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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      action_history: {
        Row: {
          action_id: string
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["action_status"] | null
          note: string | null
          old_status: Database["public"]["Enums"]["action_status"] | null
        }
        Insert: {
          action_id: string
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["action_status"] | null
          note?: string | null
          old_status?: Database["public"]["Enums"]["action_status"] | null
        }
        Update: {
          action_id?: string
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["action_status"] | null
          note?: string | null
          old_status?: Database["public"]["Enums"]["action_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "action_history_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
        ]
      }
      actions: {
        Row: {
          address: string | null
          category: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          estimated_impact: number
          evidence_photos: string[]
          executed_date: string | null
          executed_people_count: number | null
          id: string
          lat: number | null
          lng: number | null
          macroregion_id: string | null
          microregion: string | null
          municipality: string | null
          observations: string | null
          planned_date: string
          planned_time: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          responsible: string | null
          status: Database["public"]["Enums"]["action_status"]
          target_audience: string | null
          team: string[]
          title: string
          type: Database["public"]["Enums"]["action_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_impact?: number
          evidence_photos?: string[]
          executed_date?: string | null
          executed_people_count?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          observations?: string | null
          planned_date: string
          planned_time?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          responsible?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          target_audience?: string | null
          team?: string[]
          title: string
          type?: Database["public"]["Enums"]["action_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_impact?: number
          evidence_photos?: string[]
          executed_date?: string | null
          executed_people_count?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          observations?: string | null
          planned_date?: string
          planned_time?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          responsible?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          target_audience?: string | null
          team?: string[]
          title?: string
          type?: Database["public"]["Enums"]["action_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_macroregion_id_fkey"
            columns: ["macroregion_id"]
            isOneToOne: false
            referencedRelation: "macroregions"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_auto_generated: boolean
          is_read: boolean
          level: Database["public"]["Enums"]["alert_level"]
          macroregion_id: string | null
          recommendation: string | null
          resolved_at: string | null
          severity: number
          status: Database["public"]["Enums"]["alert_status"]
          territory: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_auto_generated?: boolean
          is_read?: boolean
          level?: Database["public"]["Enums"]["alert_level"]
          macroregion_id?: string | null
          recommendation?: string | null
          resolved_at?: string | null
          severity?: number
          status?: Database["public"]["Enums"]["alert_status"]
          territory?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_auto_generated?: boolean
          is_read?: boolean
          level?: Database["public"]["Enums"]["alert_level"]
          macroregion_id?: string | null
          recommendation?: string | null
          resolved_at?: string | null
          severity?: number
          status?: Database["public"]["Enums"]["alert_status"]
          territory?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_macroregion_id_fkey"
            columns: ["macroregion_id"]
            isOneToOne: false
            referencedRelation: "macroregions"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_members: {
        Row: {
          actions_managed: number
          completion_rate: number
          created_at: string
          created_by: string | null
          email: string | null
          hierarchy_level: number
          id: string
          macroregion_id: string | null
          microregion: string | null
          municipality: string | null
          name: string
          observations: string | null
          phone: string | null
          role: string
          status: string
          supervisor_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actions_managed?: number
          completion_rate?: number
          created_at?: string
          created_by?: string | null
          email?: string | null
          hierarchy_level?: number
          id?: string
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          name: string
          observations?: string | null
          phone?: string | null
          role?: string
          status?: string
          supervisor_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actions_managed?: number
          completion_rate?: number
          created_at?: string
          created_by?: string | null
          email?: string | null
          hierarchy_level?: number
          id?: string
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          name?: string
          observations?: string | null
          phone?: string | null
          role?: string
          status?: string
          supervisor_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_members_macroregion_id_fkey"
            columns: ["macroregion_id"]
            isOneToOne: false
            referencedRelation: "macroregions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_members_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "campaign_members"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          bio: string | null
          cargo: string
          created_at: string
          created_by: string | null
          election_year: number
          id: string
          is_active: boolean
          name: string
          party: string
          photo_url: string | null
          state: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          cargo?: string
          created_at?: string
          created_by?: string | null
          election_year?: number
          id?: string
          is_active?: boolean
          name: string
          party?: string
          photo_url?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          cargo?: string
          created_at?: string
          created_by?: string | null
          election_year?: number
          id?: string
          is_active?: boolean
          name?: string
          party?: string
          photo_url?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      electoral_surveys: {
        Row: {
          cargos: string[]
          collection_end: string | null
          collection_start: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          file_name: string | null
          id: string
          institute: string
          margin_of_error: number
          methodology: string | null
          release_date: string
          sample_size: number
          territory: string
          tse_registration: string | null
          updated_at: string
        }
        Insert: {
          cargos?: string[]
          collection_end?: string | null
          collection_start?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          file_name?: string | null
          id?: string
          institute: string
          margin_of_error?: number
          methodology?: string | null
          release_date: string
          sample_size?: number
          territory?: string
          tse_registration?: string | null
          updated_at?: string
        }
        Update: {
          cargos?: string[]
          collection_end?: string | null
          collection_start?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          file_name?: string | null
          id?: string
          institute?: string
          margin_of_error?: number
          methodology?: string | null
          release_date?: string
          sample_size?: number
          territory?: string
          tse_registration?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      macroregions: {
        Row: {
          center_lat: number | null
          center_lng: number | null
          coordinator: string | null
          created_at: string
          id: string
          municipalities_count: number
          name: string
        }
        Insert: {
          center_lat?: number | null
          center_lng?: number | null
          coordinator?: string | null
          created_at?: string
          id: string
          municipalities_count?: number
          name: string
        }
        Update: {
          center_lat?: number | null
          center_lng?: number | null
          coordinator?: string | null
          created_at?: string
          id?: string
          municipalities_count?: number
          name?: string
        }
        Relationships: []
      }
      political_assets: {
        Row: {
          alignment_status: Database["public"]["Enums"]["alignment_status"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          id: string
          influence_level: number
          lat: number | null
          lng: number | null
          macroregion_id: string | null
          microregion: string | null
          municipality: string | null
          name: string
          observations: string | null
          phone: string | null
          position: string | null
          relationship_owner: string | null
          support_status: string | null
          type: Database["public"]["Enums"]["asset_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alignment_status?: Database["public"]["Enums"]["alignment_status"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          influence_level?: number
          lat?: number | null
          lng?: number | null
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          name: string
          observations?: string | null
          phone?: string | null
          position?: string | null
          relationship_owner?: string | null
          support_status?: string | null
          type?: Database["public"]["Enums"]["asset_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alignment_status?: Database["public"]["Enums"]["alignment_status"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          influence_level?: number
          lat?: number | null
          lng?: number | null
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          name?: string
          observations?: string | null
          phone?: string | null
          position?: string | null
          relationship_owner?: string | null
          support_status?: string | null
          type?: Database["public"]["Enums"]["asset_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "political_assets_macroregion_id_fkey"
            columns: ["macroregion_id"]
            isOneToOne: false
            referencedRelation: "macroregions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      strategic_alerts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_read: boolean
          macroregion_id: string | null
          microregion: string | null
          municipality: string | null
          opportunity_index: number | null
          recommendation: string | null
          resolved_at: string | null
          risk_index: number | null
          score: number | null
          severity: number
          source_data: Json | null
          status: Database["public"]["Enums"]["strategic_alert_status"]
          territory: string | null
          title: string
          type: Database["public"]["Enums"]["strategic_alert_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          opportunity_index?: number | null
          recommendation?: string | null
          resolved_at?: string | null
          risk_index?: number | null
          score?: number | null
          severity?: number
          source_data?: Json | null
          status?: Database["public"]["Enums"]["strategic_alert_status"]
          territory?: string | null
          title: string
          type?: Database["public"]["Enums"]["strategic_alert_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          opportunity_index?: number | null
          recommendation?: string | null
          resolved_at?: string | null
          risk_index?: number | null
          score?: number | null
          severity?: number
          source_data?: Json | null
          status?: Database["public"]["Enums"]["strategic_alert_status"]
          territory?: string | null
          title?: string
          type?: Database["public"]["Enums"]["strategic_alert_type"]
          updated_at?: string
        }
        Relationships: []
      }
      survey_questions: {
        Row: {
          cargo: string
          created_at: string
          id: string
          note: string | null
          question_type: string
          scenario_label: string
          sort_order: number
          survey_id: string
        }
        Insert: {
          cargo: string
          created_at?: string
          id?: string
          note?: string | null
          question_type: string
          scenario_label?: string
          sort_order?: number
          survey_id: string
        }
        Update: {
          cargo?: string
          created_at?: string
          id?: string
          note?: string | null
          question_type?: string
          scenario_label?: string
          sort_order?: number
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "electoral_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_results: {
        Row: {
          candidate_name: string
          created_at: string
          id: string
          is_excluded: boolean
          percentage: number
          question_id: string
        }
        Insert: {
          candidate_name: string
          created_at?: string
          id?: string
          is_excluded?: boolean
          percentage?: number
          question_id: string
        }
        Update: {
          candidate_name?: string
          created_at?: string
          id?: string
          is_excluded?: boolean
          percentage?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_results_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          macroregion_id: string | null
          microregion: string | null
          municipality: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_kpis: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      action_status:
        | "prevista"
        | "confirmada"
        | "em_andamento"
        | "realizada"
        | "atrasada"
        | "cancelada"
        | "pendente_validacao"
      action_type:
        | "reuniao_politica"
        | "visita_institucional"
        | "mobilizacao_comunitaria"
        | "adesivacao"
        | "panfletagem"
        | "carreata"
        | "evento_regional"
        | "agenda_candidato"
        | "reuniao_empresarios"
        | "encontro_liderancas"
        | "acao_digital"
      alert_level: "critico" | "atencao" | "oportunidade" | "info"
      alert_status: "novo" | "em_analise" | "resolvido"
      alignment_status:
        | "alinhado"
        | "provavel"
        | "neutro"
        | "oposicao"
        | "indefinido"
      app_role:
        | "admin_master"
        | "coordenador_geral"
        | "coordenador_estadual"
        | "coordenador_regional"
        | "coordenador_microrregional"
        | "coordenador_municipal"
        | "lideranca_local"
        | "operador_campo"
        | "analista_inteligencia"
        | "analista_pesquisa"
        | "executivo_leitura"
      asset_type:
        | "prefeito"
        | "ex_prefeito"
        | "pretenso_prefeito"
        | "vereador"
        | "ex_vereador"
        | "pretenso_vereador"
        | "lideranca_comunitaria"
        | "lideranca_empresarial"
        | "lideranca_religiosa"
        | "presidente_entidade"
        | "influenciador_regional"
        | "coordenador_partidario"
      priority_level: "critica" | "alta" | "media" | "baixa"
      strategic_alert_status:
        | "ativo"
        | "em_analise"
        | "resolvido"
        | "descartado"
      strategic_alert_type:
        | "risco_operacional"
        | "risco_eleitoral"
        | "ineficiencia_atuacao"
        | "oportunidade_estrategica"
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
      action_status: [
        "prevista",
        "confirmada",
        "em_andamento",
        "realizada",
        "atrasada",
        "cancelada",
        "pendente_validacao",
      ],
      action_type: [
        "reuniao_politica",
        "visita_institucional",
        "mobilizacao_comunitaria",
        "adesivacao",
        "panfletagem",
        "carreata",
        "evento_regional",
        "agenda_candidato",
        "reuniao_empresarios",
        "encontro_liderancas",
        "acao_digital",
      ],
      alert_level: ["critico", "atencao", "oportunidade", "info"],
      alert_status: ["novo", "em_analise", "resolvido"],
      alignment_status: [
        "alinhado",
        "provavel",
        "neutro",
        "oposicao",
        "indefinido",
      ],
      app_role: [
        "admin_master",
        "coordenador_geral",
        "coordenador_estadual",
        "coordenador_regional",
        "coordenador_microrregional",
        "coordenador_municipal",
        "lideranca_local",
        "operador_campo",
        "analista_inteligencia",
        "analista_pesquisa",
        "executivo_leitura",
      ],
      asset_type: [
        "prefeito",
        "ex_prefeito",
        "pretenso_prefeito",
        "vereador",
        "ex_vereador",
        "pretenso_vereador",
        "lideranca_comunitaria",
        "lideranca_empresarial",
        "lideranca_religiosa",
        "presidente_entidade",
        "influenciador_regional",
        "coordenador_partidario",
      ],
      priority_level: ["critica", "alta", "media", "baixa"],
      strategic_alert_status: [
        "ativo",
        "em_analise",
        "resolvido",
        "descartado",
      ],
      strategic_alert_type: [
        "risco_operacional",
        "risco_eleitoral",
        "ineficiencia_atuacao",
        "oportunidade_estrategica",
      ],
    },
  },
} as const
