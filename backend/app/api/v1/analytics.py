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
from app.core.analytics_utils import age_group_for_patient, age_in_days, patient_issue_names, health_assessment_recorded, privacy_count, privacy_partition

router = APIRouter()

SUPPORTED_STATES = ["Andhra Pradesh"]

# Current AP district names from the Government of India's IGOD directory (28).
ANDHRA_PRADESH_DISTRICTS = [
    "Alluri Sitharama Raju", "Anakapalli", "Ananthapuramu", "Annamayya",
    "Bapatla", "Chittoor", "Dr. B.R. Ambedkar Konaseema", "East Godavari",
    "Eluru", "Guntur", "Kakinada", "Krishna", "Kurnool", "Markapuram",
    "Nandyal", "NTR", "Palnadu", "Parvathipuram Manyam", "Polavaram",
    "Prakasam", "Sri Potti Sriramulu Nellore", "Sri Sathya Sai", "Srikakulam",
    "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa",
]

def apply_authority_scope(query, current_user: User):
    """Keep higher-authority analytics inside the account's assigned area."""
    if current_user.role != "higher_authority":
        return query
    level = (current_user.jurisdiction_level or ("district" if current_user.jurisdiction_district else "state" if current_user.jurisdiction_state else "")).strip().lower()
    if level in {"phc", "primary_health_centre", "primary_health_center"}:
        if not (current_user.jurisdiction_state and current_user.jurisdiction_district and (current_user.jurisdiction_phc or current_user.jurisdiction_village)):
            return query.filter(Patient.id.is_(None))
        if current_user.jurisdiction_state:
            query = query.filter(Patient.state.ilike(current_user.jurisdiction_state.strip()))
        if current_user.jurisdiction_district:
            query = query.filter(Patient.district.ilike(current_user.jurisdiction_district.strip()))
        if current_user.jurisdiction_block:
            query = query.filter(Patient.mandal.ilike(current_user.jurisdiction_block.strip()))
        if current_user.jurisdiction_phc:
            query = query.filter(Patient.phc_name.ilike(current_user.jurisdiction_phc.strip()))
        elif current_user.jurisdiction_village:
            query = query.filter(Patient.village_or_town.ilike(current_user.jurisdiction_village.strip()))
        else:
            query = query.filter(Patient.id.is_(None))
    elif level in {"village", "ward"}:
        if not (current_user.jurisdiction_state and current_user.jurisdiction_district and current_user.jurisdiction_village):
            return query.filter(Patient.id.is_(None))
        if current_user.jurisdiction_state:
            query = query.filter(Patient.state.ilike(current_user.jurisdiction_state.strip()))
        if current_user.jurisdiction_district:
            query = query.filter(Patient.district.ilike(current_user.jurisdiction_district.strip()))
        if current_user.jurisdiction_block:
            query = query.filter(Patient.mandal.ilike(current_user.jurisdiction_block.strip()))
        if current_user.jurisdiction_village:
            query = query.filter(Patient.village_or_town.ilike(current_user.jurisdiction_village.strip()))
        else:
            query = query.filter(Patient.id.is_(None))
    elif level in {"mandal", "block", "town", "city"}:
        if not (current_user.jurisdiction_state and current_user.jurisdiction_district and current_user.jurisdiction_block):
            return query.filter(Patient.id.is_(None))
        if current_user.jurisdiction_state:
            query = query.filter(Patient.state.ilike(current_user.jurisdiction_state.strip()))
        if current_user.jurisdiction_district:
            query = query.filter(Patient.district.ilike(current_user.jurisdiction_district.strip()))
        if current_user.jurisdiction_block:
            query = query.filter(Patient.mandal.ilike(current_user.jurisdiction_block.strip()))
        else:
            query = query.filter(Patient.id.is_(None))
    elif level in {"district", "collector", "dhmo"}:
        if not (current_user.jurisdiction_state and current_user.jurisdiction_district):
            return query.filter(Patient.id.is_(None))
        if current_user.jurisdiction_state:
            query = query.filter(Patient.state.ilike(current_user.jurisdiction_state.strip()))
        if current_user.jurisdiction_district:
            query = query.filter(Patient.district.ilike(current_user.jurisdiction_district.strip()))
        else:
            query = query.filter(Patient.id.is_(None))
    elif level == "state":
        if current_user.jurisdiction_state:
            query = query.filter(Patient.state.ilike(current_user.jurisdiction_state.strip()))
        else:
            query = query.filter(Patient.id.is_(None))
    elif level not in {"national", "country"}:
        query = query.filter(Patient.id.is_(None))
    return query


