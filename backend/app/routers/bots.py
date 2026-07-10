from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from app.routers.auth import verify_token, get_user
import subprocess
import urllib.request
import urllib.error
import csv
import json
import os
from datetime import datetime

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

BOTS_BASE_PATH = "/home/smatbotsolutions/Tradingbots"
EXCHANGES = ["Binance", "Bybit", "OKX"]
BRIDGE_URL = os.getenv("BRIDGE_URL", "http://127.0.0.1:8002")
BRIDGE_SECRET = os.getenv("BRIDGE_SECRET", "changeme")

def get_current_user(token: str = Depends(oauth2_scheme)):
    username = verify_token(token)
    user = get_user(username)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def get_service_name(username: str, exchange: str, pair: str) -> str:
    return f"{exchange.lower()}-{username.lower()}-{pair.lower()}"

def bridge_request(method: str, path: str) -> dict:
    url = f"{BRIDGE_URL}{path}"
    req = urllib.request.Request(
        url,
        method=method,
        headers={"X-Bridge-Key": BRIDGE_SECRET}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        return {"success": False, "status": "unknown", "error": str(e)}
    except Exception as e:
        return {"success": False, "status": "unknown", "error": str(e)}

def get_bot_status(service: str) -> str:
    result = bridge_request("GET", f"/service/{service}/status")
    return result.get("status", "unknown")

def run_systemctl(action: str, service: str) -> bool:
    result = bridge_request("POST", f"/service/{service}/{action}")
    return result.get("success", False)

def get_log_path(username: str, exchange: str, pair: str) -> str:
    pair_dir = f"{BOTS_BASE_PATH}/{username}/{exchange}/{pair}"
    if not os.path.exists(pair_dir):
        return None
    candidates = []
    for f in os.listdir(pair_dir):
        if not f.endswith(".log"):
            continue
        if any(x in f.lower() for x in ["error", "audit", "trade", "hedge"]):
            continue
        full_path = os.path.join(pair_dir, f)
        if os.path.isfile(full_path):
            candidates.append((os.path.getmtime(full_path), full_path))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    return candidates[0][1]

def discover_bots(username: str) -> list:
    bots = []
    user_path = os.path.join(BOTS_BASE_PATH, username)
    if not os.path.exists(user_path):
        return bots
    for exchange in EXCHANGES:
        exchange_path = os.path.join(user_path, exchange)
        if not os.path.exists(exchange_path):
            continue
        for pair in os.listdir(exchange_path):
            pair_path = os.path.join(exchange_path, pair)
            if not os.path.isdir(pair_path):
                continue
            py_files = [f for f in os.listdir(pair_path) if f.endswith(".py")]
            if not py_files:
                continue
            service = get_service_name(username, exchange, pair)
            bots.append({
                "id": f"{username.lower()}-{exchange.lower()}-{pair.lower()}",
                "service": service,
                "exchange": exchange,
                "pair": pair.upper(),
                "username": username,
                "status": get_bot_status(service)
            })
    return bots

def find_bot(bot_id: str, username: str) -> dict:
    bots = discover_bots(username)
    for bot in bots:
        if bot["id"] == bot_id:
            return bot
    return None

@router.get("/")
def list_bots(user: dict = Depends(get_current_user)):
    return discover_bots(user["username"])

@router.post("/{bot_id}/start")
def start_bot(bot_id: str, user: dict = Depends(get_current_user)):
    bot = find_bot(bot_id, user["username"])
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    success = run_systemctl("start", bot["service"])
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start bot")
    return {"message": f"{bot['pair']} started successfully"}

@router.post("/{bot_id}/stop")
def stop_bot(bot_id: str, user: dict = Depends(get_current_user)):
    bot = find_bot(bot_id, user["username"])
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    success = run_systemctl("stop", bot["service"])
    if not success:
        raise HTTPException(status_code=500, detail="Failed to stop bot")
    return {"message": f"{bot['pair']} stopped successfully"}

@router.get("/{bot_id}/logs")
def get_logs(bot_id: str, lines: int = 50, user: dict = Depends(get_current_user)):
    bot = find_bot(bot_id, user["username"])
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    log_path = get_log_path(bot["username"], bot["exchange"], bot["pair"].lower())
    if not log_path:
        return {"logs": ["No log file found"]}
    today = datetime.now().strftime("%Y-%m-%d")
    result = subprocess.run(
        ["grep", today, log_path],
        capture_output=True,
        text=True
    )
    log_lines = result.stdout.splitlines()
    return {"logs": log_lines[-lines:] if log_lines else ["No entries for today yet"]}

@router.get("/{bot_id}/pnl")
def get_pnl(bot_id: str, user: dict = Depends(get_current_user)):
    bot = find_bot(bot_id, user["username"])
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    trade_logs_path = (
        f"{BOTS_BASE_PATH}/{bot['username']}"
        f"/{bot['exchange']}/{bot['pair'].lower()}/trade_logs"
    )

    # Read trades.csv for realised PnL
    csv_path = os.path.join(trade_logs_path, "trades.csv")
    total_pnl = 0.0
    closed_trades = 0
    winning_trades = 0

    if os.path.exists(csv_path):
        with open(csv_path, "r") as f:
            content = f.read().strip()
        if content and not content.startswith("timestamp"):
            content = f"timestamp,action,position_id,side,price,quantity,reason,pnl_usd,pnl_percent,current_price,equity,extra_info\n{content}"
        if content:
            reader = csv.DictReader(content.splitlines())
            for row in reader:
                if row.get("action", "").startswith("CLOSE"):
                    pnl = float(row.get("pnl_usd") or 0)
                    total_pnl += pnl
                    closed_trades += 1
                    if pnl > 0:
                        winning_trades += 1

    # Read active_trades.json for open positions
    json_path = os.path.join(trade_logs_path, "active_trades.json")
    long_deployed = 0.0
    short_deployed = 0.0
    open_positions = 0

    if os.path.exists(json_path):
        with open(json_path, "r") as f:
            data = json.load(f)
            dual_trades = data.get("dual_trades", {})
            for trade in dual_trades.values():
                long_pos = trade.get("long_position", {})
                short_pos = trade.get("short_position", {})
                long_closed = trade.get("long_closed", True)
                short_closed = trade.get("short_closed", True)

                if not long_closed and long_pos.get("status") == "OPEN":
                    qty = float(long_pos.get("quantity", 0))
                    price = float(long_pos.get("entry_price", 0))
                    leverage = float(long_pos.get("leverage", 1))
                    long_deployed += (qty * price) / leverage
                    open_positions += 1

                if not short_closed and short_pos.get("status") == "OPEN":
                    qty = float(short_pos.get("quantity", 0))
                    price = float(short_pos.get("entry_price", 0))
                    leverage = float(short_pos.get("leverage", 1))
                    short_deployed += (qty * price) / leverage
                    open_positions += 1

    win_rate = (
        round((winning_trades / closed_trades) * 100, 1)
        if closed_trades > 0 else 0
    )

    pair_upper = bot['pair'].upper()
    if pair_upper.endswith('BTC'):
        currency = 'BTC'
        decimals = 8
    else:
        currency = 'USD'
        decimals = 2

    return {
        "total_pnl_usd": round(total_pnl, decimals),
        "closed_trades": closed_trades,
        "winning_trades": winning_trades,
        "win_rate": win_rate,
        "open_positions": open_positions,
        "long_deployed": round(long_deployed, decimals),
        "short_deployed": round(short_deployed, decimals),
        "currency": currency
    }
