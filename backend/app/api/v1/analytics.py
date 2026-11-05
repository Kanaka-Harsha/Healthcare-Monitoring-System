from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, and_

from app.db.session import get_db
from app.models.user import User
from app.models.patient import Patient
from app.models.vitals import VitalsRecord
from app.api.deps import get_current_user

router = APIRouter()

INDIA_STATES_AND_UTS = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
    "Ladakh", "Lakshadweep", "Puducherry",
]

# Current AP district names from the Government of India's IGOD directory (28).
ANDHRA_PRADESH_DISTRICTS = [
    "Alluri Sitharama Raju", "Anakapalli", "Ananthapuramu", "Annamayya",
    "Bapatla", "Chittoor", "Dr. B.R. Ambedkar Konaseema", "East Godavari",
    "Eluru", "Guntur", "Kakinada", "Krishna", "Kurnool", "Markapuram",
    "Nandyal", "NTR", "Palnadu", "Parvathipuram Manyam", "Polavaram",
    "Prakasam", "Sri Potti Sriramulu Nellore", "Sri Sathya Sai", "Srikakulam",
    "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa",
]

@router.get("/locations")
def get_filter_locations(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns unique lists of States, Districts, Cities, and Villages/Towns
    for populating interactive cascading filter dropdowns in the analytics UI.
    """
    # Block Camp Assistant and Volunteer from accessing analytics
    if current_user.role in ["camp_assistant", "volunteer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analytics access is not permitted for this role."
        )

    state_query = db.query(Patient)
    if state and state != "All":
        state_query = state_query.filter(Patient.state.ilike(state.strip()))

    district_query = state_query
    if district and district != "All":
        district_query = district_query.filter(Patient.district.ilike(district.strip()))

    locality_query = district_query
    if city and city != "All":
        locality_query = locality_query.filter(Patient.city.ilike(city.strip()))

    stored_states = [r[0] for r in db.query(Patient.state).distinct().filter(Patient.state.isnot(None)).all() if r[0]]
    districts = [r[0] for r in state_query.with_entities(Patient.district).distinct().filter(Patient.district.isnot(None)).all() if r[0]]
    cities = [r[0] for r in district_query.with_entities(Patient.city).distinct().filter(Patient.city.isnot(None)).all() if r[0]]
    villages = [r[0] for r in locality_query.with_entities(Patient.village_or_town).distinct().filter(Patient.village_or_town.isnot(None)).all() if r[0]]
    problems = [r[0] for r in locality_query.with_entities(Patient.primary_health_issue).distinct().filter(Patient.primary_health_issue.isnot(None)).all() if r[0]]
    if not state or state == "All" or state.strip().casefold() == "andhra pradesh":
        districts.extend(ANDHRA_PRADESH_DISTRICTS)

    return {
        "states": sorted(set(INDIA_STATES_AND_UTS + stored_states), key=str.casefold),
        "districts": sorted(set(districts), key=str.casefold),
        "cities": sorted(set(cities), key=str.casefold),
        "villages": sorted(villages),
        "problems": sorted(problems)
    }

@router.get("/dashboard")
def get_analytics_dashboard(
    time_range: str = Query("30d", description="today, 7d, 30d, 90d, all, custom"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD for custom range"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD for custom range"),
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    village: Optional[str] = Query(None),
    primary_issue: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Core Analytics API Engine with Traffic Light Color Coding (Red / Orange / Green),
    Date Range filtering, and Geographical Hierarchy drill-downs.
    Role-based scoping strictly enforced. Zero PII returned to Higher Authorities.
    """
    # 1. Access Control Check
    if current_user.role in ["camp_assistant", "volunteer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analytics access is not permitted for your role."
        )

    # 2. Compute Date Range Cutoff
    now = datetime.now(timezone.utc)
    from_date = None
    to_date = now

    if time_range == "today":
        from_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif time_range == "7d":
        from_date = now - timedelta(days=7)
    elif time_range == "30d":
        from_date = now - timedelta(days=30)
    elif time_range == "90d":
        from_date = now - timedelta(days=90)
    elif time_range == "custom" and start_date:
        try:
            from_date = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if end_date:
                to_date = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        except Exception:
            from_date = now - timedelta(days=30)

    # 3. Base Query Join
    query = db.query(VitalsRecord).join(Patient, VitalsRecord.patient_id == Patient.id)

    # Scoping for Patient (Only own records)
    if current_user.role == "patient":
        query = query.filter(VitalsRecord.patient_id == current_user.id)

    # Date filter
    if from_date:
        query = query.filter(VitalsRecord.recorded_at >= from_date)
    if to_date:
        query = query.filter(VitalsRecord.recorded_at <= to_date)

    # Geographical Filters
    if state and state.strip() and state != "All":
        query = query.filter(Patient.state.ilike(f"%{state.strip()}%"))
    if district and district.strip() and district != "All":
        query = query.filter(Patient.district.ilike(f"%{district.strip()}%"))
    if city and city.strip() and city != "All":
        query = query.filter(Patient.city.ilike(f"%{city.strip()}%"))
    if village and village.strip() and village != "All":
        query = query.filter(Patient.village_or_town.ilike(f"%{village.strip()}%"))

    # Primary Issue Filter
    if primary_issue and primary_issue.strip() and primary_issue != "All":
        query = query.filter(Patient.primary_health_issue.ilike(f"%{primary_issue.strip()}%"))

    vitals_records = query.all()
    total_screenings = len(vitals_records)

    # 4. Aggregations & Traffic Light Triaging
    green_count = 0
    orange_count = 0
    red_count = 0

    bp_breakdown = {"Normal": 0, "Prehypertension": 0, "Hypertension": 0}
    spo2_breakdown = {"Healthy": 0, "Mild Hypoxia": 0, "Critical": 0}
    sugar_breakdown = {"Normal": 0, "Pre-diabetic": 0, "High / Diabetic": 0}
    hr_breakdown = {"Normal": 0, "Slow (Bradycardia)": 0, "Rapid (Tachycardia)": 0}

    locality_stats: Dict[str, Dict[str, Any]] = {}
    time_series_map: Dict[str, Dict[str, int]] = {}
    age_risk_map: Dict[str, Dict[str, int]] = {
        "0-18": {"Green": 0, "Orange": 0, "Red": 0},
        "19-45": {"Green": 0, "Orange": 0, "Red": 0},
        "46-60": {"Green": 0, "Orange": 0, "Red": 0},
        "60+": {"Green": 0, "Orange": 0, "Red": 0}
    }
    complaints_map: Dict[str, int] = {}

    for v in vitals_records:
        pat: Patient = v.patient
        risk = v.risk_level or pat.risk_category or "Green"

        if risk == "Red":
            red_count += 1
        elif risk == "Orange":
            orange_count += 1
        else:
            green_count += 1

        # Blood Pressure
        sys = v.systolic_bp or 0
        dia = v.diastolic_bp or 0
        if sys > 0 or dia > 0:
            if sys >= 140 or dia >= 90:
                bp_breakdown["Hypertension"] += 1
            elif (120 <= sys < 140) or (80 <= dia < 90):
                bp_breakdown["Prehypertension"] += 1
            else:
                bp_breakdown["Normal"] += 1

        # SpO2
        if v.spo2 is not None and v.spo2 > 0:
            if v.spo2 < 92:
                spo2_breakdown["Critical"] += 1
            elif 92 <= v.spo2 <= 94:
                spo2_breakdown["Mild Hypoxia"] += 1
            else:
                spo2_breakdown["Healthy"] += 1

        # Sugar
        if v.blood_glucose is not None and v.blood_glucose > 0:
            if v.blood_glucose >= 200:
                sugar_breakdown["High / Diabetic"] += 1
            elif 140 <= v.blood_glucose < 200:
                sugar_breakdown["Pre-diabetic"] += 1
            else:
                sugar_breakdown["Normal"] += 1

        # Heart Rate
        if v.heart_rate is not None and v.heart_rate > 0:
            if v.heart_rate < 60:
                hr_breakdown["Slow (Bradycardia)"] += 1
            elif v.heart_rate > 100:
                hr_breakdown["Rapid (Tachycardia)"] += 1
            else:
                hr_breakdown["Normal"] += 1

        # Locality grouping (Village/Town if available, else District, else 'Unknown')
        loc_key = pat.village_or_town or pat.district or pat.city or "General Camp"
        if loc_key not in locality_stats:
            locality_stats[loc_key] = {"locality": loc_key, "total": 0, "green": 0, "orange": 0, "red": 0}
        locality_stats[loc_key]["total"] += 1
        if risk == "Red":
            locality_stats[loc_key]["red"] += 1
        elif risk == "Orange":
            locality_stats[loc_key]["orange"] += 1
        else:
            locality_stats[loc_key]["green"] += 1

        # Time series by day (YYYY-MM-DD)
        day_str = v.recorded_at.strftime("%Y-%m-%d") if v.recorded_at else "Today"
        if day_str not in time_series_map:
            time_series_map[day_str] = {"date": day_str, "Green": 0, "Orange": 0, "Red": 0, "total": 0}
        time_series_map[day_str][risk] = time_series_map[day_str].get(risk, 0) + 1
        time_series_map[day_str]["total"] += 1

        # Age group mapping
        age = pat.age or 30
        age_bracket = "19-45"
        if age <= 18:
            age_bracket = "0-18"
        elif 19 <= age <= 45:
            age_bracket = "19-45"
        elif 46 <= age <= 60:
            age_bracket = "46-60"
        else:
            age_bracket = "60+"
        age_risk_map[age_bracket][risk] = age_risk_map[age_bracket].get(risk, 0) + 1

        # Primary complaint
        issue = pat.primary_health_issue or "General Checkup"
        complaints_map[issue] = complaints_map.get(issue, 0) + 1

    # Format Locality List with percentages and Alert Levels
    locality_list = []
    for loc, data in locality_stats.items():
        tot = data["total"]
        red_pct = round((data["red"] / tot) * 100) if tot > 0 else 0
        orange_pct = round((data["orange"] / tot) * 100) if tot > 0 else 0
        green_pct = round((data["green"] / tot) * 100) if tot > 0 else 0
        alert_level = "High Risk" if red_pct >= 25 else ("Medium Alert" if (red_pct + orange_pct) >= 40 else "Normal")
        locality_list.append({
            "locality": loc,
            "total": tot,
            "green": data["green"],
            "orange": data["orange"],
            "red": data["red"],
            "green_pct": green_pct,
            "orange_pct": orange_pct,
            "red_pct": red_pct,
            "alert_level": alert_level
        })
    locality_list.sort(key=lambda x: x["red_pct"], reverse=True)

    # Sort Time Series Chronologically
    time_series_list = sorted(list(time_series_map.values()), key=lambda x: x["date"])

    # Format Complaints List
    complaints_list = [{"issue": k, "count": v} for k, v in complaints_map.items()]
    complaints_list.sort(key=lambda x: x["count"], reverse=True)

    # Compute Overall Percentages
    green_pct = round((green_count / total_screenings) * 100) if total_screenings > 0 else 0
    orange_pct = round((orange_count / total_screenings) * 100) if total_screenings > 0 else 0
    red_pct = round((red_count / total_screenings) * 100) if total_screenings > 0 else 0

    return {
        "summary": {
            "total_screened": total_screenings,
            "green_count": green_count,
            "green_pct": green_pct,
            "orange_count": orange_count,
            "orange_pct": orange_pct,
            "red_count": red_count,
            "red_pct": red_pct
        },
        "vitals_breakdown": {
            "blood_pressure": bp_breakdown,
            "spo2": spo2_breakdown,
            "blood_glucose": sugar_breakdown,
            "heart_rate": hr_breakdown
        },
        "time_series": time_series_list,
        "localities": locality_list,
        "complaints": complaints_list,
        "age_risk": [
            {"age_bracket": k, "Green": v["Green"], "Orange": v["Orange"], "Red": v["Red"]}
            for k, v in age_risk_map.items()
        ]
    }