def add_requested_location_filters(query, state=None, district=None, city=None, village=None, mandal=None, phc=None):
    if state and state.strip() and state != "All": query = query.filter(Patient.state.ilike(f"%{state.strip()}%"))
    if district and district.strip() and district != "All": query = query.filter(Patient.district.ilike(f"%{district.strip()}%"))
    if city and city.strip() and city != "All": query = query.filter(Patient.city.ilike(f"%{city.strip()}%"))
    if village and village.strip() and village != "All": query = query.filter(Patient.village_or_town.ilike(f"%{village.strip()}%"))
    if mandal and mandal.strip() and mandal != "All": query = query.filter(Patient.mandal.ilike(f"%{mandal.strip()}%"))
    if phc and phc.strip() and phc != "All": query = query.filter(Patient.phc_name.ilike(f"%{phc.strip()}%"))
    return query


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
    if current_user.role in ["camp_assistant", "volunteer", "patient"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analytics access is not permitted for this role."
        )

    state_query = apply_authority_scope(db.query(Patient), current_user).filter(Patient.state.ilike("Andhra Pradesh"))
    if state and state != "All":
        state_query = state_query.filter(Patient.state.ilike(state.strip()))

    district_query = state_query
    if district and district != "All":
        district_query = district_query.filter(Patient.district.ilike(district.strip()))

    locality_query = district_query
    if city and city != "All":
        locality_query = locality_query.filter(Patient.city.ilike(city.strip()))

    stored_states = [r[0] for r in state_query.with_entities(Patient.state).distinct().filter(Patient.state.isnot(None)).all() if r[0]]
    districts = [r[0] for r in state_query.with_entities(Patient.district).distinct().filter(Patient.district.isnot(None)).all() if r[0]]
    cities = [r[0] for r in district_query.with_entities(Patient.city).distinct().filter(Patient.city.isnot(None)).all() if r[0]]
    villages = [r[0] for r in locality_query.with_entities(Patient.village_or_town).distinct().filter(Patient.village_or_town.isnot(None)).all() if r[0]]
    mandals = [r[0] for r in district_query.with_entities(Patient.mandal).distinct().filter(Patient.mandal.isnot(None)).all() if r[0]]
    phcs = [r[0] for r in locality_query.with_entities(Patient.phc_name).distinct().filter(Patient.phc_name.isnot(None)).all() if r[0]]
    problems = sorted({name for person in locality_query.all() for name in patient_issue_names(person)}, key=str.casefold)
    user_level = (current_user.jurisdiction_level or "").strip().lower()
    can_list_all_ap_districts = current_user.role != "higher_authority" or user_level in {"state", "national", "country"}
    if can_list_all_ap_districts and (not state or state == "All" or state.strip().casefold() == "andhra pradesh"):
        districts.extend(ANDHRA_PRADESH_DISTRICTS)

    return {
        "states": SUPPORTED_STATES,
        "districts": sorted(set(districts), key=str.casefold),
        "cities": sorted(set(cities), key=str.casefold),
        "villages": sorted(villages),
        "mandals": sorted(set(mandals), key=str.casefold),
        "phcs": sorted(set(phcs), key=str.casefold),
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
    gender: Optional[str] = Query(None),
    mandal: Optional[str] = Query(None),
    phc: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Core Analytics API Engine with Traffic Light Color Coding (Red / Orange / Green),
    Date Range filtering, and Geographical Hierarchy drill-downs.
    Role-based scoping strictly enforced. Zero PII returned to Higher Authorities.
    """
    # 1. Access Control Check
    if current_user.role in ["camp_assistant", "volunteer", "patient"]:
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

    # The dashboard cohort includes anyone registered in the period or screened
    # in the period. A repeat visit never increases the people count.
    people_query = apply_authority_scope(db.query(Patient), current_user).filter(Patient.state.ilike("Andhra Pradesh"))
    people_query = add_requested_location_filters(people_query, state, district, city, village, mandal, phc)
    if current_user.role == "patient":
        people_query = people_query.filter(Patient.id == current_user.id)
    if gender and gender.strip().casefold() in {"male", "female", "other"}:
        people_query = people_query.filter(Patient.gender.ilike(gender.strip()))
    if from_date:
        period_screened_ids = db.query(VitalsRecord.patient_id).filter(VitalsRecord.recorded_at >= from_date)
        if to_date:
            period_screened_ids = period_screened_ids.filter(VitalsRecord.recorded_at <= to_date)
        people_query = people_query.filter(or_(Patient.created_at >= from_date, Patient.id.in_(period_screened_ids)))
    if to_date:
        people_query = people_query.filter(or_(Patient.created_at <= to_date, Patient.id.in_(period_screened_ids) if from_date else Patient.created_at <= to_date))
    patients = people_query.all()
    if primary_issue and primary_issue.strip() and primary_issue != "All":
        issue_key = primary_issue.strip().casefold()
        patients = [p for p in patients if any(issue_key in name.casefold() for name in patient_issue_names(p))]
    patient_ids = {p.id for p in patients}

    # Screenings are visits; population metrics below use distinct patient IDs.
    query = db.query(VitalsRecord).filter(VitalsRecord.patient_id.in_(patient_ids))
    if from_date:
        query = query.filter(VitalsRecord.recorded_at >= from_date)
    if to_date:
        query = query.filter(VitalsRecord.recorded_at <= to_date)

    vitals_records = query.all()
    total_screenings = len(vitals_records)

    # 4. Aggregations & Traffic Light Triaging
    green_count = 0
    orange_count = 0
    red_count = 0

    bp_breakdown = {"Normal range": 0, "Raised reading": 0, "High reading": 0}
    spo2_breakdown = {"Healthy": 0, "Mild Hypoxia": 0, "Critical": 0}
    sugar_breakdown = {"Normal range": 0, "Raised reading": 0, "High reading": 0}
    hr_breakdown = {"Normal": 0, "Slow (Bradycardia)": 0, "Rapid (Tachycardia)": 0}

    locality_stats: Dict[str, Dict[str, Any]] = {}
    time_series_map: Dict[str, Dict[str, int]] = {}
    time_series_people: Dict[str, set] = {}
    measured_people = {"blood_pressure": set(), "spo2": set(), "blood_glucose": set(), "heart_rate": set()}
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
            measured_people["blood_pressure"].add(pat.id)
            if sys >= 140 or dia >= 90:
                bp_breakdown["High reading"] += 1
            elif (120 <= sys < 140) or (80 <= dia < 90):
                bp_breakdown["Raised reading"] += 1
            else:
                bp_breakdown["Normal range"] += 1

        # SpO2
        if v.spo2 is not None and v.spo2 > 0:
            measured_people["spo2"].add(pat.id)
            if v.spo2 < 92:
                spo2_breakdown["Critical"] += 1
            elif 92 <= v.spo2 <= 94:
                spo2_breakdown["Mild Hypoxia"] += 1
            else:
                spo2_breakdown["Healthy"] += 1

        # Sugar
        if v.blood_glucose is not None and v.blood_glucose > 0:
            measured_people["blood_glucose"].add(pat.id)
            if v.blood_glucose >= 200:
                sugar_breakdown["High reading"] += 1
            elif 140 <= v.blood_glucose < 200:
                sugar_breakdown["Raised reading"] += 1
            else:
                sugar_breakdown["Normal range"] += 1

        # Heart Rate
        if v.heart_rate is not None and v.heart_rate > 0:
            measured_people["heart_rate"].add(pat.id)
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
        day_str = v.recorded_at.strftime("%Y-%m") if v.recorded_at else "Unknown month"
        if day_str not in time_series_map:
            time_series_map[day_str] = {"date": day_str, "Green": 0, "Orange": 0, "Red": 0, "total": 0}
            time_series_people[day_str] = set()
        time_series_people[day_str].add(pat.id)
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
        masked_risks = privacy_partition({"green": data["green"], "orange": data["orange"], "red": data["red"]})
        if 0 < tot < 5:
            locality_list.append({"locality": loc, "total": None, "green": None, "orange": None, "red": None,
                                  "green_pct": None, "orange_pct": None, "red_pct": None,
                                  "alert_level": "Hidden for privacy"})
            continue
        red_pct = round((data["red"] / tot) * 100) if tot > 0 else 0
        orange_pct = round((data["orange"] / tot) * 100) if tot > 0 else 0
        green_pct = round((data["green"] / tot) * 100) if tot > 0 else 0
        alert_level = "High Risk" if red_pct >= 25 else ("Medium Alert" if (red_pct + orange_pct) >= 40 else "Normal")
        risk_suppressed = any(value is None for value in masked_risks.values())
        locality_list.append({
            "locality": loc,
            "total": tot,
            "green": masked_risks["green"],
            "orange": masked_risks["orange"],
            "red": masked_risks["red"],
            "green_pct": green_pct if not risk_suppressed else None,
            "orange_pct": orange_pct if not risk_suppressed else None,
            "red_pct": red_pct if not risk_suppressed else None,
            "alert_level": alert_level if not risk_suppressed else "Not enough records"
        })
    locality_list.sort(key=lambda x: (x["red_pct"] is not None, x["red_pct"] or 0), reverse=True)

    # Sort Time Series Chronologically
    time_series_list = sorted(list(time_series_map.values()), key=lambda x: x["date"])
    for item in time_series_list:
        item["unique_people"] = privacy_count(len(time_series_people[item["date"]]))
        item["total"] = privacy_count(item["total"])
        item.update(privacy_partition({key: item[key] for key in ("Green", "Orange", "Red")}))

    # Format Complaints List
    complaints_list = [{"issue": k, "count": v} for k, v in complaints_map.items()]
    complaints_list = [row for row in complaints_list if row["count"] == 0 or row["count"] >= 5]
    complaints_list.sort(key=lambda x: x["count"], reverse=True)

    # Compute Overall Percentages
    green_pct = round((green_count / total_screenings) * 100) if total_screenings > 0 else 0
    orange_pct = round((orange_count / total_screenings) * 100) if total_screenings > 0 else 0
    red_pct = round((red_count / total_screenings) * 100) if total_screenings > 0 else 0
    def safe_breakdown(values):
        return privacy_partition(values)

    # Patient-level metrics are distinct people. Keep screening visits as their
    # own measure so repeat visits never inflate population counts.
    from datetime import date
    as_of = date.today()
    screened_ids = {v.patient_id for v in vitals_records}
    ages = {p.id: age_in_days(p, as_of) for p in patients}
    age_groups = {p.id: age_group_for_patient(p, as_of) for p in patients}
    adult_ids = {p.id for p in patients if age_groups[p.id].startswith("Adult") or age_groups[p.id].startswith("Older adult")}
    under_six_ids = {p.id for p in patients if age_groups[p.id] in {"Baby (29 days–under 1 year)", "Child (1–5 years)"}}
    women = [p for p in patients if (p.gender or "").strip().casefold() == "female" and p.id in adult_ids]
    men = [p for p in patients if (p.gender or "").strip().casefold() == "male" and p.id in adult_ids]
    pregnant = [p for p in patients if (p.gender or "").strip().casefold() == "female" and p.is_pregnant is True]
    children_under_six = [p for p in patients if p.id in under_six_ids]
    newborns = [p for p in patients if age_groups[p.id] == "Newborn (0–28 days)"]
    babies_under_one = [p for p in patients if age_groups[p.id] == "Baby (29 days–under 1 year)"]
    group_members = {
        "Men 18+": men,
        "Women 18+": women,
        "Newborns (0–28 days)": newborns,
        "Babies (29 days–under 1 year)": babies_under_one,
        "Children (1–5 years)": [p for p in patients if age_groups[p.id] == "Child (1–5 years)"],
        "Children (6–9 years)": [p for p in patients if age_groups[p.id] == "Child (6–9 years)"],
        "Children (10–13 years)": [p for p in patients if age_groups[p.id] == "Child (10–13 years)"],
        "Children (14–17 years)": [p for p in patients if age_groups[p.id] == "Child (14–17 years)"],
        "Pregnant women": pregnant,
        "Other adults 18+": [p for p in patients if p.id in adult_ids and (p.gender or "").strip().casefold() not in {"male", "female"}],
    }
    age_order = ["Newborn (0–28 days)", "Baby (29 days–under 1 year)", "Child (1–5 years)", "Child (6–9 years)", "Child (10–13 years)", "Child (14–17 years)", "Adult (18–29 years)", "Adult (30–44 years)", "Adult (45–59 years)", "Older adult (60+ years)", "Age not recorded"]
    age_counts_raw = {label: sum(1 for p in patients if age_groups[p.id] == label) for label in age_order}
    age_counts = privacy_partition(age_counts_raw)

    def list_values(value):
        return value if isinstance(value, (list, tuple, set)) else []

    def distinct_issues(members, pregnancy=False, baby=False):
        counts = {}
        assessed_ids = set()
        for person in members:
            assessed_marker = health_assessment_recorded(person)
            if pregnancy and (person.pregnancy_issues is not None or person.antenatal_care is not None):
                assessed_marker = True
            if baby and (person.growth_issues is not None or person.newborn_details is not None):
                assessed_marker = True
            if assessed_marker:
                assessed_ids.add(person.id)
            values = set(patient_issue_names(person))
            if pregnancy:
                values.update(str(x).strip() for x in list_values(person.pregnancy_issues) if str(x).strip())
            if baby:
                values.update(str(x).strip() for x in list_values(person.growth_issues) if str(x).strip())
                details = person.newborn_details or {}
                values.update(str(x).strip() for x in list_values(details.get("feeding_concerns")) if str(x).strip())
                values.update(str(x).strip() for x in list_values(details.get("newborn_concerns")) if str(x).strip())
            if values:
                assessed_ids.add(person.id)
            for issue_name in values:
                if issue_name.casefold() not in {"none", "none known", "not recorded", "other"}:
                    counts[issue_name] = counts.get(issue_name, 0) + 1
        assessed = len(assessed_ids)
        results = []
        for name, count in sorted(counts.items(), key=lambda entry: (-entry[1], entry[0].casefold())):
            suppressed = count < 5 or (assessed > 0 and assessed < 5)
            results.append({"name": name, "count": None if suppressed else count,
                            "percent_of_assessed": None if suppressed or not assessed else round(count / assessed * 100, 1),
                            "suppressed": suppressed})
        return assessed, results

    issue_groups = []
    for group_name, members in group_members.items():
        is_pregnancy = group_name == "Pregnant women"
        is_baby = group_name.startswith("Newborn") or group_name.startswith("Babies") or group_name.startswith("Children (1–5")
        assessed, issues = distinct_issues(members, pregnancy=is_pregnancy, baby=is_baby)
        count = len(members)
        hidden_group = 0 < count < 5
        issue_groups.append({"name": group_name, "people": privacy_count(count),
                             "assessed": privacy_count(assessed) if not hidden_group else None,
                             "issues": [] if hidden_group else issues,
                             "suppressed": hidden_group})
    overall_assessed, overall_issues = distinct_issues(patients)
    pregnancy_assessed, pregnancy_issues = distinct_issues(pregnant, pregnancy=True)
    babies_for_health = newborns + babies_under_one
    babies_assessed, baby_issues = distinct_issues(babies_for_health, baby=True)

    # Small groups and issue counts are hidden to protect people's privacy.
    women_count = len(women)
    men_count = len(men)
    care_vaccine_children = [p for p in patients if p.id in under_six_ids or p in newborns]
    vaccination = {"up_to_date": 0, "some_missed": 0, "overdue": 0, "dose_recorded": 0, "not_recorded": 0}
    vaccination_dose_counts: Dict[str, Dict[str, int]] = {}
    for person in care_vaccine_children:
        statuses = [str(row.get("status", "")).casefold() for row in list_values(person.vaccination_records) if isinstance(row, dict)]
        if "overdue" in statuses or person.vaccination_status == "overdue":
            status_key = "overdue"
        elif "missed" in statuses or "some_missed" in statuses or person.vaccination_status == "some_missed":
            status_key = "some_missed"
        elif person.vaccination_status == "up_to_date":
            status_key = "up_to_date"
        elif statuses:
            status_key = "dose_recorded"
        else:
            status_key = "not_recorded"
        vaccination[status_key] += 1
        person_doses = {}
        status_priority = {"given": 1, "missed": 2, "overdue": 3}
        for row in list_values(person.vaccination_records):
            if not isinstance(row, dict) or not row.get("name"):
                continue
            dose_name = " ".join(str(row["name"]).split())
            dose_status = str(row.get("status", "")).casefold()
            if dose_status not in status_priority:
                continue
            existing_status = person_doses.get(dose_name.casefold())
            if existing_status is None or status_priority[dose_status] > status_priority[existing_status[1]]:
                person_doses[dose_name.casefold()] = (dose_name, dose_status)
        for dose_key, (dose_display_name, dose_status) in person_doses.items():
            if dose_key not in vaccination_dose_counts:
                vaccination_dose_counts[dose_key] = {"name": dose_display_name, "given": 0, "missed": 0, "overdue": 0}
            vaccination_dose_counts[dose_key][dose_status] += 1
    vaccination = privacy_partition(vaccination)
    vaccination_by_dose = []
    for dose_key, counts in vaccination_dose_counts.items():
        hidden_counts = privacy_partition({key: counts[key] for key in ("given", "missed", "overdue")})
        if any(value is None for value in hidden_counts.values()):
            continue
        vaccination_by_dose.append({"name": counts["name"], **hidden_counts})
    vaccination_by_dose.sort(key=lambda row: row["name"].casefold())

    baby_month_ranges = {"0-5 months": 0, "6-11 months": 0, "1-5 years": 0, "Not recorded": 0}
    for person in newborns + children_under_six:
        day_count = ages[person.id]
        if day_count is None:
            key = "Not recorded"
        elif day_count < 183:
            key = "0-5 months"
        elif day_count < 365:
            key = "6-11 months"
        else:
            key = "1-5 years"
        baby_month_ranges[key] += 1
    baby_month_ranges = privacy_partition(baby_month_ranges)

    month_ranges = {"1-3": 0, "4-6": 0, "7-9": 0, "Not recorded": 0}
    for person in pregnant:
        month = person.pregnancy_month
        key = "1-3" if month and month <= 3 else ("4-6" if month and month <= 6 else ("7-9" if month and month <= 9 else "Not recorded"))
        month_ranges[key] += 1
    month_ranges = privacy_partition(month_ranges)
    pregnancy_visit_stats = {
        "people_with_visits_recorded": privacy_count(sum(1 for person in pregnant if person.anc_visit_count is not None)),
        "visits_total": privacy_count(sum(person.anc_visit_count or 0 for person in pregnant)),
    }

    antenatal_metrics = {}
    for field in ("blood_pressure", "haemoglobin", "blood_sugar", "urine_test", "td_vaccine", "iron_calcium"):
        recorded_done = sum(1 for person in pregnant if isinstance(person.antenatal_care, dict) and person.antenatal_care.get(field) is True)
        recorded_not_done = sum(1 for person in pregnant if isinstance(person.antenatal_care, dict) and person.antenatal_care.get(field) is False)
        antenatal_metrics[field] = privacy_partition({"done": recorded_done, "not_done": recorded_not_done,
                                    "not_recorded": max(0, len(pregnant) - recorded_done - recorded_not_done)})

    newborn_metrics = {
        "birth_weight_recorded": privacy_count(sum(1 for p in newborns if (p.newborn_details or {}).get("birth_weight_kg") is not None or p.weight_kg is not None)),
        "feeding_concerns_recorded": privacy_count(sum(1 for p in newborns if (p.newborn_details or {}).get("feeding_concerns"))),
        "newborn_check_recorded": privacy_count(sum(1 for p in newborns if (p.newborn_details or {}).get("newborn_check_done") is True)),
        "home_visits_recorded": privacy_count(sum(1 for p in newborns if (p.newborn_details or {}).get("home_visit_count") is not None)),
        "birth_vaccines_given": sum(1 for p in newborns if (p.newborn_details or {}).get("birth_vaccines_status") == "given"),
        "birth_vaccines_missed": sum(1 for p in newborns if (p.newborn_details or {}).get("birth_vaccines_status") == "missed"),
        "birth_vaccines_not_recorded": sum(1 for p in newborns if not (p.newborn_details or {}).get("birth_vaccines_status")),
    }
    newborn_metrics.update(privacy_partition({key: newborn_metrics[key] for key in ("birth_vaccines_given", "birth_vaccines_missed", "birth_vaccines_not_recorded")}))
    newborn_age_ranges = {
        "0-6 days": sum(1 for p in newborns if ages[p.id] is not None and ages[p.id] <= 6),
        "7-28 days": sum(1 for p in newborns if ages[p.id] is not None and 7 <= ages[p.id] <= 28),
    }
    newborn_age_ranges = privacy_partition(newborn_age_ranges)

    safe_age_risk = []
    for bracket, values in age_risk_map.items():
        safe_values = privacy_partition(values)
        safe_age_risk.append({"age_bracket": bracket, **safe_values})

    return {
        "people": {
            "total": privacy_count(len(patients)),
            "screened": privacy_count(len(screened_ids)),
            "screening_visits": privacy_count(total_screenings),
            "men_18_plus": privacy_count(men_count),
            "women_18_plus": privacy_count(women_count),
            "children_6_17": privacy_count(sum(1 for p in patients if age_groups[p.id] in {"Child (6–9 years)", "Child (10–13 years)", "Child (14–17 years)"})),
            "children_under_6": privacy_count(len(children_under_six)),
            "newborns": privacy_count(len(newborns)),
            "babies_under_1": privacy_count(len(babies_under_one)),
            "pregnant": privacy_count(len(pregnant)),
            "pregnancy_month_ranges": month_ranges,
            "pregnancy_visit_stats": pregnancy_visit_stats,
            "newborn_age_ranges": newborn_age_ranges,
            "baby_month_ranges": baby_month_ranges,
            "vaccination": vaccination,
            "vaccination_by_dose": vaccination_by_dose,
            "age_counts": age_counts,
            "children_in_vaccine_summary": privacy_count(len(care_vaccine_children)),
        },
        "problems": {
            "overall": overall_issues,
            "overall_assessed": privacy_count(overall_assessed),
            "pregnancy": pregnancy_issues,
            "pregnancy_assessed": privacy_count(pregnancy_assessed),
            "babies": baby_issues,
            "babies_assessed": privacy_count(babies_assessed),
            "groups": issue_groups,
            "antenatal_care": antenatal_metrics,
            "newborn_care": newborn_metrics,
        },
        "summary": {
            "total_screened": privacy_count(len(screened_ids)),
            "screening_visits": privacy_count(total_screenings),
            "green_count": privacy_count(green_count),
            "green_pct": green_pct if green_count == 0 or green_count >= 5 else None,
            "orange_count": privacy_count(orange_count),
            "orange_pct": orange_pct if orange_count == 0 or orange_count >= 5 else None,
            "red_count": privacy_count(red_count),
            "red_pct": red_pct if red_count == 0 or red_count >= 5 else None
        },
        "vitals_breakdown": {
            "blood_pressure": safe_breakdown(bp_breakdown),
            "spo2": safe_breakdown(spo2_breakdown),
            "blood_glucose": safe_breakdown(sugar_breakdown),
            "heart_rate": safe_breakdown(hr_breakdown),
            "people_assessed": {key: privacy_count(len(value)) for key, value in measured_people.items()},
        },
        "time_series": time_series_list,
        "localities": locality_list,
        "complaints": complaints_list,
        "age_risk": safe_age_risk
    }

