import unittest
from datetime import date
from types import SimpleNamespace

from app.core.analytics_utils import age_group_for_patient, patient_issue_names, privacy_count, privacy_partition


class AnalyticsUtilityTests(unittest.TestCase):
    def test_newborn_day_boundaries(self):
        self.assertEqual(age_group_for_patient(SimpleNamespace(age_days=0), date(2026, 11, 7)), "Newborn (0–28 days)")
        self.assertEqual(age_group_for_patient(SimpleNamespace(age_days=28), date(2026, 11, 7)), "Newborn (0–28 days)")
        self.assertEqual(age_group_for_patient(SimpleNamespace(age_days=29), date(2026, 11, 7)), "Baby (29 days–under 1 year)")
        self.assertEqual(age_group_for_patient(SimpleNamespace(age_days=365), date(2026, 11, 7)), "Baby (29 days–under 1 year)")
        self.assertEqual(age_group_for_patient(SimpleNamespace(age_days=366), date(2026, 11, 7)), "Child (1–5 years)")

    def test_child_and_adult_boundaries(self):
        cases = [
            (SimpleNamespace(age=5), "Child (1–5 years)"),
            (SimpleNamespace(age=6), "Child (6–9 years)"),
            (SimpleNamespace(age=10), "Child (10–13 years)"),
            (SimpleNamespace(age=14), "Child (14–17 years)"),
            (SimpleNamespace(age=18), "Adult (18–29 years)"),
            (SimpleNamespace(age=30), "Adult (30–44 years)"),
            (SimpleNamespace(age=45), "Adult (45–59 years)"),
            (SimpleNamespace(age=60), "Older adult (60+ years)"),
        ]
        for person, expected in cases:
            with self.subTest(age=person.age):
                self.assertEqual(age_group_for_patient(person, date(2026, 11, 7)), expected)

    def test_date_of_birth_is_more_precise_than_entered_age(self):
        person = SimpleNamespace(date_of_birth=date(2026, 10, 9), age_days=1, age_months=0, age=0)
        self.assertEqual(age_group_for_patient(person, date(2026, 11, 7)), "Baby (29 days–under 1 year)")

    def test_issue_names_are_unique_and_exclude_placeholders(self):
        person = SimpleNamespace(
            primary_health_issue="Routine Preventive Checkup",
            health_issue_categories=["Heart", "heart", "Other"],
            health_issues_list=["Type 2 Diabetes", "None Known"],
            pregnancy_issues=["High blood pressure"],
            growth_issues=[],
            newborn_details=None,
        )
        self.assertEqual(patient_issue_names(person), ["Heart", "High blood pressure", "Type 2 Diabetes"])

    def test_privacy_threshold_keeps_zero_and_hides_one_to_four(self):
        self.assertEqual(privacy_count(0), 0)
        for count in range(1, 5):
            with self.subTest(count=count):
                self.assertIsNone(privacy_count(count))
        self.assertEqual(privacy_count(5), 5)

    def test_privacy_partition_hides_neighboring_buckets_to_prevent_subtraction(self):
        self.assertEqual(privacy_partition({"given": 8, "missed": 2, "unknown": 0}), {"given": None, "missed": None, "unknown": None})
        self.assertEqual(privacy_partition({"given": 5, "missed": 0}), {"given": 5, "missed": 0})


if __name__ == "__main__":
    unittest.main()
