#!/usr/bin/env python3
"""
Smart Cloudflare Quick Tunnel Launcher
=======================================
- Starts cloudflared free quick tunnel (no account needed)
- Auto-captures new trycloudflare.com URL on every start
- Updates backend/.env  CORS_ORIGINS
- Updates frontend/.env + .env.production  VITE_API_URL
- Writes tunnel_state.json (shared state for other scripts)
- Auto-restarts tunnel on crash with exponential backoff
- All activity logged to tunnel.log

Usage:
    python start_tunnel.py
    python start_tunnel.py --no-restart   (single run, no auto-restart)
"""

import subprocess
import sys
import re
import os
import json
import time
import argparse
from datetime import datetime
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT              = Path(__file__).parent.resolve()
CLOUDFLARED       = ROOT / "cloudflared.exe"
BACKEND_ENV       = ROOT / "backend" / ".env"
FRONTEND_ENV      = ROOT / "frontend" / ".env"
FRONTEND_ENV_PROD = ROOT / "frontend" / ".env.production"
STATE_FILE        = ROOT / "tunnel_state.json"
LOG_FILE          = ROOT / "tunnel.log"
BACKEND_PORT      = 8000

# ── Encoding fix (Windows) ────────────────────────────────────────────────────
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ── Logging ───────────────────────────────────────────────────────────────────
def log(level: str, msg: str):
    ts   = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] [{level}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass

def info(m):  log("INFO ", m)
def warn(m):  log("WARN ", m)
def error(m): log("ERROR", m)
def ok(m):    log("OK   ", m)

# ── URL Extractor ─────────────────────────────────────────────────────────────
URL_PATTERN = re.compile(r"https://[a-z0-9\-]+\.trycloudflare\.com")

def extract_url(line: str):
    m = URL_PATTERN.search(line)
    return m.group(0) if m else None

# ── File Updaters ─────────────────────────────────────────────────────────────
def update_env_file(path: Path, key: str, value: str):
    """Insert or update KEY="value" in a .env file."""
    content = path.read_text(encoding="utf-8") if path.exists() else ""
    lines   = content.splitlines()
    found   = False
    new_lines = []
    for line in lines:
        if re.match(rf'^{key}\s*=', line):
            new_lines.append(f'{key}="{value}"')
            found = True
        else:
            new_lines.append(line)
    if not found:
        new_lines.append(f'{key}="{value}"')
    path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")

def update_cors_in_backend_env(tunnel_url: str):
    """Replace the old trycloudflare entry in CORS_ORIGINS with the new URL."""
    if not BACKEND_ENV.exists():
        warn("backend/.env not found — skipping CORS update")
        return
    content   = BACKEND_ENV.read_text(encoding="utf-8")
    lines     = content.splitlines()
    new_lines = []
    for line in lines:
        if re.match(r'^CORS_ORIGINS\s*=', line):
            current = line.split("=", 1)[1].strip().strip('"')
            origins = [o.strip() for o in current.split(",") if o.strip()]
            # Drop old trycloudflare entries, add new
            origins = [o for o in origins if "trycloudflare.com" not in o]
            origins.append(tunnel_url)
            new_lines.append(f'CORS_ORIGINS="{",".join(origins)}"')
            ok("backend/.env CORS_ORIGINS updated")
        else:
            new_lines.append(line)
    BACKEND_ENV.write_text("\n".join(new_lines) + "\n", encoding="utf-8")

def save_state(tunnel_url: str, status: str = "active"):
    state = {
        "tunnel_url": tunnel_url,
        "api_base":   f"{tunnel_url}/api/v1",
        "status":     status,
        "updated_at": datetime.now().isoformat(),
    }
    STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")

def apply_all_updates(tunnel_url: str):
    """Called once when the tunnel URL is first detected."""
    info(f"Tunnel URL detected: {tunnel_url}")
    api_url = f"{tunnel_url}/api/v1"

    update_env_file(FRONTEND_ENV,      "VITE_API_URL", api_url)
    ok(f"frontend/.env            → VITE_API_URL updated")

    update_env_file(FRONTEND_ENV_PROD, "VITE_API_URL", api_url)
    ok(f"frontend/.env.production → VITE_API_URL updated")

    update_cors_in_backend_env(tunnel_url)
    save_state(tunnel_url)
    ok("tunnel_state.json saved")

    print()
    print("=" * 65)
    print(f"  TUNNEL  ►  {tunnel_url}")
    print(f"  API     ►  {api_url}")
    print(f"  HEALTH  ►  {tunnel_url}/health")
    print(f"  DOCS    ►  {tunnel_url}/api/v1/docs")
    print("=" * 65)
    print()
    warn("CORS updated in backend/.env — restart backend once to apply.")
    warn("Vercel: update VITE_API_URL env var in Vercel dashboard & redeploy.")
    print()

# ── Main Tunnel Runner ────────────────────────────────────────────────────────
def run_cloudflared():
    """Spawn cloudflared, stream output, detect URL. Returns when tunnel dies."""
    if not CLOUDFLARED.exists():
        error("cloudflared.exe not found. Run:")
        error("  Invoke-WebRequest -Uri https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe -OutFile cloudflared.exe")
        sys.exit(1)

    info(f"Launching cloudflared → http://localhost:{BACKEND_PORT}")

    proc = subprocess.Popen(
        [str(CLOUDFLARED), "tunnel", "--url", f"http://localhost:{BACKEND_PORT}"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    tunnel_url = None
    try:
        for raw in proc.stdout:
            line = raw.rstrip()
            # Mirror important cloudflared lines to console
            if any(k in line for k in ["ERR", "error", "Registered tunnel", "quick Tunnel", "trycloudflare"]):
                print(f"[cloudflared] {line}")
            # Always write full output to log file
            try:
                with open(LOG_FILE, "a", encoding="utf-8") as f:
                    f.write(f"[cloudflared] {line}\n")
            except Exception:
                pass

            if not tunnel_url:
                url = extract_url(line)
                if url:
                    tunnel_url = url
                    apply_all_updates(tunnel_url)

    except KeyboardInterrupt:
        pass
    finally:
        proc.terminate()
        if tunnel_url:
            save_state(tunnel_url, status="stopped")

# ── Entry Point ───────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Smart Cloudflare Quick Tunnel Launcher")
    parser.add_argument("--no-restart", action="store_true",
                        help="Exit when tunnel stops instead of auto-restarting")
    args = parser.parse_args()

    print()
    print("=" * 65)
    print("  HEALTHCARE MONITORING — CLOUDFLARE TUNNEL MANAGER")
    print("  Free | No Account | Auto-Config | Auto-Restart")
    print("=" * 65)
    print()

    delay = 5
    while True:
        try:
            run_cloudflared()
        except KeyboardInterrupt:
            info("Stopped by user.")
            break
        except Exception as e:
            error(f"Unexpected error: {e}")

        if args.no_restart:
            break

        warn(f"Tunnel exited. Restarting in {delay}s... (Ctrl+C to quit)")
        try:
            time.sleep(delay)
        except KeyboardInterrupt:
            info("Stopped by user.")
            break
        delay = min(delay * 2, 60)  # exponential backoff, cap at 60s

if __name__ == "__main__":
    main()
