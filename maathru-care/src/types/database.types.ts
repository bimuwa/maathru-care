export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          avatar_url: string | null
          age: number | null
          gestational_week: number | null
          no_of_pregnancy: number | null
          gestation_in_previous_pregnancy: number | null
          bmi: number | null
          hdl: number | null
          family_history: number | null
          unexplained_prenatal_loss: number | null
          large_child_or_birth_default: number | null
          pcos: number | null
          sys_bp: number | null
          dia_bp: number | null
          ogtt: number | null
          hemoglobin: number | null
          sedentary_lifestyle: number | null
          prediabetes: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          age?: number | null
          gestational_week?: number | null
          no_of_pregnancy?: number | null
          gestation_in_previous_pregnancy?: number | null
          bmi?: number | null
          hdl?: number | null
          family_history?: number | null
          unexplained_prenatal_loss?: number | null
          large_child_or_birth_default?: number | null
          pcos?: number | null
          sys_bp?: number | null
          dia_bp?: number | null
          ogtt?: number | null
          hemoglobin?: number | null
          sedentary_lifestyle?: number | null
          prediabetes?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          age?: number | null
          gestational_week?: number | null
          no_of_pregnancy?: number | null
          gestation_in_previous_pregnancy?: number | null
          bmi?: number | null
          hdl?: number | null
          family_history?: number | null
          unexplained_prenatal_loss?: number | null
          large_child_or_birth_default?: number | null
          pcos?: number | null
          sys_bp?: number | null
          dia_bp?: number | null
          ogtt?: number | null
          hemoglobin?: number | null
          sedentary_lifestyle?: number | null
          prediabetes?: number | null
          created_at?: string | null
        }
      }
      meal_logs: {
        Row: {
          id: string
          user_id: string
          meal_type: string
          logged_date: string
          total_carbs_g: number | null
          total_sugar_g: number | null
          total_fiber_g: number | null
          total_fat_g: number | null
          total_iron_mg: number | null
          total_calcium_mg: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          meal_type: string
          logged_date?: string
          total_carbs_g?: number | null
          total_sugar_g?: number | null
          total_fiber_g?: number | null
          total_fat_g?: number | null
          total_iron_mg?: number | null
          total_calcium_mg?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          meal_type?: string
          logged_date?: string
          total_carbs_g?: number | null
          total_sugar_g?: number | null
          total_fiber_g?: number | null
          total_fat_g?: number | null
          total_iron_mg?: number | null
          total_calcium_mg?: number | null
          created_at?: string | null
        }
      }
      meal_items: {
        Row: {
          id: string
          meal_log_id: string
          food_id: string
          item_name: string
          image_uri: string | null
          serving_multiplier: number | null
          carbs_g: number | null
          sugar_g: number | null
          fiber_g: number | null
          fat_g: number | null
          iron_mg: number | null
          calcium_mg: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          meal_log_id: string
          food_id: string
          item_name: string
          image_uri?: string | null
          serving_multiplier?: number | null
          carbs_g?: number | null
          sugar_g?: number | null
          fiber_g?: number | null
          fat_g?: number | null
          iron_mg?: number | null
          calcium_mg?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          meal_log_id?: string
          food_id?: string
          item_name?: string
          image_uri?: string | null
          serving_multiplier?: number | null
          carbs_g?: number | null
          sugar_g?: number | null
          fiber_g?: number | null
          fat_g?: number | null
          iron_mg?: number | null
          calcium_mg?: number | null
          created_at?: string | null
        }
      }
      maternal_foods: {
        Row: {
          food_id: string
          display_name: string
          carbs_g: number | null
          sugar_g: number | null
          fiber_g: number | null
          fat_g: number | null
          iron_mg: number | null
          calcium_mg: number | null
          created_at: string | null
        }
        Insert: {
          food_id: string
          display_name: string
          carbs_g?: number | null
          sugar_g?: number | null
          fiber_g?: number | null
          fat_g?: number | null
          iron_mg?: number | null
          calcium_mg?: number | null
          created_at?: string | null
        }
        Update: {
          food_id?: string
          display_name?: string
          carbs_g?: number | null
          sugar_g?: number | null
          fiber_g?: number | null
          fat_g?: number | null
          iron_mg?: number | null
          calcium_mg?: number | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
