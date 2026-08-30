import { supabase } from '../lib/supabase';
import { GDMRiskRequest, GDMRiskResponse } from '../types/gdm';

const GDM_API_URL = 'https://food-detector-api.onrender.com/predict-diabetes';

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
    // Basic validation to ensure required fields aren't completely missing
    // In a real app, this should be a robust schema validation (like Zod)
    const requiredFields: (keyof GDMRiskRequest)[] = [
      'age', 'gestational_week', 'no_of_pregnancy', 'bmi',
      'sys_bp', 'dia_bp', 'ogtt', 'hemoglobin'
    ];
    
    for (const field of requiredFields) {
      if (profileData[field] === undefined || profileData[field] === null) {
        throw new Error(`Missing required clinical data: ${field}`);
      }
    }

    try {
      // Create an AbortController for a 15-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(GDM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Risk Assessment API returned ${response.status}`);
      }

      const result = await response.json();
      
      // Determine risk category if the API doesn't provide it clearly, or map from API response
      let riskCategory: 'Low Risk' | 'Moderate Risk' | 'High Risk' = 'Low Risk';
      let message = 'Continue maintaining balanced meals and regular prenatal care.';

      // Fallback categorization based on raw prediction value if no category is returned
      if (result.prediction === 1) {
         riskCategory = 'High Risk';
         message = 'Please discuss this result with your healthcare professional for appropriate evaluation and guidance.';
      } else if (result.prediction === 0) {
         riskCategory = 'Low Risk';
         message = 'Continue maintaining balanced meals and regular prenatal care.';
      }

      // If the API returns a probability score, we can be more nuanced
      if (result.probability) {
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
      
      throw new Error('Unable to complete risk assessment right now. Please try again later.');
    }
  }
};
