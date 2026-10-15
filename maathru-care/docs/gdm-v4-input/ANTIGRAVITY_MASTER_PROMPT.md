# ANTIGRAVITY MASTER PROMPT — Maathru Care GDM V4 (Research-only)

You are a senior full-stack React Native/Expo + FastAPI + ML deployment engineer working inside the EXISTING Maathru Care repository. Implement a careful, versioned, research-only integration of the trained GDM V4 Random Forest model. Work on actual project files, inspect the codebase first, and avoid unsupported claims. Do not simply output sample code or redesign the whole app.

## INPUTS I WILL PROVIDE
1. The existing Maathru Care repository/workspace (mobile app + Python AI backend).
2. This package's `gdm_v4_conservative_RESEARCH_ONLY.joblib`.
3. `model_metadata.json`, `holdout_test_metrics.json`, and `README_RESEARCH.txt`.

## NON-NEGOTIABLE FACTS FROM THE MODEL METADATA
- Dataset: Kaggle Sumathi GDM, 3,521 records after exact-duplicate removal; internal holdout N=529.
- Algorithm: RandomForest fitted in a scikit-learn Pipeline with median imputation. Do not apply the old separate GDM scaler/imputer to V4.
- EXACT features, in EXACT order, with exact training column spellings:
  1. `Age`
  2. `No of Pregnancy`
  3. `Family History`
  4. `unexplained prenetal loss` (original misspelling is intentional)
  5. `Sedentary Lifestyle`
- Metadata classification threshold: 0.30, selected experimentally on validation data. Do not substitute 0.35/0.65 risk bands or `model.predict()` default threshold 0.50.
- Internal test accuracy 0.9357, ROC-AUC 0.9764, precision 0.9257, recall 0.9078. These are NOT external or clinical performance claims. No Sri Lankan external validation.
- Original training metadata says Python 3.13.16 and scikit-learn 1.6.1.
- The supplied previous-code snapshot uses Python 3.10 in Dockerfile and scikit-learn 1.7.2 in requirements.txt. This mismatch MUST be addressed safely before model loading.
- The five V4 features do NOT include BMI, OGTT, HDL, BP, gestation-in-previous-pregnancy, PCOS, or prediabetes. Never include these in the V4 prediction vector. Do not silently replace the 15-input legacy model.

## PHASE 0 — READ-ONLY DISCOVERY (DO THIS FIRST)
Inspect the ACTUAL current workspace, not assumptions. Locate the FastAPI application, Dockerfile, requirements/lockfiles, model loading, existing `/predict-diabetes`, YOLO `/predict`, health route, current hosting config, React Native `gdmRiskService.ts`, `src/types/gdm.ts`, `src/app/(mother)/gdm-care.tsx`, registration/profile screens, cache service, Supabase access, env configuration, and tests. Determine which repository/folder is deployed to Render and whether deployment is Docker or native Python. Check if old `.pkl` files and YOLO `best.pt` are present in the real workspace; the earlier audit ZIP intentionally omitted large model binaries.

First produce a compact implementation plan with exact discovered file paths, old behavior, model compatibility risks, and what will change. Then implement in small reviewable steps. Never delete/rewrite existing features, including YOLO, maternal nutrition, doctor risk assessment, or old GDM endpoint.

## PHASE 1 — SAFE ML RUNTIME STRATEGY
Before loading the model, inspect `model_metadata.json`. Use only the trusted provided joblib file; never deserialize model files received from arbitrary API requests. Verify the SHA256 of the copied artifact against the source. Check dependency compatibility with an isolated smoke test. A Python/scikit-learn version mismatch is NOT something to ignore because `joblib.load` happens to succeed. Prefer a compatible, reproducible inference environment with scikit-learn 1.6.1 and compatible Python 3.13, if the original artifact requires that environment.

PREFERRED: add a versioned route to the existing FastAPI service ONLY IF this can be achieved without breaking YOLO, its PyTorch/Ultralytics dependencies, or other routes. Do not globally upgrade/downgrade Python or scikit-learn just to force compatibility. If an isolated environment is necessary, explain why and implement a small separate GDM V4 research FastAPI service (with its own Dockerfile/requirements and its own URL), keeping the original food-detection backend unchanged. The client should use an environment-based API base URL. Clearly report which architecture you selected and why. Do not deploy automatically.

## PHASE 2 — VERSIONED BACKEND CONTRACT
Implement `POST /research/gdm/v4/predict` (or an equivalent clearly versioned route) and a safe model-status route that exposes no patient data and does not return sensitive server details. Protect the research endpoint appropriately with the project's actual auth mechanism, environment feature flag `ENABLE_GDM_V4_RESEARCH=false` by default, and reasonable rate limiting if the infrastructure supports it. Do not expose unrestricted patient risk inference on a public URL.

Client JSON contract:
{
  "age": 30,
  "no_of_pregnancy": 2,
  "family_history": 1,
  "unexplained_prenatal_loss": 0,
  "sedentary_lifestyle": 1
}

Mapping to the exact DataFrame columns:
`age` -> `Age`
`no_of_pregnancy` -> `No of Pregnancy`
`family_history` -> `Family History`
`unexplained_prenatal_loss` -> `unexplained prenetal loss`
`sedentary_lifestyle` -> `Sedentary Lifestyle`

Use a one-row pandas DataFrame in exact model feature order, `pipeline.predict_proba(X)[0, 1]`, and classification `probability >= 0.30` (threshold loaded from metadata, not duplicated magic number). Check finite numeric values; validate age and pregnancy count with sensible, documented bounds, and enforce binary values 0/1 for history fields. Reject missing/unknown required inputs with a clear 422 response; DO NOT convert unknown to false/0 or invent normal values. `No of Pregnancy` is gravida, not parity, and do not infer it from number of children. Verify that class `1` represents GDM in the serialized model before using column index 1. Handle unavailable model with a controlled 503, not silent fallbacks.

