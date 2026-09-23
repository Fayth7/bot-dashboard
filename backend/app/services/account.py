import ccxt
import os
import time
from pathlib import Path
from dotenv import load_dotenv

# Cache to avoid hammering exchange APIs
_cache = {}
CACHE_TTL = 300  # 5 minutes

def list_symbols(username: str, exchange: str) -> list:
    """Build exchange-specific symbols from the bot folders."""
    base = Path(f"/home/smatbotsolutions/Tradingbots/{username}/{exchange}")
    if not base.exists():
        return []
    symbols = []
    for pair_dir in base.iterdir():
        if not pair_dir.is_dir():
            continue
        name = pair_dir.name.upper()
        if name in ("MONITOR", "TRACKER", "__PYCACHE__"):
            continue
        if exchange == "OKX":
            base_ccy = name[:-4] if name.endswith("USDT") else name
            symbols.append(f"{base_ccy}-USDT-SWAP")
        else:
            symbols.append(name)
    return symbols

def load_exchange_keys(username: str) -> dict:
    env_path = Path(f"/home/smatbotsolutions/Tradingbots/{username}/Tracker/.env")
    if not env_path.exists():
        return {}
    load_dotenv(env_path, override=True)
    return {
        "binance": {
            "api_key": os.getenv("BINANCE_API_KEY"),
            "api_secret": os.getenv("BINANCE_API_SECRET"),
        },
        "bybit": {
            "api_key": os.getenv("BYBIT_API_KEY"),
            "api_secret": os.getenv("BYBIT_API_SECRET"),
        },
        "okx": {
            "api_key": os.getenv("OKX_API_KEY"),
            "api_secret": os.getenv("OKX_API_SECRET"),
            "passphrase": os.getenv("OKX_PASSPHRASE"),
        },
    }

def get_binance_summary(keys: dict) -> dict:
    try:
        exchange = ccxt.binance({
            "apiKey": keys["api_key"],
            "secret": keys["api_secret"],
            "options": {"defaultType": "future"},
        })
        balance = exchange.fetch_balance()
        positions = exchange.fetch_positions()

        total_wallet = float(balance.get("info", {}).get("totalWalletBalance", 0))
        total_unrealized = float(balance.get("info", {}).get("totalUnrealizedProfit", 0))
        total_equity = float(balance.get("info", {}).get("totalMarginBalance", 0))

        open_positions = [
            {
                "symbol": p["symbol"],
                "side": p["side"],
                "size": p["contracts"],
                "entry_price": p["entryPrice"],
                "unrealized_pnl": round(float(p["unrealizedPnl"] or 0), 2),
                "percentage": round(float(p["percentage"] or 0), 2),
            }
            for p in positions if p["contracts"] and float(p["contracts"]) > 0
        ]

        return {
            "wallet_balance": round(total_wallet, 2),
            "unrealized_pnl": round(total_unrealized, 2),
            "equity": round(total_equity, 2),
            "open_positions": open_positions,
            "error": None,
        }
    except Exception as e:
        return {"wallet_balance": 0, "unrealized_pnl": 0, "equity": 0,
                "open_positions": [], "error": str(e)}

def get_bybit_summary(keys: dict) -> dict:
    try:
        exchange = ccxt.bybit({
            "apiKey": keys["api_key"],
            "secret": keys["api_secret"],
            "options": {"defaultType": "future"},
        })
        balance = exchange.fetch_balance()
        positions = exchange.fetch_positions()

        usdt = balance.get("USDT", {})
        total_wallet = float(usdt.get("total", 0) or 0)
        total_unrealized = sum(
            float(p["unrealizedPnl"] or 0)
            for p in positions if p["contracts"] and float(p["contracts"]) > 0
        )
        total_equity = total_wallet + total_unrealized

        open_positions = [
            {
                "symbol": p["symbol"],
                "side": p["side"],
                "size": p["contracts"],
                "entry_price": p["entryPrice"],
                "unrealized_pnl": round(float(p["unrealizedPnl"] or 0), 2),
                "percentage": round(float(p["percentage"] or 0), 2),
            }
            for p in positions if p["contracts"] and float(p["contracts"]) > 0
        ]

        return {
            "wallet_balance": round(total_wallet, 2),
            "unrealized_pnl": round(total_unrealized, 2),
            "equity": round(total_equity, 2),
            "open_positions": open_positions,
            "error": None,
        }
    except Exception as e:
        return {"wallet_balance": 0, "unrealized_pnl": 0, "equity": 0,
                "open_positions": [], "error": str(e)}

def get_okx_summary(keys: dict) -> dict:
    try:
        exchange = ccxt.okx({
            "apiKey": keys["api_key"],
            "secret": keys["api_secret"],
            "password": keys["passphrase"],
            "options": {"defaultType": "swap"},
        })
        balance = exchange.fetch_balance()
        positions = exchange.fetch_positions()

        usdt = balance.get("USDT", {})
        total_wallet = float(usdt.get("total", 0) or 0)
        total_unrealized = sum(
            float(p["unrealizedPnl"] or 0)
            for p in positions if p["contracts"] and float(p["contracts"]) > 0
        )
        total_equity = total_wallet + total_unrealized

        open_positions = [
            {
                "symbol": p["symbol"],
                "side": p["side"],
                "size": p["contracts"],
                "entry_price": p["entryPrice"],
                "unrealized_pnl": round(float(p["unrealizedPnl"] or 0), 2),
                "percentage": round(float(p["percentage"] or 0), 2),
            }
            for p in positions if p["contracts"] and float(p["contracts"]) > 0
        ]

        return {
            "wallet_balance": round(total_wallet, 2),
            "unrealized_pnl": round(total_unrealized, 2),
            "equity": round(total_equity, 2),
            "open_positions": open_positions,
            "error": None,
        }
    except Exception as e:
        return {"wallet_balance": 0, "unrealized_pnl": 0, "equity": 0,
                "open_positions": [], "error": str(e)}

