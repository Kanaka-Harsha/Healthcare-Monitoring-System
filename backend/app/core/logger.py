import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

# Ensure UTF-8 output encoding for Windows server shells
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Create logs directory
LOGS_DIR = Path(__file__).resolve().parent.parent.parent / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

SERVER_LOG_FILE = LOGS_DIR / "server.log"
ACCESS_LOG_FILE = LOGS_DIR / "access.log"
ERROR_LOG_FILE = LOGS_DIR / "error.log"

# Standard detailed formatter for files and console
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | [%(name)s] [%(process)d:%(threadName)s] %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)

def setup_logging():
    # Root Logger Configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Clear existing handlers to avoid duplicates
    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    # 1. Console Stream Handler (Outputs directly to server terminal)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # 2. Main Server Rotating File Handler (10MB per file, keeps 10 backups)
    server_file_handler = RotatingFileHandler(
        SERVER_LOG_FILE,
        maxBytes=10 * 1024 * 1024,
        backupCount=10,
        encoding="utf-8"
    )
    server_file_handler.setLevel(logging.INFO)
    server_file_handler.setFormatter(formatter)
    root_logger.addHandler(server_file_handler)

    # 3. Error-Only Rotating File Handler
    error_file_handler = RotatingFileHandler(
        ERROR_LOG_FILE,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8"
    )
    error_file_handler.setLevel(logging.ERROR)
    error_file_handler.setFormatter(formatter)
    root_logger.addHandler(error_file_handler)

    # Set external libraries to appropriate levels
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    return root_logger

# Initialize logger
server_logger = logging.getLogger("healthcare.server")
access_logger = logging.getLogger("healthcare.access")
db_logger = logging.getLogger("healthcare.db")
auth_logger = logging.getLogger("healthcare.auth")
otp_logger = logging.getLogger("healthcare.otp")
telemetry_logger = logging.getLogger("healthcare.telemetry")