Example response shape:
{
  "success": true,
  "model_version": "gdm-v4-research",
  "research_only": true,
  "model_score": 0.42,
  "threshold": 0.30,
  "screen_positive": true,
  "disclaimer": "Research prototype only. Not a GDM diagnosis or clinically validated risk estimate. Seek professional antenatal screening."
}

The model_score is a model output, NOT a calibrated personal clinical disease probability. Do not claim a woman has/does not have GDM, do not label negative as medically safe, and do not return urgent or strict dietary/medication directives based on this model.

## PHASE 3 — REACT NATIVE / EXPO INTEGRATION
Keep legacy `/predict-diabetes` and other services untouched. Introduce a separate `gdmV4ResearchService.ts` and strict TypeScript request/response types. Use an environment-configured URL (Expo public env only for NON-secret base URLs); never hardcode localhost or local LAN IP in production. Keep authentication secrets outside public Expo environment variables.

Add a dedicated, opt-in, research/demo entry point in the existing GDM care UI, disabled by default behind a feature flag. Preserve the existing tabs, meal logging, and nutrition features. Use a clean mobile-friendly form for the five verified fields. Age and number of pregnancies can be prefilled ONLY when an actual, verified, current user profile value exists; user can review/edit it. For each binary history question, use an explicit three-state `Yes / No / Not sure` UI with default `Not sure`; require explicit Yes/No before submitting or explain why the assessment cannot run. Never treat a false/unchecked UI default as an answered 'No'. If source profile fields have different semantics, do not map them automatically; require user confirmation.

Show loading, retry, 422 validation, 503 service-unavailable, offline and timeout states. Prevent duplicate submissions. Use a compact result card that says `Research screening model` and `Model score`, plus `Screen-positive at experimental threshold` or `Screen-negative at experimental threshold`; always display the non-diagnostic disclaimer. Do not reuse the old app's 35%/65% Low/Moderate/High risk categories. Do not use V4 screen-positive results to automatically modify nutritional targets, prescribe diets, send doctor alerts, or mark medical diagnosis. Keep legacy and V4 caches separated and versioned; avoid storing personal health information in plaintext logs or unnecessary persistent storage.

## PHASE 4 — FIX EXISTING FAKE-DEFAULT BUGS SAFELY
Inspect `mobile_app/src/services/api.ts` registration mapping and any other place that silently supplies clinical defaults such as age 25, BMI 22, HDL 50, BP 120/80, OGTT 120, Hb 12, history 0, pregnancy count 1. Fix the underlying semantic problem: distinguish missing, unknown, and explicit No. Use null/optional fields when schema allows; where database columns require values, do NOT make silent incompatible migrations. Instead explain the schema constraint and provide a safe migration plan with SQL and rollback. Ensure unrelated registration and login still work. Never run destructive Supabase migrations without approval.

Inspect `gdmRiskService.ts` existing validation and its relationship to backend 15-feature schema. Document mismatch and fix it without mixing old/V4 models or breaking old flows. Check the existing gdm-care screen's default gestational-week fallback and remove fabricated medical data from clinical interpretation where feasible.

## PHASE 5 — TESTS AND VERIFICATION
Create backend tests using pytest/FastAPI TestClient with an injected fake estimator for contract tests, plus a real-artifact smoke test in the compatible environment. Test: model loaded, five columns exact order, binary validation, missing field 422, bad values 422, feature flag disabled, auth required, unavailable model 503, threshold exactly 0.30, no old scaler/imputer applied, old `/predict-diabetes` unchanged, YOLO `/predict` still works with a fixture image, and health route remains healthy. Use at least two known reference feature vectors with expected `predict_proba` from the same serialized artifact in the training-compatible environment; report expected/actual within tolerance. Do not invent reference probabilities.

Create client tests for request mapping, explicit Yes/No/Unknown semantics, API failures, score display and disclaimer, and absence of clinical advice. Run TypeScript checks and relevant tests; show real pass/fail outputs. If tools or binaries are missing, state exactly which checks could not run and how to perform them.

## PHASE 6 — DEPLOYMENT (DO NOT AUTO-DEPLOY)
Provide exact file changes and local commands. If compatible with the existing backend, document updating its linked Git repo and redeploying the existing Render web service. If separate research service is required, provide its own Dockerfile, pinned requirements, health check, environment settings, Render deployment steps and environment-configured client URL. Do not require a GPU for inference. Do not expose medical data in query strings, logs or analytics. Give a rollback plan, including disabling the feature flag and reverting the deployment. Never claim successful deployment without verifying live endpoint responses.

## DELIVERABLES
1. Concise repo audit and chosen architecture, explicitly explaining runtime compatibility.
2. Changed files and exact paths, with code implemented in the workspace.
3. Versioned API request/response examples.
4. Safe opt-in mobile demo UI.
5. Unit/integration/smoke tests and results.
6. Local run instructions and Render deployment checklist.
7. Research limitations and viva-ready explanation: internal Kaggle split only; no independent Sri Lankan clinical validation; label/age/order artifacts remain concerns; V4 does not replace OGTT or antenatal care.
8. List of blockers/questions that genuinely require my input (e.g. missing original binaries, actual deployment repo, Supabase schema migration authorization). Do not guess missing facts.

Start with PHASE 0 inspection and PHASE 1 compatibility check. Make the smallest safe changes. Do not deploy or publish without explicit confirmation.
