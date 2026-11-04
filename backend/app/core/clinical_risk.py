from typing import Optional, Tuple

def compute_vitals_risk(
    systolic_bp: Optional[float] = None,
    diastolic_bp: Optional[float] = None,
    spo2: Optional[float] = None,
    blood_glucose: Optional[float] = None,
    heart_rate: Optional[int] = None
) -> Tuple[str, str]:
    """
    Evaluates clinical vitals and returns (risk_category, explanation).
    Categories:
      - 'Red': Bad / High Risk (Urgent Medical Attention)
      - 'Orange': Medium / Borderline (Follow-up & Monitoring)
      - 'Green': Good / Healthy (Normal Parameters)
    """
    reasons = []
    is_red = False
    is_orange = False

    # 1. Blood Pressure Check
    if systolic_bp is not None or diastolic_bp is not None:
        sys = systolic_bp or 0
        dia = diastolic_bp or 0
        if sys >= 140 or dia >= 90:
            is_red = True
            reasons.append(f"High Blood Pressure ({sys:.0f}/{dia:.0f} mmHg)")
        elif (120 <= sys < 140) or (80 <= dia < 90):
            is_orange = True
            reasons.append(f"Borderline Blood Pressure ({sys:.0f}/{dia:.0f} mmHg)")

    # 2. Blood Oxygen (SpO2) Check
    if spo2 is not None:
        if spo2 < 92:
            is_red = True
            reasons.append(f"Critical Oxygen Level ({spo2:.0f}%)")
        elif 92 <= spo2 <= 94:
            is_orange = True
            reasons.append(f"Borderline Oxygen Level ({spo2:.0f}%)")

    # 3. Blood Glucose Check
    if blood_glucose is not None and blood_glucose > 0:
        if blood_glucose >= 200:
            is_red = True
            reasons.append(f"High Blood Sugar ({blood_glucose:.0f} mg/dL)")
        elif 140 <= blood_glucose < 200:
            is_orange = True
            reasons.append(f"Elevated Blood Sugar ({blood_glucose:.0f} mg/dL)")

    # 4. Heart Rate Check
    if heart_rate is not None and heart_rate > 0:
        if heart_rate < 50 or heart_rate > 110:
            is_red = True
            reasons.append(f"Abnormal Heart Rate ({heart_rate} BPM)")
        elif (50 <= heart_rate < 60) or (101 <= heart_rate <= 110):
            is_orange = True
            reasons.append(f"Borderline Heart Rate ({heart_rate} BPM)")

    if is_red:
        return "Red", "; ".join(reasons)
    elif is_orange:
        return "Orange", "; ".join(reasons)
    return "Green", "All vitals in normal healthy range"

