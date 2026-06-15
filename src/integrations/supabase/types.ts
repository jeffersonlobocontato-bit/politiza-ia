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
          candidate_id: string | null
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
          impact_score: number | null
          lat: number | null
          lng: number | null
          macroregion_id: string | null
          microregion: string | null
          municipality: string | null
          municipality_population_snapshot: number | null
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
          candidate_id?: string | null
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
          impact_score?: number | null
          lat?: number | null
          lng?: number | null
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          municipality_population_snapshot?: number | null
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
          candidate_id?: string | null
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
          impact_score?: number | null
          lat?: number | null
          lng?: number | null
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          municipality_population_snapshot?: number | null
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
          hierarchy_chain: Json | null
          id: string
          is_auto_generated: boolean
          is_read: boolean
          level: Database["public"]["Enums"]["alert_level"]
          macroregion_id: string | null
          recommendation: string | null
          resolution_note: string | null
          resolved_at: string | null
          responsible_name: string | null
          responsible_role: string | null
          severity: number
          status: Database["public"]["Enums"]["alert_status"]
          territory: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          hierarchy_chain?: Json | null
          id?: string
          is_auto_generated?: boolean
          is_read?: boolean
          level?: Database["public"]["Enums"]["alert_level"]
          macroregion_id?: string | null
          recommendation?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          responsible_name?: string | null
          responsible_role?: string | null
          severity?: number
          status?: Database["public"]["Enums"]["alert_status"]
          territory?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          hierarchy_chain?: Json | null
          id?: string
          is_auto_generated?: boolean
          is_read?: boolean
          level?: Database["public"]["Enums"]["alert_level"]
          macroregion_id?: string | null
          recommendation?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          responsible_name?: string | null
          responsible_role?: string | null
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
      asset_leadership_profiles: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_leadership_profiles_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "political_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_leadership_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leadership_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      association_members: {
        Row: {
          association_id: string
          created_at: string
          id: string
          municipality_name: string
        }
        Insert: {
          association_id: string
          created_at?: string
          id?: string
          municipality_name: string
        }
        Update: {
          association_id?: string
          created_at?: string
          id?: string
          municipality_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "association_members_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "municipality_associations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_member_associations: {
        Row: {
          association_id: string
          created_at: string
          id: string
          member_id: string
        }
        Insert: {
          association_id: string
          created_at?: string
          id?: string
          member_id: string
        }
        Update: {
          association_id?: string
          created_at?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_member_associations_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "municipality_associations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_member_associations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "campaign_members"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_member_leadership_profiles: {
        Row: {
          created_at: string
          id: string
          member_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_member_leadership_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "campaign_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_member_leadership_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leadership_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_member_macroregions: {
        Row: {
          created_at: string
          id: string
          macroregion_id: string
          member_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          macroregion_id: string
          member_id: string
        }
        Update: {
          created_at?: string
          id?: string
          macroregion_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_member_macroregions_macroregion_id_fkey"
            columns: ["macroregion_id"]
            isOneToOne: false
            referencedRelation: "macroregions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_member_macroregions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "campaign_members"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_members: {
        Row: {
          actions_managed: number
          candidate_id: string | null
          completion_rate: number
          created_at: string
          created_by: string | null
          email: string | null
          hierarchy_level: number
          id: string
          lat: number | null
          lng: number | null
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
          candidate_id?: string | null
          completion_rate?: number
          created_at?: string
          created_by?: string | null
          email?: string | null
          hierarchy_level?: number
          id?: string
          lat?: number | null
          lng?: number | null
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
          candidate_id?: string | null
          completion_rate?: number
          created_at?: string
          created_by?: string | null
          email?: string | null
          hierarchy_level?: number
          id?: string
          lat?: number | null
          lng?: number | null
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
          name_aliases: string[]
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
          name_aliases?: string[]
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
          name_aliases?: string[]
          party?: string
          photo_url?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          blocked: string | null
          candidate_id: string | null
          checkin_date: string
          created_at: string
          deleted_at: string | null
          delivered: string
          id: string
          planned: string
          updated_at: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          blocked?: string | null
          candidate_id?: string | null
          checkin_date?: string
          created_at?: string
          deleted_at?: string | null
          delivered: string
          id?: string
          planned: string
          updated_at?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          blocked?: string | null
          candidate_id?: string | null
          checkin_date?: string
          created_at?: string
          deleted_at?: string | null
          delivered?: string
          id?: string
          planned?: string
          updated_at?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkins_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      electoral_surveys: {
        Row: {
          candidate_id: string | null
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
          candidate_id?: string | null
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
          candidate_id?: string | null
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
      fiscalize_attachments: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          mime: string | null
          name: string
          path: string
          report_id: string
          size: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          mime?: string | null
          name: string
          path: string
          report_id: string
          size?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          mime?: string | null
          name?: string
          path?: string
          report_id?: string
          size?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscalize_attachments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "fiscalize_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscalize_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "juridico_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscalize_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscalize_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string
          report_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note: string
          report_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string
          report_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscalize_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "fiscalize_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscalize_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          mentions: string[]
          report_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          mentions?: string[]
          report_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          mentions?: string[]
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscalize_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "juridico_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscalize_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscalize_notes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "fiscalize_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscalize_reports: {
        Row: {
          address: string | null
          ai_risk_score: number | null
          ai_summary: string | null
          assigned_lawyer_id: string | null
          assigned_to: string | null
          candidate_id: string | null
          category: string
          client_ip: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          denounced_name: string
          denounced_party: string | null
          denounced_role: string | null
          evidence: Json
          id: string
          last_activity_at: string
          lat: number | null
          legal_notes: string | null
          lng: number | null
          municipality: string | null
          narrative: string
          protocol_number: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          address?: string | null
          ai_risk_score?: number | null
          ai_summary?: string | null
          assigned_lawyer_id?: string | null
          assigned_to?: string | null
          candidate_id?: string | null
          category: string
          client_ip?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          denounced_name: string
          denounced_party?: string | null
          denounced_role?: string | null
          evidence?: Json
          id?: string
          last_activity_at?: string
          lat?: number | null
          legal_notes?: string | null
          lng?: number | null
          municipality?: string | null
          narrative: string
          protocol_number?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          address?: string | null
          ai_risk_score?: number | null
          ai_summary?: string | null
          assigned_lawyer_id?: string | null
          assigned_to?: string | null
          candidate_id?: string | null
          category?: string
          client_ip?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          denounced_name?: string
          denounced_party?: string | null
          denounced_role?: string | null
          evidence?: Json
          id?: string
          last_activity_at?: string
          lat?: number | null
          legal_notes?: string | null
          lng?: number | null
          municipality?: string | null
          narrative?: string
          protocol_number?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscalize_reports_assigned_lawyer_id_fkey"
            columns: ["assigned_lawyer_id"]
            isOneToOne: false
            referencedRelation: "juridico_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscalize_reports_assigned_lawyer_id_fkey"
            columns: ["assigned_lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscalize_reports_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      leader_leadership_profiles: {
        Row: {
          created_at: string
          id: string
          leader_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leader_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leader_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leader_leadership_profiles_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "leaders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leader_leadership_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "leadership_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leader_party_history: {
        Row: {
          created_at: string
          end_year: number | null
          id: string
          leader_id: string
          observations: string | null
          party_name: string
          start_year: number | null
        }
        Insert: {
          created_at?: string
          end_year?: number | null
          id?: string
          leader_id: string
          observations?: string | null
          party_name: string
          start_year?: number | null
        }
        Update: {
          created_at?: string
          end_year?: number | null
          id?: string
          leader_id?: string
          observations?: string | null
          party_name?: string
          start_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leader_party_history_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "leaders"
            referencedColumns: ["id"]
          },
        ]
      }
      leader_political_history: {
        Row: {
          created_at: string
          election_years: string[] | null
          electoral_performance: string | null
          held_mandate: boolean | null
          id: string
          leader_id: string
          mandate_count: number | null
          observations: string | null
          positions_disputed: string[] | null
          positions_held: string[] | null
          times_candidate: number | null
          updated_at: string
          was_candidate: boolean | null
          was_councilperson: boolean | null
          was_neighborhood_president: boolean | null
        }
        Insert: {
          created_at?: string
          election_years?: string[] | null
          electoral_performance?: string | null
          held_mandate?: boolean | null
          id?: string
          leader_id: string
          mandate_count?: number | null
          observations?: string | null
          positions_disputed?: string[] | null
          positions_held?: string[] | null
          times_candidate?: number | null
          updated_at?: string
          was_candidate?: boolean | null
          was_councilperson?: boolean | null
          was_neighborhood_president?: boolean | null
        }
        Update: {
          created_at?: string
          election_years?: string[] | null
          electoral_performance?: string | null
          held_mandate?: boolean | null
          id?: string
          leader_id?: string
          mandate_count?: number | null
          observations?: string | null
          positions_disputed?: string[] | null
          positions_held?: string[] | null
          times_candidate?: number | null
          updated_at?: string
          was_candidate?: boolean | null
          was_councilperson?: boolean | null
          was_neighborhood_president?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "leader_political_history_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "leaders"
            referencedColumns: ["id"]
          },
        ]
      }
      leaders: {
        Row: {
          alignment_status: string | null
          candidate_id: string | null
          coordinator_id: string | null
          coverage_type: string
          created_at: string
          created_by: string | null
          current_party: string | null
          deleted_at: string | null
          email: string | null
          entry_date: string | null
          estimated_supporters: number
          id: string
          influence_level: number
          lat: number | null
          lng: number | null
          local_reputation: number
          macroregion_id: string | null
          microregion: string | null
          mobilization_capacity: number
          municipality: string | null
          name: string
          neighborhood: string | null
          observations: string | null
          phone: string | null
          photo_url: string | null
          political_reliability: number
          relationship_owner: string | null
          secondary_territories: Json | null
          status: string
          support_status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alignment_status?: string | null
          candidate_id?: string | null
          coordinator_id?: string | null
          coverage_type?: string
          created_at?: string
          created_by?: string | null
          current_party?: string | null
          deleted_at?: string | null
          email?: string | null
          entry_date?: string | null
          estimated_supporters?: number
          id?: string
          influence_level?: number
          lat?: number | null
          lng?: number | null
          local_reputation?: number
          macroregion_id?: string | null
          microregion?: string | null
          mobilization_capacity?: number
          municipality?: string | null
          name: string
          neighborhood?: string | null
          observations?: string | null
          phone?: string | null
          photo_url?: string | null
          political_reliability?: number
          relationship_owner?: string | null
          secondary_territories?: Json | null
          status?: string
          support_status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alignment_status?: string | null
          candidate_id?: string | null
          coordinator_id?: string | null
          coverage_type?: string
          created_at?: string
          created_by?: string | null
          current_party?: string | null
          deleted_at?: string | null
          email?: string | null
          entry_date?: string | null
          estimated_supporters?: number
          id?: string
          influence_level?: number
          lat?: number | null
          lng?: number | null
          local_reputation?: number
          macroregion_id?: string | null
          microregion?: string | null
          mobilization_capacity?: number
          municipality?: string | null
          name?: string
          neighborhood?: string | null
          observations?: string | null
          phone?: string | null
          photo_url?: string | null
          political_reliability?: number
          relationship_owner?: string | null
          secondary_territories?: Json | null
          status?: string
          support_status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leaders_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaders_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "campaign_members"
            referencedColumns: ["id"]
          },
        ]
      }
      leadership_profiles: {
        Row: {
          active: boolean
          category: string | null
          color: string
          created_at: string
          description: string | null
          id: string
          level: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          level?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          level?: string
          name?: string
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
      municipalities: {
        Row: {
          address: string | null
          cep: string | null
          created_at: string
          id: string
          mayor_name: string | null
          name: string
          neighborhood: string | null
          phone: string | null
          population: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cep?: string | null
          created_at?: string
          id?: string
          mayor_name?: string | null
          name: string
          neighborhood?: string | null
          phone?: string | null
          population?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cep?: string | null
          created_at?: string
          id?: string
          mayor_name?: string | null
          name?: string
          neighborhood?: string | null
          phone?: string | null
          population?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      municipality_associations: {
        Row: {
          acronym: string
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          polo_city: string | null
          president_city: string | null
          president_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          acronym: string
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          polo_city?: string | null
          president_city?: string | null
          president_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          acronym?: string
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          polo_city?: string | null
          president_city?: string | null
          president_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          report_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          report_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          report_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "fiscalize_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      party_slate_candidates: {
        Row: {
          association: string | null
          candidate_id: string | null
          cargo: string
          city: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          filiacao_note: string | null
          filiacao_status: string
          general_status: string | null
          id: string
          instagram_url: string | null
          is_active: boolean
          name: string
          notes: string | null
          order_index: number
          party: string
          phone: string | null
          photo_url: string | null
          updated_at: string
          votes_bom: number | null
          votes_medio: number | null
          votes_ruim: number | null
        }
        Insert: {
          association?: string | null
          candidate_id?: string | null
          cargo: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          filiacao_note?: string | null
          filiacao_status?: string
          general_status?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          order_index: number
          party: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          votes_bom?: number | null
          votes_medio?: number | null
          votes_ruim?: number | null
        }
        Update: {
          association?: string | null
          candidate_id?: string | null
          cargo?: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          filiacao_note?: string | null
          filiacao_status?: string
          general_status?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          order_index?: number
          party?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          votes_bom?: number | null
          votes_medio?: number | null
          votes_ruim?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "party_slate_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      political_assets: {
        Row: {
          alignment_status: Database["public"]["Enums"]["alignment_status"]
          candidate_id: string | null
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
          candidate_id?: string | null
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
          candidate_id?: string | null
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
          hierarchy_chain: Json | null
          id: string
          is_read: boolean
          macroregion_id: string | null
          microregion: string | null
          municipality: string | null
          opportunity_index: number | null
          recommendation: string | null
          resolution_note: string | null
          resolved_at: string | null
          responsible_name: string | null
          responsible_role: string | null
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
          hierarchy_chain?: Json | null
          id?: string
          is_read?: boolean
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          opportunity_index?: number | null
          recommendation?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          responsible_name?: string | null
          responsible_role?: string | null
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
          hierarchy_chain?: Json | null
          id?: string
          is_read?: boolean
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          opportunity_index?: number | null
          recommendation?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          responsible_name?: string | null
          responsible_role?: string | null
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
          is_main_scenario: boolean
          is_multiple_choice: boolean
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
          is_main_scenario?: boolean
          is_multiple_choice?: boolean
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
          is_main_scenario?: boolean
          is_multiple_choice?: boolean
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
      tasks: {
        Row: {
          area: Database["public"]["Enums"]["task_area"]
          assigned_name: string | null
          assigned_to: string | null
          candidate_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          area?: Database["public"]["Enums"]["task_area"]
          assigned_name?: string | null
          assigned_to?: string | null
          candidate_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          area?: Database["public"]["Enums"]["task_area"]
          assigned_name?: string | null
          assigned_to?: string | null
          candidate_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_ai_alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["tracking_alert_type"]
          candidate_id: string
          capillarity_index: number | null
          created_at: string
          description: string | null
          field_actions_count: number | null
          generated_from: Json | null
          id: string
          macroregion_id: string | null
          microregion: string | null
          municipality: string | null
          priority_score: number | null
          recommendation: string | null
          resolution_note: string | null
          round_id: string
          severity: number
          status: Database["public"]["Enums"]["tracking_insight_status"]
          title: string
          tracking_variation: number | null
          updated_at: string
        }
        Insert: {
          alert_type?: Database["public"]["Enums"]["tracking_alert_type"]
          candidate_id: string
          capillarity_index?: number | null
          created_at?: string
          description?: string | null
          field_actions_count?: number | null
          generated_from?: Json | null
          id?: string
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          priority_score?: number | null
          recommendation?: string | null
          resolution_note?: string | null
          round_id: string
          severity?: number
          status?: Database["public"]["Enums"]["tracking_insight_status"]
          title: string
          tracking_variation?: number | null
          updated_at?: string
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["tracking_alert_type"]
          candidate_id?: string
          capillarity_index?: number | null
          created_at?: string
          description?: string | null
          field_actions_count?: number | null
          generated_from?: Json | null
          id?: string
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          priority_score?: number | null
          recommendation?: string | null
          resolution_note?: string | null
          round_id?: string
          severity?: number
          status?: Database["public"]["Enums"]["tracking_insight_status"]
          title?: string
          tracking_variation?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_ai_alerts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_ai_alerts_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "tracking_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_ai_config: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          model: string
          system_instructions: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          model?: string
          system_instructions?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          model?: string
          system_instructions?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_ai_config_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_ai_insights: {
        Row: {
          candidate_id: string
          capillarity_score: number | null
          created_at: string
          description: string | null
          efficiency_score: number | null
          id: string
          insight_type: Database["public"]["Enums"]["tracking_insight_type"]
          macroregion_id: string | null
          microregion: string | null
          municipality: string | null
          priority_score: number | null
          recommendation: string | null
          resolution_note: string | null
          round_id: string
          severity: number
          source_data: Json | null
          status: Database["public"]["Enums"]["tracking_insight_status"]
          territory_scope: string | null
          title: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          capillarity_score?: number | null
          created_at?: string
          description?: string | null
          efficiency_score?: number | null
          id?: string
          insight_type?: Database["public"]["Enums"]["tracking_insight_type"]
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          priority_score?: number | null
          recommendation?: string | null
          resolution_note?: string | null
          round_id: string
          severity?: number
          source_data?: Json | null
          status?: Database["public"]["Enums"]["tracking_insight_status"]
          territory_scope?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          capillarity_score?: number | null
          created_at?: string
          description?: string | null
          efficiency_score?: number | null
          id?: string
          insight_type?: Database["public"]["Enums"]["tracking_insight_type"]
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          priority_score?: number | null
          recommendation?: string | null
          resolution_note?: string | null
          round_id?: string
          severity?: number
          source_data?: Json | null
          status?: Database["public"]["Enums"]["tracking_insight_status"]
          territory_scope?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_ai_insights_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_ai_insights_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "tracking_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_ai_knowledge: {
        Row: {
          candidate_id: string
          content_text: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          uploaded_by: string | null
        }
        Insert: {
          candidate_id: string
          content_text?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          candidate_id?: string
          content_text?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_ai_knowledge_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_ai_messages: {
        Row: {
          candidate_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          role: string
        }
        Insert: {
          candidate_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          role: string
        }
        Update: {
          candidate_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_ai_messages_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_interview_answers: {
        Row: {
          answer_value: string
          candidate_name: string | null
          created_at: string
          id: string
          interview_id: string
          question_key: string
        }
        Insert: {
          answer_value: string
          candidate_name?: string | null
          created_at?: string
          id?: string
          interview_id: string
          question_key: string
        }
        Update: {
          answer_value?: string
          candidate_name?: string | null
          created_at?: string
          id?: string
          interview_id?: string
          question_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_interview_answers_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "tracking_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_interviewers: {
        Row: {
          candidate_id: string
          city: string | null
          created_at: string
          created_by: string | null
          email: string
          id: string
          name: string
          phone: string | null
          status: string
          user_id: string
        }
        Insert: {
          candidate_id: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          status?: string
          user_id: string
        }
        Update: {
          candidate_id?: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_interviewers_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_interviews: {
        Row: {
          created_at: string
          id: string
          interviewer_id: string
          lat: number | null
          lng: number | null
          macroregion_id: string | null
          microregion: string | null
          municipality: string | null
          respondent_age_range: string | null
          respondent_education: string | null
          respondent_gender: string | null
          respondent_income: string | null
          round_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interviewer_id: string
          lat?: number | null
          lng?: number | null
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          respondent_age_range?: string | null
          respondent_education?: string | null
          respondent_gender?: string | null
          respondent_income?: string | null
          round_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interviewer_id?: string
          lat?: number | null
          lng?: number | null
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          respondent_age_range?: string | null
          respondent_education?: string | null
          respondent_gender?: string | null
          respondent_income?: string | null
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_interviews_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "tracking_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_round_questions: {
        Row: {
          allow_other: boolean | null
          conditional_question_key: string | null
          conditional_value: string | null
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          label: string
          options: Json | null
          question_key: string
          question_type: string
          round_id: string
          sort_order: number
        }
        Insert: {
          allow_other?: boolean | null
          conditional_question_key?: string | null
          conditional_value?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          label: string
          options?: Json | null
          question_key: string
          question_type?: string
          round_id: string
          sort_order?: number
        }
        Update: {
          allow_other?: boolean | null
          conditional_question_key?: string | null
          conditional_value?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          label?: string
          options?: Json | null
          question_key?: string
          question_type?: string
          round_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "tracking_round_questions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "tracking_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_rounds: {
        Row: {
          candidate_id: string
          city: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          id: string
          macroregion_id: string | null
          microregion: string | null
          municipality: string | null
          share_code: string | null
          start_date: string
          start_time: string | null
          state: string | null
          status: Database["public"]["Enums"]["tracking_round_status"]
          target_interviews: number
          territory_scope: string
          title: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          share_code?: string | null
          start_date?: string
          start_time?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["tracking_round_status"]
          target_interviews?: number
          territory_scope?: string
          title: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          share_code?: string | null
          start_date?: string
          start_time?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["tracking_round_status"]
          target_interviews?: number
          territory_scope?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_rounds_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_candidates: {
        Row: {
          candidate_id: string
          created_at: string
          created_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
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
      vote_projection_revisions: {
        Row: {
          id: string
          new_intermediate: number
          new_optimistic: number
          new_pessimistic: number
          prev_intermediate: number
          prev_optimistic: number
          prev_pessimistic: number
          projection_id: string
          revised_at: string
          revised_by: string | null
          revision_reason: string | null
        }
        Insert: {
          id?: string
          new_intermediate: number
          new_optimistic: number
          new_pessimistic: number
          prev_intermediate: number
          prev_optimistic: number
          prev_pessimistic: number
          projection_id: string
          revised_at?: string
          revised_by?: string | null
          revision_reason?: string | null
        }
        Update: {
          id?: string
          new_intermediate?: number
          new_optimistic?: number
          new_pessimistic?: number
          prev_intermediate?: number
          prev_optimistic?: number
          prev_pessimistic?: number
          projection_id?: string
          revised_at?: string
          revised_by?: string | null
          revision_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vote_projection_revisions_projection_id_fkey"
            columns: ["projection_id"]
            isOneToOne: false
            referencedRelation: "vote_projections"
            referencedColumns: ["id"]
          },
        ]
      }
      vote_projections: {
        Row: {
          candidacy_type: string
          candidate_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          intermediate: number
          justification: string | null
          leader_id: string
          macroregion_id: string | null
          microregion: string | null
          municipality: string | null
          neighborhood: string | null
          observations: string | null
          optimistic: number
          pessimistic: number
          projection_date: string
          reliability_index: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          candidacy_type?: string
          candidate_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          intermediate: number
          justification?: string | null
          leader_id: string
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          neighborhood?: string | null
          observations?: string | null
          optimistic: number
          pessimistic: number
          projection_date?: string
          reliability_index?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          candidacy_type?: string
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          intermediate?: number
          justification?: string | null
          leader_id?: string
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          neighborhood?: string | null
          observations?: string | null
          optimistic?: number
          pessimistic?: number
          projection_date?: string
          reliability_index?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vote_projections_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_projections_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "leaders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      juridico_users: {
        Row: {
          email: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          email?: string | null
          full_name?: string | null
          id?: string | null
        }
        Update: {
          email?: string | null
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_by_creator_party: {
        Args: { _created_by: string; _user_id: string }
        Returns: boolean
      }
      can_view_candidate_record: {
        Args: { _candidate_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_creator_record: {
        Args: { _created_by: string; _user_id: string }
        Returns: boolean
      }
      can_view_party_record: {
        Args: { _created_by: string; _record_party: string; _user_id: string }
        Returns: boolean
      }
      get_dashboard_kpis: { Args: never; Returns: Json }
      get_productivity_ranking: {
        Args: { p_candidate_id?: string; p_period_days?: number }
        Returns: Json
      }
      get_tracking_evolution: {
        Args: { p_candidate_id: string }
        Returns: Json
      }
      get_user_candidate_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_party: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      user_has_candidate_scope: { Args: { _user_id: string }; Returns: boolean }
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
        | "gestor_estadual_novo"
        | "gestor_estadual_pl"
        | "juridico"
        | "gestor_operacional"
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
      task_area: "central" | "regional" | "partidario"
      task_priority: "urgente" | "alta" | "normal" | "baixa"
      task_status: "a_fazer" | "em_andamento" | "bloqueado" | "concluido"
      tracking_alert_type:
        | "baixa_capilaridade"
        | "queda_tracking"
        | "oportunidade_expansao"
        | "baixa_eficiencia"
        | "indecisos_altos"
      tracking_insight_status:
        | "novo"
        | "visualizado"
        | "em_analise"
        | "resolvido"
      tracking_insight_type:
        | "performance"
        | "eficiencia"
        | "capilaridade"
        | "oportunidade"
      tracking_round_status: "rascunho" | "aberta" | "fechada" | "em_analise"
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
        "gestor_estadual_novo",
        "gestor_estadual_pl",
        "juridico",
        "gestor_operacional",
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
      task_area: ["central", "regional", "partidario"],
      task_priority: ["urgente", "alta", "normal", "baixa"],
      task_status: ["a_fazer", "em_andamento", "bloqueado", "concluido"],
      tracking_alert_type: [
        "baixa_capilaridade",
        "queda_tracking",
        "oportunidade_expansao",
        "baixa_eficiencia",
        "indecisos_altos",
      ],
      tracking_insight_status: [
        "novo",
        "visualizado",
        "em_analise",
        "resolvido",
      ],
      tracking_insight_type: [
        "performance",
        "eficiencia",
        "capilaridade",
        "oportunidade",
      ],
      tracking_round_status: ["rascunho", "aberta", "fechada", "em_analise"],
    },
  },
} as const
