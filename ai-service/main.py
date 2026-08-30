import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from schemas import (
    MaternalRiskInput,
    RiskPredictionResponse,
    RiskComparisonRequest,
    RiskComparisonResponse,
)
from model_loader import load_production_model
from risk_service import compute_risk_prediction, compare_risk_assessments

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai-service")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Maathru Care AI Service...")
    try:
        load_production_model()
        logger.info("ML Production Model & SHAP Explainer ready for inference.")
    except Exception as e:
        logger.error(f"Failed to preload ML model on startup: {e}")
    yield
    logger.info("Shutting down Maathru Care AI Service...")

app = FastAPI(
    title="Maathru Care Maternal Risk AI Service",
    description="Microservice hosting Tuned XGBoost for maternal pregnancy high-risk prediction and SHAP explainability.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    return {
        "status": "healthy",
        "service": "Maathru Care AI Service",
        "version": "1.0.0",
        "modelLoaded": True
    }

@app.post(
    "/api/v1/risk/predict",
    response_model=RiskPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Assess Maternal Pregnancy Risk"
)
def predict_maternal_risk(payload: MaternalRiskInput):
    """
    Accepts maternal and fetal health measurements (13 features) and returns:
    - High-risk probability (0-100%)
    - 4-Tier Risk Band (Low, Moderate, High, Very High)
    - SHAP local feature importance breakdown
    - Evidence-based preventive guidance
    """
    try:
        response = compute_risk_prediction(payload)
        return response
    except Exception as e:
        logger.error(f"Error during risk prediction: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(e)}"
        )

@app.post(
    "/api/v1/risk/explain",
    response_model=RiskPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get SHAP Factor Attribution"
)
def explain_maternal_risk(payload: MaternalRiskInput):
    """Returns detailed SHAP explainability factors for given patient input."""
    return predict_maternal_risk(payload)

@app.post(
    "/api/v1/risk/compare",
    response_model=RiskComparisonResponse,
    status_code=status.HTTP_200_OK,
    summary="Explain Risk Level Shift Between Two Assessments"
)
def compare_assessments(payload: RiskComparisonRequest):
    """
    Compares consecutive assessments and highlights vital changes that caused
    the model's predicted probability to increase, decrease, or remain stable.
    """
    try:
        return compare_risk_assessments(payload)
    except Exception as e:
        logger.error(f"Error during risk comparison: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comparison error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
