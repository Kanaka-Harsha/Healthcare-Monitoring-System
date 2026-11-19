import sys
from sqlalchemy import text
from app.core.logger import db_logger
from app.db.session import engine, SessionLocal, Base
from app.models import User, Patient, VitalsRecord, DoctorAccessSession, ClinicalNote, Device, AuditLog, MedicalReport
from app.core.config import settings
from app.core.security import get_password_hash, verify_password

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
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS jurisdiction_phc VARCHAR(150);"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS jurisdiction_village VARCHAR(100);"))
                
                # Patients migrations
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS house_number VARCHAR(100);"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS village_or_town VARCHAR(150);"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS city VARCHAR(150);"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS mandal VARCHAR(150);"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS phc_name VARCHAR(150);"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS age_months INTEGER;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS age_days INTEGER;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS date_of_birth DATE;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS health_issue_categories JSON;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS health_assessed BOOLEAN;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_pregnant BOOLEAN;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS pregnancy_month INTEGER;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS pregnancy_issues JSON;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS anc_visit_count INTEGER;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS vaccination_status VARCHAR(40);"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS vaccination_records JSON;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS antenatal_care JSON;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS newborn_details JSON;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS weight_kg FLOAT;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS height_cm FLOAT;"))
                conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS growth_issues JSON;"))
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
                password_hash=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
                is_active=True
            )
            db.add(admin)
            db.commit()
            db_logger.info("[ADMIN] Real App Admin created: username=admin")
        else:
            # Upgrade only the former seeded password; preserve any password the real admin chose later.
            if not admin.password_hash or verify_password("Admin@Healthcare2026", admin.password_hash):
                admin.password_hash = get_password_hash(settings.DEFAULT_ADMIN_PASSWORD)
                db.commit()

        def ensure_test_account(old_username, username, full_name, email, phone, role, password, **scope):
            account = db.query(User).filter(User.username == username).first()
            legacy = db.query(User).filter(User.username == old_username).first() if old_username != username else None
            migrated_legacy = account is None and legacy is not None
            if account is None:
                account = legacy or User()
                db.add(account)
            elif legacy is not None and legacy.id != account.id:
                # Keep any duplicate former demo login visibly marked as a test account.
                legacy_name = f"{old_username}_test_legacy"
                if db.query(User).filter(User.username == legacy_name).first():
                    legacy_name = f"{old_username}_test_legacy_{str(legacy.id)[:8]}"
                legacy.username = legacy_name
                legacy.password_hash = get_password_hash(legacy_name)
                legacy.full_name = f"Test legacy account - {legacy.full_name}"

            account.username = username
            account.full_name = full_name
            account.email = email
            account.phone = phone
            account.role = role
            account.is_active = True
            if migrated_legacy or account.password_hash is None:
                account.password_hash = get_password_hash(password)
            for key, value in scope.items():
                setattr(account, key, value)
            db.commit()
            # Never include passwords in logs.
            db_logger.info(f"[TEST ACCOUNT] Ready: username={username}")

        ensure_test_account("dr_sarah", "testdoctor", "Test Doctor", "testdoctor@healthcare.local", "9876543210", "doctor", "testdoctor")
        ensure_test_account("assistant_alex", "testassistant", "Test Assistant/Camp", "testassistant@healthcare.local", "9123456780", "camp_assistant", "testassistant")
        ensure_test_account("volunteer_maya", "testvolunteer", "Test Volunteer", "testvolunteer@healthcare.local", "9000000001", "volunteer", "testvolunteer")
        ensure_test_account(
            "collector_rao", "testauthority", "Test District Authority", "testauthority@healthcare.local", "9111111111",
            "higher_authority", "testauthority", jurisdiction_level="district",
            jurisdiction_state="Andhra Pradesh", jurisdiction_district="Visakhapatnam"
        )

    except Exception as e:
        db.rollback()
        db_logger.error(f"[ERROR] Error during database initialization: {e}", exc_info=True)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    reset_flag = "--reset" in sys.argv
    init_db(reset=reset_flag)
