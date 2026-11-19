import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        reload_dirs=["app"]
    )


'''
cd backend
.\venv\Scripts\Activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

cloudflared tunnel --url http://127.0.0.1:8000
ngrok http 8000 xxxxx
'''