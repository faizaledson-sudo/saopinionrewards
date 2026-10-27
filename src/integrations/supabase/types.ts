export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          created_at: string
          id: string
          question_id: string
          response_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          response_id: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          response_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      badges: {
        Row: {
          code: string
          description: string
          icon: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          description: string
          icon?: string
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          description?: string
          icon?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      charges: {
        Row: {
          admin_note: string | null
          amount_kes: number
          created_at: string
          failure_reason: string | null
          id: string
          operator: string
          phone: string
          provider_charge_id: string | null
          provider_transaction_id: string | null
          purpose: Database["public"]["Enums"]["charge_purpose"]
          reverted_at: string | null
          status: Database["public"]["Enums"]["charge_status"]
          target_tier: Database["public"]["Enums"]["plan_tier"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_kes: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          operator?: string
          phone: string
          provider_charge_id?: string | null
          provider_transaction_id?: string | null
          purpose: Database["public"]["Enums"]["charge_purpose"]
          reverted_at?: string | null
          status?: Database["public"]["Enums"]["charge_status"]
          target_tier?: Database["public"]["Enums"]["plan_tier"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_kes?: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          operator?: string
          phone?: string
          provider_charge_id?: string | null
          provider_transaction_id?: string | null
          purpose?: Database["public"]["Enums"]["charge_purpose"]
          reverted_at?: string | null
          status?: Database["public"]["Enums"]["charge_status"]
          target_tier?: Database["public"]["Enums"]["plan_tier"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_activity: {
        Row: {
          day: string
          earned_kes: number
          id: string
          popup_seen: boolean
          surveys_completed: number
          user_id: string
        }
        Insert: {
          day: string
          earned_kes?: number
          id?: string
          popup_seen?: boolean
          surveys_completed?: number
          user_id: string
        }
        Update: {
          day?: string
          earned_kes?: number
          id?: string
          popup_seen?: boolean
          surveys_completed?: number
          user_id?: string
        }
        Relationships: []
      }
      earnings: {
        Row: {
          amount_kes: number
          created_at: string
          id: string
          note: string | null
          survey_id: string | null
          type: Database["public"]["Enums"]["earning_type"]
          user_id: string
        }
        Insert: {
          amount_kes: number
          created_at?: string
          id?: string
          note?: string | null
          survey_id?: string | null
          type: Database["public"]["Enums"]["earning_type"]
          user_id: string
        }
        Update: {
          amount_kes?: number
          created_at?: string
          id?: string
          note?: string | null
          survey_id?: string | null
          type?: Database["public"]["Enums"]["earning_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earnings_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_requests: {
        Row: {
          admin_note: string | null
          id: string
          id_back_path: string | null
          id_front_path: string | null
          instructions: string | null
          kind: Database["public"]["Enums"]["kyc_kind"]
          requested_at: string
          requested_by: string | null
          reviewed_at: string | null
          selfie_path: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          id?: string
          id_back_path?: string | null
          id_front_path?: string | null
          instructions?: string | null
          kind?: Database["public"]["Enums"]["kyc_kind"]
          requested_at?: string
          requested_by?: string | null
          reviewed_at?: string | null
          selfie_path?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          id?: string
          id_back_path?: string | null
          id_front_path?: string | null
          instructions?: string | null
          kind?: Database["public"]["Enums"]["kyc_kind"]
          requested_at?: string
          requested_by?: string | null
          reviewed_at?: string | null
          selfie_path?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          active: boolean
          code: string
          description: string
          goal: number
          id: string
          metric: string
          period: string
          reward_kes: number
          sort_order: number
          title: string
        }
        Insert: {
          active?: boolean
          code: string
          description: string
          goal?: number
          id?: string
          metric?: string
          period?: string
          reward_kes?: number
          sort_order?: number
          title: string
        }
        Update: {
          active?: boolean
          code?: string
          description?: string
          goal?: number
          id?: string
          metric?: string
          period?: string
          reward_kes?: number
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          name: string
          perks: string[]
          price_kes: number
          reward_per_survey: number
          sort_order: number
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at: string
          withdrawal_days: number
        }
        Insert: {
          name: string
          perks?: string[]
          price_kes?: number
          reward_per_survey?: number
          sort_order?: number
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
          withdrawal_days?: number
        }
        Update: {
          name?: string
          perks?: string[]
          price_kes?: number
          reward_per_survey?: number
          sort_order?: number
          tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
          withdrawal_days?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          banned_at: string | null
          created_at: string
          full_name: string | null
          id: string
          last_activity_day: string | null
          last_withdrawal_at: string | null
          mpesa_phone: string | null
          mpesa_verified: boolean
          phone: string
          referral_code: string
          referred_by: string | null
          streak_days: number
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at: string
          xp: number
        }
        Insert: {
          banned_at?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          last_activity_day?: string | null
          last_withdrawal_at?: string | null
          mpesa_phone?: string | null
          mpesa_verified?: boolean
          phone: string
          referral_code: string
          referred_by?: string | null
          streak_days?: number
          tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
          xp?: number
        }
        Update: {
          banned_at?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          last_activity_day?: string | null
          last_withdrawal_at?: string | null
          mpesa_phone?: string | null
          mpesa_verified?: boolean
          phone?: string
          referral_code?: string
          referred_by?: string | null
          streak_days?: number
          tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          id: string
          options: Json
          position: number
          required: boolean
          survey_id: string
          text: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          id?: string
          options?: Json
          position?: number
          required?: boolean
          survey_id: string
          text: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          id?: string
          options?: Json
          position?: number
          required?: boolean
          survey_id?: string
          text?: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          activated: boolean
          activated_at: string | null
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          activated?: boolean
          activated_at?: string | null
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          activated?: boolean
          activated_at?: string | null
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          completed_at: string | null
          id: string
          reward_kes: number
          started_at: string
          status: Database["public"]["Enums"]["response_status"]
          survey_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          reward_kes?: number
          started_at?: string
          status?: Database["public"]["Enums"]["response_status"]
          survey_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          reward_kes?: number
          started_at?: string
          status?: Database["public"]["Enums"]["response_status"]
          survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      secure_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      surveys: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          estimated_minutes: number
          id: string
          min_tier: Database["public"]["Enums"]["plan_tier"]
          status: Database["public"]["Enums"]["survey_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number
          id?: string
          min_tier?: Database["public"]["Enums"]["plan_tier"]
          status?: Database["public"]["Enums"]["survey_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number
          id?: string
          min_tier?: Database["public"]["Enums"]["plan_tier"]
          status?: Database["public"]["Enums"]["survey_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_code: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_code: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_code?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["code"]
          },
        ]
      }
      user_missions: {
        Row: {
          claimed_at: string | null
          id: string
          mission_id: string
          period_start: string
          progress: number
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          id?: string
          mission_id: string
          period_start: string
          progress?: number
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          id?: string
          mission_id?: string
          period_start?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_note: string | null
          amount_kes: number
          id: string
          phone: string
          processed_at: string | null
          requested_at: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_kes: number
          id?: string
          phone: string
          processed_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_kes?: number
          id?: string
          phone?: string
          processed_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      user_balance: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      charge_purpose:
        | "withdrawal_verification"
        | "plan_upgrade"
        | "kyc_verification"
      charge_status:
        | "pending"
        | "completed"
        | "failed"
        | "cancelled"
        | "expired"
      earning_type:
        | "survey"
        | "welcome_bonus"
        | "streak_bonus"
        | "referral"
        | "mission"
        | "admin_adjustment"
      kyc_kind: "documents" | "mpesa" | "both"
      kyc_status: "requested" | "submitted" | "approved" | "rejected"
      plan_tier: "regular" | "vip1" | "vip2" | "vip3"
      question_type:
        | "single_choice"
        | "multi_choice"
        | "scale"
        | "text"
        | "number"
      response_status: "in_progress" | "completed"
      survey_status: "draft" | "active" | "closed"
      withdrawal_status: "pending" | "approved" | "rejected" | "paid"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      charge_purpose: [
        "withdrawal_verification",
        "plan_upgrade",
        "kyc_verification",
      ],
      charge_status: ["pending", "completed", "failed", "cancelled", "expired"],
      earning_type: [
        "survey",
        "welcome_bonus",
        "streak_bonus",
        "referral",
        "mission",
        "admin_adjustment",
      ],
      kyc_kind: ["documents", "mpesa", "both"],
      kyc_status: ["requested", "submitted", "approved", "rejected"],
      plan_tier: ["regular", "vip1", "vip2", "vip3"],
      question_type: [
        "single_choice",
        "multi_choice",
        "scale",
        "text",
        "number",
      ],
      response_status: ["in_progress", "completed"],
      survey_status: ["draft", "active", "closed"],
      withdrawal_status: ["pending", "approved", "rejected", "paid"],
    },
  },
} as const
