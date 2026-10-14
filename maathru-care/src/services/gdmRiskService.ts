import { supabase } from '../lib/supabase';
import { GDMRiskRequest, GDMRiskResponse } from '../types/gdm';

const configuredTimeout = Number(process.env.EXPO_PUBLIC_GDM_TIMEOUT_MS);
const GDM_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 90_000;

const GDM_API_URL = process.env.EXPO_PUBLIC_GDM_API_URL || 'https://food-detector-api.onrender.com/predict-diabetes';

export const gdmRiskService = {
  async getMaternalProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching maternal profile:', error);
      return null;
    }
    return data;
  },

  async assessRisk(profileData: Partial<GDMRiskRequest>): Promise<GDMRiskResponse> {
    // Audit: The legacy /predict-diabetes backend requires 15 specific clinical features
    const requiredFields: (keyof GDMRiskRequest)[] = [
      'age', 'no_of_pregnancy', 'gestation_in_previous_pregnancy', 'bmi',
      'hdl', 'family_history', 'unexplained_prenatal_loss', 'large_child_or_birth_default',
      'pcos', 'sys_bp', 'dia_bp', 'ogtt', 'hemoglobin', 'sedentary_lifestyle', 'prediabetes'
    ];

    const missing = requiredFields.filter(
      field => profileData[field] === undefined || profileData[field] === null
    );

    if (missing.length > 0) {
      throw new Error(`Incomplete clinical profile. Missing: ${missing.join(', ')}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GDM_TIMEOUT_MS);
    try {

      const response = await fetch(GDM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 422) throw new Error('Please review the required Health Profile values.');
        if (response.status === 503) throw new Error('The risk assessment service is unavailable or still starting. Please try again.');
        throw new Error(`Risk assessment could not complete (HTTP ${response.status}). Please try again later.`);
      }

      const result = await response.json();
      if (!result || (result.success !== undefined
        ? result.success !== true || typeof result.diabetes_risk !== 'boolean' ||
          !Number.isFinite(result.risk_percentage) || result.risk_percentage < 0 || result.risk_percentage > 100
        : ![0, 1].includes(result.prediction) || !Number.isFinite(result.probability) ||
          result.probability < 0 || result.probability > 1)) {
        throw new Error('The risk assessment service returned an invalid result. Please try again later.');
      }

      let riskCategory: 'Low Risk' | 'Moderate Risk' | 'High Risk' = 'Low Risk';
      let message = 'Continue maintaining balanced meals and regular prenatal care.';

      // Handle new API response format
      if (result.success !== undefined) {
        if (result.risk_level) {
          riskCategory = result.risk_level;
        } else if (result.diabetes_risk === true) {
          riskCategory = 'High Risk';
        }

        if (result.recommendation) {
          message = result.recommendation;
        }

        const probability = result.risk_percentage / 100;

        return {
          prediction: result.diabetes_risk ? 1 : 0,
          probability,
          riskCategory,
          message
        };
      }

      // Fallback for old format
      if (result.prediction === 1) {
        riskCategory = 'High Risk';
        message = 'Please discuss this result with your healthcare professional for appropriate evaluation and guidance.';
      } else if (result.prediction === 0) {
        riskCategory = 'Low Risk';
        message = 'Continue maintaining balanced meals and regular prenatal care.';
      }

      if (result.probability !== undefined) {
        if (result.probability >= 0.7) {
          riskCategory = 'High Risk';
          message = 'Please discuss this result with your healthcare professional for appropriate evaluation and guidance.';
        } else if (result.probability >= 0.3) {
          riskCategory = 'Moderate Risk';
          message = 'Consider discussing your nutrition and glucose monitoring with your healthcare professional.';
        }
      }

      return {
        prediction: result.prediction,
        probability: result.probability,
        riskCategory,
        message
      };

    } catch (error: any) {
      console.error('Error assessing GDM risk:', error);

      if (error.name === 'AbortError') {
        throw new Error('The risk assessment service took too long to respond. Please try again.');
      }

      if (error instanceof TypeError) {
        throw new Error('Unable to connect to the risk assessment service. Please check your connection and try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
};
