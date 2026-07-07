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
      academic_events: {
        Row: {
          created_at: string
          ends_at: string | null
          event_type: string
          id: string
          starts_at: string
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          event_type: string
          id?: string
          starts_at: string
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          event_type?: string
          id?: string
          starts_at?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_events_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: string
          body: string
          created_at: string
          id: string
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          id?: string
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          id?: string
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          class_date: string
          created_at: string
          enrollment_id: string
          hours: number
          id: string
          notes: string | null
          recorded_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          class_date: string
          created_at?: string
          enrollment_id: string
          hours?: number
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          class_date?: string
          created_at?: string
          enrollment_id?: string
          hours?: number
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      classes: {
        Row: {
          academic_period: string
          capacity: number
          code: string
          course_id: string | null
          created_at: string
          enrolled_count: number
          id: string
          name: string
          professor_id: string | null
          room: string | null
          schedule: Json
          shift: string
          status: string
          subject_id: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          academic_period: string
          capacity?: number
          code: string
          course_id?: string | null
          created_at?: string
          enrolled_count?: number
          id?: string
          name: string
          professor_id?: string | null
          room?: string | null
          schedule?: Json
          shift: string
          status?: string
          subject_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_period?: string
          capacity?: number
          code?: string
          course_id?: string | null
          created_at?: string
          enrolled_count?: number
          id?: string
          name?: string
          professor_id?: string | null
          room?: string | null
          schedule?: Json
          shift?: string
          status?: string
          subject_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          id: string
          message: string
          priority: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          target_id: string | null
          target_type: string
          title: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          priority?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          target_id?: string | null
          target_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          priority?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          target_id?: string | null
          target_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          coordinator_name: string | null
          created_at: string
          degree_type: string
          duration_semesters: number
          id: string
          modality: string
          name: string
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          coordinator_name?: string | null
          created_at?: string
          degree_type: string
          duration_semesters?: number
          id?: string
          modality?: string
          name: string
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          coordinator_name?: string | null
          created_at?: string
          degree_type?: string
          duration_semesters?: number
          id?: string
          modality?: string
          name?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          class_id: string
          created_at: string
          enrolled_at: string
          id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          enrolled_at?: string
          id?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          enrolled_at?: string
          id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          assessment: string
          created_at: string
          enrollment_id: string
          id: string
          max_score: number
          notes: string | null
          released_at: string | null
          released_by: string | null
          score: number | null
          updated_at: string
          weight: number
        }
        Insert: {
          assessment: string
          created_at?: string
          enrollment_id: string
          id?: string
          max_score?: number
          notes?: string | null
          released_at?: string | null
          released_by?: string | null
          score?: number | null
          updated_at?: string
          weight?: number
        }
        Update: {
          assessment?: string
          created_at?: string
          enrollment_id?: string
          id?: string
          max_score?: number
          notes?: string | null
          released_at?: string | null
          released_by?: string | null
          score?: number | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "grades_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_slips: {
        Row: {
          amount: number
          barcode: string | null
          charge_id: string | null
          created_at: string
          digitable_line: string | null
          due_date: string
          id: string
          issued_at: string
          notes: string | null
          paid_at: string | null
          pdf_url: string | null
          slip_number: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          barcode?: string | null
          charge_id?: string | null
          created_at?: string
          digitable_line?: string | null
          due_date: string
          id?: string
          issued_at?: string
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          slip_number: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          barcode?: string | null
          charge_id?: string | null
          created_at?: string
          digitable_line?: string | null
          due_date?: string
          id?: string
          issued_at?: string
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          slip_number?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_slips_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "tuition_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_slips_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      professors: {
        Row: {
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          registration: string
          status: string
          title: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          registration: string
          status?: string
          title?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          registration?: string
          status?: string
          title?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professors_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          document_number: string | null
          email: string | null
          full_name: string
          id: string
          is_super_admin: boolean
          password_change_required: boolean
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          document_number?: string | null
          email?: string | null
          full_name: string
          id: string
          is_super_admin?: boolean
          password_change_required?: boolean
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          document_number?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_super_admin?: boolean
          password_change_required?: boolean
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      requirement_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          requirement_id: string
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          requirement_id: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          requirement_id?: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requirement_attachments_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "student_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_categories: {
        Row: {
          code: string
          created_at: string
          department: string | null
          id: string
          is_active: boolean
          name: string
          requires_attachment: boolean
          sla_days: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean
          name: string
          requires_attachment?: boolean
          sla_days?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean
          name?: string
          requires_attachment?: boolean
          sla_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      requirement_comments: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          created_at: string
          id: string
          is_internal: boolean
          requirement_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          requirement_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          requirement_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_comments_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "student_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_read: boolean
          can_update: boolean
          created_at: string
          id: string
          module: string
          role: string
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string
          id?: string
          module: string
          role: string
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      room_reservations: {
        Row: {
          approval_notes: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          end_datetime: string
          event_type: string
          id: string
          requester_id: string | null
          room_id: string
          start_datetime: string
          status: string
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          approval_notes?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          end_datetime: string
          event_type?: string
          id?: string
          requester_id?: string | null
          room_id: string
          start_datetime: string
          status?: string
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          approval_notes?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          end_datetime?: string
          event_type?: string
          id?: string
          requester_id?: string | null
          room_id?: string
          start_datetime?: string
          status?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_reservations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          block: string | null
          capacity: number
          code: string
          created_at: string
          floor: string | null
          has_air_conditioning: boolean
          has_computer: boolean
          has_projector: boolean
          id: string
          name: string
          notes: string | null
          room_type: string
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          block?: string | null
          capacity?: number
          code: string
          created_at?: string
          floor?: string | null
          has_air_conditioning?: boolean
          has_computer?: boolean
          has_projector?: boolean
          id?: string
          name: string
          notes?: string | null
          room_type?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          block?: string | null
          capacity?: number
          code?: string
          created_at?: string
          floor?: string | null
          has_air_conditioning?: boolean
          has_computer?: boolean
          has_projector?: boolean
          id?: string
          name?: string
          notes?: string | null
          room_type?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarships: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          created_by: string | null
          discount_kind: string
          discount_value: number
          id: string
          name: string
          notes: string | null
          type: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          created_by?: string | null
          discount_kind?: string
          discount_value?: number
          id?: string
          name: string
          notes?: string | null
          type?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          created_by?: string | null
          discount_kind?: string
          discount_value?: number
          id?: string
          name?: string
          notes?: string | null
          type?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      student_requirements: {
        Row: {
          assigned_to: string | null
          category_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          protocol_number: string | null
          response: string | null
          status: string
          student_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          protocol_number?: string | null
          response?: string | null
          status?: string
          student_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          protocol_number?: string | null
          response?: string | null
          status?: string
          student_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_requirements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "requirement_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_requirements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_scholarships: {
        Row: {
          created_at: string
          ends_at: string | null
          granted_by: string | null
          id: string
          notes: string | null
          scholarship_id: string
          starts_at: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          scholarship_id: string
          starts_at?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          scholarship_id?: string
          starts_at?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_scholarships_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_scholarships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_period: string
          birth_date: string | null
          class_id: string | null
          course_id: string | null
          created_at: string
          document_number: string | null
          email: string
          enrollment_status: string
          full_name: string
          id: string
          phone: string | null
          registration: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          admission_period?: string
          birth_date?: string | null
          class_id?: string | null
          course_id?: string | null
          created_at?: string
          document_number?: string | null
          email: string
          enrollment_status?: string
          full_name: string
          id?: string
          phone?: string | null
          registration: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          admission_period?: string
          birth_date?: string | null
          class_id?: string | null
          course_id?: string | null
          created_at?: string
          document_number?: string | null
          email?: string
          enrollment_status?: string
          full_name?: string
          id?: string
          phone?: string | null
          registration?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          course_id: string | null
          created_at: string
          id: string
          name: string
          professor_id: string | null
          semester: number
          status: string
          updated_at: string
          workload_hours: number
        }
        Insert: {
          code: string
          course_id?: string | null
          created_at?: string
          id?: string
          name: string
          professor_id?: string | null
          semester?: number
          status?: string
          updated_at?: string
          workload_hours?: number
        }
        Update: {
          code?: string
          course_id?: string | null
          created_at?: string
          id?: string
          name?: string
          professor_id?: string | null
          semester?: number
          status?: string
          updated_at?: string
          workload_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      tuition_charges: {
        Row: {
          base_amount: number
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discount_amount: number
          due_date: string
          id: string
          net_amount: number | null
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          reference_month: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          base_amount?: number
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number
          due_date: string
          id?: string
          net_amount?: number | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          reference_month: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          base_amount?: number
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number
          due_date?: string
          id?: string
          net_amount?: number | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          reference_month?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tuition_charges_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tuition_charges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          address: string | null
          city: string
          code: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          state: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city: string
          code: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          code?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["app_role"]
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      enrollment_belongs_to_student: {
        Args: { _enrollment_id: string; _user_id: string }
        Returns: boolean
      }
      enrollment_taught_by_professor: {
        Args: { _enrollment_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      mark_charge_paid: {
        Args: {
          _charge_id: string
          _method: string
          _paid_amount: number
          _paid_at?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "administrador"
        | "secretaria"
        | "coordenacao"
        | "professor"
        | "aluno"
        | "financeiro"
        | "atendimento"
        | "gestor_unidade"
        | "operador_espacos"
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
      app_role: [
        "super_admin",
        "administrador",
        "secretaria",
        "coordenacao",
        "professor",
        "aluno",
        "financeiro",
        "atendimento",
        "gestor_unidade",
        "operador_espacos",
      ],
    },
  },
} as const
