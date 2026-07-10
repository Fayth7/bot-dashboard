from fastapi import FastAPI, HTTPException
from fastapi.security import APIKeyHeader
from fastapi import Security
import subprocess
import os

app = FastAPI(title="Bot Control Bridge")

# Simple secret key so only our Docker container can call this
BRIDGE_SECRET = os.getenv("BRIDGE_SECRET", "changeme")
api_key_header = APIKeyHeader(name="X-Bridge-Key")

def verify_key(key: str = Security(api_key_header)):
    if key != BRIDGE_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")
    return key

def run_systemctl(action: str, service: str) -> dict:
    # Validate action and service name to prevent injection
    allowed_actions = ["start", "stop", "restart", "is-active"]
    if action not in allowed_actions:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    # Service must match our naming pattern exchange-username-pair
    import re
    if not re.match(r'^[a-z]+-[a-z]+-[a-z0-9]+$', service):
        raise HTTPException(status_code=400, detail="Invalid service name")
    
    result = subprocess.run(
        ["sudo", "/usr/bin/systemctl", action, service],
        capture_output=True,
        text=True
    )
    return {
        "success": result.returncode == 0,
        "output": result.stdout.strip(),
        "error": result.stderr.strip()
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/service/{service}/start")
def start_service(service: str, key: str = Security(verify_key)):
    return run_systemctl("start", service)

@app.post("/service/{service}/stop")
def stop_service(service: str, key: str = Security(verify_key)):
    return run_systemctl("stop", service)

@app.get("/service/{service}/status")
def service_status(service: str, key: str = Security(verify_key)):
    result = subprocess.run(
        ["systemctl", "is-active", service],
        capture_output=True,
        text=True
    )
    return {"status": result.stdout.strip()}
