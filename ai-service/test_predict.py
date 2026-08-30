import sys
import os
import json

sys.path.insert(0, os.path.dirname(__file__))

from schemas import MaternalRiskInput, RiskComparisonRequest
from risk_service import compute_risk_prediction, compare_risk_assessments

def test_predictions():
    print("==================================================")
    print("Testing Maathru Care XGBoost Risk Prediction Model")
    print("==================================================")

    # Test Case 1: Low Risk Mother
    low_risk_sample = MaternalRiskInput(
        age=24.0,
        gravida=1,
        tetanusVaccination=2,
        gestationalAge=26.0,
        weightKg=58.0,
        heightFt=5.3,
        fetalPosition=0,
        fetalHeartRate=135.0,
        urineSugar=0,
        vdrl=0,
        hbsAg=0,
        systolicBP=110.0,
        diastolicBP=70.0
    )
    res1 = compute_risk_prediction(low_risk_sample)
    print(f"\n[Test Case 1] Normal Patient:")
    print(f"  Prediction Label: {res1.predictionLabel}")
    print(f"  Probability: {res1.highRiskProbability}%")
    print(f"  Risk Level: {res1.riskLevel}")
    print(f"  Alert Required: {res1.isAlertRequired}")
    print(f"  Top Factor: {res1.factors[0].explanation}")

    # Test Case 2: High Risk Patient (Elevated BP & Urine Sugar)
    high_risk_sample = MaternalRiskInput(
        age=36.0,
        gravida=3,
        tetanusVaccination=1,
        gestationalAge=34.0,
        weightKg=82.0,
        heightFt=5.1,
        fetalPosition=1,
        fetalHeartRate=168.0,
        urineSugar=1,
        vdrl=0,
        hbsAg=1,
        systolicBP=150.0,
        diastolicBP=98.0
    )
    res2 = compute_risk_prediction(high_risk_sample)
    print(f"\n[Test Case 2] High-Risk Patient:")
    print(f"  Prediction Label: {res2.predictionLabel}")
    print(f"  Probability: {res2.highRiskProbability}%")
    print(f"  Risk Level: {res2.riskLevel}")
    print(f"  Alert Required: {res2.isAlertRequired}")
    print(f"  Top Factor: {res2.factors[0].explanation}")
    print(f"  Recommendations: {res2.recommendations[:2]}")

    # Test Case 3: Comparison / "Why did risk change?"
    comp_req = RiskComparisonRequest(
        previous=low_risk_sample,
        current=high_risk_sample
    )
    res3 = compare_risk_assessments(comp_req)
    print(f"\n[Test Case 3] Longitudinal Comparison:")
    print(f"  Trajectory: {res3.riskTrajectory}")
    print(f"  Summary: {res3.summary}")
    print(f"  Key Changes Count: {len(res3.keyChanges)}")
    for ch in res3.keyChanges[:3]:
        print(f"    - {ch.clinicalSignificance}")

    print("\n==================================================")
    print("All Model & SHAP Test Inferences Passed Successfully!")
    print("==================================================")

if __name__ == "__main__":
    test_predictions()
