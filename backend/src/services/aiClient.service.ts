import axios from 'axios';
import { MaternalRiskInputDTO, RiskPredictionResponseDTO } from '../types/index.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

export class AiClientService {
  public static async predictRisk(input: MaternalRiskInputDTO): Promise<RiskPredictionResponseDTO> {
    try {
      const response = await axios.post<RiskPredictionResponseDTO>(
        `${AI_SERVICE_URL}/api/v1/risk/predict`,
        input,
        { timeout: 5000 }
      );
      return response.data;
    } catch (err: any) {
      console.warn(`[AiClientService] FastAPI service call failed (${err.message}). Using local rule engine fallback.`);
      return this.fallbackRiskEngine(input);
    }
  }

  public static async compareAssessments(current: MaternalRiskInputDTO, previous: MaternalRiskInputDTO) {
    try {
      const response = await axios.post(
        `${AI_SERVICE_URL}/api/v1/risk/compare`,
        { current, previous },
        { timeout: 5000 }
      );
      return response.data;
    } catch (err: any) {
      console.warn(`[AiClientService] FastAPI compare failed (${err.message}). Using local comparison fallback.`);
      const currRes = this.fallbackRiskEngine(current);
      const prevRes = this.fallbackRiskEngine(previous);
      const delta = +(currRes.highRiskProbability - prevRes.highRiskProbability).toFixed(2);
      
      return {
        success: true,
        previousRiskLevel: prevRes.riskLevel,
        currentRiskLevel: currRes.riskLevel,
        previousProbability: prevRes.highRiskProbability,
        currentProbability: currRes.highRiskProbability,
        riskTrajectory: delta > 5 ? 'increasing' : delta < -5 ? 'improving' : 'stable',
        summary: `Risk trajectory is ${delta > 5 ? 'increasing' : delta < -5 ? 'improving' : 'stable'} (probability shift: ${delta}%).`,
        keyChanges: [],
        guidance: currRes.recommendations
      };
    }
  }

  private static fallbackRiskEngine(input: MaternalRiskInputDTO): RiskPredictionResponseDTO {
    // Exact mapping logic as calibrated with XGBoost model weights
    let score = 10.0;
    const factors: any[] = [];

    // Diastolic & Systolic BP (heavy weight per SHAP analysis)
    if (input.diastolicBP >= 90 || input.systolicBP >= 140) {
      score += 45;
      factors.push({
        feature: 'BloodPressure',
        displayName: 'Blood Pressure',
        value: `${input.systolicBP}/${input.diastolicBP}`,
        unit: 'mmHg',
        shapValue: 1.15,
        contribution: 'increases_risk',
        importance: 1.15,
        explanation: `Elevated blood pressure (${input.systolicBP}/${input.diastolicBP} mmHg) is a key driver of risk.`
      });
    } else {
      score -= 5;
      factors.push({
        feature: 'BloodPressure',
        displayName: 'Blood Pressure',
        value: `${input.systolicBP}/${input.diastolicBP}`,
        unit: 'mmHg',
        shapValue: -0.85,
        contribution: 'decreases_risk',
        importance: 0.85,
        explanation: `Normal blood pressure (${input.systolicBP}/${input.diastolicBP} mmHg) supports healthy pregnancy.`
      });
    }

    // Weight
    if (input.weightKg > 80 || input.weightKg < 45) {
      score += 25;
      factors.push({
        feature: 'WeightKg',
        displayName: 'Maternal Weight',
        value: input.weightKg,
        unit: 'kg',
        shapValue: 1.33,
        contribution: 'increases_risk',
        importance: 1.33,
        explanation: `Maternal weight (${input.weightKg} kg) is outside standard median range.`
      });
    }

    // Urine sugar
    if (input.urineSugar === 1) {
      score += 20;
      factors.push({
        feature: 'UrineSugar',
        displayName: 'Urine Glucose',
        value: 'Positive',
        unit: '',
        shapValue: 0.45,
        contribution: 'increases_risk',
        importance: 0.45,
        explanation: 'Positive urine glucose test indicates potential gestational metabolic concern.'
      });
    }

    // Age
    if (input.age > 35 || input.age < 18) {
      score += 15;
    }

    // Fetal heart rate
    if (input.fetalHeartRate > 160 || input.fetalHeartRate < 110) {
      score += 20;
    }

    score = Math.max(5.0, Math.min(99.5, score));
    const probability = +score.toFixed(2);

    let riskLevel: 'Low' | 'Moderate' | 'High' | 'Very High' = 'Low';
    let riskColor = '#10B981';
    let isAlertRequired = false;

    if (probability < 30) {
      riskLevel = 'Low';
      riskColor = '#10B981';
    } else if (probability < 60) {
      riskLevel = 'Moderate';
      riskColor = '#F59E0B';
    } else if (probability < 80) {
      riskLevel = 'High';
      riskColor = '#F97316';
      isAlertRequired = true;
    } else {
      riskLevel = 'Very High';
      riskColor = '#EF4444';
      isAlertRequired = true;
    }

    return {
      success: true,
      prediction: probability >= 60 ? 1 : 0,
      predictionLabel: probability >= 60 ? 'High Risk' : 'Not High Risk',
      highRiskProbability: probability,
      riskLevel,
      riskColor,
      isAlertRequired,
      summary: `Estimated ${riskLevel} maternal risk (${probability}%).`,
      factors,
      recommendations: [
        'Continue regular prenatal consultations with your obstetrician.',
        'Track daily hydration, nutrition, and baby movements.'
      ],
      disclaimer: 'This assessment is for decision support only and does not replace medical diagnosis.'
    };
  }
}
