MaathruCare GDM V4 — Research report (automatically generated)
Dataset: Gestational Diabetic Dat Set.xlsx
Records after exact duplicate removal: 3521
Conservative candidate: RandomForest
Features: ['Age', 'No of Pregnancy', 'Family History', 'unexplained prenetal loss', 'Sedentary Lifestyle']
Validation threshold: 0.3000
Holdout test: N=529, prevalence=0.389
ROC-AUC=0.9764, PR-AUC=0.9578
Precision=0.9257, Recall=0.9078, F1=0.9167
Confusion matrix TN=308, FP=15, FN=19, TP=187

INTERPRETATION:
- A_CORE_NO_BMI is a conservative experimental feature set, not an approved medical tool.
- B/C/D/E/F groups are validation-only exploratory ablations.
- BMI missingness is strongly associated with the GDM label; adding BMI may inflate results.
- Gestation in previous Pregnancy 0/1/2 coding is unverified; excluded from final candidate.
- Prediabetes and PCOS show unusually strong associations; source/label audit required.
- OGTT was not used in the conservative pre-OGTT candidate.
- The holdout is internal random split, not external Sri Lankan clinical validation.
- No performance claims should be made without reporting false positives/negatives.
