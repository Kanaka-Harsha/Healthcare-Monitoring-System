from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.models.user import User
from app.models.patient import Patient
from app.models.vitals import VitalsRecord
from app.models.clinical import ClinicalNote
from app.schemas.doctor import PatientMedicalFileOut, ClinicalNoteOut
from app.schemas.patient import PatientOut
from app.schemas.vitals import VitalsRecordOut
from app.api.deps import get_current_user, require_role

router = APIRouter()

patient_only = require_role(["patient", "admin"])

@router.get("/my-records", response_model=PatientMedicalFileOut)
def get_my_patient_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Allows an authenticated patient to view their own complete medical records, vitals history, and doctor prescriptions.
    """
    # Find patient by matching ID or phone number
    patient = db.query(Patient).filter(
        (Patient.id == current_user.id) | (Patient.phone == current_user.phone)
    ).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found."
        )

    vitals = db.query(VitalsRecord).filter(
        VitalsRecord.patient_id == patient.id
    ).order_by(desc(VitalsRecord.recorded_at)).all()

    notes = db.query(ClinicalNote).filter(
        ClinicalNote.patient_id == patient.id
    ).order_by(desc(ClinicalNote.created_at)).all()

    formatted_clinical = []
    for note in notes:
        formatted_clinical.append(
            ClinicalNoteOut(
                id=note.id,
                patient_id=note.patient_id,
                doctor_id=note.doctor_id,
                doctor_name=note.doctor.full_name if note.doctor else "Medical Staff",
                diagnosis=note.diagnosis,
                prescription=note.prescription,
                clinical_notes=note.clinical_notes,
                prescribed_medicines=note.prescribed_medicines,
                follow_up_date=note.follow_up_date,
                created_at=note.created_at
            )
        )

    return PatientMedicalFileOut(
        patient=PatientOut.model_validate(patient),
        vitals_history=[VitalsRecordOut.model_validate(v) for v in vitals],
        clinical_history=formatted_clinical,
        is_session_unlocked=True
    )
