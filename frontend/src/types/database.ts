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
      candidate: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      candidate_profile: {
        Row: {
          candidate_id: string
          career_intent: string | null
          certifications: Json | null
          current_employer: string | null
          current_job_title: string | null
          degree: string | null
          field_of_study: string | null
          graduation_year: number | null
          id: string
          institution: string | null
          projects: Json | null
          skills: Json | null
          underemployment_flag: boolean
          updated_at: string
          visibility_status: Database["public"]["Enums"]["visibility_status_enum"]
          years_of_experience: number | null
        }
        Insert: {
          candidate_id: string
          career_intent?: string | null
          certifications?: Json | null
          current_employer?: string | null
          current_job_title?: string | null
          degree?: string | null
          field_of_study?: string | null
          graduation_year?: number | null
          id?: string
          institution?: string | null
          projects?: Json | null
          skills?: Json | null
          underemployment_flag?: boolean
          updated_at?: string
          visibility_status?: Database["public"]["Enums"]["visibility_status_enum"]
          years_of_experience?: number | null
        }
        Update: {
          candidate_id?: string
          career_intent?: string | null
          certifications?: Json | null
          current_employer?: string | null
          current_job_title?: string | null
          degree?: string | null
          field_of_study?: string | null
          graduation_year?: number | null
          id?: string
          institution?: string | null
          projects?: Json | null
          skills?: Json | null
          underemployment_flag?: boolean
          updated_at?: string
          visibility_status?: Database["public"]["Enums"]["visibility_status_enum"]
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profile_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidate"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_assessment: {
        Row: {
          candidate_id: string
          created_at: string
          dimensions: Json
          id: string
          model_version: string
          tier_1_coverage: number | null
          tier_2_coverage: number | null
          tier_3_coverage: number | null
          tier_4_trajectory_score: number | null
          underemployment_signal: boolean
        }
        Insert: {
          candidate_id: string
          created_at?: string
          dimensions: Json
          id?: string
          model_version: string
          tier_1_coverage?: number | null
          tier_2_coverage?: number | null
          tier_3_coverage?: number | null
          tier_4_trajectory_score?: number | null
          underemployment_signal?: boolean
        }
        Update: {
          candidate_id?: string
          created_at?: string
          dimensions?: Json
          id?: string
          model_version?: string
          tier_1_coverage?: number | null
          tier_2_coverage?: number | null
          tier_3_coverage?: number | null
          tier_4_trajectory_score?: number | null
          underemployment_signal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "capability_assessment_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate"
            referencedColumns: ["id"]
          },
        ]
      }
      employer: {
        Row: {
          company_name: string
          created_at: string
          id: string
          industry: string | null
          size_band: Database["public"]["Enums"]["employer_size_enum"] | null
          verified: boolean
          website: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: string
          industry?: string | null
          size_band?: Database["public"]["Enums"]["employer_size_enum"] | null
          verified?: boolean
          website?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          industry?: string | null
          size_band?: Database["public"]["Enums"]["employer_size_enum"] | null
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      employer_user: {
        Row: {
          created_at: string
          email: string
          employer_id: string
          id: string
          name: string
          role: Database["public"]["Enums"]["employer_user_role_enum"]
        }
        Insert: {
          created_at?: string
          email: string
          employer_id: string
          id?: string
          name: string
          role?: Database["public"]["Enums"]["employer_user_role_enum"]
        }
        Update: {
          created_at?: string
          email?: string
          employer_id?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["employer_user_role_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "employer_user_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer"
            referencedColumns: ["id"]
          },
        ]
      }
      interaction_event: {
        Row: {
          actor_id: string
          actor_type: Database["public"]["Enums"]["actor_type_enum"]
          created_at: string
          event_type: Database["public"]["Enums"]["event_type_enum"]
          id: string
          payload: Json | null
          related_entity_id: string | null
          related_entity_type: string | null
        }
        Insert: {
          actor_id: string
          actor_type: Database["public"]["Enums"]["actor_type_enum"]
          created_at?: string
          event_type: Database["public"]["Enums"]["event_type_enum"]
          id?: string
          payload?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Update: {
          actor_id?: string
          actor_type?: Database["public"]["Enums"]["actor_type_enum"]
          created_at?: string
          event_type?: Database["public"]["Enums"]["event_type_enum"]
          id?: string
          payload?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Relationships: []
      }
      match: {
        Row: {
          assessment_id: string
          candidate_id: string
          created_at: string
          id: string
          map_id: string
          model_version: string
          overall_score: number
          role_id: string
          status: Database["public"]["Enums"]["match_status_enum"]
          tier_1_score: number | null
          tier_2_score: number | null
          tier_3_score: number | null
          tier_4_score: number | null
          underemployment_surfaced: boolean
          updated_at: string
        }
        Insert: {
          assessment_id: string
          candidate_id: string
          created_at?: string
          id?: string
          map_id: string
          model_version: string
          overall_score: number
          role_id: string
          status?: Database["public"]["Enums"]["match_status_enum"]
          tier_1_score?: number | null
          tier_2_score?: number | null
          tier_3_score?: number | null
          tier_4_score?: number | null
          underemployment_surfaced?: boolean
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          candidate_id?: string
          created_at?: string
          id?: string
          map_id?: string
          model_version?: string
          overall_score?: number
          role_id?: string
          status?: Database["public"]["Enums"]["match_status_enum"]
          tier_1_score?: number | null
          tier_2_score?: number | null
          tier_3_score?: number | null
          tier_4_score?: number | null
          underemployment_surfaced?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "capability_assessment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "role_capability_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
        ]
      }
      match_explanation: {
        Row: {
          ats_bypass_reasoning: string | null
          bridge_suggestion: string | null
          candidate_facing_text: string
          created_at: string
          employer_facing_text: string
          gap_dimensions: Json | null
          id: string
          match_id: string
          model_version: string
          partial_dimensions: Json | null
          strong_dimensions: Json
        }
        Insert: {
          ats_bypass_reasoning?: string | null
          bridge_suggestion?: string | null
          candidate_facing_text: string
          created_at?: string
          employer_facing_text: string
          gap_dimensions?: Json | null
          id?: string
          match_id: string
          model_version: string
          partial_dimensions?: Json | null
          strong_dimensions: Json
        }
        Update: {
          ats_bypass_reasoning?: string | null
          bridge_suggestion?: string | null
          candidate_facing_text?: string
          created_at?: string
          employer_facing_text?: string
          gap_dimensions?: Json | null
          id?: string
          match_id?: string
          model_version?: string
          partial_dimensions?: Json | null
          strong_dimensions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "match_explanation_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "match"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_message: {
        Row: {
          character_count: number | null
          delivery_status: Database["public"]["Enums"]["delivery_status_enum"]
          draft_text: string
          employer_edited: boolean
          final_text: string | null
          id: string
          match_id: string
          sent_at: string | null
        }
        Insert: {
          character_count?: number | null
          delivery_status?: Database["public"]["Enums"]["delivery_status_enum"]
          draft_text: string
          employer_edited?: boolean
          final_text?: string | null
          id?: string
          match_id: string
          sent_at?: string | null
        }
        Update: {
          character_count?: number | null
          delivery_status?: Database["public"]["Enums"]["delivery_status_enum"]
          draft_text?: string
          employer_edited?: boolean
          final_text?: string | null
          id?: string
          match_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_message_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "match"
            referencedColumns: ["id"]
          },
        ]
      }
      reengage_record: {
        Row: {
          candidate_id: string
          created_at: string
          employer_id: string
          gap_delta: Json
          id: string
          notified_at: string | null
          original_match_id: string
          outreach_message_id: string | null
          previous_assessment_id: string
          status: Database["public"]["Enums"]["reengage_status_enum"]
          trigger_assessment_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          employer_id: string
          gap_delta: Json
          id?: string
          notified_at?: string | null
          original_match_id: string
          outreach_message_id?: string | null
          previous_assessment_id: string
          status?: Database["public"]["Enums"]["reengage_status_enum"]
          trigger_assessment_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          employer_id?: string
          gap_delta?: Json
          id?: string
          notified_at?: string | null
          original_match_id?: string
          outreach_message_id?: string | null
          previous_assessment_id?: string
          status?: Database["public"]["Enums"]["reengage_status_enum"]
          trigger_assessment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reengage_record_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reengage_record_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reengage_record_original_match_id_fkey"
            columns: ["original_match_id"]
            isOneToOne: false
            referencedRelation: "match"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reengage_record_outreach_message_id_fkey"
            columns: ["outreach_message_id"]
            isOneToOne: false
            referencedRelation: "outreach_message"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reengage_record_previous_assessment_id_fkey"
            columns: ["previous_assessment_id"]
            isOneToOne: false
            referencedRelation: "capability_assessment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reengage_record_trigger_assessment_id_fkey"
            columns: ["trigger_assessment_id"]
            isOneToOne: false
            referencedRelation: "capability_assessment"
            referencedColumns: ["id"]
          },
        ]
      }
      role: {
        Row: {
          context_notes: string | null
          created_at: string
          created_by: string | null
          description_raw: string
          employer_id: string
          id: string
          location_type:
            | Database["public"]["Enums"]["location_type_enum"]
            | null
          seniority_level: Database["public"]["Enums"]["seniority_enum"] | null
          status: Database["public"]["Enums"]["role_status_enum"]
          title: string
          updated_at: string
        }
        Insert: {
          context_notes?: string | null
          created_at?: string
          created_by?: string | null
          description_raw: string
          employer_id: string
          id?: string
          location_type?:
            | Database["public"]["Enums"]["location_type_enum"]
            | null
          seniority_level?: Database["public"]["Enums"]["seniority_enum"] | null
          status?: Database["public"]["Enums"]["role_status_enum"]
          title: string
          updated_at?: string
        }
        Update: {
          context_notes?: string | null
          created_at?: string
          created_by?: string | null
          description_raw?: string
          employer_id?: string
          id?: string
          location_type?:
            | Database["public"]["Enums"]["location_type_enum"]
            | null
          seniority_level?: Database["public"]["Enums"]["seniority_enum"] | null
          status?: Database["public"]["Enums"]["role_status_enum"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employer_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer"
            referencedColumns: ["id"]
          },
        ]
      }
      role_capability_map: {
        Row: {
          created_at: string
          dimensions: Json
          edit_notes: string | null
          employer_edited: boolean
          id: string
          model_version: string
          role_id: string
        }
        Insert: {
          created_at?: string
          dimensions: Json
          edit_notes?: string | null
          employer_edited?: boolean
          id?: string
          model_version: string
          role_id: string
        }
        Update: {
          created_at?: string
          dimensions?: Json
          edit_notes?: string | null
          employer_edited?: boolean
          id?: string
          model_version?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_capability_map_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      actor_type_enum: "candidate" | "employer"
      confidence_enum: "verified" | "inferred" | "self_reported"
      delivery_status_enum: "draft" | "sent" | "delivered" | "failed"
      employer_size_enum: "startup" | "sme" | "enterprise"
      employer_user_role_enum: "admin" | "member" | "viewer"
      event_type_enum:
        | "visibility_changed"
        | "match_accepted"
        | "match_declined"
        | "interest_expressed"
        | "reengage_opted_in"
        | "reengage_opted_out"
        | "profile_updated"
        | "message_sent"
        | "message_read"
        | "role_posted"
        | "role_closed"
      location_type_enum: "remote" | "hybrid" | "onsite"
      match_status_enum:
        | "pending"
        | "notified"
        | "accepted"
        | "declined"
        | "expired"
        | "withdrawn"
      reengage_status_enum:
        | "pending"
        | "notified"
        | "accepted"
        | "declined"
        | "expired"
      role_status_enum: "draft" | "active" | "paused" | "filled" | "closed"
      seniority_enum: "junior" | "mid" | "senior" | "lead" | "executive"
      visibility_status_enum: "open" | "passive" | "closed"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      actor_type_enum: ["candidate", "employer"],
      confidence_enum: ["verified", "inferred", "self_reported"],
      delivery_status_enum: ["draft", "sent", "delivered", "failed"],
      employer_size_enum: ["startup", "sme", "enterprise"],
      employer_user_role_enum: ["admin", "member", "viewer"],
      event_type_enum: [
        "visibility_changed",
        "match_accepted",
        "match_declined",
        "interest_expressed",
        "reengage_opted_in",
        "reengage_opted_out",
        "profile_updated",
        "message_sent",
        "message_read",
        "role_posted",
        "role_closed",
      ],
      location_type_enum: ["remote", "hybrid", "onsite"],
      match_status_enum: [
        "pending",
        "notified",
        "accepted",
        "declined",
        "expired",
        "withdrawn",
      ],
      reengage_status_enum: [
        "pending",
        "notified",
        "accepted",
        "declined",
        "expired",
      ],
      role_status_enum: ["draft", "active", "paused", "filled", "closed"],
      seniority_enum: ["junior", "mid", "senior", "lead", "executive"],
      visibility_status_enum: ["open", "passive", "closed"],
    },
  },
} as const

