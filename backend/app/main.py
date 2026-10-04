import time
import sys
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logger import setup_logging, server_logger, access_logger
from app.db.init_db import init_db
from app.api.v1 import api_router

# Initialize centralized logging system (Console + Rotating Log Files)
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    server_logger.info("==================================================")
    server_logger.info(f"⚡ STARTING {settings.PROJECT_NAME} BACKEND")
    server_logger.info(f"🌐 Environment: {settings.ENVIRONMENT} | Host: {settings.HOST}:{settings.PORT}")
    server_logger.info(f"🔗 Database URL: {settings.DB_URL.split('@')[-1] if '@' in settings.DB_URL else 'Configured'}")
    server_logger.info("==================================================")
    try:
        init_db()
        server_logger.info("✅ Database connected and schema verified.")
    except Exception as e:
        server_logger.error(f"❌ Database initialization error: {e}", exc_info=True)
    yield
    server_logger.info(f"🛑 SHUTTING DOWN {settings.PROJECT_NAME} BACKEND")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# Comprehensive HTTP Request & Response Logging Middleware
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    start_time = time.time()
    client_host = request.client.host if request.client else "unknown"
    method = request.method
    path = request.url.path
    query_params = str(request.query_params) if request.query_params else ""

    access_logger.info(f"📥 [REQUEST] {method} {path}{('?' + query_params) if query_params else ''} | IP: {client_host}")

    try:
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000
        
        status_code = response.status_code
        log_level = access_logger.warning if status_code >= 400 else access_logger.info
        log_level(
            f"📤 [RESPONSE] {method} {path} | Status: {status_code} | Time: {duration_ms:.2f}ms | IP: {client_host}"
        )
        
        response.headers["X-Process-Time-MS"] = f"{duration_ms:.2f}"
        return response
    except Exception as exc:
        duration_ms = (time.time() - start_time) * 1000
        access_logger.error(
            f"💥 [UNHANDLED EXCEPTION] {method} {path} | Time: {duration_ms:.2f}ms | Error: {str(exc)}\n{traceback.format_exc()}"
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error. The incident has been logged."}
        )

# CORS Configuration
if isinstance(settings.CORS_ORIGINS, str):
    if settings.CORS_ORIGINS.strip() == "*":
        origins = ["*"]
    else:
        origins = [orig.strip() for orig in settings.CORS_ORIGINS.split(",") if orig.strip()]
else:
    origins = list(settings.CORS_ORIGINS)

for extra in [
    settings.VERCEL_FRONTEND_URL,
    "https://healthcare-monitoring-system-nine.vercel.app",
    "https://casually-override-childlike.ngrok-free.dev",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
]:
    if extra and extra not in origins and "*" not in origins:
        origins.append(extra)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" in origins else origins,
    allow_origin_regex=r"^(https:\/\/.*\.vercel\.app|https:\/\/.*\.ngrok-free\.dev|https:\/\/.*\.ngrok\.app|https:\/\/[a-z0-9\-]+\.trycloudflare\.com)$" if "*" not in origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
