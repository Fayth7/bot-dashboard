from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from app.routers.auth import verify_token
import subprocess

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    return verify_token(token)

# Registry of all bots
# As you add more bots, just add them here
BOTS = {
    "okx-clusdt": {
        "service": "okx-clusdt",
        "exchange": "OKX",
        "pair": "CLUSDT",
        "log_path": "/home/smatbotsolutions/Tradingbots/OKX/clusdt/CLusdt.log"
    }
}

def run_systemctl(action: str, service: str):
    result = subprocess.run(
        ["sudo", "systemctl", action, service],
        capture_output=True,
        text=True
    )
    return result.returncode == 0

def get_bot_status(service: str) -> str:
    result = subprocess.run(
        ["systemctl", "is-active", service],
        capture_output=True,
        text=True
    )
    return result.stdout.strip()

@router.get("/")
def list_bots(user: str = Depends(get_current_user)):
    bots_status = []
    for bot_id, bot in BOTS.items():
        bots_status.append({
            "id": bot_id,
            "exchange": bot["exchange"],
            "pair": bot["pair"],
            "status": get_bot_status(bot["service"])
        })
    return bots_status

@router.post("/{bot_id}/start")
def start_bot(bot_id: str, user: str = Depends(get_current_user)):
    if bot_id not in BOTS:
        raise HTTPException(status_code=404, detail="Bot not found")
    success = run_systemctl("start", BOTS[bot_id]["service"])
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start bot")
    return {"message": f"{bot_id} started successfully"}

@router.post("/{bot_id}/stop")
def stop_bot(bot_id: str, user: str = Depends(get_current_user)):
    if bot_id not in BOTS:
        raise HTTPException(status_code=404, detail="Bot not found")
    success = run_systemctl("stop", BOTS[bot_id]["service"])
    if not success:
        raise HTTPException(status_code=500, detail="Failed to stop bot")
    return {"message": f"{bot_id} stopped successfully"}

@router.get("/{bot_id}/logs")
def get_logs(bot_id: str, lines: int = 50, user: str = Depends(get_current_user)):
    if bot_id not in BOTS:
        raise HTTPException(status_code=404, detail="Bot not found")
    log_path = BOTS[bot_id]["log_path"]
    result = subprocess.run(
        ["tail", f"-{lines}", log_path],
        capture_output=True,
        text=True
    )
    return {"logs": result.stdout.splitlines()}
