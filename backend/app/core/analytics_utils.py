from datetime import date


def age_in_days(patient, today=None):
    """Best available age in days, preferring birth date over entered age."""
    today = today or date.today()
    birth_date = getattr(patient, "date_of_birth", None)
    if birth_date:
        return max(0, (today - birth_date).days)
    age_days = getattr(patient, "age_days", None)
    if age_days is not None:
        return max(0, age_days)
    age_months = getattr(patient, "age_months", None)
    if age_months is not None:
        return max(0, round(age_months * 30.4375))
    age = getattr(patient, "age", None)
    return max(0, round(age * 365.2425)) if age is not None else None


def age_group_for_patient(patient, today=None):
    today = today or date.today()
    days = age_in_days(patient, today)
    if days is None:
        return "Age not recorded"
    if not getattr(patient, "date_of_birth", None) and getattr(patient, "age_days", None) is None and (getattr(patient, "age_months", None) == 0 or getattr(patient, "age", None) == 0):
        return "Age not recorded"
    if days <= 28:
        return "Newborn (0–28 days)"
    birth_date = getattr(patient, "date_of_birth", None)
    if birth_date:
        years = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        if years < 1:
            return "Baby (29 days–under 1 year)"
    elif getattr(patient, "age_days", None) is not None and days < 366:
        return "Baby (29 days–under 1 year)"
    elif getattr(patient, "age_months", None) is not None and patient.age_months < 12:
        return "Baby (29 days–under 1 year)" if patient.age_months > 0 else "Age not recorded"
    elif getattr(patient, "age", None) is not None and patient.age < 1:
        return "Age not recorded"
    else:
        years = days / 365.2425
        if getattr(patient, "age_days", None) is not None:
            years = days / 365.2425
        elif getattr(patient, "age_months", None) is not None:
            years = patient.age_months / 12
        elif getattr(patient, "age", None) is not None:
            years = patient.age
    if years < 6:
        return "Child (1–5 years)"
    if years < 10:
        return "Child (6–9 years)"
    if years < 14:
        return "Child (10–13 years)"
    if years < 18:
        return "Child (14–17 years)"
    if years < 30:
        return "Adult (18–29 years)"
    if years < 45:
        return "Adult (30–44 years)"
    if years < 60:
        return "Adult (45–59 years)"
    return "Older adult (60+ years)"


def patient_issue_names(patient):
    """Return unique recorded concerns, excluding placeholders and routine visits."""
    values = []
    for field in ("primary_health_issue", "health_issue_categories", "health_issues_list", "pregnancy_issues", "growth_issues"):
        value = getattr(patient, field, None)
        if isinstance(value, str):
            values.append(value)
        elif isinstance(value, (list, tuple, set)):
            values.extend(value)
    newborn = getattr(patient, "newborn_details", None) or {}
    if isinstance(newborn, dict):
        values.extend(newborn.get("feeding_concerns") or [])
        values.extend(newborn.get("newborn_concerns") or [])
    excluded = {"none", "none known", "none / no known long-term illness", "general checkup", "routine preventive checkup", "other"}
    normalized = {}
    for value in values:
        if not isinstance(value, str):
            continue
        label = " ".join(value.split())
        if label and label.casefold() not in excluded:
            normalized.setdefault(label.casefold(), label)
    return sorted(normalized.values(), key=str.casefold)


def health_assessment_recorded(patient):
    explicit = getattr(patient, "health_assessed", None)
    if explicit is not None:
        return bool(explicit)
    # Older records did not have an explicit assessment marker. Only infer an
    # assessment when an issue answer was actually saved, never from a blank.
    return bool(getattr(patient, "health_issues_list", None)) or bool(getattr(patient, "health_issue_categories", None))


def privacy_count(value, threshold=5):
    """Hide non-zero counts below threshold while preserving true zeroes."""
    value = int(value or 0)
    return value if value == 0 or value >= threshold else None


def privacy_partition(values, threshold=5):
    """Hide a whole set of mutually exclusive buckets if one bucket is small."""
    if any(0 < int(value or 0) < threshold for value in values.values()):
        return {key: None for key in values}
    return {key: privacy_count(value, threshold) for key, value in values.items()}
