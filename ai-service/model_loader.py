import os
import joblib
import shap
import logging
from typing import Optional, Tuple

logger = logging.getLogger("ai-service.model_loader")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

_model = None
_explainer = None

MODEL_SEARCH_PATHS = [
    os.path.join(os.path.dirname(__file__), "..", "model", "pregnancy_risk_xgboost.pkl"),
    os.path.join(os.path.dirname(__file__), "model", "pregnancy_risk_xgboost.pkl"),
    os.path.join(os.getcwd(), "model", "pregnancy_risk_xgboost.pkl"),
    os.path.join(os.getcwd(), "pregnancy_risk_xgboost.pkl"),
    "c:/MAATHRU CARE  - IT22557506/model/pregnancy_risk_xgboost.pkl",
]

def load_production_model() -> Tuple[object, Optional[object]]:
    global _model, _explainer
    if _model is not None:
        return _model, _explainer

    model_path = None
    for path in MODEL_SEARCH_PATHS:
        normalized = os.path.abspath(path)
        if os.path.exists(normalized):
            model_path = normalized
            break

    if not model_path:
        raise FileNotFoundError(
            f"Could not locate 'pregnancy_risk_xgboost.pkl' in candidate paths: {MODEL_SEARCH_PATHS}"
        )

    logger.info(f"Loading Tuned XGBoost production model from: {model_path}")
    _model = joblib.load(model_path)
    logger.info("Successfully loaded XGBoost model into memory.")

    try:
        logger.info("Initializing SHAP TreeExplainer for fast local explainability...")
        _explainer = shap.TreeExplainer(_model)
        logger.info("SHAP TreeExplainer initialized successfully.")
    except Exception as e:
        logger.warning(f"Could not initialize SHAP TreeExplainer: {e}. Fallback to feature importance weights.")
        _explainer = None

    return _model, _explainer

def get_model():
    if _model is None:
        load_production_model()
    return _model

def get_explainer():
    if _model is None:
        load_production_model()
    return _explainer
