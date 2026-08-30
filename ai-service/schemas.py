from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any

class MaternalRiskInput(BaseModel):
    age: float = Field(..., ge=10, le=60, description="Maternal age in years")
    gravida: int = Field(..., ge=1, le=15, description="Gravida number (1 for 1st, 2 for 2nd, etc.)")
    tetanusVaccination: int = Field(..., ge=0, le=10, description="Tetanus vaccination dose count (1 for 1st, 2 for 2nd, etc.)")
    gestationalAge: float = Field(..., ge=4, le=45, description="Gestational age in weeks")
    weightKg: float = Field(..., ge=30, le=200, description="Maternal weight in kilograms")
    heightFt: float = Field(..., ge=3.5, le=7.5, description="Maternal height in feet (e.g. 5.3)")
    fetalPosition: int = Field(..., ge=0, le=1, description="Fetal position (0 = Normal, 1 = Abnormal)")
    fetalHeartRate: float = Field(..., ge=60, le=220, description="Fetal heart rate in bpm")
    urineSugar: int = Field(..., ge=0, le=1, description="Urine sugar presence (0 = No, 1 = Yes)")
    vdrl: int = Field(..., ge=0, le=1, description="VDRL test result (0 = Negative, 1 = Positive)")
    hbsAg: int = Field(..., ge=0, le=1, description="HBsAg test result (0 = Negative, 1 = Positive)")
    systolicBP: float = Field(..., ge=60, le=240, description="Systolic blood pressure in mmHg")
    diastolicBP: float = Field(..., ge=30, le=160, description="Diastolic blood pressure in mmHg")

    @field_validator("diastolicBP")
    @classmethod
    def validate_bp(cls, v, info):
        systolic = info.data.get("systolicBP")
        if systolic is not None and v >= systolic:
            raise ValueError("Diastolic BP must be less than Systolic BP")
        return v

class FeatureImpact(BaseModel):
    feature: str
    displayName: str
    value: Any
    unit: str
    shapValue: float
    contribution: str  # "increases_risk", "decreases_risk", "neutral"
    importance: float
    explanation: str

class RiskPredictionResponse(BaseModel):
    success: bool
    prediction: int  # 0 or 1
    predictionLabel: str  # "Not High Risk" or "High Risk"
    highRiskProbability: float  # 0.0 - 100.0%
    riskLevel: str  # "Low", "Moderate", "High", "Very High"
    riskColor: str  # Hex or Tailwind color class
    isAlertRequired: bool  # True if High or Very High
    summary: str
    factors: List[FeatureImpact]
    recommendations: List[str]
    disclaimer: str
    modelMetadata: Dict[str, Any]

class RiskComparisonRequest(BaseModel):
    current: MaternalRiskInput
    previous: MaternalRiskInput

class RiskFactorChange(BaseModel):
    feature: str
    displayName: str
    previousValue: Any
    currentValue: Any
    unit: str
    changeType: str  # "increased", "decreased", "unchanged"
    clinicalSignificance: str

class RiskComparisonResponse(BaseModel):
    success: bool
    previousRiskLevel: str
    currentRiskLevel: str
    previousProbability: float
    currentProbability: float
    riskTrajectory: str  # "improving", "stable", "increasing"
    summary: str
    keyChanges: List[RiskFactorChange]
    guidance: List[str]
