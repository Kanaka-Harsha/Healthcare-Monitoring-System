import sys
from app.core.logger import db_logger
from app.db.session import engine, SessionLocal, Base
from app.models import User, Patient, VitalsRecord, DoctorAccessSession, ClinicalNote, Device, AuditLog
from app.core.config import settings
from app.core.security import get_password_hash

def init_db():
    db_logger.info("Initializing database tables...")
    db_logger.info("[DB INIT] Connecting to Supabase PostgreSQL and creating schema tables...")
    Base.metadata.create_all(bind=engine)
    db_logger.info("[DB INIT] Schema tables created successfully.")

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
            db_logger.info(f"[ADMIN] Created default Admin: {settings.DEFAULT_ADMIN_EMAIL}")
        else:
            db_logger.info(f"[ADMIN] Admin account already exists: {settings.DEFAULT_ADMIN_EMAIL}")

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
            db_logger.info("[DOCTOR] Demo Doctor created: doctor@healthcare.local")

        demo_collector = db.query(User).filter(User.email == "collector@healthcare.local").first()
        if not demo_collector:
            collector = User(
                full_name="Alex Turner (Healthcamp Assistant)",
                email="collector@healthcare.local",
                phone="9123456780",
                role="collector",
                password_hash=get_password_hash("Collector@123"),
                is_active=True
            )
            db.add(collector)
            db.commit()
            db_logger.info("[COLLECTOR] Demo Field Collector created: collector@healthcare.local")

        demo_registrar = db.query(User).filter(User.email == "registrar@healthcare.local").first()
        if not demo_registrar:
            registrar = User(
                full_name="Elena Vance (User Registration)",
                email="registrar@healthcare.local",
                phone="9000000001",
                role="registrar",
                password_hash=get_password_hash("Registrar@123"),
                is_active=True
            )
            db.add(registrar)
            db.commit()
            db_logger.info("[REGISTRAR] Demo Registrar created: registrar@healthcare.local")

    except Exception as e:
        db.rollback()
        db_logger.error(f"[ERROR] Error during database seed: {e}", exc_info=True)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_db()

