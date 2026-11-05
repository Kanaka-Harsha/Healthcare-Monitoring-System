import sys
from sqlalchemy import text
from app.core.logger import db_logger
from app.db.session import engine, SessionLocal, Base
from app.models import User, Patient, VitalsRecord, DoctorAccessSession, ClinicalNote, Device, AuditLog, MedicalReport
from app.core.config import settings
from app.core.security import get_password_hash

def reset_and_clean_database():
    """
    Purges all stored data and tables for a complete fresh start.
    """
    db_logger.info("[DB RESET] Starting clean database purge for fresh start...")
    try:
        with engine.connect() as conn:
            # Drop tables with CASCADE in PostgreSQL
            conn.execute(text("DROP TABLE IF EXISTS medical_reports CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS vitals_records CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS clinical_notes CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS doctor_access_sessions CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS devices CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS audit_logs CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS patients CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
            conn.commit()
            db_logger.info("[DB RESET] All legacy tables dropped successfully.")
    except Exception as e:
        db_logger.warning(f"[DB RESET] Drop tables warning: {e}")

    # Re-create all tables cleanly
    Base.metadata.create_all(bind=engine)
    db_logger.info("[DB RESET] Fresh tables created with new schema.")

def init_db(reset: bool = False):
    db_logger.info("Initializing database...")
    if reset:
        reset_and_clean_database()
    else:
        # Create any missing tables
        Base.metadata.create_all(bind=engine)
        
        # Auto-migrate columns if tables already exist
        try:
            with engine.connect() as conn:
                # Users migrations
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);"))
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users(username);"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS jurisdiction_level VARCHAR(50);"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS jurisdiction_state VARCHAR(100);"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS jurisdiction_district VARCHAR(100);"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS jurisdiction_block VARCHAR(100);"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS jurisdiction_village VARCHAR(100);"))
                
                # Patients migrations
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS house_number VARCHAR(100);"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS village_or_town VARCHAR(150);"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS city VARCHAR(150);"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS district VARCHAR(150);"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS state VARCHAR(150);"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS primary_health_issue VARCHAR(150);"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS health_issues_list JSON;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS risk_category VARCHAR(20) DEFAULT 'Green';"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_scanned BOOLEAN DEFAULT TRUE;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS registered_by_id UUID REFERENCES users(id) ON DELETE SET NULL;"))

                # Vitals migrations
                conn.execute(text("ALTER TABLE vitals_records ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'Green';"))
                conn.commit()
        except Exception as me:
            db_logger.warning(f"[DB MIGRATION] Migration notice: {me}")

    db = SessionLocal()
    try:
        # 1. Seed App Admin (Username & Password)
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                full_name="App Administrator",
                email="admin@healthcare.local",
                phone="9999999999",
                role="admin",
                password_hash=get_password_hash("Admin@Healthcare2026"),
                is_active=True
            )
            db.add(admin)
            db.commit()
            db_logger.info("[ADMIN] Fresh App Admin created: username=admin")
        
        # 2. Seed Demo Doctor
        demo_doctor = db.query(User).filter(User.username == "dr_sarah").first()
        if not demo_doctor:
            doctor = User(
                username="dr_sarah",
                full_name="Dr. Sarah Jenkins (Cardiologist)",
                email="doctor@healthcare.local",
                phone="9876543210",
                role="doctor",
                password_hash=get_password_hash("Doctor@123"),
                is_active=True
            )
            db.add(doctor)
            db.commit()
            db_logger.info("[DOCTOR] Fresh Doctor created: username=dr_sarah")

        # 3. Seed Demo Assistant/Camp
        demo_assistant = db.query(User).filter(User.username == "assistant_alex").first()
        if not demo_assistant:
            assistant = User(
                username="assistant_alex",
                full_name="Alex Turner (Assistant/Camp)",
                email="assistant@healthcare.local",
                phone="9123456780",
                role="camp_assistant",
                password_hash=get_password_hash("Assistant@123"),
                is_active=True
            )
            db.add(assistant)
            db.commit()
            db_logger.info("[ASSISTANT] Fresh Assistant/Camp created: username=assistant_alex")
        else:
            demo_assistant.full_name = "Alex Turner (Assistant/Camp)"
            db.commit()

        # 4. Seed Demo Volunteer (Village Level)
        demo_volunteer = db.query(User).filter(User.username == "volunteer_maya").first()
        if not demo_volunteer:
            volunteer = User(
                username="volunteer_maya",
                full_name="Maya Devi (Village Volunteer)",
                email="volunteer@healthcare.local",
                phone="9000000001",
                role="volunteer",
                password_hash=get_password_hash("Volunteer@123"),
                is_active=True
            )
            db.add(volunteer)
            db.commit()
            db_logger.info("[VOLUNTEER] Fresh Volunteer created: username=volunteer_maya")

        # 5. Seed Demo Higher Authority (District Collector)
        demo_authority = db.query(User).filter(User.username == "collector_rao").first()
        if not demo_authority:
            authority = User(
                username="collector_rao",
                full_name="Dr. K. S. Rao, IAS (District Collector)",
                email="collector@healthcare.local",
                phone="9111111111",
                role="higher_authority",
                jurisdiction_level="district",
                jurisdiction_state="Andhra Pradesh",
                jurisdiction_district="Visakhapatnam",
                password_hash=get_password_hash("Authority@123"),
                is_active=True
            )
            db.add(authority)
            db.commit()
            db_logger.info("[AUTHORITY] Fresh Higher Authority created: username=collector_rao")
        else:
            demo_authority.jurisdiction_state = "Andhra Pradesh"
            demo_authority.jurisdiction_district = "Visakhapatnam"
            db.commit()

    except Exception as e:
        db.rollback()
        db_logger.error(f"[ERROR] Error during database initialization: {e}", exc_info=True)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    reset_flag = "--reset" in sys.argv
    init_db(reset=reset_flag)