def get_account_summary(username: str) -> dict:
    cache_key = f"account_{username}"
    now = time.time()

    if cache_key in _cache:
        cached_at, cached_data = _cache[cache_key]
        if now - cached_at < CACHE_TTL:
            cached_data["cached"] = True
            cached_data["cache_age_seconds"] = int(now - cached_at)
            return cached_data

    keys = load_exchange_keys(username)
    if not keys:
        return {"error": "No API keys found", "exchanges": {}}

    exchanges = {
        "Binance": get_binance_summary(keys["binance"]),
        "Bybit": get_bybit_summary(keys["bybit"]),
        "OKX": get_okx_summary(keys["okx"]),
    }

    total_wallet = sum(e["wallet_balance"] for e in exchanges.values())
    total_unrealized = sum(e["unrealized_pnl"] for e in exchanges.values())
    total_equity = sum(e["equity"] for e in exchanges.values())

    result = {
        "exchanges": exchanges,
        "total_wallet_balance": round(total_wallet, 2),
        "total_unrealized_pnl": round(total_unrealized, 2),
        "total_equity": round(total_equity, 2),
        "cached": False,
        "cache_age_seconds": 0,
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }

    _cache[cache_key] = (now, result)
    return result

def get_today_pnl(username: str) -> dict:
    from datetime import datetime, timezone

    keys = load_exchange_keys(username)
    if not keys:
        return {"error": "No API keys found"}

    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    since_ms = int(start.timestamp() * 1000)

    result = {}
    total_pnl = 0.0
    total_closes = 0

    # --- Binance ---
    try:
        ex = ccxt.binance({
            "apiKey": keys["binance"]["api_key"],
            "secret": keys["binance"]["api_secret"],
            "options": {"defaultType": "future"},
        })
        pnl, closes = 0.0, 0
        for sym in list_symbols(username, "Binance"):
            try:
                trades = ex.fetch_my_trades(sym, since=since_ms, limit=1000)
            except Exception:
                continue
            orders = {}
            for t in trades:
                realized = float(t.get("info", {}).get("realizedPnl", 0) or 0)
                if realized == 0:
                    continue
                oid = t.get("order") or t.get("info", {}).get("orderId") or t.get("id")
                orders.setdefault(oid, 0.0)
                orders[oid] += realized
            for o_pnl in orders.values():
                pnl += o_pnl
                closes += 1
        result["Binance"] = {"pnl": round(pnl, 2), "closes": closes}
        total_pnl += pnl
        total_closes += closes
    except Exception as e:
        result["Binance"] = {"pnl": 0, "closes": 0, "error": str(e)}

    # --- Bybit ---
    try:
        ex = ccxt.bybit({
            "apiKey": keys["bybit"]["api_key"],
            "secret": keys["bybit"]["api_secret"],
            "options": {"defaultType": "linear"},
        })
        pnl, closes = 0.0, 0
        resp = ex.private_get_v5_position_closed_pnl({
            "category": "linear",
            "startTime": since_ms,
            "limit": 100,
        })
        rows = (resp.get("result") or {}).get("list") or []
        for r in rows:
            pnl += float(r.get("closedPnl", 0) or 0)
            closes += 1
        result["Bybit"] = {"pnl": round(pnl, 2), "closes": closes}
        total_pnl += pnl
        total_closes += closes
    except Exception as e:
        result["Bybit"] = {"pnl": 0, "closes": 0, "error": str(e)}

    # --- OKX ---
    try:
        ex = ccxt.okx({
            "apiKey": keys["okx"]["api_key"],
            "secret": keys["okx"]["api_secret"],
            "password": keys["okx"]["passphrase"],
            "options": {"defaultType": "swap"},
        })
        pnl, closes = 0.0, 0
        for sym in list_symbols(username, "OKX"):
            try:
                trades = ex.fetch_my_trades(sym, since=since_ms, limit=1000)
            except Exception:
                continue
            orders = {}
            for t in trades:
                realized = float(t.get("info", {}).get("fillPnl", 0) or 0)
                if realized == 0:
                    continue
                oid = t.get("order") or t.get("info", {}).get("ordId") or t.get("id")
                orders.setdefault(oid, 0.0)
                orders[oid] += realized
            for o_pnl in orders.values():
                pnl += o_pnl
                closes += 1
        result["OKX"] = {"pnl": round(pnl, 2), "closes": closes}
        total_pnl += pnl
        total_closes += closes
    except Exception as e:
        result["OKX"] = {"pnl": 0, "closes": 0, "error": str(e)}

    return {
        "date": datetime.now(timezone.utc).date().isoformat(),
        "total_pnl": round(total_pnl, 2),
        "total_closes": total_closes,
        "exchanges": result,
    }
