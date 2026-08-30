export interface GDMRiskRequest {
  age: number;
  gestational_week: number;
  no_of_pregnancy: number;
  gestation_in_previous_pregnancy: number;
  bmi: number;
  hdl: number;
  family_history: number;
  unexplained_prenatal_loss: number;
  large_child_or_birth_default: number;
  pcos: number;
  sys_bp: number;
  dia_bp: number;
  ogtt: number;
  hemoglobin: number;
  sedentary_lifestyle: number;
  prediabetes: number;
}

export interface GDMRiskResponse {
  prediction: number; // e.g. 0 or 1 for class
  probability?: number; // model probability
  riskCategory: 'Low Risk' | 'Moderate Risk' | 'High Risk';
  message?: string;
}
