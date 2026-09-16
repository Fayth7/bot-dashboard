from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from app.routers.auth import verify_token, get_user
from pathlib import Path
import json

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

BOTS_BASE_PATH = "/home/smatbotsolutions/Tradingbots"

def get_current_user(token: str = Depends(oauth2_scheme)):
    from fastapi import HTTPException
    username = verify_token(token)
    user = get_user(username)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.get("/daily")
def get_daily_pnl(user: dict = Depends(get_current_user)):
    username = user["username"]
    jsonl_path = Path(f"{BOTS_BASE_PATH}/{username}/Tracker/daily_totals.jsonl")

    if not jsonl_path.exists():
        return {"today": None, "history": [], "averages": {}}

    records = []
    with open(jsonl_path, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    if not records:
        return {"today": None, "history": [], "averages": {}}

    records.sort(key=lambda r: r.get("date", ""), reverse=True)

    def format_record(r):
        exchanges = {}
        exchange_names = {"okx": "OKX", "binance": "Binance", "bybit": "Bybit"}
        for ex, data in r.get("exchanges", {}).items():
            display_name = exchange_names.get(ex.lower(), ex.capitalize())
            exchanges[display_name] = {
                "net_pnl": round(data.get("net_pnl", 0), 2),
                "realized_pnl": round(data.get("realized_pnl", 0), 2),
                "commission": round(data.get("commission", 0), 2),
                "funding_fee": round(data.get("funding_fee", 0), 2),
                "trades_closed": data.get("trades_closed", 0),
            }
        return {
            "date": r.get("date"),
            "total_net_pnl": round(r.get("total_net_pnl", 0), 2),
            "total_realized_pnl": round(r.get("total_realized_pnl", 0), 2),
            "total_costs": round(r.get("total_costs", 0), 2),
            "total_trades_closed": r.get("total_trades_closed", 0),
            "exchanges": exchanges,
        }

    def average_over(days):
        subset = records[:days]
        if not subset:
            return None
        count = len(subset)
        return {
            "days": count,
            "avg_net_pnl": round(sum(r.get("total_net_pnl", 0) for r in subset) / count, 2),
            "avg_realized_pnl": round(sum(r.get("total_realized_pnl", 0) for r in subset) / count, 2),
            "avg_trades": round(sum(r.get("total_trades_closed", 0) for r in subset) / count, 1),
            "total_net_pnl": round(sum(r.get("total_net_pnl", 0) for r in subset), 2),
        }

    return {
        "today": format_record(records[0]) if records else None,
        "history": [format_record(r) for r in records[1:8]],
        "averages": {
            "7d": average_over(7),
            "30d": average_over(30),
            "90d": average_over(90),
        }
    }
