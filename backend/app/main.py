from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, bots, analytics

app = FastAPI(
    title="Bot Dashboard API",
    description="API to monitor and control trading bots",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://bots.redorchid.co.ug"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(bots.router, prefix="/api/bots", tags=["bots"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
