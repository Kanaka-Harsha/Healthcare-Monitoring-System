import os
import re
import uuid
import traceback
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.core.config import settings
from app.core.logger import server_logger
from app.models.user import User
from app.models.patient import Patient
from app.models.report import MedicalReport
from app.schemas.report import MedicalReportOut
from app.api.deps import get_current_user, require_role, log_audit_event

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.abspath(os.path.dirname(__file__)), "..", "..", "..", "uploads", "reports")
os.makedirs(UPLOADS_DIR, exist_ok=True)

def sanitize_filename_part(text: str) -> str:
    """Sanitize strings for safe filesystem naming (e.g. Ramesh Kumar -> Ramesh_Kumar)"""
    cleaned = re.sub(r'[^a-zA-Z0-9_\-]', '_', text.strip())
    return re.sub(r'_+', '_', cleaned).strip('_')

can_upload = require_role(["camp_assistant", "volunteer", "doctor", "admin"])

@router.post("/patient/{patient_id}/upload", response_model=List[MedicalReportOut])
async def upload_patient_reports(
    patient_id: UUID,
    request: Request,
    files: List[UploadFile] = File(...),
    report_types: List[str] = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(can_upload)
):
    """
    Upload multiple medical report files for a patient.
    Each file is named after the patient name and the type of report:
    Formula: <PatientName>_<ReportType>_<Timestamp>.<ext>
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient record not found. Please verify the patient ID."
        )

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select at least one medical report file to upload."
        )

    # Standardize length of report_types to match files
    expanded_types = list(report_types)
    while len(expanded_types) < len(files):
        expanded_types.append("Medical Report")

    clean_patient_name = sanitize_filename_part(patient.full_name) or "Patient"
    saved_reports = []

    for idx, file in enumerate(files):
        try:
            raw_type = expanded_types[idx] if idx < len(expanded_types) else "Medical Report"
            clean_type = sanitize_filename_part(raw_type) or "Report"
            
            # Extract extension safely
            orig_name = file.filename or "document.pdf"
            ext = os.path.splitext(orig_name)[1].lower()
            if not ext:
                ext = ".pdf"

            # Safe standard naming: PatientName_ReportType_YYYYMMDD_HHMMSS_idx.ext
            time_tag = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            stored_name = f"{clean_patient_name}_{clean_type}_{time_tag}_{idx+1}{ext}"
            file_abs_path = os.path.join(UPLOADS_DIR, stored_name)

            # Write file to disk
            contents = await file.read()
            file_size = len(contents)
            with open(file_abs_path, "wb") as f:
                f.write(contents)

            # Record in database
            db_report = MedicalReport(
                patient_id=patient.id,
                uploaded_by_id=current_user.id,
                report_type=raw_type,
                original_filename=orig_name,
                stored_filename=stored_name,
                file_path=os.path.join("reports", stored_name),
                file_size_bytes=file_size,
                mime_type=file.content_type or "application/octet-stream"
            )
            db.add(db_report)
            db.flush()

            saved_reports.append(
                MedicalReportOut(
                    id=db_report.id,
                    patient_id=db_report.patient_id,
                    report_type=db_report.report_type,
                    original_filename=db_report.original_filename,
                    stored_filename=db_report.stored_filename,
                    file_path=db_report.file_path,
                    file_size_bytes=db_report.file_size_bytes,
                    mime_type=db_report.mime_type,
                    created_at=db_report.created_at,
                    uploaded_by_name=current_user.full_name
                )
            )

        except Exception as e:
            server_logger.error(f"[REPORT UPLOAD ERROR] File {file.filename}: {str(e)}\n{traceback.format_exc()}")
            continue

    db.commit()

    log_audit_event(
        db=db,
        action="MEDICAL_REPORTS_UPLOADED",
        user_id=current_user.id,
        resource_type="patient",
        resource_id=str(patient.id),
        details=f"{len(saved_reports)} medical report(s) uploaded for {patient.full_name} by {current_user.full_name}",
        ip_address=request.client.host if request.client else None
    )

    return saved_reports

@router.get("/patient/{patient_id}", response_model=List[MedicalReportOut])
def get_patient_reports(
    patient_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all uploaded reports for a patient.
    Accessible to Doctors, Admins, Camp staff, and the Patient themselves.
    """
    if current_user.role == "patient" and str(current_user.id) != str(patient_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own medical reports."
        )

    records = db.query(MedicalReport).filter(MedicalReport.patient_id == patient_id).order_by(desc(MedicalReport.created_at)).all()
    
    out = []
    for r in records:
        out.append(
            MedicalReportOut(
                id=r.id,
                patient_id=r.patient_id,
                report_type=r.report_type,
                original_filename=r.original_filename,
                stored_filename=r.stored_filename,
                file_path=r.file_path,
                file_size_bytes=r.file_size_bytes,
                mime_type=r.mime_type,
                created_at=r.created_at,
                uploaded_by_name=r.uploaded_by.full_name if r.uploaded_by else "Staff"
            )
        )
    return out

@router.get("/download/{report_id}")
def download_medical_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download a medical report by ID.
    """
    report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested medical report was not found."
        )

    # Patient permission check
    if current_user.role == "patient" and str(current_user.id) != str(report.patient_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to download this report."
        )

    file_abs = os.path.join(UPLOADS_DIR, report.stored_filename)
    if not os.path.exists(file_abs):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The report file could not be located on the server storage."
        )

    return FileResponse(
        path=file_abs,
        filename=report.stored_filename,
        media_type=report.mime_type or "application/octet-stream"
    )

@router.delete("/{report_id}")
def delete_medical_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["doctor", "admin"]))
):
    """
    Delete a report (restricted to Doctors and Admins).
    """
    report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Medical report not found.")

    file_abs = os.path.join(UPLOADS_DIR, report.stored_filename)
    if os.path.exists(file_abs):
        try:
            os.remove(file_abs)
        except Exception as e:
            server_logger.warning(f"Could not remove file {file_abs}: {e}")

    db.delete(report)
    db.commit()

    return {"success": True, "message": "Medical report deleted successfully."}

