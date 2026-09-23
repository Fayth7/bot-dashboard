from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from app.routers.auth import verify_token, get_user
from pathlib import Path
import json
import csv as csv_module
from datetime import datetime, timezone, timedelta
EAT = timezone(timedelta(hours=3))

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
        exchange_names = {"okx": "OKX", "binance": "Binance", "bybit": "Bybit"}
        exchanges = {}
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


@router.get("/pair-pnl")
def get_pair_pnl(user: dict = Depends(get_current_user)):
    username = user["username"]
    csv_path = Path(f"{BOTS_BASE_PATH}/{username}/Tracker/daily_pair_metrics.csv")

    if not csv_path.exists():
        return {}

    pair_totals = {}

    with open(csv_path, "r") as f:
        reader = csv_module.DictReader(f)
        for row in reader:
            exchange = row.get("exchange", "").capitalize()
            symbol = row.get("symbol", "").upper()
            pnl = float(row.get("pnl_usd") or 0)
            long_closes = int(row.get("long_closes") or 0)
            short_closes = int(row.get("short_closes") or 0)

            key = f"{exchange}:{symbol}"
            if key not in pair_totals:
                pair_totals[key] = {
                    "exchange": exchange,
                    "symbol": symbol,
                    "total_pnl": 0.0,
                    "total_closes": 0,
                    "long_closes": 0,
                    "short_closes": 0,
                    "days_tracked": 0,
                }
            pair_totals[key]["total_pnl"] += pnl
            pair_totals[key]["total_closes"] += long_closes + short_closes
            pair_totals[key]["long_closes"] += long_closes
            pair_totals[key]["short_closes"] += short_closes
            pair_totals[key]["days_tracked"] += 1

    result = {}
    for key, data in pair_totals.items():
        data["total_pnl"] = round(data["total_pnl"], 2)
        result[key] = data

    return result


@router.get("/calendar")
def get_calendar(user: dict = Depends(get_current_user)):
    username = user["username"]
    jsonl_path = Path(f"{BOTS_BASE_PATH}/{username}/Tracker/daily_totals.jsonl")

    if not jsonl_path.exists():
        return {"days": {}, "months": {}}

    days = {}
    months = {}

    with open(jsonl_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
                date = r.get("date")
                if not date:
                    continue

                month = date[:7]
                net_pnl = round(r.get("total_net_pnl", 0), 2)
                realized = round(r.get("total_realized_pnl", 0), 2)
                costs = round(r.get("total_costs", 0), 2)
                closes = r.get("total_trades_closed", 0)

                exchange_names = {"okx": "OKX", "binance": "Binance", "bybit": "Bybit"}
                exchanges = {}
                for ex, data in r.get("exchanges", {}).items():
                    name = exchange_names.get(ex.lower(), ex.capitalize())
                    exchanges[name] = {
                        "net_pnl": round(data.get("net_pnl", 0), 2),
                        "realized_pnl": round(data.get("realized_pnl", 0), 2),
                        "trades_closed": data.get("trades_closed", 0),
                    }

                days[date] = {
                    "date": date,
                    "net_pnl": net_pnl,
                    "realized_pnl": realized,
                    "costs": costs,
                    "trades_closed": closes,
                    "exchanges": exchanges,
                }

                if month not in months:
                    months[month] = {
                        "total_net_pnl": 0.0,
                        "total_realized_pnl": 0.0,
                        "total_costs": 0.0,
                        "total_trades": 0,
                        "days_tracked": 0,
                    }
                months[month]["total_net_pnl"] += net_pnl
                months[month]["total_realized_pnl"] += realized
                months[month]["total_costs"] += costs
                months[month]["total_trades"] += closes
                months[month]["days_tracked"] += 1

            except json.JSONDecodeError:
                continue

    for month in months:
        m = months[month]
        days_count = m["days_tracked"]
        m["total_net_pnl"] = round(m["total_net_pnl"], 2)
        m["total_realized_pnl"] = round(m["total_realized_pnl"], 2)
        m["total_costs"] = round(m["total_costs"], 2)
        m["avg_daily_pnl"] = round(m["total_net_pnl"] / days_count, 2) if days_count else 0

    return {"days": days, "months": months}

@router.get("/today")
def get_today_pnl(user: dict = Depends(get_current_user)):
    from app.services.account import get_today_pnl as compute_today_pnl
    return compute_today_pnl(user["username"])

@router.get("/account-summary")
def get_account_summary_endpoint(user: dict = Depends(get_current_user)):
    from app.services.account import get_account_summary
    return get_account_summary(user["username"])

@router.get("/alerts")
def get_alerts(user: dict = Depends(get_current_user)):
    username = user["username"]
    user_path = Path(f"{BOTS_BASE_PATH}/{username}")
    alerts = []

    if not user_path.exists():
        return {"alerts": []}

    exchanges = ["Binance", "Bybit", "OKX"]
    for exchange in exchanges:
        alert_file = user_path / exchange / "monitor" / "drawdown_alert.json"
        if alert_file.exists():
            try:
                with open(alert_file, "r") as f:
                    alert = json.load(f)
                    alert["exchange_dir"] = exchange
                    alerts.append(alert)
            except Exception:
                continue

    return {"alerts": alerts}


@router.post("/alerts/{exchange}/approve")
def approve_alert(exchange: str, user: dict = Depends(get_current_user)):
    username = user["username"]
    alert_file = Path(f"{BOTS_BASE_PATH}/{username}/{exchange}/monitor/drawdown_alert.json")

    if not alert_file.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No alert found")

    with open(alert_file, "r") as f:
        alert = json.load(f)

    alert["status"] = "approved"
    alert["approved_at"] = datetime.now(EAT).isoformat()

    with open(alert_file, "w") as f:
        json.dump(alert, f, indent=2)

    return {"message": "Alert approved — monitor will execute on next cycle"}


@router.post("/alerts/{exchange}/reject")
def reject_alert(exchange: str, user: dict = Depends(get_current_user)):
    username = user["username"]
    alert_file = Path(f"{BOTS_BASE_PATH}/{username}/{exchange}/monitor/drawdown_alert.json")

    if not alert_file.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No alert found")

    with open(alert_file, "r") as f:
        alert = json.load(f)

    alert["status"] = "rejected"
    alert["rejected_at"] = datetime.now(EAT).isoformat()

    with open(alert_file, "w") as f:
        json.dump(alert, f, indent=2)

    return {"message": "Alert rejected — monitor will re-alert in 2 hours if still breached"}
