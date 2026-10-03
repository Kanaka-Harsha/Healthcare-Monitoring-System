from contextlib import asynccontextmanager
import time
import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.init_db import init_db
from app.api.v1 import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("healthcare.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and seed data on startup
    logger.info("⚡ Starting Healthcare Monitoring Backend...")
    try:
        init_db()
        logger.info("✅ Database initialized successfully.")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
    yield
    logger.info("🛑 Shutting down Healthcare Monitoring Backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS Configuration
# Extract origins from settings and clean whitespace
if isinstance(settings.CORS_ORIGINS, str):
    if settings.CORS_ORIGINS.strip() == "*":
        origins = ["*"]
    else:
        origins = [orig.strip() for orig in settings.CORS_ORIGINS.split(",") if orig.strip()]
else:
    origins = list(settings.CORS_ORIGINS)

# Always include Vercel URL placeholder and localhost ports
for extra in [settings.VERCEL_FRONTEND_URL, "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"]:
    if extra and extra not in origins and "*" not in origins:
        origins.append(extra)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" in origins else origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$" if "*" not in origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Timing Middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(f"{process_time:.4f}s")
    return response

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["System"])
def health_check():
    """
    24/7 server health-check probe.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp": time.time()
    }

@app.get("/", tags=["System"])
def root():
    return {
        "message": "Healthcare Monitoring System API is running.",
        "docs": f"{settings.API_V1_STR}/docs",
        "health": "/health"
    }
