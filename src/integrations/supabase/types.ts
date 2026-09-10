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
      animal_guardians: {
        Row: {
          animal_id: string
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean
          person_id: string
          relationship: string
        }
        Insert: {
          animal_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          person_id: string
          relationship?: string
        }
        Update: {
          animal_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          person_id?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "animal_guardians_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_guardians_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          archived_at: string | null
          birth_date: string | null
          clinic_id: string | null
          breed: string | null
          created_at: string
          created_by: string | null
          id: string
          microchip_number: string | null
          name: string
          organization_id: string
          sex: string | null
          species: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          birth_date?: string | null
          breed?: string | null
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          microchip_number?: string | null
          name: string
          organization_id: string
          sex?: string | null
          species: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          birth_date?: string | null
          breed?: string | null
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          microchip_number?: string | null
          name?: string
          organization_id?: string
          sex?: string | null
          species?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animals_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          clinic_id: string
          clinic_service_id: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          organization_id: string
          patient_id: string
          reason: string | null
          scheduled_at: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          clinic_id: string
          clinic_service_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          organization_id: string
          patient_id: string
          reason?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          clinic_id?: string
          clinic_service_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          organization_id?: string
          patient_id?: string
          reason?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_clinic_service_id_fkey"
            columns: ["clinic_service_id"]
            isOneToOne: false
            referencedRelation: "clinic_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_table: string
          id: string
          metadata: Json
          organization_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_table: string
          id?: string
          metadata?: Json
          organization_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_table?: string
          id?: string
          metadata?: Json
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_services: {
        Row: {
          clinic_id: string
          code: string
          created_at: string
          duration_minutes: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          code: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          code?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_note_versions: {
        Row: {
          author_id: string
          clinical_note_id: string
          content: string
          created_at: string
          id: string
          reason: string | null
          version_number: number
        }
        Insert: {
          author_id: string
          clinical_note_id: string
          content: string
          created_at?: string
          id?: string
          reason?: string | null
          version_number: number
        }
        Update: {
          author_id?: string
          clinical_note_id?: string
          content?: string
          created_at?: string
          id?: string
          reason?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_note_versions_clinical_note_id_fkey"
            columns: ["clinical_note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_notes: {
        Row: {
          author_id: string
          authored_at: string
          clinical_record_id: string
          content: string
          created_at: string
          encounter_id: string | null
          id: string
          note_type: string
          signed_at: string | null
          supersedes_note_id: string | null
        }
        Insert: {
          author_id: string
          authored_at?: string
          clinical_record_id: string
          content: string
          created_at?: string
          encounter_id?: string | null
          id?: string
          note_type?: string
          signed_at?: string | null
          supersedes_note_id?: string | null
        }
        Update: {
          author_id?: string
          authored_at?: string
          clinical_record_id?: string
          content?: string
          created_at?: string
          encounter_id?: string | null
          id?: string
          note_type?: string
          signed_at?: string | null
          supersedes_note_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_clinical_record_id_fkey"
            columns: ["clinical_record_id"]
            isOneToOne: false
            referencedRelation: "clinical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_supersedes_note_id_fkey"
            columns: ["supersedes_note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_procedures: {
        Row: {
          archived_at: string | null
          clinic_id: string
          code: string
          created_at: string
          created_by: string | null
          encounter_id: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          patient_id: string | null
          performed_at: string | null
          status: string
        }
        Insert: {
          archived_at?: string | null
          clinic_id: string
          code: string
          created_at?: string
          created_by?: string | null
          encounter_id?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          patient_id?: string | null
          performed_at?: string | null
          status?: string
        }
        Update: {
          archived_at?: string | null
          clinic_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          encounter_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          patient_id?: string | null
          performed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_procedures_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_procedures_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_procedures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_procedures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_records: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          patient_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          patient_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          specialty: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          specialty?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          specialty?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinics_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          consent_type: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          granted_at: string | null
          id: string
          organization_id: string
          patient_id: string
          revoked_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          organization_id: string
          patient_id: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          organization_id?: string
          patient_id?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          document_type: string
          encounter_id: string | null
          file_name: string
          file_size: number | null
          id: string
          mime_type: string
          organization_id: string
          patient_id: string | null
          storage_path: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          document_type: string
          encounter_id?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          mime_type: string
          organization_id: string
          patient_id?: string | null
          storage_path: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          document_type?: string
          encounter_id?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string
          organization_id?: string
          patient_id?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      encounters: {
        Row: {
          appointment_id: string | null
          clinic_id: string
          created_at: string
          created_by: string | null
          ended_at: string | null
          id: string
          organization_id: string
          patient_id: string
          queue_ticket_id: string | null
          started_at: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          appointment_id?: string | null
          clinic_id: string
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          organization_id: string
          patient_id: string
          queue_ticket_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          organization_id?: string
          patient_id?: string
          queue_ticket_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encounters_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_queue_ticket_id_fkey"
            columns: ["queue_ticket_id"]
            isOneToOne: false
            referencedRelation: "queue_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          created_at: string
          evaluator_user_id: string
          feedback: string | null
          id: string
          rubric: Json
          score: number | null
          submitted_at: string | null
          supervision_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evaluator_user_id: string
          feedback?: string | null
          id?: string
          rubric?: Json
          score?: number | null
          submitted_at?: string | null
          supervision_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evaluator_user_id?: string
          feedback?: string | null
          id?: string
          rubric?: Json
          score?: number | null
          submitted_at?: string | null
          supervision_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_supervision_id_fkey"
            columns: ["supervision_id"]
            isOneToOne: false
            referencedRelation: "student_supervisions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_orders: {
        Row: {
          clinic_id: string
          completed_at: string | null
          created_by: string | null
          encounter_id: string | null
          exam_name: string
          id: string
          organization_id: string
          patient_id: string
          requested_at: string
          result_summary: string | null
          status: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          completed_at?: string | null
          created_by?: string | null
          encounter_id?: string | null
          exam_name: string
          id?: string
          organization_id: string
          patient_id: string
          requested_at?: string
          result_summary?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          completed_at?: string | null
          created_by?: string | null
          encounter_id?: string | null
          exam_name?: string
          id?: string
          organization_id?: string
          patient_id?: string
          requested_at?: string
          result_summary?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_orders_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_orders_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          organization_id: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          organization_id: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          display_name: string
          document_number: string | null
          id: string
          is_active: boolean
          legal_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          document_number?: string | null
          id?: string
          is_active?: boolean
          legal_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          document_number?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          person_id: string
          record_number: string
          registered_at: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          person_id: string
          record_number: string
          registered_at?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          person_id?: string
          record_number?: string
          registered_at?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_clinic_links: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          id: string
          patient_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_clinic_links_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_clinic_links_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      persons: {
        Row: {
          archived_at: string | null
          birth_date: string | null
          created_at: string
          created_by: string | null
          document_number: string | null
          email: string | null
          full_name: string
          id: string
          organization_id: string
          phone: string | null
          preferred_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          document_number?: string | null
          email?: string | null
          full_name: string
          id?: string
          organization_id: string
          phone?: string | null
          preferred_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          document_number?: string | null
          email?: string | null
          full_name?: string
          id?: string
          organization_id?: string
          phone?: string | null
          preferred_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      queue_sessions: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          service_date: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          service_date?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          service_date?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_sessions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_tickets: {
        Row: {
          appointment_id: string | null
          called_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          patient_id: string
          priority: string
          queue_session_id: string
          status: string
          ticket_number: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          appointment_id?: string | null
          called_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id: string
          priority?: string
          queue_session_id: string
          status?: string
          ticket_number: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          appointment_id?: string | null
          called_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id?: string
          priority?: string
          queue_session_id?: string
          status?: string
          ticket_number?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_tickets_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_tickets_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_tickets_queue_session_id_fkey"
            columns: ["queue_session_id"]
            isOneToOne: false
            referencedRelation: "queue_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      student_supervisions: {
        Row: {
          clinic_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          encounter_id: string | null
          id: string
          organization_id: string
          started_at: string | null
          status: string
          student_user_id: string
          supervisor_user_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          clinic_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          encounter_id?: string | null
          id?: string
          organization_id: string
          started_at?: string | null
          status?: string
          student_user_id: string
          supervisor_user_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          encounter_id?: string | null
          id?: string
          organization_id?: string
          started_at?: string | null
          status?: string
          student_user_id?: string
          supervisor_user_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_supervisions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_supervisions_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_supervisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          address_line1: string | null
          city: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          city?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          city?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_clinic_scopes: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          revoked_at: string | null
          user_role_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          revoked_at?: string | null
          user_role_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          revoked_at?: string | null
          user_role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_clinic_scopes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_clinic_scopes_user_role_id_fkey"
            columns: ["user_role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean
          organization_id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_clinical_note: {
        Args: {
          correction_of?: string
          correction_reason?: string
          note_content: string
          target_encounter_id: string
          target_note_type: string
        }
        Returns: string
      }
      issue_queue_ticket: {
        Args: {
          target_appointment_id?: string
          target_patient_id: string
          target_queue_session_id: string
          ticket_priority?: string
        }
        Returns: string
      }
      register_patient: {
        Args: {
          patient_birth_date?: string
          patient_document_number?: string
          patient_email?: string
          patient_full_name: string
          patient_phone?: string
          patient_preferred_name?: string
          patient_record_number: string
          target_organization_id: string
          target_clinic_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
