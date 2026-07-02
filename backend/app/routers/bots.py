from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from app.routers.auth import verify_token, get_user
import subprocess
import os

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

BOTS_BASE_PATH = "/home/smatbotsolutions/Tradingbots"
EXCHANGES = ["Binance", "Bybit", "OKX"]

def get_current_user(token: str = Depends(oauth2_scheme)):
    username = verify_token(token)
    user = get_user(username)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def get_service_name(username: str, exchange: str, pair: str) -> str:
    return f"{exchange.lower()}-{username.lower()}-{pair.lower()}"

def get_bot_status(service: str) -> str:
    result = subprocess.run(
        ["systemctl", "is-active", service],
        capture_output=True,
        text=True
    )
    return result.stdout.strip()

def get_log_path(username: str, exchange: str, pair: str) -> str:
    pair_dir = f"{BOTS_BASE_PATH}/{username}/{exchange}/{pair}"
    for f in os.listdir(pair_dir):
        if f.endswith(".log") and "error" not in f.lower() and "audit" not in f.lower() and "trade" not in f.lower():
            return os.path.join(pair_dir, f)
    return None

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

def run_systemctl(action: str, service: str) -> bool:
    result = subprocess.run(
        ["sudo", "systemctl", action, service],
        capture_output=True,
        text=True
    )
    return result.returncode == 0

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
    result = subprocess.run(
        ["tail", f"-{lines}", log_path],
        capture_output=True,
        text=True
    )
    return {"logs": result.stdout.splitlines()}
