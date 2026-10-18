Maathru Care GDM V4 — Antigravity integration input package

CONTENTS:
- ANTIGRAVITY_MASTER_PROMPT.md: full copy-paste prompt for Google Antigravity
- gdm_v4_conservative_RESEARCH_ONLY.joblib: trained scikit-learn pipeline
- model_metadata.json: feature order, model threshold, Python/sklearn versions
- holdout_test_metrics.json: INTERNAL Kaggle test results, NOT clinical validation
- README_RESEARCH.txt: research caveats

HOW TO USE:
1. Make a backup or Git commit of your current app and backend.
2. Open the real Maathru Care project folder in Google Antigravity.
3. Add this ZIP or extract these files into a separate project subfolder e.g. docs/gdm-v4-input/.
4. Copy the contents of ANTIGRAVITY_MASTER_PROMPT.md into Antigravity.
5. Have Antigravity audit actual repository paths and dependencies first.
6. Review its changes and run tests locally before committing or deploying.
7. Enable the research-only feature flag only for authorized demo/test accounts.

IMPORTANT:
- Existing AI backend uses Python 3.10 + scikit-learn 1.7.2 (in prior snapshot).
- V4 model metadata reports Python 3.13.16 + scikit-learn 1.6.1.
- scikit-learn joblib cross-version loads are not supported; DO NOT force loading or break YOLO.
- V4 threshold is 0.30, not the legacy app's 0.35/0.65 thresholds.
- Never replace the legacy 15-input endpoint with V4 five-input model.
- Do not deploy this model as a clinical GDM diagnosis or treatment system.
