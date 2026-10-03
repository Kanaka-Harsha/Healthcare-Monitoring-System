import logging
import sys

# Ensure UTF-8 output encoding for Windows shells
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from app.db.session import engine, SessionLocal, Base
from app.models import User, Patient, VitalsRecord, DoctorAccessSession, ClinicalNote, Device, AuditLog
from app.core.config import settings
from app.core.security import get_password_hash

logger = logging.getLogger("healthcare.init_db")

def init_db():
    logger.info("Initializing database tables...")
    print("[DB INIT] Connecting to Supabase PostgreSQL and creating schema tables...")
    Base.metadata.create_all(bind=engine)
    print("[DB INIT] Schema tables created successfully.")

    db = SessionLocal()
    try:
        # Check if default admin exists
        admin = db.query(User).filter(User.email == settings.DEFAULT_ADMIN_EMAIL).first()
        if not admin:
            admin = User(
                full_name="System Administrator",
                email=settings.DEFAULT_ADMIN_EMAIL,
                phone=settings.DEFAULT_ADMIN_PHONE,
                role="admin",
                password_hash=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
                is_active=True
            )
            db.add(admin)
            db.commit()
            print(f"[ADMIN] Created default Admin: {settings.DEFAULT_ADMIN_EMAIL} (Password: {settings.DEFAULT_ADMIN_PASSWORD})")
        else:
            print(f"[ADMIN] Admin account already exists: {settings.DEFAULT_ADMIN_EMAIL}")

        # Seed sample demo doctor and collector for rapid verification if none exist
        demo_doctor = db.query(User).filter(User.email == "doctor@healthcare.local").first()
        if not demo_doctor:
            doctor = User(
                full_name="Dr. Sarah Jenkins",
                email="doctor@healthcare.local",
                phone="9876543210",
                role="doctor",
                password_hash=get_password_hash("Doctor@123"),
                is_active=True
            )
            db.add(doctor)
            db.commit()
            print("[DOCTOR] Demo Doctor created: doctor@healthcare.local (Password: Doctor@123)")

        demo_collector = db.query(User).filter(User.email == "collector@healthcare.local").first()
        if not demo_collector:
            collector = User(
                full_name="Alex Turner (Field Collector)",
                email="collector@healthcare.local",
                phone="9123456780",
                role="collector",
                password_hash=get_password_hash("Collector@123"),
                is_active=True
            )
            db.add(collector)
            db.commit()
            print("[COLLECTOR] Demo Field Collector created: collector@healthcare.local (Password: Collector@123)")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
        print(f"[ERROR] Error during database seed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_db()

