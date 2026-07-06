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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounting_exports: {
        Row: {
          arquivo_path: string | null
          concluido_em: string | null
          created_at: string
          created_by: string
          erro_msg: string | null
          formato: string
          hash_integridade: string | null
          id: string
          organization_id: string
          periodo_fim: string
          periodo_inicio: string
          status: string
          tipo: string
          total_linhas: number
        }
        Insert: {
          arquivo_path?: string | null
          concluido_em?: string | null
          created_at?: string
          created_by: string
          erro_msg?: string | null
          formato?: string
          hash_integridade?: string | null
          id?: string
          organization_id: string
          periodo_fim: string
          periodo_inicio: string
          status?: string
          tipo: string
          total_linhas?: number
        }
        Update: {
          arquivo_path?: string | null
          concluido_em?: string | null
          created_at?: string
          created_by?: string
          erro_msg?: string | null
          formato?: string
          hash_integridade?: string | null
          id?: string
          organization_id?: string
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
          tipo?: string
          total_linhas?: number
        }
        Relationships: []
      }
      accounts_payable: {
        Row: {
          categoria: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string
          data_emissao: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string | null
          forma_pagamento: string | null
          id: string
          numero_documento: string | null
          observacoes: string | null
          order_id: string | null
          organization_id: string
          status: string
          supplier_id: string | null
          updated_at: string
          valor_pago: number
          valor_total: number
        }
        Insert: {
          categoria?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          order_id?: string | null
          organization_id: string
          status?: string
          supplier_id?: string | null
          updated_at?: string
          valor_pago?: number
          valor_total: number
        }
        Update: {
          categoria?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          order_id?: string | null
          organization_id?: string
          status?: string
          supplier_id?: string | null
          updated_at?: string
          valor_pago?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      active_sessions: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          last_activity: string
          session_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          last_activity?: string
          session_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          last_activity?: string
          session_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          dados: Json
          decidido_em: string | null
          decidido_por: string | null
          descricao: string
          entidade: string | null
          entidade_id: string | null
          gerado_em: string
          id: string
          organization_id: string
          severidade: string
          status: string
          tipo: string
          titulo: string
        }
        Insert: {
          dados?: Json
          decidido_em?: string | null
          decidido_por?: string | null
          descricao: string
          entidade?: string | null
          entidade_id?: string | null
          gerado_em?: string
          id?: string
          organization_id: string
          severidade?: string
          status?: string
          tipo: string
          titulo: string
        }
        Update: {
          dados?: Json
          decidido_em?: string | null
          decidido_por?: string | null
          descricao?: string
          entidade?: string | null
          entidade_id?: string | null
          gerado_em?: string
          id?: string
          organization_id?: string
          severidade?: string
          status?: string
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      alert_suppressions: {
        Row: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string
          created_by: string
          id: string
          product_id: string | null
          suppressed_until: string
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          created_by: string
          id?: string
          product_id?: string | null
          suppressed_until: string
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          created_by?: string
          id?: string
          product_id?: string | null
          suppressed_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_alert_suppressions_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          organization_id: string | null
          product_id: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          type: Database["public"]["Enums"]["alert_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          organization_id?: string | null
          product_id?: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          type: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          organization_id?: string | null
          product_id?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
          type?: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_alerts_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_alerts_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_delegations: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          destino_user_id: string
          id: string
          motivo: string | null
          organization_id: string
          origem_user_id: string
          updated_at: string
          vigencia_fim: string
          vigencia_inicio: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          destino_user_id: string
          id?: string
          motivo?: string | null
          organization_id: string
          origem_user_id: string
          updated_at?: string
          vigencia_fim: string
          vigencia_inicio: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          destino_user_id?: string
          id?: string
          motivo?: string | null
          organization_id?: string
          origem_user_id?: string
          updated_at?: string
          vigencia_fim?: string
          vigencia_inicio?: string
        }
        Relationships: []
      }
      approval_request_steps: {
        Row: {
          aprovador_papel: string | null
          aprovador_user_id: string | null
          comentario: string | null
          created_at: string
          decidido_em: string | null
          decidido_por: string | null
          escalona_para: string | null
          id: string
          nome: string
          ordem: number
          prazo_em: string | null
          request_id: string
          status: Database["public"]["Enums"]["approval_step_status"]
          tipo: Database["public"]["Enums"]["approval_step_type"]
          updated_at: string
        }
        Insert: {
          aprovador_papel?: string | null
          aprovador_user_id?: string | null
          comentario?: string | null
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          escalona_para?: string | null
          id?: string
          nome: string
          ordem: number
          prazo_em?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["approval_step_status"]
          tipo?: Database["public"]["Enums"]["approval_step_type"]
          updated_at?: string
        }
        Update: {
          aprovador_papel?: string | null
          aprovador_user_id?: string | null
          comentario?: string | null
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          escalona_para?: string | null
          id?: string
          nome?: string
          ordem?: number
          prazo_em?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["approval_step_status"]
          tipo?: Database["public"]["Enums"]["approval_step_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_request_steps_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          concluido_em: string | null
          created_at: string
          etapa_atual: number
          id: string
          iniciado_em: string
          organization_id: string
          referencia_id: string
          referencia_tipo: string
          solicitante_user_id: string | null
          status: Database["public"]["Enums"]["approval_request_status"]
          updated_at: string
          valor: number | null
          workflow_id: string | null
          workflow_snapshot: Json | null
        }
        Insert: {
          concluido_em?: string | null
          created_at?: string
          etapa_atual?: number
          id?: string
          iniciado_em?: string
          organization_id: string
          referencia_id: string
          referencia_tipo: string
          solicitante_user_id?: string | null
          status?: Database["public"]["Enums"]["approval_request_status"]
          updated_at?: string
          valor?: number | null
          workflow_id?: string | null
          workflow_snapshot?: Json | null
        }
        Update: {
          concluido_em?: string | null
          created_at?: string
          etapa_atual?: number
          id?: string
          iniciado_em?: string
          organization_id?: string
          referencia_id?: string
          referencia_tipo?: string
          solicitante_user_id?: string | null
          status?: Database["public"]["Enums"]["approval_request_status"]
          updated_at?: string
          valor?: number | null
          workflow_id?: string | null
          workflow_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_thresholds: {
        Row: {
          created_at: string
          id: string
          ordem: number
          organization_id: string
          papel_aprovador: string
          updated_at: string
          valor_max: number | null
          valor_min: number
        }
        Insert: {
          created_at?: string
          id?: string
          ordem?: number
          organization_id: string
          papel_aprovador: string
          updated_at?: string
          valor_max?: number | null
          valor_min?: number
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          organization_id?: string
          papel_aprovador?: string
          updated_at?: string
          valor_max?: number | null
          valor_min?: number
        }
        Relationships: []
      }
      approval_workflow_steps: {
        Row: {
          aprovador_papel: string | null
          aprovador_user_id: string | null
          created_at: string
          escalona_para: string | null
          id: string
          nome: string
          ordem: number
          sla_horas: number | null
          tipo: Database["public"]["Enums"]["approval_step_type"]
          valor_min: number | null
          workflow_id: string
        }
        Insert: {
          aprovador_papel?: string | null
          aprovador_user_id?: string | null
          created_at?: string
          escalona_para?: string | null
          id?: string
          nome: string
          ordem: number
          sla_horas?: number | null
          tipo?: Database["public"]["Enums"]["approval_step_type"]
          valor_min?: number | null
          workflow_id: string
        }
        Update: {
          aprovador_papel?: string | null
          aprovador_user_id?: string | null
          created_at?: string
          escalona_para?: string | null
          id?: string
          nome?: string
          ordem?: number
          sla_horas?: number | null
          tipo?: Database["public"]["Enums"]["approval_step_type"]
          valor_min?: number | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflows: {
        Row: {
          ativo: boolean
          categoria: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          organization_id: string
          prioridade: number
          referencia_tipo: string
          updated_at: string
          valor_max: number | null
          valor_min: number | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          organization_id: string
          prioridade?: number
          referencia_tipo: string
          updated_at?: string
          valor_max?: number | null
          valor_min?: number | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          organization_id?: string
          prioridade?: number
          referencia_tipo?: string
          updated_at?: string
          valor_max?: number | null
          valor_min?: number | null
        }
        Relationships: []
      }
      asset_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      asset_documents: {
        Row: {
          asset_id: string
          created_at: string
          document_type: string | null
          file_name: string
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          document_type?: string | null
          file_name: string
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          document_type?: string | null
          file_name?: string
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_import_batches: {
        Row: {
          created_at: string
          error_rows: number
          errors_log: Json | null
          file_name: string
          id: string
          imported_at: string
          imported_by: string | null
          imported_rows: number
          notes: string | null
          organization_id: string | null
          status: string
          total_rows: number
        }
        Insert: {
          created_at?: string
          error_rows?: number
          errors_log?: Json | null
          file_name: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          imported_rows?: number
          notes?: string | null
          organization_id?: string | null
          status?: string
          total_rows?: number
        }
        Update: {
          created_at?: string
          error_rows?: number
          errors_log?: Json | null
          file_name?: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          imported_rows?: number
          notes?: string | null
          organization_id?: string | null
          status?: string
          total_rows?: number
        }
        Relationships: []
      }
      asset_inventory_checks: {
        Row: {
          asset_id: string
          checked_at: string
          checked_by: string | null
          condition_found: Database["public"]["Enums"]["asset_condition"] | null
          expected_subspace_id: string | null
          expected_unit_id: string | null
          found_subspace_id: string | null
          found_unit_id: string | null
          id: string
          inventory_batch_id: string | null
          notes: string | null
          was_found: boolean
        }
        Insert: {
          asset_id: string
          checked_at?: string
          checked_by?: string | null
          condition_found?:
            | Database["public"]["Enums"]["asset_condition"]
            | null
          expected_subspace_id?: string | null
          expected_unit_id?: string | null
          found_subspace_id?: string | null
          found_unit_id?: string | null
          id?: string
          inventory_batch_id?: string | null
          notes?: string | null
          was_found?: boolean
        }
        Update: {
          asset_id?: string
          checked_at?: string
          checked_by?: string | null
          condition_found?:
            | Database["public"]["Enums"]["asset_condition"]
            | null
          expected_subspace_id?: string | null
          expected_unit_id?: string | null
          found_subspace_id?: string | null
          found_unit_id?: string | null
          id?: string
          inventory_batch_id?: string | null
          notes?: string | null
          was_found?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "asset_inventory_checks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance_history: {
        Row: {
          asset_id: string
          cost: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          maintenance_date: string
          maintenance_type: string
          next_maintenance_date: string | null
          performed_by: string | null
          related_ticket_id: string | null
        }
        Insert: {
          asset_id: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          maintenance_date?: string
          maintenance_type: string
          next_maintenance_date?: string | null
          performed_by?: string | null
          related_ticket_id?: string | null
        }
        Update: {
          asset_id?: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          maintenance_date?: string
          maintenance_type?: string
          next_maintenance_date?: string | null
          performed_by?: string | null
          related_ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_movements: {
        Row: {
          asset_id: string
          created_at: string
          from_building_id: string | null
          from_sector_id: string | null
          from_subspace_id: string | null
          from_unit_id: string | null
          id: string
          moved_by: string | null
          movement_date: string
          movement_type: string
          notes: string | null
          reason: string | null
          responsible_user_id: string | null
          to_building_id: string | null
          to_sector_id: string | null
          to_subspace_id: string | null
          to_unit_id: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          from_building_id?: string | null
          from_sector_id?: string | null
          from_subspace_id?: string | null
          from_unit_id?: string | null
          id?: string
          moved_by?: string | null
          movement_date?: string
          movement_type?: string
          notes?: string | null
          reason?: string | null
          responsible_user_id?: string | null
          to_building_id?: string | null
          to_sector_id?: string | null
          to_subspace_id?: string | null
          to_unit_id?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          from_building_id?: string | null
          from_sector_id?: string | null
          from_subspace_id?: string | null
          from_unit_id?: string | null
          id?: string
          moved_by?: string | null
          movement_date?: string
          movement_type?: string
          notes?: string | null
          reason?: string | null
          responsible_user_id?: string | null
          to_building_id?: string | null
          to_sector_id?: string | null
          to_subspace_id?: string | null
          to_unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_movements_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_types: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          acquisition_date: string | null
          acquisition_value: number | null
          asset_number: string
          brand: string | null
          building_id: string | null
          category_id: string | null
          color: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          floor_id: string | null
          has_preventive_maintenance: boolean
          id: string
          internal_code: string | null
          invoice_number: string | null
          last_maintenance_date: string | null
          main_photo_url: string | null
          material: string | null
          model: string | null
          name: string
          next_maintenance_date: string | null
          notes: string | null
          organization_id: string | null
          physical_condition: Database["public"]["Enums"]["asset_condition"]
          preventive_frequency: string | null
          purchase_order_id: string | null
          qr_code: string
          responsible_sector_id: string | null
          responsible_team: string | null
          responsible_user_id: string | null
          sector_id: string | null
          serial_number: string | null
          specific_location: string | null
          status: Database["public"]["Enums"]["asset_status"]
          subspace_id: string | null
          supplier_id: string | null
          type_id: string | null
          unit_id: string | null
          updated_at: string
          updated_by: string | null
          warranty_until: string | null
        }
        Insert: {
          acquisition_date?: string | null
          acquisition_value?: number | null
          asset_number: string
          brand?: string | null
          building_id?: string | null
          category_id?: string | null
          color?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          floor_id?: string | null
          has_preventive_maintenance?: boolean
          id?: string
          internal_code?: string | null
          invoice_number?: string | null
          last_maintenance_date?: string | null
          main_photo_url?: string | null
          material?: string | null
          model?: string | null
          name: string
          next_maintenance_date?: string | null
          notes?: string | null
          organization_id?: string | null
          physical_condition?: Database["public"]["Enums"]["asset_condition"]
          preventive_frequency?: string | null
          purchase_order_id?: string | null
          qr_code?: string
          responsible_sector_id?: string | null
          responsible_team?: string | null
          responsible_user_id?: string | null
          sector_id?: string | null
          serial_number?: string | null
          specific_location?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          subspace_id?: string | null
          supplier_id?: string | null
          type_id?: string | null
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          warranty_until?: string | null
        }
        Update: {
          acquisition_date?: string | null
          acquisition_value?: number | null
          asset_number?: string
          brand?: string | null
          building_id?: string | null
          category_id?: string | null
          color?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          floor_id?: string | null
          has_preventive_maintenance?: boolean
          id?: string
          internal_code?: string | null
          invoice_number?: string | null
          last_maintenance_date?: string | null
          main_photo_url?: string | null
          material?: string | null
          model?: string | null
          name?: string
          next_maintenance_date?: string | null
          notes?: string | null
          organization_id?: string | null
          physical_condition?: Database["public"]["Enums"]["asset_condition"]
          preventive_frequency?: string | null
          purchase_order_id?: string | null
          qr_code?: string
          responsible_sector_id?: string | null
          responsible_team?: string | null
          responsible_user_id?: string | null
          sector_id?: string | null
          serial_number?: string | null
          specific_location?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          subspace_id?: string | null
          supplier_id?: string | null
          type_id?: string | null
          unit_id?: string | null
          updated_at?: string
          updated_by?: string | null
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "unit_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "unit_floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "unit_sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_subspace_id_fkey"
            columns: ["subspace_id"]
            isOneToOne: false
            referencedRelation: "unit_subspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      atualizar: {
        Row: {
          created_at: string
          id: number
          numero: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          numero?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          numero?: number | null
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          acoes: Json
          ativo: boolean
          condicoes: Json
          created_at: string
          created_by: string
          descricao: string | null
          id: string
          nome: string
          organization_id: string
          tipo: string
          ultima_execucao: string | null
          updated_at: string
        }
        Insert: {
          acoes?: Json
          ativo?: boolean
          condicoes?: Json
          created_at?: string
          created_by: string
          descricao?: string | null
          id?: string
          nome: string
          organization_id: string
          tipo: string
          ultima_execucao?: string | null
          updated_at?: string
        }
        Update: {
          acoes?: Json
          ativo?: boolean
          condicoes?: Json
          created_at?: string
          created_by?: string
          descricao?: string | null
          id?: string
          nome?: string
          organization_id?: string
          tipo?: string
          ultima_execucao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          agencia: string | null
          ativo: boolean
          banco: string | null
          conta: string | null
          created_at: string
          created_by: string
          id: string
          nome: string
          organization_id: string
          saldo_inicial: number
          tipo: string
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          conta?: string | null
          created_at?: string
          created_by: string
          id?: string
          nome: string
          organization_id: string
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          conta?: string | null
          created_at?: string
          created_by?: string
          id?: string
          nome?: string
          organization_id?: string
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      batch_stock_by_location: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          organization_id: string
          quantidade: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          organization_id: string
          quantidade?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          quantidade?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_stock_by_location_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "product_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_stock_by_location_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      bi_saved_views: {
        Row: {
          created_at: string
          descricao: string | null
          filtros: Json
          grafico: string
          id: string
          nome: string
          organization_id: string
          updated_at: string
          user_id: string
          visibilidade: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          filtros?: Json
          grafico?: string
          id?: string
          nome: string
          organization_id: string
          updated_at?: string
          user_id: string
          visibilidade?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          filtros?: Json
          grafico?: string
          id?: string
          nome?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
          visibilidade?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          ativo: boolean
          category: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string
          id: string
          organization_id: string
          periodo_fim: string
          periodo_inicio: string
          updated_at: string
          valor_alerta_percent: number
          valor_planejado: number
        }
        Insert: {
          ativo?: boolean
          category?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          periodo_fim: string
          periodo_inicio: string
          updated_at?: string
          valor_alerta_percent?: number
          valor_planejado: number
        }
        Update: {
          ativo?: boolean
          category?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          periodo_fim?: string
          periodo_inicio?: string
          updated_at?: string
          valor_alerta_percent?: number
          valor_planejado?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      category_notifications: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          enabled: boolean
          id: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["product_category"]
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_category_notifications_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_approvals: {
        Row: {
          approver_id: string | null
          ci_id: string
          comentario: string | null
          created_at: string
          decided_at: string | null
          id: string
          ordem: number
          organization_id: string
          papel: string
          status: string
        }
        Insert: {
          approver_id?: string | null
          ci_id: string
          comentario?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          ordem: number
          organization_id: string
          papel: string
          status?: string
        }
        Update: {
          approver_id?: string | null
          ci_id?: string
          comentario?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          ordem?: number
          organization_id?: string
          papel?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_approvals_ci_id_fkey"
            columns: ["ci_id"]
            isOneToOne: false
            referencedRelation: "ci_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_attachments: {
        Row: {
          ci_id: string
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          organization_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          ci_id: string
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          organization_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          ci_id?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          organization_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ci_attachments_ci_id_fkey"
            columns: ["ci_id"]
            isOneToOne: false
            referencedRelation: "ci_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_comments: {
        Row: {
          author_id: string | null
          author_name: string | null
          ci_id: string
          content: string
          created_at: string
          id: string
          mentioned: string[] | null
          organization_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          ci_id: string
          content: string
          created_at?: string
          id?: string
          mentioned?: string[] | null
          organization_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          ci_id?: string
          content?: string
          created_at?: string
          id?: string
          mentioned?: string[] | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_comments_ci_id_fkey"
            columns: ["ci_id"]
            isOneToOne: false
            referencedRelation: "ci_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_delivery: {
        Row: {
          ci_id: string
          conferido: boolean
          created_at: string
          created_by: string | null
          data_entrega: string | null
          data_prevista: string | null
          id: string
          observacoes: string | null
          organization_id: string
          recebido_por: string | null
          updated_at: string
        }
        Insert: {
          ci_id: string
          conferido?: boolean
          created_at?: string
          created_by?: string | null
          data_entrega?: string | null
          data_prevista?: string | null
          id?: string
          observacoes?: string | null
          organization_id: string
          recebido_por?: string | null
          updated_at?: string
        }
        Update: {
          ci_id?: string
          conferido?: boolean
          created_at?: string
          created_by?: string | null
          data_entrega?: string | null
          data_prevista?: string | null
          id?: string
          observacoes?: string | null
          organization_id?: string
          recebido_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_delivery_ci_id_fkey"
            columns: ["ci_id"]
            isOneToOne: false
            referencedRelation: "ci_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_items: {
        Row: {
          category_id: string | null
          ci_id: string
          created_at: string
          created_by: string | null
          descricao: string
          especificacao: string | null
          id: string
          observacao: string | null
          organization_id: string
          quantidade: number
          type_id: string | null
          unidade: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          ci_id: string
          created_at?: string
          created_by?: string | null
          descricao: string
          especificacao?: string | null
          id?: string
          observacao?: string | null
          organization_id: string
          quantidade?: number
          type_id?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          ci_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string
          especificacao?: string | null
          id?: string
          observacao?: string | null
          organization_id?: string
          quantidade?: number
          type_id?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ci_items_ci_id_fkey"
            columns: ["ci_id"]
            isOneToOne: false
            referencedRelation: "ci_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ci_items_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_purchase_order: {
        Row: {
          ci_id: string
          created_at: string
          created_by: string | null
          data_emissao: string | null
          id: string
          numero_alterdata: string | null
          observacoes: string | null
          organization_id: string
          status: string
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          ci_id: string
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          id?: string
          numero_alterdata?: string | null
          observacoes?: string | null
          organization_id: string
          status?: string
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          ci_id?: string
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          id?: string
          numero_alterdata?: string | null
          observacoes?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ci_purchase_order_ci_id_fkey"
            columns: ["ci_id"]
            isOneToOne: false
            referencedRelation: "ci_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_quotes: {
        Row: {
          anexo_url: string | null
          ci_id: string
          condicoes_pagamento: string | null
          created_at: string
          created_by: string | null
          escolhida: boolean
          fornecedor: string
          id: string
          observacoes: string | null
          organization_id: string
          prazo_entrega: string | null
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          anexo_url?: string | null
          ci_id: string
          condicoes_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          escolhida?: boolean
          fornecedor: string
          id?: string
          observacoes?: string | null
          organization_id: string
          prazo_entrega?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          anexo_url?: string | null
          ci_id?: string
          condicoes_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          escolhida?: boolean
          fornecedor?: string
          id?: string
          observacoes?: string | null
          organization_id?: string
          prazo_entrega?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ci_quotes_ci_id_fkey"
            columns: ["ci_id"]
            isOneToOne: false
            referencedRelation: "ci_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          assigned_to_secondary: string | null
          campus: string | null
          channel: Database["public"]["Enums"]["ci_channel"]
          cost_center: string | null
          council_decided_at: string | null
          council_decided_by: string | null
          council_decision: string | null
          created_at: string
          created_by: string | null
          current_stage: string
          delivered_at: string | null
          delivery_forecast: string | null
          description: string | null
          destination_sector: string | null
          due_date: string | null
          generated_description: string | null
          id: string
          lookup_token: string
          organization_id: string
          priority: Database["public"]["Enums"]["ci_priority"]
          protocol: string
          purchase_request_id: string | null
          regulatory_review_notes: string | null
          regulatory_reviewed_at: string | null
          regulatory_reviewer_id: string | null
          rejected_reason: string | null
          request_type: string | null
          requester_email: string | null
          requester_name: string
          requester_registration: string | null
          requester_role: string | null
          requester_sector: string | null
          requester_whatsapp: string | null
          requires_regulatory_validation: boolean
          requires_superior_approval: boolean
          requires_technical_validation: boolean
          source_sector: string | null
          status: Database["public"]["Enums"]["ci_status"]
          stock_available: boolean | null
          stock_checked: boolean
          stock_qty: number | null
          subject: string
          technical_review_notes: string | null
          technical_reviewed_at: string | null
          technical_reviewer_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          assigned_to_secondary?: string | null
          campus?: string | null
          channel?: Database["public"]["Enums"]["ci_channel"]
          cost_center?: string | null
          council_decided_at?: string | null
          council_decided_by?: string | null
          council_decision?: string | null
          created_at?: string
          created_by?: string | null
          current_stage?: string
          delivered_at?: string | null
          delivery_forecast?: string | null
          description?: string | null
          destination_sector?: string | null
          due_date?: string | null
          generated_description?: string | null
          id?: string
          lookup_token?: string
          organization_id: string
          priority?: Database["public"]["Enums"]["ci_priority"]
          protocol?: string
          purchase_request_id?: string | null
          regulatory_review_notes?: string | null
          regulatory_reviewed_at?: string | null
          regulatory_reviewer_id?: string | null
          rejected_reason?: string | null
          request_type?: string | null
          requester_email?: string | null
          requester_name: string
          requester_registration?: string | null
          requester_role?: string | null
          requester_sector?: string | null
          requester_whatsapp?: string | null
          requires_regulatory_validation?: boolean
          requires_superior_approval?: boolean
          requires_technical_validation?: boolean
          source_sector?: string | null
          status?: Database["public"]["Enums"]["ci_status"]
          stock_available?: boolean | null
          stock_checked?: boolean
          stock_qty?: number | null
          subject: string
          technical_review_notes?: string | null
          technical_reviewed_at?: string | null
          technical_reviewer_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          assigned_to_secondary?: string | null
          campus?: string | null
          channel?: Database["public"]["Enums"]["ci_channel"]
          cost_center?: string | null
          council_decided_at?: string | null
          council_decided_by?: string | null
          council_decision?: string | null
          created_at?: string
          created_by?: string | null
          current_stage?: string
          delivered_at?: string | null
          delivery_forecast?: string | null
          description?: string | null
          destination_sector?: string | null
          due_date?: string | null
          generated_description?: string | null
          id?: string
          lookup_token?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["ci_priority"]
          protocol?: string
          purchase_request_id?: string | null
          regulatory_review_notes?: string | null
          regulatory_reviewed_at?: string | null
          regulatory_reviewer_id?: string | null
          rejected_reason?: string | null
          request_type?: string | null
          requester_email?: string | null
          requester_name?: string
          requester_registration?: string | null
          requester_role?: string | null
          requester_sector?: string | null
          requester_whatsapp?: string | null
          requires_regulatory_validation?: boolean
          requires_superior_approval?: boolean
          requires_technical_validation?: boolean
          source_sector?: string | null
          status?: Database["public"]["Enums"]["ci_status"]
          stock_available?: boolean | null
          stock_checked?: boolean
          stock_qty?: number | null
          subject?: string
          technical_review_notes?: string | null
          technical_reviewed_at?: string | null
          technical_reviewer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_requests_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_status_history: {
        Row: {
          actor_id: string | null
          ci_id: string
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          organization_id: string
          payload: Json | null
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          ci_id: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          organization_id: string
          payload?: Json | null
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          ci_id?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          organization_id?: string
          payload?: Json | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ci_status_history_ci_id_fkey"
            columns: ["ci_id"]
            isOneToOne: false
            referencedRelation: "ci_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_templates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          organization_id: string
          payload: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ci_validation_attachments: {
        Row: {
          ci_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          organization_id: string
          size_bytes: number | null
          uploaded_by: string
          validation_type: string
        }
        Insert: {
          ci_id: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          organization_id: string
          size_bytes?: number | null
          uploaded_by: string
          validation_type: string
        }
        Update: {
          ci_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          organization_id?: string
          size_bytes?: number | null
          uploaded_by?: string
          validation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ci_validation_attachments_ci_id_fkey"
            columns: ["ci_id"]
            isOneToOne: false
            referencedRelation: "ci_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          autor_id: string
          conteudo: string
          created_at: string
          editado_em: string | null
          id: string
          mencionados: string[]
          organization_id: string
          thread_id: string
        }
        Insert: {
          autor_id: string
          conteudo: string
          created_at?: string
          editado_em?: string | null
          id?: string
          mencionados?: string[]
          organization_id: string
          thread_id: string
        }
        Update: {
          autor_id?: string
          conteudo?: string
          created_at?: string
          editado_em?: string | null
          id?: string
          mencionados?: string[]
          organization_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "comments_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      comments_threads: {
        Row: {
          created_at: string
          criado_por: string
          entidade_id: string
          entidade_tipo: string
          id: string
          organization_id: string
          resolvido: boolean
          resolvido_em: string | null
          resolvido_por: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          entidade_id: string
          entidade_tipo: string
          id?: string
          organization_id: string
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          organization_id?: string
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contract_items: {
        Row: {
          contract_id: string
          created_at: string
          descricao: string | null
          id: string
          organization_id: string
          prazo_entrega_dias: number | null
          preco_unitario: number
          product_id: string | null
          quantidade_minima: number | null
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          organization_id: string
          prazo_entrega_dias?: number | null
          preco_unitario: number
          product_id?: string | null
          quantidade_minima?: number | null
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          organization_id?: string
          prazo_entrega_dias?: number | null
          preco_unitario?: number
          product_id?: string | null
          quantidade_minima?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_v"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "supplier_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          nome: string
          organization_id: string
          responsavel_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          nome: string
          organization_id: string
          responsavel_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          organization_id?: string
          responsavel_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      council_members: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          foto_url: string | null
          id: string
          nome_exibicao: string | null
          organization_id: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          foto_url?: string | null
          id?: string
          nome_exibicao?: string | null
          organization_id: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          foto_url?: string | null
          id?: string
          nome_exibicao?: string | null
          organization_id?: string
          user_id?: string
        }
        Relationships: []
      }
      council_proposal_quotes: {
        Row: {
          condicoes: string | null
          created_at: string
          fornecedor: string
          frete: number
          id: string
          posicao: number
          proposal_id: string
          qtd: number
          total: number | null
          valor_unit: number
        }
        Insert: {
          condicoes?: string | null
          created_at?: string
          fornecedor: string
          frete?: number
          id?: string
          posicao?: number
          proposal_id: string
          qtd?: number
          total?: number | null
          valor_unit?: number
        }
        Update: {
          condicoes?: string | null
          created_at?: string
          fornecedor?: string
          frete?: number
          id?: string
          posicao?: number
          proposal_id?: string
          qtd?: number
          total?: number | null
          valor_unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "council_proposal_quotes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "council_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      council_proposals: {
        Row: {
          ci_id: string | null
          created_at: string
          created_by: string
          decidido_em: string | null
          id: string
          imagem_url: string | null
          justificativa: string | null
          location: string | null
          min_votos_aprovacao: number
          organization_id: string
          purchase_request_id: string | null
          status: Database["public"]["Enums"]["council_proposal_status"]
          titulo: string
          total_membros: number
          updated_at: string
        }
        Insert: {
          ci_id?: string | null
          created_at?: string
          created_by: string
          decidido_em?: string | null
          id?: string
          imagem_url?: string | null
          justificativa?: string | null
          location?: string | null
          min_votos_aprovacao?: number
          organization_id: string
          purchase_request_id?: string | null
          status?: Database["public"]["Enums"]["council_proposal_status"]
          titulo: string
          total_membros?: number
          updated_at?: string
        }
        Update: {
          ci_id?: string | null
          created_at?: string
          created_by?: string
          decidido_em?: string | null
          id?: string
          imagem_url?: string | null
          justificativa?: string | null
          location?: string | null
          min_votos_aprovacao?: number
          organization_id?: string
          purchase_request_id?: string | null
          status?: Database["public"]["Enums"]["council_proposal_status"]
          titulo?: string
          total_membros?: number
          updated_at?: string
        }
        Relationships: []
      }
      council_votes: {
        Row: {
          comentario: string | null
          id: string
          membro_user_id: string
          proposal_id: string
          votado_em: string
          voto: Database["public"]["Enums"]["council_vote_value"]
        }
        Insert: {
          comentario?: string | null
          id?: string
          membro_user_id: string
          proposal_id: string
          votado_em?: string
          voto: Database["public"]["Enums"]["council_vote_value"]
        }
        Update: {
          comentario?: string | null
          id?: string
          membro_user_id?: string
          proposal_id?: string
          votado_em?: string
          voto?: Database["public"]["Enums"]["council_vote_value"]
        }
        Relationships: [
          {
            foreignKeyName: "council_votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "council_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_count_plans: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string
          freq_a_dias: number
          freq_b_dias: number
          freq_c_dias: number
          id: string
          nome: string
          organization_id: string
          tolerancia_percent: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by: string
          freq_a_dias?: number
          freq_b_dias?: number
          freq_c_dias?: number
          id?: string
          nome: string
          organization_id: string
          tolerancia_percent?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string
          freq_a_dias?: number
          freq_b_dias?: number
          freq_c_dias?: number
          id?: string
          nome?: string
          organization_id?: string
          tolerancia_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      cycle_count_tasks: {
        Row: {
          ajuste_automatico: boolean
          contado_em: string | null
          contado_por: string | null
          created_at: string
          created_by: string
          curva: string | null
          divergencia: number | null
          id: string
          observacao: string | null
          organization_id: string
          plan_id: string | null
          product_id: string
          qtd_contada: number | null
          qtd_esperada: number
          status: string
          updated_at: string
        }
        Insert: {
          ajuste_automatico?: boolean
          contado_em?: string | null
          contado_por?: string | null
          created_at?: string
          created_by: string
          curva?: string | null
          divergencia?: number | null
          id?: string
          observacao?: string | null
          organization_id: string
          plan_id?: string | null
          product_id: string
          qtd_contada?: number | null
          qtd_esperada?: number
          status?: string
          updated_at?: string
        }
        Update: {
          ajuste_automatico?: boolean
          contado_em?: string | null
          contado_por?: string | null
          created_at?: string
          created_by?: string
          curva?: string | null
          divergencia?: number | null
          id?: string
          observacao?: string | null
          organization_id?: string
          plan_id?: string | null
          product_id?: string
          qtd_contada?: number | null
          qtd_esperada?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_count_tasks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cycle_count_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          config: Json
          created_at: string
          dashboard_id: string
          id: string
          organization_id: string
          posicao: Json
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          dashboard_id: string
          id?: string
          organization_id: string
          posicao?: Json
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          dashboard_id?: string
          id?: string
          organization_id?: string
          posicao?: Json
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "executive_dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_signatures: {
        Row: {
          assinante_doc: string | null
          assinante_nome: string
          assinatura_data: string
          capturado_em: string
          capturado_por: string
          created_at: string
          entidade_id: string
          entidade_tipo: string
          id: string
          organization_id: string
        }
        Insert: {
          assinante_doc?: string | null
          assinante_nome: string
          assinatura_data: string
          capturado_em?: string
          capturado_por: string
          created_at?: string
          entidade_id: string
          entidade_tipo: string
          id?: string
          organization_id: string
        }
        Update: {
          assinante_doc?: string | null
          assinante_nome?: string
          assinatura_data?: string
          capturado_em?: string
          capturado_por?: string
          created_at?: string
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          organization_id?: string
        }
        Relationships: []
      }
      demand_forecasts: {
        Row: {
          confianca: number
          consumo_previsto: number
          consumo_real: number | null
          gerado_em: string
          id: string
          metodo: string
          organization_id: string
          periodo: string
          product_id: string
        }
        Insert: {
          confianca?: number
          consumo_previsto?: number
          consumo_real?: number | null
          gerado_em?: string
          id?: string
          metodo?: string
          organization_id: string
          periodo: string
          product_id: string
        }
        Update: {
          confianca?: number
          consumo_previsto?: number
          consumo_real?: number | null
          gerado_em?: string
          id?: string
          metodo?: string
          organization_id?: string
          periodo?: string
          product_id?: string
        }
        Relationships: []
      }
      executive_dashboards: {
        Row: {
          compartilhado: boolean
          created_at: string
          created_by: string
          descricao: string | null
          id: string
          layout: Json
          nome: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          compartilhado?: boolean
          created_at?: string
          created_by: string
          descricao?: string | null
          id?: string
          layout?: Json
          nome: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          compartilhado?: boolean
          created_at?: string
          created_by?: string
          descricao?: string | null
          id?: string
          layout?: Json
          nome?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      fiscal_events: {
        Row: {
          created_at: string
          criado_por: string | null
          fiscal_invoice_id: string
          id: string
          mensagem: string | null
          organization_id: string
          payload: Json | null
          resposta: Json | null
          tipo: Database["public"]["Enums"]["fiscal_event_tipo"]
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          fiscal_invoice_id: string
          id?: string
          mensagem?: string | null
          organization_id: string
          payload?: Json | null
          resposta?: Json | null
          tipo: Database["public"]["Enums"]["fiscal_event_tipo"]
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          fiscal_invoice_id?: string
          id?: string
          mensagem?: string | null
          organization_id?: string
          payload?: Json | null
          resposta?: Json | null
          tipo?: Database["public"]["Enums"]["fiscal_event_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_events_fiscal_invoice_id_fkey"
            columns: ["fiscal_invoice_id"]
            isOneToOne: false
            referencedRelation: "fiscal_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_invoice_items: {
        Row: {
          cfop: string | null
          cofins_aliquota: number | null
          cofins_cst: string | null
          cofins_valor: number | null
          created_at: string
          descricao: string
          fiscal_invoice_id: string
          icms_aliquota: number | null
          icms_cst: string | null
          icms_valor: number | null
          id: string
          ncm: string | null
          numero_item: number
          organization_id: string
          pis_aliquota: number | null
          pis_cst: string | null
          pis_valor: number | null
          product_id: string | null
          quantidade: number
          unidade: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          cfop?: string | null
          cofins_aliquota?: number | null
          cofins_cst?: string | null
          cofins_valor?: number | null
          created_at?: string
          descricao: string
          fiscal_invoice_id: string
          icms_aliquota?: number | null
          icms_cst?: string | null
          icms_valor?: number | null
          id?: string
          ncm?: string | null
          numero_item: number
          organization_id: string
          pis_aliquota?: number | null
          pis_cst?: string | null
          pis_valor?: number | null
          product_id?: string | null
          quantidade: number
          unidade?: string | null
          valor_total: number
          valor_unitario: number
        }
        Update: {
          cfop?: string | null
          cofins_aliquota?: number | null
          cofins_cst?: string | null
          cofins_valor?: number | null
          created_at?: string
          descricao?: string
          fiscal_invoice_id?: string
          icms_aliquota?: number | null
          icms_cst?: string | null
          icms_valor?: number | null
          id?: string
          ncm?: string | null
          numero_item?: number
          organization_id?: string
          pis_aliquota?: number | null
          pis_cst?: string | null
          pis_valor?: number | null
          product_id?: string | null
          quantidade?: number
          unidade?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_invoice_items_fiscal_invoice_id_fkey"
            columns: ["fiscal_invoice_id"]
            isOneToOne: false
            referencedRelation: "fiscal_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_invoices: {
        Row: {
          ambiente: Database["public"]["Enums"]["fiscal_ambiente"]
          cancelada_em: string | null
          chave_acesso: string | null
          created_at: string
          created_by: string | null
          danfe_url: string | null
          destinatario_documento: string | null
          destinatario_nome: string | null
          emitida_em: string | null
          id: string
          mensagem_sefaz: string | null
          modelo: Database["public"]["Enums"]["fiscal_modelo"]
          motivo_cancelamento: string | null
          nota_referenciada_id: string | null
          numero: number | null
          organization_id: string
          protocolo: string | null
          provider_ref: string | null
          referencia_id: string | null
          referencia_tipo: string | null
          serie: number | null
          status: Database["public"]["Enums"]["fiscal_status"]
          tipo: Database["public"]["Enums"]["fiscal_tipo"]
          updated_at: string
          valor_total: number
          xml_url: string | null
        }
        Insert: {
          ambiente?: Database["public"]["Enums"]["fiscal_ambiente"]
          cancelada_em?: string | null
          chave_acesso?: string | null
          created_at?: string
          created_by?: string | null
          danfe_url?: string | null
          destinatario_documento?: string | null
          destinatario_nome?: string | null
          emitida_em?: string | null
          id?: string
          mensagem_sefaz?: string | null
          modelo: Database["public"]["Enums"]["fiscal_modelo"]
          motivo_cancelamento?: string | null
          nota_referenciada_id?: string | null
          numero?: number | null
          organization_id: string
          protocolo?: string | null
          provider_ref?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          serie?: number | null
          status?: Database["public"]["Enums"]["fiscal_status"]
          tipo: Database["public"]["Enums"]["fiscal_tipo"]
          updated_at?: string
          valor_total?: number
          xml_url?: string | null
        }
        Update: {
          ambiente?: Database["public"]["Enums"]["fiscal_ambiente"]
          cancelada_em?: string | null
          chave_acesso?: string | null
          created_at?: string
          created_by?: string | null
          danfe_url?: string | null
          destinatario_documento?: string | null
          destinatario_nome?: string | null
          emitida_em?: string | null
          id?: string
          mensagem_sefaz?: string | null
          modelo?: Database["public"]["Enums"]["fiscal_modelo"]
          motivo_cancelamento?: string | null
          nota_referenciada_id?: string | null
          numero?: number | null
          organization_id?: string
          protocolo?: string | null
          provider_ref?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          serie?: number | null
          status?: Database["public"]["Enums"]["fiscal_status"]
          tipo?: Database["public"]["Enums"]["fiscal_tipo"]
          updated_at?: string
          valor_total?: number
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_invoices_nota_referenciada_id_fkey"
            columns: ["nota_referenciada_id"]
            isOneToOne: false
            referencedRelation: "fiscal_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_settings: {
        Row: {
          ambiente: Database["public"]["Enums"]["fiscal_ambiente"]
          certificado_path: string | null
          cnpj: string
          created_at: string
          created_by: string | null
          csc_id: string | null
          csc_token: string | null
          endereco: Json
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          nome_fantasia: string | null
          organization_id: string
          provider: string
          proximo_numero_nfce: number
          proximo_numero_nfe: number
          razao_social: string
          regime_tributario: Database["public"]["Enums"]["regime_tributario"]
          serie_nfce: number
          serie_nfe: number
          updated_at: string
        }
        Insert: {
          ambiente?: Database["public"]["Enums"]["fiscal_ambiente"]
          certificado_path?: string | null
          cnpj: string
          created_at?: string
          created_by?: string | null
          csc_id?: string | null
          csc_token?: string | null
          endereco?: Json
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          organization_id: string
          provider?: string
          proximo_numero_nfce?: number
          proximo_numero_nfe?: number
          razao_social: string
          regime_tributario?: Database["public"]["Enums"]["regime_tributario"]
          serie_nfce?: number
          serie_nfe?: number
          updated_at?: string
        }
        Update: {
          ambiente?: Database["public"]["Enums"]["fiscal_ambiente"]
          certificado_path?: string | null
          cnpj?: string
          created_at?: string
          created_by?: string | null
          csc_id?: string | null
          csc_token?: string | null
          endereco?: Json
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          organization_id?: string
          provider?: string
          proximo_numero_nfce?: number
          proximo_numero_nfe?: number
          razao_social?: string
          regime_tributario?: Database["public"]["Enums"]["regime_tributario"]
          serie_nfce?: number
          serie_nfe?: number
          updated_at?: string
        }
        Relationships: []
      }
      global_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      inbound_invoice_items: {
        Row: {
          cean: string | null
          cfop: string | null
          created_at: string
          descricao: string
          divergence: string
          divergence_detail: Json | null
          id: string
          invoice_id: string
          ncm: string | null
          numero_item: number | null
          order_item_id: string | null
          organization_id: string
          product_id: string | null
          quantidade: number
          unidade: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          cean?: string | null
          cfop?: string | null
          created_at?: string
          descricao: string
          divergence?: string
          divergence_detail?: Json | null
          id?: string
          invoice_id: string
          ncm?: string | null
          numero_item?: number | null
          order_item_id?: string | null
          organization_id: string
          product_id?: string | null
          quantidade?: number
          unidade?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          cean?: string | null
          cfop?: string | null
          created_at?: string
          descricao?: string
          divergence?: string
          divergence_detail?: Json | null
          id?: string
          invoice_id?: string
          ncm?: string | null
          numero_item?: number | null
          order_item_id?: string | null
          organization_id?: string
          product_id?: string | null
          quantidade?: number
          unidade?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "inbound_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "inbound_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_invoices: {
        Row: {
          chave_acesso: string
          created_at: string
          created_by: string
          data_vencimento: string | null
          emissao: string | null
          id: string
          matched_at: string | null
          numero: string | null
          order_id: string | null
          organization_id: string
          parse_warnings: Json | null
          received_at: string | null
          serie: string | null
          status: string
          supplier_cnpj: string | null
          supplier_id: string | null
          supplier_nome: string | null
          updated_at: string
          valor_total: number
          xml_path: string
        }
        Insert: {
          chave_acesso: string
          created_at?: string
          created_by: string
          data_vencimento?: string | null
          emissao?: string | null
          id?: string
          matched_at?: string | null
          numero?: string | null
          order_id?: string | null
          organization_id: string
          parse_warnings?: Json | null
          received_at?: string | null
          serie?: string | null
          status?: string
          supplier_cnpj?: string | null
          supplier_id?: string | null
          supplier_nome?: string | null
          updated_at?: string
          valor_total?: number
          xml_path: string
        }
        Update: {
          chave_acesso?: string
          created_at?: string
          created_by?: string
          data_vencimento?: string | null
          emissao?: string | null
          id?: string
          matched_at?: string | null
          numero?: string | null
          order_id?: string | null
          organization_id?: string
          parse_warnings?: Json | null
          received_at?: string | null
          serie?: string | null
          status?: string
          supplier_cnpj?: string | null
          supplier_id?: string | null
          supplier_nome?: string | null
          updated_at?: string
          valor_total?: number
          xml_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbound_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          created_at: string
          evento: string
          id: string
          organization_id: string
          payload: Json
          resposta: string | null
          status_http: number | null
          tentativa: number
          webhook_id: string | null
        }
        Insert: {
          created_at?: string
          evento: string
          id?: string
          organization_id: string
          payload?: Json
          resposta?: string | null
          status_http?: number | null
          tentativa?: number
          webhook_id?: string | null
        }
        Update: {
          created_at?: string
          evento?: string
          id?: string
          organization_id?: string
          payload?: Json
          resposta?: string | null
          status_http?: number | null
          tentativa?: number
          webhook_id?: string | null
        }
        Relationships: []
      }
      integration_webhooks: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string
          evento: string
          headers: Json
          id: string
          nome: string
          organization_id: string
          secret: string | null
          ultima_chamada: string | null
          ultimo_status: number | null
          updated_at: string
          url: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by: string
          evento: string
          headers?: Json
          id?: string
          nome: string
          organization_id: string
          secret?: string | null
          ultima_chamada?: string | null
          ultimo_status?: number | null
          updated_at?: string
          url: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string
          evento?: string
          headers?: Json
          id?: string
          nome?: string
          organization_id?: string
          secret?: string | null
          ultima_chamada?: string | null
          ultimo_status?: number | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      inventory_counts: {
        Row: {
          contado: number
          contado_em: string
          contado_por: string
          created_at: string
          divergencia: number | null
          id: string
          observacao: string | null
          organization_id: string
          product_id: string
          session_id: string
          sistema: number
          updated_at: string
        }
        Insert: {
          contado?: number
          contado_em?: string
          contado_por: string
          created_at?: string
          divergencia?: number | null
          id?: string
          observacao?: string | null
          organization_id: string
          product_id: string
          session_id: string
          sistema?: number
          updated_at?: string
        }
        Update: {
          contado?: number
          contado_em?: string
          contado_por?: string
          created_at?: string
          divergencia?: number | null
          id?: string
          observacao?: string | null
          organization_id?: string
          product_id?: string
          session_id?: string
          sistema?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "inventory_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_sessions: {
        Row: {
          created_at: string
          created_by: string
          escopo: Json
          fechada_em: string | null
          fechada_por: string | null
          id: string
          iniciada_em: string | null
          nome: string
          organization_id: string
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          escopo?: Json
          fechada_em?: string | null
          fechada_por?: string | null
          id?: string
          iniciada_em?: string | null
          nome: string
          organization_id: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          escopo?: Json
          fechada_em?: string | null
          fechada_por?: string | null
          id?: string
          iniciada_em?: string | null
          nome?: string
          organization_id?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      label_templates: {
        Row: {
          altura_mm: number
          created_at: string
          created_by: string
          id: string
          largura_mm: number
          layout: Json
          nome: string
          organization_id: string
          padrao: boolean
          updated_at: string
        }
        Insert: {
          altura_mm?: number
          created_at?: string
          created_by: string
          id?: string
          largura_mm?: number
          layout?: Json
          nome: string
          organization_id: string
          padrao?: boolean
          updated_at?: string
        }
        Update: {
          altura_mm?: number
          created_at?: string
          created_by?: string
          id?: string
          largura_mm?: number
          layout?: Json
          nome?: string
          organization_id?: string
          padrao?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      launchpad_preferences: {
        Row: {
          created_at: string
          favorites: string[]
          hidden: string[]
          id: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          favorites?: string[]
          hidden?: string[]
          id?: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          favorites?: string[]
          hidden?: string[]
          id?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      movements: {
        Row: {
          batch_id: string | null
          bin_id: string | null
          created_at: string
          created_by: string
          destination: string | null
          destination_location: string | null
          document_number: string | null
          id: string
          location_info: string | null
          new_stock: number
          organization_id: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reason: string | null
          supplier: string | null
          total_value: number | null
          transfer_id: string | null
          type: Database["public"]["Enums"]["movement_type"]
          unit_price: number | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          batch_id?: string | null
          bin_id?: string | null
          created_at?: string
          created_by: string
          destination?: string | null
          destination_location?: string | null
          document_number?: string | null
          id?: string
          location_info?: string | null
          new_stock: number
          organization_id?: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reason?: string | null
          supplier?: string | null
          total_value?: number | null
          transfer_id?: string | null
          type: Database["public"]["Enums"]["movement_type"]
          unit_price?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          batch_id?: string | null
          bin_id?: string | null
          created_at?: string
          created_by?: string
          destination?: string | null
          destination_location?: string | null
          document_number?: string | null
          id?: string
          location_info?: string | null
          new_stock?: number
          organization_id?: string | null
          previous_stock?: number
          product_id?: string
          quantity?: number
          reason?: string | null
          supplier?: string | null
          total_value?: number | null
          transfer_id?: string | null
          type?: Database["public"]["Enums"]["movement_type"]
          unit_price?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_movements_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_movements_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_sync_queue: {
        Row: {
          client_op_id: string
          created_at: string
          erro: string | null
          id: string
          organization_id: string
          payload: Json
          processed_at: string
          status: string
          tipo: string
          user_id: string
        }
        Insert: {
          client_op_id: string
          created_at?: string
          erro?: string | null
          id?: string
          organization_id: string
          payload: Json
          processed_at?: string
          status?: string
          tipo: string
          user_id: string
        }
        Update: {
          client_op_id?: string
          created_at?: string
          erro?: string | null
          id?: string
          organization_id?: string
          payload?: Json
          processed_at?: string
          status?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      operational_demand_activity_log: {
        Row: {
          autor: string | null
          created_at: string
          demand_id: string
          evento: string
          id: string
          organization_id: string
          payload: Json | null
        }
        Insert: {
          autor?: string | null
          created_at?: string
          demand_id: string
          evento: string
          id?: string
          organization_id: string
          payload?: Json | null
        }
        Update: {
          autor?: string | null
          created_at?: string
          demand_id?: string
          evento?: string
          id?: string
          organization_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_demand_activity_log_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demand_activity_log_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "operational_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demand_activity_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_demand_attachments: {
        Row: {
          created_at: string
          demand_id: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          demand_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          demand_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_demand_attachments_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "operational_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demand_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demand_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_demand_comments: {
        Row: {
          autor: string | null
          comentario: string
          created_at: string
          demand_id: string
          id: string
          organization_id: string
        }
        Insert: {
          autor?: string | null
          comentario: string
          created_at?: string
          demand_id: string
          id?: string
          organization_id: string
        }
        Update: {
          autor?: string | null
          comentario?: string
          created_at?: string
          demand_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_demand_comments_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demand_comments_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "operational_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demand_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_demand_dependencies: {
        Row: {
          created_at: string
          created_by: string | null
          demand_id: string
          descricao: string
          id: string
          organization_id: string
          responsavel: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          demand_id: string
          descricao: string
          id?: string
          organization_id: string
          responsavel?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          demand_id?: string
          descricao?: string
          id?: string
          organization_id?: string
          responsavel?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_demand_dependencies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demand_dependencies_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "operational_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demand_dependencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_demand_links: {
        Row: {
          created_at: string
          created_by: string | null
          demand_id: string
          id: string
          label: string | null
          link_type: string
          organization_id: string
          target_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          demand_id: string
          id?: string
          label?: string | null
          link_type: string
          organization_id: string
          target_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          demand_id?: string
          id?: string
          label?: string | null
          link_type?: string
          organization_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_demand_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demand_links_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "operational_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demand_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_demand_notifications: {
        Row: {
          created_at: string
          demand_id: string
          event_type: string
          id: string
          is_read: boolean
          message: string | null
          organization_id: string
          recipient_id: string
          title: string
        }
        Insert: {
          created_at?: string
          demand_id: string
          event_type: string
          id?: string
          is_read?: boolean
          message?: string | null
          organization_id: string
          recipient_id: string
          title: string
        }
        Update: {
          created_at?: string
          demand_id?: string
          event_type?: string
          id?: string
          is_read?: boolean
          message?: string | null
          organization_id?: string
          recipient_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_demand_notifications_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "operational_demands"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_demand_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          comment: string | null
          demand_id: string
          from_status: string | null
          id: string
          organization_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          comment?: string | null
          demand_id: string
          from_status?: string | null
          id?: string
          organization_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          comment?: string | null
          demand_id?: string
          from_status?: string | null
          id?: string
          organization_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_demand_status_history_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "operational_demands"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_demand_units: {
        Row: {
          campus_id: string | null
          created_at: string
          demand_id: string
          id: string
          organization_id: string
          unit_name_fallback: string | null
        }
        Insert: {
          campus_id?: string | null
          created_at?: string
          demand_id: string
          id?: string
          organization_id: string
          unit_name_fallback?: string | null
        }
        Update: {
          campus_id?: string | null
          created_at?: string
          demand_id?: string
          id?: string
          organization_id?: string
          unit_name_fallback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_demand_units_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "operational_demands"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_demand_updates: {
        Row: {
          autor: string | null
          created_at: string
          demand_id: string
          id: string
          organization_id: string
          percentual_andamento: number | null
          texto: string
        }
        Insert: {
          autor?: string | null
          created_at?: string
          demand_id: string
          id?: string
          organization_id: string
          percentual_andamento?: number | null
          texto: string
        }
        Update: {
          autor?: string | null
          created_at?: string
          demand_id?: string
          id?: string
          organization_id?: string
          percentual_andamento?: number | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_demand_updates_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demand_updates_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "operational_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demand_updates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_demands: {
        Row: {
          approval_comment: string | null
          approval_state: string
          approved_at: string | null
          approved_by: string | null
          area: string | null
          arquivada: boolean
          attention_points: string | null
          campus_id: string | null
          category_id: string | null
          code: string
          concluida_em: string | null
          created_at: string
          created_by: string | null
          dependencies: string | null
          descricao: string | null
          gestor_responsavel: string
          id: string
          is_overdue: boolean
          justificativa_cancelamento: string | null
          last_summary_generated_at: string | null
          last_summary_generated_by: string | null
          manager_summary: string | null
          motivo_pausa: string | null
          nome: string
          objetivo: string
          organization_id: string
          prazo_estimado: string | null
          prioridade: Database["public"]["Enums"]["operational_demand_priority"]
          proximas_etapas: string | null
          resultado_esperado: string | null
          resumo_final: string | null
          status: Database["public"]["Enums"]["operational_demand_status"]
          tipo: Database["public"]["Enums"]["operational_demand_type"]
          type_id: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          approval_comment?: string | null
          approval_state?: string
          approved_at?: string | null
          approved_by?: string | null
          area?: string | null
          arquivada?: boolean
          attention_points?: string | null
          campus_id?: string | null
          category_id?: string | null
          code: string
          concluida_em?: string | null
          created_at?: string
          created_by?: string | null
          dependencies?: string | null
          descricao?: string | null
          gestor_responsavel: string
          id?: string
          is_overdue?: boolean
          justificativa_cancelamento?: string | null
          last_summary_generated_at?: string | null
          last_summary_generated_by?: string | null
          manager_summary?: string | null
          motivo_pausa?: string | null
          nome: string
          objetivo: string
          organization_id: string
          prazo_estimado?: string | null
          prioridade?: Database["public"]["Enums"]["operational_demand_priority"]
          proximas_etapas?: string | null
          resultado_esperado?: string | null
          resumo_final?: string | null
          status?: Database["public"]["Enums"]["operational_demand_status"]
          tipo?: Database["public"]["Enums"]["operational_demand_type"]
          type_id?: string | null
          unidade: string
          updated_at?: string
        }
        Update: {
          approval_comment?: string | null
          approval_state?: string
          approved_at?: string | null
          approved_by?: string | null
          area?: string | null
          arquivada?: boolean
          attention_points?: string | null
          campus_id?: string | null
          category_id?: string | null
          code?: string
          concluida_em?: string | null
          created_at?: string
          created_by?: string | null
          dependencies?: string | null
          descricao?: string | null
          gestor_responsavel?: string
          id?: string
          is_overdue?: boolean
          justificativa_cancelamento?: string | null
          last_summary_generated_at?: string | null
          last_summary_generated_by?: string | null
          manager_summary?: string | null
          motivo_pausa?: string | null
          nome?: string
          objetivo?: string
          organization_id?: string
          prazo_estimado?: string | null
          prioridade?: Database["public"]["Enums"]["operational_demand_priority"]
          proximas_etapas?: string | null
          resultado_esperado?: string | null
          resumo_final?: string | null
          status?: Database["public"]["Enums"]["operational_demand_status"]
          tipo?: Database["public"]["Enums"]["operational_demand_type"]
          type_id?: string | null
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_demands_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demands_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demands_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demands_gestor_responsavel_fkey"
            columns: ["gestor_responsavel"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_demands_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          joined_at: string | null
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string | null
          organization_id: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string | null
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
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
          created_by: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          max_products: number | null
          max_users: number | null
          name: string
          slug: string
          subscription_plan: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_products?: number | null
          max_users?: number | null
          name: string
          slug: string
          subscription_plan?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_products?: number | null
          max_users?: number | null
          name?: string
          slug?: string
          subscription_plan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          account_payable_id: string
          bank_account_id: string | null
          comprovante_url: string | null
          created_at: string
          created_by: string
          data_pagamento: string
          forma_pagamento: string
          id: string
          observacoes: string | null
          organization_id: string
          valor: number
        }
        Insert: {
          account_payable_id: string
          bank_account_id?: string | null
          comprovante_url?: string | null
          created_at?: string
          created_by: string
          data_pagamento?: string
          forma_pagamento?: string
          id?: string
          observacoes?: string | null
          organization_id: string
          valor: number
        }
        Update: {
          account_payable_id?: string
          bank_account_id?: string | null
          comprovante_url?: string | null
          created_at?: string
          created_by?: string
          data_pagamento?: string
          forma_pagamento?: string
          id?: string
          observacoes?: string | null
          organization_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_account_payable_id_fkey"
            columns: ["account_payable_id"]
            isOneToOne: false
            referencedRelation: "accounts_payable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      picking_wave_items: {
        Row: {
          created_at: string
          created_by: string
          descricao: string
          id: string
          observacao: string | null
          ordem_rota: number
          organization_id: string
          product_id: string | null
          qtd_separada: number
          qtd_solicitada: number
          request_id: string | null
          separado_em: string | null
          status: string
          updated_at: string
          wave_id: string
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          descricao: string
          id?: string
          observacao?: string | null
          ordem_rota?: number
          organization_id: string
          product_id?: string | null
          qtd_separada?: number
          qtd_solicitada?: number
          request_id?: string | null
          separado_em?: string | null
          status?: string
          updated_at?: string
          wave_id: string
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          descricao?: string
          id?: string
          observacao?: string | null
          ordem_rota?: number
          organization_id?: string
          product_id?: string | null
          qtd_separada?: number
          qtd_solicitada?: number
          request_id?: string | null
          separado_em?: string | null
          status?: string
          updated_at?: string
          wave_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "picking_wave_items_wave_id_fkey"
            columns: ["wave_id"]
            isOneToOne: false
            referencedRelation: "picking_waves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "picking_wave_items_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "warehouse_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      picking_waves: {
        Row: {
          concluida_em: string | null
          created_at: string
          created_by: string
          data_onda: string
          id: string
          iniciada_em: string | null
          numero: string
          observacoes: string | null
          organization_id: string
          separador_id: string | null
          status: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          concluida_em?: string | null
          created_at?: string
          created_by: string
          data_onda?: string
          id?: string
          iniciada_em?: string | null
          numero: string
          observacoes?: string | null
          organization_id: string
          separador_id?: string | null
          status?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          concluida_em?: string | null
          created_at?: string
          created_by?: string
          data_onda?: string
          id?: string
          iniciada_em?: string | null
          numero?: string
          observacoes?: string | null
          organization_id?: string
          separador_id?: string | null
          status?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: []
      }
      product_abc_classification: {
        Row: {
          calculado_em: string
          consumo_90d: number
          curva: string
          id: string
          organization_id: string
          participacao_percent: number
          product_id: string
          valor_consumido: number
        }
        Insert: {
          calculado_em?: string
          consumo_90d?: number
          curva: string
          id?: string
          organization_id: string
          participacao_percent?: number
          product_id: string
          valor_consumido?: number
        }
        Update: {
          calculado_em?: string
          consumo_90d?: number
          curva?: string
          id?: string
          organization_id?: string
          participacao_percent?: number
          product_id?: string
          valor_consumido?: number
        }
        Relationships: []
      }
      product_batches: {
        Row: {
          created_at: string
          created_by: string | null
          fabricacao: string | null
          id: string
          lote: string
          observacao: string | null
          organization_id: string
          product_id: string
          supplier_id: string | null
          updated_at: string
          validade: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fabricacao?: string | null
          id?: string
          lote: string
          observacao?: string | null
          organization_id: string
          product_id: string
          supplier_id?: string | null
          updated_at?: string
          validade?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fabricacao?: string | null
          id?: string
          lote?: string
          observacao?: string | null
          organization_id?: string
          product_id?: string
          supplier_id?: string | null
          updated_at?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_fiscal_data: {
        Row: {
          cest: string | null
          cfop_padrao: string | null
          cofins_aliquota: number | null
          cofins_cst: string | null
          created_at: string
          icms_aliquota: number | null
          icms_cst: string | null
          icms_modalidade_bc: number | null
          id: string
          ncm: string | null
          organization_id: string
          origem: number
          pis_aliquota: number | null
          pis_cst: string | null
          product_id: string
          unidade_tributavel: string | null
          updated_at: string
        }
        Insert: {
          cest?: string | null
          cfop_padrao?: string | null
          cofins_aliquota?: number | null
          cofins_cst?: string | null
          created_at?: string
          icms_aliquota?: number | null
          icms_cst?: string | null
          icms_modalidade_bc?: number | null
          id?: string
          ncm?: string | null
          organization_id: string
          origem?: number
          pis_aliquota?: number | null
          pis_cst?: string | null
          product_id: string
          unidade_tributavel?: string | null
          updated_at?: string
        }
        Update: {
          cest?: string | null
          cfop_padrao?: string | null
          cofins_aliquota?: number | null
          cofins_cst?: string | null
          created_at?: string
          icms_aliquota?: number | null
          icms_cst?: string | null
          icms_modalidade_bc?: number | null
          id?: string
          ncm?: string | null
          organization_id?: string
          origem?: number
          pis_aliquota?: number | null
          pis_cst?: string | null
          product_id?: string
          unidade_tributavel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_fiscal_data_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock_by_location: {
        Row: {
          bin_id: string | null
          created_at: string
          id: string
          organization_id: string
          product_id: string
          quantidade: number
          reservado: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          bin_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          product_id: string
          quantidade?: number
          reservado?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          bin_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          product_id?: string
          quantidade?: number
          reservado?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_by_location_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "warehouse_bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_by_location_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_by_location_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: Database["public"]["Enums"]["product_category"]
          category_id: string | null
          controla_lote: boolean
          controla_validade: boolean
          created_at: string
          created_by: string
          current_stock: number
          description: string | null
          id: string
          location: string | null
          max_stock: number | null
          min_stock: number
          name: string
          organization_id: string | null
          qr_code: string | null
          sku: string
          supplier: string | null
          type_id: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category: Database["public"]["Enums"]["product_category"]
          category_id?: string | null
          controla_lote?: boolean
          controla_validade?: boolean
          created_at?: string
          created_by: string
          current_stock?: number
          description?: string | null
          id?: string
          location?: string | null
          max_stock?: number | null
          min_stock?: number
          name: string
          organization_id?: string | null
          qr_code?: string | null
          sku: string
          supplier?: string | null
          type_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          category_id?: string | null
          controla_lote?: boolean
          controla_validade?: boolean
          created_at?: string
          created_by?: string
          current_stock?: number
          description?: string | null
          id?: string
          location?: string | null
          max_stock?: number | null
          min_stock?: number
          name?: string
          organization_id?: string | null
          qr_code?: string | null
          sku?: string
          supplier?: string | null
          type_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          cover_cta_style: string | null
          cover_kpi_accent: string | null
          cover_kpi_tones: Json | null
          cover_overlay: number
          cover_type: string
          cover_updated_at: string | null
          cover_value: Json
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          institutional_email: string | null
          is_super_admin: boolean | null
          job_role: string | null
          nickname: string | null
          password_change_required: boolean | null
          personal_email: string | null
          preferred_name: string | null
          registration: string | null
          unit_campus: string | null
          updated_at: string
          user_type: string | null
          whatsapp: string | null
          work_location: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          cover_cta_style?: string | null
          cover_kpi_accent?: string | null
          cover_kpi_tones?: Json | null
          cover_overlay?: number
          cover_type?: string
          cover_updated_at?: string | null
          cover_value?: Json
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          institutional_email?: string | null
          is_super_admin?: boolean | null
          job_role?: string | null
          nickname?: string | null
          password_change_required?: boolean | null
          personal_email?: string | null
          preferred_name?: string | null
          registration?: string | null
          unit_campus?: string | null
          updated_at?: string
          user_type?: string | null
          whatsapp?: string | null
          work_location?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          cover_cta_style?: string | null
          cover_kpi_accent?: string | null
          cover_kpi_tones?: Json | null
          cover_overlay?: number
          cover_type?: string
          cover_updated_at?: string | null
          cover_value?: Json
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          institutional_email?: string | null
          is_super_admin?: boolean | null
          job_role?: string | null
          nickname?: string | null
          password_change_required?: boolean | null
          personal_email?: string | null
          preferred_name?: string | null
          registration?: string | null
          unit_campus?: string | null
          updated_at?: string
          user_type?: string | null
          whatsapp?: string | null
          work_location?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          condicao_pagamento: string | null
          contract_id: string | null
          cost_center_id: string | null
          created_at: string
          emitido_por: string
          id: string
          inbound_invoice_id: string | null
          nota_fiscal_numero: string | null
          nota_fiscal_path: string | null
          nota_fiscal_uploaded_at: string | null
          numero: string
          organization_id: string
          prazo_entrega_dias: number | null
          quantidade: number
          quote_id: string
          request_id: string
          status: string
          supplier_id: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          condicao_pagamento?: string | null
          contract_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          emitido_por: string
          id?: string
          inbound_invoice_id?: string | null
          nota_fiscal_numero?: string | null
          nota_fiscal_path?: string | null
          nota_fiscal_uploaded_at?: string | null
          numero: string
          organization_id: string
          prazo_entrega_dias?: number | null
          quantidade: number
          quote_id: string
          request_id: string
          status?: string
          supplier_id: string
          updated_at?: string
          valor_total: number
        }
        Update: {
          condicao_pagamento?: string | null
          contract_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          emitido_por?: string
          id?: string
          inbound_invoice_id?: string | null
          nota_fiscal_numero?: string | null
          nota_fiscal_path?: string | null
          nota_fiscal_uploaded_at?: string | null
          numero?: string
          organization_id?: string
          prazo_entrega_dias?: number | null
          quantidade?: number
          quote_id?: string
          request_id?: string
          status?: string
          supplier_id?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_expiring_v"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "purchase_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "supplier_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_inbound_invoice_id_fkey"
            columns: ["inbound_invoice_id"]
            isOneToOne: false
            referencedRelation: "inbound_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "purchase_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_quotes: {
        Row: {
          anexo_path: string | null
          condicao_pagamento: string | null
          created_at: string
          created_by: string
          id: string
          observacoes: string | null
          organization_id: string
          prazo_entrega_dias: number | null
          quantidade: number
          request_id: string
          status: string
          supplier_id: string
          updated_at: string
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          anexo_path?: string | null
          condicao_pagamento?: string | null
          created_at?: string
          created_by: string
          id?: string
          observacoes?: string | null
          organization_id: string
          prazo_entrega_dias?: number | null
          quantidade: number
          request_id: string
          status?: string
          supplier_id: string
          updated_at?: string
          valor_total?: number | null
          valor_unitario: number
        }
        Update: {
          anexo_path?: string | null
          condicao_pagamento?: string | null
          created_at?: string
          created_by?: string
          id?: string
          observacoes?: string | null
          organization_id?: string
          prazo_entrega_dias?: number | null
          quantidade?: number
          request_id?: string
          status?: string
          supplier_id?: string
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_quotes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_receipts: {
        Row: {
          created_at: string
          data_recebimento: string
          divergencia: boolean
          divergencia_descricao: string | null
          id: string
          movement_id: string | null
          observacoes: string | null
          order_id: string
          organization_id: string
          quantidade_recebida: number
          recebido_por: string
        }
        Insert: {
          created_at?: string
          data_recebimento?: string
          divergencia?: boolean
          divergencia_descricao?: string | null
          id?: string
          movement_id?: string | null
          observacoes?: string | null
          order_id: string
          organization_id: string
          quantidade_recebida: number
          recebido_por: string
        }
        Update: {
          created_at?: string
          data_recebimento?: string
          divergencia?: boolean
          divergencia_descricao?: string | null
          id?: string
          movement_id?: string | null
          observacoes?: string | null
          order_id?: string
          organization_id?: string
          quantidade_recebida?: number
          recebido_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_request_approvals: {
        Row: {
          aprovador_id: string | null
          comentario: string | null
          created_at: string
          decidido_em: string | null
          id: string
          ordem: number
          organization_id: string
          papel_aprovador: string
          request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          aprovador_id?: string | null
          comentario?: string | null
          created_at?: string
          decidido_em?: string | null
          id?: string
          ordem: number
          organization_id: string
          papel_aprovador: string
          request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          aprovador_id?: string | null
          comentario?: string | null
          created_at?: string
          decidido_em?: string | null
          id?: string
          ordem?: number
          organization_id?: string
          papel_aprovador?: string
          request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_request_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          organization_id: string
          request_id: string
          size_bytes: number | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          organization_id: string
          request_id: string
          size_bytes?: number | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          organization_id?: string
          request_id?: string
          size_bytes?: number | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_request_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          organization_id: string
          request_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          organization_id: string
          request_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_request_history: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          organization_id: string
          payload: Json | null
          request_id: string
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          organization_id: string
          payload?: Json | null
          request_id: string
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          organization_id?: string
          payload?: Json | null
          request_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          categoria: string | null
          cost_center_id: string | null
          created_at: string
          id: string
          item_descricao: string
          justificativa: string | null
          numero: string
          observacoes: string | null
          organization_id: string
          prazo_desejado: string | null
          prioridade: Database["public"]["Enums"]["purchase_priority"]
          quantidade: number
          responsavel_id: string | null
          setor: string | null
          solicitante_id: string
          status: Database["public"]["Enums"]["purchase_status"]
          unidade: string | null
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          categoria?: string | null
          cost_center_id?: string | null
          created_at?: string
          id?: string
          item_descricao: string
          justificativa?: string | null
          numero: string
          observacoes?: string | null
          organization_id: string
          prazo_desejado?: string | null
          prioridade?: Database["public"]["Enums"]["purchase_priority"]
          quantidade: number
          responsavel_id?: string | null
          setor?: string | null
          solicitante_id: string
          status?: Database["public"]["Enums"]["purchase_status"]
          unidade?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          categoria?: string | null
          cost_center_id?: string | null
          created_at?: string
          id?: string
          item_descricao?: string
          justificativa?: string | null
          numero?: string
          observacoes?: string | null
          organization_id?: string
          prazo_desejado?: string | null
          prioridade?: Database["public"]["Enums"]["purchase_priority"]
          quantidade?: number
          responsavel_id?: string | null
          setor?: string | null
          solicitante_id?: string
          status?: Database["public"]["Enums"]["purchase_status"]
          unidade?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_return_items: {
        Row: {
          created_at: string
          id: string
          motivo_item: string | null
          organization_id: string
          product_id: string
          purchase_return_id: string
          quantidade: number
          valor_unitario: number
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          motivo_item?: string | null
          organization_id: string
          product_id: string
          purchase_return_id: string
          quantidade: number
          valor_unitario: number
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          motivo_item?: string | null
          organization_id?: string
          product_id?: string
          purchase_return_id?: string
          quantidade?: number
          valor_unitario?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_return_items_purchase_return_id_fkey"
            columns: ["purchase_return_id"]
            isOneToOne: false
            referencedRelation: "purchase_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_return_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_returns: {
        Row: {
          created_at: string
          created_by: string | null
          fiscal_invoice_id: string | null
          id: string
          motivo: string
          numero: string | null
          organization_id: string
          processada_em: string | null
          processada_por: string | null
          purchase_order_id: string
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fiscal_invoice_id?: string | null
          id?: string
          motivo: string
          numero?: string | null
          organization_id: string
          processada_em?: string | null
          processada_por?: string | null
          purchase_order_id: string
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
          valor_total?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fiscal_invoice_id?: string | null
          id?: string
          motivo?: string
          numero?: string | null
          organization_id?: string
          processada_em?: string | null
          processada_por?: string | null
          purchase_order_id?: string
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_returns_fiscal_invoice_id_fkey"
            columns: ["fiscal_invoice_id"]
            isOneToOne: false
            referencedRelation: "fiscal_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_simulations: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          lead_time_dias: number
          nome: string
          organization_id: string
          preco_unitario: number
          product_id: string | null
          quantidade: number
          resultado: Json
          supplier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          lead_time_dias?: number
          nome: string
          organization_id: string
          preco_unitario?: number
          product_id?: string | null
          quantidade?: number
          resultado?: Json
          supplier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          lead_time_dias?: number
          nome?: string
          organization_id?: string
          preco_unitario?: number
          product_id?: string | null
          quantidade?: number
          resultado?: Json
          supplier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reorder_suggestions: {
        Row: {
          created_at: string
          decidido_em: string | null
          decidido_por: string | null
          id: string
          motivo: string | null
          organization_id: string
          product_id: string
          quantidade_sugerida: number
          request_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          motivo?: string | null
          organization_id: string
          product_id: string
          quantidade_sugerida: number
          request_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          motivo?: string | null
          organization_id?: string
          product_id?: string
          quantidade_sugerida?: number
          request_id?: string | null
          status?: string
        }
        Relationships: []
      }
      requester_cart_items: {
        Row: {
          cart_id: string
          created_at: string
          descricao: string
          id: string
          observacao: string | null
          organization_id: string
          product_id: string | null
          quantidade: number
        }
        Insert: {
          cart_id: string
          created_at?: string
          descricao: string
          id?: string
          observacao?: string | null
          organization_id: string
          product_id?: string | null
          quantidade?: number
        }
        Update: {
          cart_id?: string
          created_at?: string
          descricao?: string
          id?: string
          observacao?: string | null
          organization_id?: string
          product_id?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "requester_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "requester_carts"
            referencedColumns: ["id"]
          },
        ]
      }
      requester_carts: {
        Row: {
          cost_center_id: string | null
          created_at: string
          enviado_em: string | null
          id: string
          justificativa: string | null
          organization_id: string
          prazo_desejado: string | null
          request_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_center_id?: string | null
          created_at?: string
          enviado_em?: string | null
          id?: string
          justificativa?: string | null
          organization_id: string
          prazo_desejado?: string | null
          request_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_center_id?: string | null
          created_at?: string
          enviado_em?: string | null
          id?: string
          justificativa?: string | null
          organization_id?: string
          prazo_desejado?: string | null
          request_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_reports: {
        Row: {
          agendamento: Json | null
          colunas: Json
          created_at: string
          created_by: string
          filtros: Json
          id: string
          nome: string
          organization_id: string
          tipo: string
          ultima_execucao: string | null
          updated_at: string
        }
        Insert: {
          agendamento?: Json | null
          colunas?: Json
          created_at?: string
          created_by: string
          filtros?: Json
          id?: string
          nome: string
          organization_id: string
          tipo: string
          ultima_execucao?: string | null
          updated_at?: string
        }
        Update: {
          agendamento?: Json | null
          colunas?: Json
          created_at?: string
          created_by?: string
          filtros?: Json
          id?: string
          nome?: string
          organization_id?: string
          tipo?: string
          ultima_execucao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          organization_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          created_at: string
          expedida_em: string
          expedida_por: string
          id: string
          observacao: string | null
          order_id: string
          organization_id: string
          rastreio: string | null
          status: string
          transportadora: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          expedida_em?: string
          expedida_por: string
          id?: string
          observacao?: string | null
          order_id: string
          organization_id: string
          rastreio?: string | null
          status?: string
          transportadora?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          expedida_em?: string
          expedida_por?: string
          id?: string
          observacao?: string | null
          order_id?: string
          organization_id?: string
          rastreio?: string | null
          status?: string
          transportadora?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_items: {
        Row: {
          batch_id: string | null
          created_at: string
          divergencia: number | null
          id: string
          observacao: string | null
          organization_id: string
          product_id: string
          quantidade_enviada: number
          quantidade_recebida: number | null
          transfer_id: string
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          divergencia?: number | null
          id?: string
          observacao?: string | null
          organization_id: string
          product_id: string
          quantidade_enviada?: number
          quantidade_recebida?: number | null
          transfer_id: string
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          divergencia?: number | null
          id?: string
          observacao?: string | null
          organization_id?: string
          product_id?: string
          quantidade_enviada?: number
          quantidade_recebida?: number | null
          transfer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "product_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string
          created_by: string | null
          destino_id: string
          enviada_em: string | null
          enviada_por: string | null
          id: string
          numero: string | null
          observacao: string | null
          organization_id: string
          origem_id: string
          recebida_em: string | null
          recebida_por: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destino_id: string
          enviada_em?: string | null
          enviada_por?: string | null
          id?: string
          numero?: string | null
          observacao?: string | null
          organization_id: string
          origem_id: string
          recebida_em?: string | null
          recebida_por?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destino_id?: string
          enviada_em?: string | null
          enviada_por?: string | null
          id?: string
          numero?: string | null
          observacao?: string | null
          organization_id?: string
          origem_id?: string
          recebida_em?: string | null
          recebida_por?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_destino_id_fkey"
            columns: ["destino_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_origem_id_fkey"
            columns: ["origem_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount: number
          billing_period_end: string
          billing_period_start: string
          created_at: string
          currency: string
          due_date: string
          id: string
          invoice_number: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          payment_method: string | null
          pdf_url: string | null
          status: string
          subscription_plan: string
          updated_at: string
        }
        Insert: {
          amount: number
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          invoice_number: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          status: string
          subscription_plan: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          invoice_number?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          status?: string
          subscription_plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_bank_accounts: {
        Row: {
          agencia: string
          banco: string
          chave_pix: string | null
          conta: string
          created_at: string
          documento_titular: string | null
          id: string
          is_primary: boolean
          organization_id: string
          supplier_id: string
          tipo_conta: string | null
          titular: string
          updated_at: string
        }
        Insert: {
          agencia: string
          banco: string
          chave_pix?: string | null
          conta: string
          created_at?: string
          documento_titular?: string | null
          id?: string
          is_primary?: boolean
          organization_id: string
          supplier_id: string
          tipo_conta?: string | null
          titular: string
          updated_at?: string
        }
        Update: {
          agencia?: string
          banco?: string
          chave_pix?: string | null
          conta?: string
          created_at?: string
          documento_titular?: string | null
          id?: string
          is_primary?: boolean
          organization_id?: string
          supplier_id?: string
          tipo_conta?: string | null
          titular?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_bank_accounts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_change_requests: {
        Row: {
          campo: string
          created_at: string
          id: string
          justificativa: string | null
          organization_id: string
          requested_by: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["supplier_change_status"]
          supplier_id: string
          updated_at: string
          valor_antigo: Json | null
          valor_novo: Json
        }
        Insert: {
          campo: string
          created_at?: string
          id?: string
          justificativa?: string | null
          organization_id: string
          requested_by: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["supplier_change_status"]
          supplier_id: string
          updated_at?: string
          valor_antigo?: Json | null
          valor_novo: Json
        }
        Update: {
          campo?: string
          created_at?: string
          id?: string
          justificativa?: string | null
          organization_id?: string
          requested_by?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["supplier_change_status"]
          supplier_id?: string
          updated_at?: string
          valor_antigo?: Json | null
          valor_novo?: Json
        }
        Relationships: [
          {
            foreignKeyName: "supplier_change_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contracts: {
        Row: {
          arquivo_url: string | null
          auto_renovacao: boolean
          aviso_enviado_em: string | null
          categoria: string | null
          condicao_pagamento: string | null
          created_at: string
          created_by: string
          desconto_percent: number | null
          dias_aviso_vencimento: number
          fim: string
          id: string
          inicio: string
          numero: string
          observacoes: string | null
          organization_id: string
          status: string
          supplier_id: string
          updated_at: string
          valor_mensal: number | null
        }
        Insert: {
          arquivo_url?: string | null
          auto_renovacao?: boolean
          aviso_enviado_em?: string | null
          categoria?: string | null
          condicao_pagamento?: string | null
          created_at?: string
          created_by: string
          desconto_percent?: number | null
          dias_aviso_vencimento?: number
          fim: string
          id?: string
          inicio: string
          numero: string
          observacoes?: string | null
          organization_id: string
          status?: string
          supplier_id: string
          updated_at?: string
          valor_mensal?: number | null
        }
        Update: {
          arquivo_url?: string | null
          auto_renovacao?: boolean
          aviso_enviado_em?: string | null
          categoria?: string | null
          condicao_pagamento?: string | null
          created_at?: string
          created_by?: string
          desconto_percent?: number | null
          dias_aviso_vencimento?: number
          fim?: string
          id?: string
          inicio?: string
          numero?: string
          observacoes?: string | null
          organization_id?: string
          status?: string
          supplier_id?: string
          updated_at?: string
          valor_mensal?: number | null
        }
        Relationships: []
      }
      supplier_documents: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          created_at: string
          enviado_em: string | null
          enviado_por: string | null
          file_name: string | null
          file_path: string | null
          id: string
          nome: string
          obrigatorio: boolean
          observacao_analise: string | null
          organization_id: string
          status: Database["public"]["Enums"]["supplier_doc_status"]
          supplier_id: string
          tipo: string
          updated_at: string
          validade: string | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          created_at?: string
          enviado_em?: string | null
          enviado_por?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          nome: string
          obrigatorio?: boolean
          observacao_analise?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["supplier_doc_status"]
          supplier_id: string
          tipo: string
          updated_at?: string
          validade?: string | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          created_at?: string
          enviado_em?: string | null
          enviado_por?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          nome?: string
          obrigatorio?: boolean
          observacao_analise?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["supplier_doc_status"]
          supplier_id?: string
          tipo?: string
          updated_at?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_evaluations: {
        Row: {
          atendimento: number
          avaliado_por: string
          comentario: string | null
          created_at: string
          id: string
          nota_geral: number | null
          order_id: string
          organization_id: string
          pontualidade: number
          preco: number
          qualidade: number
          supplier_id: string
          updated_at: string
        }
        Insert: {
          atendimento: number
          avaliado_por: string
          comentario?: string | null
          created_at?: string
          id?: string
          nota_geral?: number | null
          order_id: string
          organization_id: string
          pontualidade: number
          preco: number
          qualidade: number
          supplier_id: string
          updated_at?: string
        }
        Update: {
          atendimento?: number
          avaliado_por?: string
          comentario?: string | null
          created_at?: string
          id?: string
          nota_geral?: number | null
          order_id?: string
          organization_id?: string
          pontualidade?: number
          preco?: number
          qualidade?: number
          supplier_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_invitations: {
        Row: {
          categoria_esperada: string | null
          cnpj: string | null
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          nome_empresa: string | null
          observacao_interna: string | null
          organization_id: string
          status: Database["public"]["Enums"]["supplier_invitation_status"]
          supplier_id: string | null
          tipo_fornecedor: string
          token: string
          updated_at: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          categoria_esperada?: string | null
          cnpj?: string | null
          created_at?: string
          created_by: string
          email: string
          expires_at: string
          id?: string
          nome_empresa?: string | null
          observacao_interna?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["supplier_invitation_status"]
          supplier_id?: string | null
          tipo_fornecedor?: string
          token: string
          updated_at?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          categoria_esperada?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          nome_empresa?: string | null
          observacao_interna?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["supplier_invitation_status"]
          supplier_id?: string | null
          tipo_fornecedor?: string
          token?: string
          updated_at?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invitations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invoices: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          chave_acesso: string | null
          created_at: string
          enviado_em: string
          enviado_por: string | null
          file_name: string | null
          file_path: string | null
          id: string
          motivo_recusa: string | null
          numero_nf: string
          observacao: string | null
          organization_id: string
          purchase_order_id: string | null
          serie: string | null
          status: Database["public"]["Enums"]["supplier_invoice_status"]
          supplier_id: string
          updated_at: string
          valor: number
          xml_path: string | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          chave_acesso?: string | null
          created_at?: string
          enviado_em?: string
          enviado_por?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          motivo_recusa?: string | null
          numero_nf: string
          observacao?: string | null
          organization_id: string
          purchase_order_id?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["supplier_invoice_status"]
          supplier_id: string
          updated_at?: string
          valor: number
          xml_path?: string | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          chave_acesso?: string | null
          created_at?: string
          enviado_em?: string
          enviado_por?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          motivo_recusa?: string | null
          numero_nf?: string
          observacao?: string | null
          organization_id?: string
          purchase_order_id?: string | null
          serie?: string | null
          status?: Database["public"]["Enums"]["supplier_invoice_status"]
          supplier_id?: string
          updated_at?: string
          valor?: number
          xml_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_registration_drafts: {
        Row: {
          created_at: string
          current_step: number
          data: Json
          id: string
          invitation_token: string | null
          organization_id: string | null
          submitted: boolean
          supplier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_step?: number
          data?: Json
          id?: string
          invitation_token?: string | null
          organization_id?: string | null
          submitted?: boolean
          supplier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_step?: number
          data?: Json
          id?: string
          invitation_token?: string | null
          organization_id?: string | null
          submitted?: boolean
          supplier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_registration_drafts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_score_snapshots: {
        Row: {
          captured_at: string
          id: string
          metrics: Json
          organization_id: string
          period_from: string
          period_to: string
          score_final: number
          supplier_id: string
          tier: string
        }
        Insert: {
          captured_at?: string
          id?: string
          metrics?: Json
          organization_id: string
          period_from: string
          period_to: string
          score_final: number
          supplier_id: string
          tier: string
        }
        Update: {
          captured_at?: string
          id?: string
          metrics?: Json
          organization_id?: string
          period_from?: string
          period_to?: string
          score_final?: number
          supplier_id?: string
          tier?: string
        }
        Relationships: []
      }
      supplier_sla_notifications: {
        Row: {
          id: string
          kind: string
          notified_at: string
          organization_id: string | null
          ref_id: string
          supplier_id: string
        }
        Insert: {
          id?: string
          kind: string
          notified_at?: string
          organization_id?: string | null
          ref_id: string
          supplier_id: string
        }
        Update: {
          id?: string
          kind?: string
          notified_at?: string
          organization_id?: string | null
          ref_id?: string
          supplier_id?: string
        }
        Relationships: []
      }
      supplier_users: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          organization_id: string
          supplier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          organization_id: string
          supplier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          organization_id?: string
          supplier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_users_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          acesso_liberado_manual: boolean
          approved_at: string | null
          ativo: boolean
          avaliacao: number | null
          bairro: string | null
          cargo_comercial: string | null
          categoria: string | null
          categorias: string[]
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          contato_nome: string | null
          created_at: string
          created_by: string
          email: string | null
          email_comercial: string | null
          email_financeiro: string | null
          email_tecnico: string | null
          endereco: string | null
          homologacao_validade: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          logradouro: string | null
          nome_fantasia: string
          numero: string | null
          observacoes: string | null
          organization_id: string
          pais: string | null
          porte: string | null
          produtos_servicos: string[] | null
          razao_social: string | null
          regime_tributario: string | null
          responsavel_comercial: string | null
          responsavel_financeiro: string | null
          responsavel_tecnico: string | null
          site: string | null
          status: Database["public"]["Enums"]["supplier_status"]
          status_observacao: string | null
          submitted_at: string | null
          telefone: string | null
          telefone_comercial: string | null
          telefone_financeiro: string | null
          telefone_tecnico: string | null
          tipo_fornecedor: string | null
          uf: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          acesso_liberado_manual?: boolean
          approved_at?: string | null
          ativo?: boolean
          avaliacao?: number | null
          bairro?: string | null
          cargo_comercial?: string | null
          categoria?: string | null
          categorias?: string[]
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          contato_nome?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          email_comercial?: string | null
          email_financeiro?: string | null
          email_tecnico?: string | null
          endereco?: string | null
          homologacao_validade?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logradouro?: string | null
          nome_fantasia: string
          numero?: string | null
          observacoes?: string | null
          organization_id: string
          pais?: string | null
          porte?: string | null
          produtos_servicos?: string[] | null
          razao_social?: string | null
          regime_tributario?: string | null
          responsavel_comercial?: string | null
          responsavel_financeiro?: string | null
          responsavel_tecnico?: string | null
          site?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          status_observacao?: string | null
          submitted_at?: string | null
          telefone?: string | null
          telefone_comercial?: string | null
          telefone_financeiro?: string | null
          telefone_tecnico?: string | null
          tipo_fornecedor?: string | null
          uf?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          acesso_liberado_manual?: boolean
          approved_at?: string | null
          ativo?: boolean
          avaliacao?: number | null
          bairro?: string | null
          cargo_comercial?: string | null
          categoria?: string | null
          categorias?: string[]
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          contato_nome?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          email_comercial?: string | null
          email_financeiro?: string | null
          email_tecnico?: string | null
          endereco?: string | null
          homologacao_validade?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logradouro?: string | null
          nome_fantasia?: string
          numero?: string | null
          observacoes?: string | null
          organization_id?: string
          pais?: string | null
          porte?: string | null
          produtos_servicos?: string[] | null
          razao_social?: string | null
          regime_tributario?: string | null
          responsavel_comercial?: string | null
          responsavel_financeiro?: string | null
          responsavel_tecnico?: string | null
          site?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          status_observacao?: string | null
          submitted_at?: string | null
          telefone?: string | null
          telefone_comercial?: string | null
          telefone_financeiro?: string | null
          telefone_tecnico?: string | null
          tipo_fornecedor?: string | null
          uf?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      unit_blocks: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_blocks_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_floors: {
        Row: {
          block_id: string
          created_at: string
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          block_id: string
          created_at?: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          block_id?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_floors_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "unit_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_sectors: {
        Row: {
          created_at: string
          display_order: number
          floor_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          floor_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          floor_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_sectors_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "unit_floors"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_subspaces: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          sector_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          sector_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          sector_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_subspaces_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "unit_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          address: string | null
          color: string | null
          created_at: string
          display_order: number
          emoji: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          observation: string | null
          short_name: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          color?: string | null
          created_at?: string
          display_order?: number
          emoji?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          observation?: string | null
          short_name?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          color?: string | null
          created_at?: string
          display_order?: number
          emoji?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          observation?: string | null
          short_name?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_approvals: {
        Row: {
          approved_by: string | null
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          banned_by: string | null
          banned_until: string | null
          created_at: string
          id: string
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          banned_by?: string | null
          banned_until?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          banned_by?: string | null
          banned_until?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_cost_centers: {
        Row: {
          can_approve_cc: boolean
          can_request: boolean
          cost_center_id: string
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_approve_cc?: boolean
          can_request?: boolean
          cost_center_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_approve_cc?: boolean
          can_request?: boolean
          cost_center_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cost_centers_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cost_centers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          email: string
          expires_at: string
          filled_name: string | null
          id: string
          internal_note: string | null
          invited_by: string
          invitee_type: string | null
          organization_id: string
          resent_from: string | null
          revoked_at: string | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          email: string
          expires_at: string
          filled_name?: string | null
          id?: string
          internal_note?: string | null
          invited_by: string
          invitee_type?: string | null
          organization_id: string
          resent_from?: string | null
          revoked_at?: string | null
          role: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          filled_name?: string | null
          id?: string
          internal_note?: string | null
          invited_by?: string
          invitee_type?: string | null
          organization_id?: string
          resent_from?: string | null
          revoked_at?: string | null
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_tokens: {
        Row: {
          created_at: string | null
          id: string
          subscription: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          subscription: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          subscription?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tile_preferences: {
        Row: {
          created_at: string
          group_key: string
          hidden: boolean
          id: string
          position: number
          tile_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_key?: string
          hidden?: boolean
          id?: string
          position?: number
          tile_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_key?: string
          hidden?: boolean
          id?: string
          position?: number
          tile_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      warehouse_bins: {
        Row: {
          capacidade: number | null
          codigo: string
          corredor: string | null
          created_at: string
          id: string
          organization_id: string
          posicao: string | null
          prateleira: string | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          capacidade?: number | null
          codigo: string
          corredor?: string | null
          created_at?: string
          id?: string
          organization_id: string
          posicao?: string | null
          prateleira?: string | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          capacidade?: number | null
          codigo?: string
          corredor?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          posicao?: string | null
          prateleira?: string | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_bins_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_zones: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          created_by: string
          id: string
          nome: string
          organization_id: string
          rota: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          created_by: string
          id?: string
          nome: string
          organization_id: string
          rota?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string
          id?: string
          nome?: string
          organization_id?: string
          rota?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          ativo: boolean
          codigo: string | null
          created_at: string
          created_by: string | null
          endereco: Json | null
          id: string
          nome: string
          organization_id: string
          padrao: boolean
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          endereco?: Json | null
          id?: string
          nome: string
          organization_id: string
          padrao?: boolean
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          endereco?: Json | null
          id?: string
          nome?: string
          organization_id?: string
          padrao?: boolean
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      contracts_expiring_v: {
        Row: {
          auto_renovacao: boolean | null
          aviso_enviado_em: string | null
          contract_id: string | null
          dias_aviso_vencimento: number | null
          dias_para_vencer: number | null
          fim: string | null
          numero: string | null
          organization_id: string | null
          status: string | null
          supplier_id: string | null
        }
        Insert: {
          auto_renovacao?: boolean | null
          aviso_enviado_em?: string | null
          contract_id?: string | null
          dias_aviso_vencimento?: number | null
          dias_para_vencer?: never
          fim?: string | null
          numero?: string | null
          organization_id?: string | null
          status?: string | null
          supplier_id?: string | null
        }
        Update: {
          auto_renovacao?: boolean | null
          aviso_enviado_em?: string | null
          contract_id?: string | null
          dias_aviso_vencimento?: number | null
          dias_para_vencer?: never
          fim?: string | null
          numero?: string | null
          organization_id?: string | null
          status?: string | null
          supplier_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _ci_user_can_approve: { Args: { _ci_id: string }; Returns: boolean }
      _ci_user_can_distribute: { Args: { _ci_id: string }; Returns: boolean }
      _ci_user_has_role: {
        Args: { _ci_id: string; _roles: string[] }
        Returns: boolean
      }
      _dem_notify: {
        Args: {
          _demand: string
          _event: string
          _message: string
          _org: string
          _recipient: string
          _title: string
        }
        Returns: undefined
      }
      _invoke_push: {
        Args: {
          _data: Json
          _message: string
          _title: string
          _url: string
          _user_id: string
        }
        Returns: undefined
      }
      accept_organization_invitation: {
        Args: { invitation_token: string }
        Returns: Json
      }
      accounts_payable_summary: { Args: never; Returns: Json }
      active_contract_price: {
        Args: { _product_id: string; _supplier_id: string }
        Returns: {
          contract_id: string
          desconto_percent: number
          fim: string
          numero: string
          prazo_entrega_dias: number
          preco_unitario: number
        }[]
      }
      approval_sla_sweep: { Args: never; Returns: Json }
      budget_consumed: { Args: { _budget_id: string }; Returns: number }
      budget_status: {
        Args: never
        Returns: {
          category: string
          cost_center_id: string
          cost_center_nome: string
          id: string
          pct_consumido: number
          periodo_fim: string
          periodo_inicio: string
          valor_alerta_percent: number
          valor_consumido: number
          valor_planejado: number
        }[]
      }
      calculate_demand_forecast: {
        Args: { _org: string; _product_id: string }
        Returns: number
      }
      can_create_purchase_request: {
        Args: { _user_id: string }
        Returns: boolean
      }
      cancel_fiscal_invoice: {
        Args: { _id: string; _motivo: string }
        Returns: Json
      }
      cash_flow_projection: {
        Args: { _dias?: number }
        Returns: {
          dia: string
          qtd: number
          valor_a_pagar: number
        }[]
      }
      check_is_super_admin: { Args: never; Returns: boolean }
      choose_quote: { Args: { _quote_id: string }; Returns: undefined }
      ci_approve: {
        Args: { _comentario?: string; _id: string }
        Returns: undefined
      }
      ci_assign_buyer: {
        Args: { _buyer_id: string; _id: string; _secondary?: string }
        Returns: undefined
      }
      ci_check_stock: {
        Args: { p_term: string }
        Returns: {
          current_stock: number
          id: string
          min_stock: number
          name: string
          sku: string
        }[]
      }
      ci_coordinator_approve: {
        Args: { _comentario?: string; _id: string }
        Returns: undefined
      }
      ci_council_decide: {
        Args: { _comentario?: string; _decisao: string; _id: string }
        Returns: undefined
      }
      ci_engineer_approve: {
        Args: { _id: string; _parecer?: string }
        Returns: undefined
      }
      ci_engineer_request_adjustment: {
        Args: { _id: string; _motivo: string }
        Returns: undefined
      }
      ci_lookup: {
        Args: { p_protocol: string; p_registration?: string }
        Returns: Json
      }
      ci_manager_send_to_council: {
        Args: { _comentario?: string; _id: string }
        Returns: undefined
      }
      ci_promote_to_purchase: { Args: { p_ci_id: string }; Returns: string }
      ci_regulatory_approve: {
        Args: { _id: string; _parecer?: string }
        Returns: undefined
      }
      ci_regulatory_request_adjustment: {
        Args: { _id: string; _motivo: string }
        Returns: undefined
      }
      ci_reject: { Args: { _id: string; _motivo: string }; Returns: undefined }
      ci_request_regulatory_review: {
        Args: { _comentario?: string; _id: string }
        Returns: undefined
      }
      ci_request_superior_approval: {
        Args: { _id: string; _motivo?: string }
        Returns: undefined
      }
      ci_request_technical_review: {
        Args: { _comentario?: string; _id: string }
        Returns: undefined
      }
      ci_user_can_access: { Args: { _ci_id: string }; Returns: boolean }
      close_inventory_session: { Args: { _session_id: string }; Returns: Json }
      confirm_sales_order: { Args: { _order_id: string }; Returns: Json }
      consume_batch_fefo: {
        Args: { _product_id: string; _qty: number; _warehouse_id: string }
        Returns: {
          batch_id: string
          lote: string
          quantidade_disponivel: number
          validade: string
        }[]
      }
      council_cast_vote: {
        Args: {
          _comentario?: string
          _proposal_id: string
          _voto: Database["public"]["Enums"]["council_vote_value"]
        }
        Returns: undefined
      }
      council_grant_test_access: { Args: never; Returns: undefined }
      council_open_voting: {
        Args: { _proposal_id: string }
        Returns: undefined
      }
      council_recalc_status: {
        Args: { _proposal_id: string }
        Returns: undefined
      }
      create_purchase_order: { Args: { _quote_id: string }; Returns: string }
      decide_approval: {
        Args: { _comentario?: string; _decision: string; _request_id: string }
        Returns: Json
      }
      decide_approval_step: {
        Args: { _comentario?: string; _decisao: string; _step_id: string }
        Returns: Database["public"]["Enums"]["approval_request_status"]
      }
      detect_budget_overruns: { Args: { _org: string }; Returns: number }
      detect_consumption_anomalies: { Args: { _org: string }; Returns: number }
      dispatch_webhook_event: {
        Args: { _evento: string; _org: string; _payload: Json }
        Returns: undefined
      }
      generate_approval_chain: {
        Args: { _request_id: string }
        Returns: undefined
      }
      generate_cycle_count_tasks: {
        Args: { p_plan_id: string }
        Returns: number
      }
      generate_payable_from_order: {
        Args: { _order_id: string }
        Returns: string
      }
      generate_reorder_suggestions: { Args: { _org: string }; Returns: number }
      get_asset_by_qr: {
        Args: { _qr: string }
        Returns: {
          asset_number: string
          brand: string
          description: string
          id: string
          model: string
          name: string
          status: Database["public"]["Enums"]["asset_status"]
          unit_name: string
        }[]
      }
      get_contracts_dashboard: {
        Args: never
        Returns: {
          ativos: number
          em_renovacao: number
          valor_mensal_total: number
          vencendo_30d: number
          vencidos: number
        }[]
      }
      get_current_user_role: { Args: never; Returns: string }
      get_cycle_count_dashboard: {
        Args: never
        Returns: {
          aprovadas_mes: number
          contadas_hoje: number
          curva_a: number
          curva_b: number
          curva_c: number
          divergentes: number
          pendentes: number
        }[]
      }
      get_document_flow: { Args: { _root_request_id: string }; Returns: Json }
      get_inbound_invoices_dashboard: { Args: never; Returns: Json }
      get_launchpad_metrics: { Args: { _org?: string }; Returns: Json }
      get_organization_role: { Args: never; Returns: string }
      get_picking_waves_dashboard: {
        Args: never
        Returns: {
          abertas: number
          concluidas_hoje: number
          itens_pendentes: number
          separando: number
        }[]
      }
      get_stockout_alerts: {
        Args: { p_lead_time_default?: number }
        Returns: {
          cobertura_dias: number
          consumo_diario: number
          current_stock: number
          lead_time_dias: number
          product_id: string
          product_name: string
          status: string
        }[]
      }
      get_supplier_scorecard: {
        Args: { _from: string; _to: string }
        Returns: {
          divergence_rate: number
          manual_avg: number
          nf_on_time_rate: number
          nome_fantasia: string
          on_time_rate: number
          orders_count: number
          quote_response_rate: number
          score_final: number
          supplier_id: string
          tier: string
          total_value: number
        }[]
      }
      get_user_cost_centers: {
        Args: { _user_id: string }
        Returns: {
          can_approve_cc: boolean
          codigo: string
          id: string
          is_default: boolean
          nome: string
        }[]
      }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_unig_role: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inserir_3x_e_parar: { Args: never; Returns: undefined }
      invoice_sales_order: {
        Args: { _data_vencimento?: string; _order_id: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_gerente: { Args: never; Returns: boolean }
      is_admin_unit_manager: { Args: never; Returns: boolean }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      is_council_member: {
        Args: { _org: string; _user_id: string }
        Returns: boolean
      }
      is_org_admin: { Args: { org_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_supplier_user: { Args: { _user_id: string }; Returns: boolean }
      kpi_purchase_lead_time_series: {
        Args: { _from: string; _to: string }
        Returns: {
          emitidos: number
          mes: string
          recebidos: number
        }[]
      }
      kpi_purchases_by_category: {
        Args: { _from: string; _to: string }
        Returns: {
          categoria: string
          total_pedidos: number
          valor_total: number
        }[]
      }
      kpi_purchases_by_status: {
        Args: { _from: string; _to: string }
        Returns: {
          status: string
          total: number
        }[]
      }
      kpi_purchases_overview: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      kpi_top_suppliers: {
        Args: { _from: string; _limit?: number; _to: string }
        Returns: {
          nome_fantasia: string
          nota_media: number
          pct_no_prazo: number
          supplier_id: string
          total_pedidos: number
          valor_total: number
        }[]
      }
      mark_overdue_demands: { Args: never; Returns: number }
      next_fiscal_number: {
        Args: {
          _modelo: Database["public"]["Enums"]["fiscal_modelo"]
          _org_id: string
        }
        Returns: {
          numero: number
          serie: number
        }[]
      }
      od_is_admin: { Args: never; Returns: boolean }
      od_user_role: { Args: never; Returns: string }
      pick_sales_order: {
        Args: { _items: Json; _order_id: string }
        Returns: Json
      }
      process_purchase_return: { Args: { _return_id: string }; Returns: Json }
      process_sales_return: { Args: { _return_id: string }; Returns: Json }
      recalc_abc_curve: { Args: never; Returns: number }
      register_receipt: {
        Args: {
          _divergencia?: boolean
          _divergencia_desc?: string
          _observacoes?: string
          _order_id: string
          _quantidade: number
        }
        Returns: Json
      }
      register_sales_receipt: {
        Args: {
          _ar_id: string
          _bank_account_id?: string
          _data: string
          _forma?: string
          _valor: number
        }
        Returns: Json
      }
      resolve_step_approvers: {
        Args: { _step_id: string }
        Returns: {
          user_id: string
        }[]
      }
      ship_sales_order: {
        Args: {
          _order_id: string
          _rastreio?: string
          _transportadora?: string
        }
        Returns: Json
      }
      start_approval_request: {
        Args: {
          _categoria?: string
          _cost_center_id?: string
          _referencia_id: string
          _referencia_tipo: string
          _valor?: number
        }
        Returns: string
      }
      submit_ci: { Args: { payload: Json }; Returns: Json }
      submit_purchase_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      supplier_id_of: { Args: { _user_id: string }; Returns: string }
      supplier_org_of: { Args: { _user_id: string }; Returns: string }
      transfer_receive: {
        Args: { _items: Json; _transfer_id: string }
        Returns: Json
      }
      transfer_send: { Args: { _transfer_id: string }; Returns: Json }
      update_payable_status: {
        Args: { _payable_id: string }
        Returns: undefined
      }
      update_receivable_status: { Args: { _ar_id: string }; Returns: undefined }
      user_belongs_to_supplier: {
        Args: { _supplier_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_decide_step: {
        Args: { _step_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      alert_severity: "low" | "medium" | "high" | "critical"
      alert_type: "low_stock" | "expired" | "system" | "security"
      app_role: "super_admin" | "org_admin" | "manager" | "user"
      approval_request_status:
        | "pendente"
        | "aprovado"
        | "rejeitado"
        | "cancelado"
        | "escalonado"
      approval_step_status:
        | "aguardando"
        | "pendente"
        | "aprovado"
        | "rejeitado"
        | "escalonado"
        | "pulado"
      approval_step_type: "unico" | "paralelo" | "qualquer_um"
      asset_condition: "novo" | "bom" | "regular" | "ruim" | "inservivel"
      asset_status:
        | "ativo"
        | "em_uso"
        | "em_manutencao"
        | "reserva"
        | "danificado"
        | "sem_localizacao"
        | "transferido"
        | "baixado"
        | "extraviado"
      ci_channel: "chatbot" | "formulario" | "interno"
      ci_priority: "baixa" | "media" | "alta" | "urgente"
      ci_status:
        | "recebida"
        | "em_analise"
        | "aguardando_aprovacao"
        | "aprovada"
        | "em_cotacao"
        | "pedido_emitido"
        | "aguardando_entrega"
        | "recebida_estoque"
        | "finalizada"
        | "cancelada"
        | "reprovada"
        | "aguardando_validacao_tecnica"
        | "ajuste_solicitado_engenheira"
        | "aguardando_coordenador"
        | "aguardando_gerente"
        | "aguardando_conselho"
        | "revisao_solicitada"
        | "desaprovada_conselho"
        | "aguardando_validacao_regulatoria"
        | "ajuste_solicitado_regulatorio"
      council_proposal_status:
        | "rascunho"
        | "em_votacao"
        | "aprovada"
        | "reprovada"
        | "retirada"
      council_vote_value: "aprovado" | "rejeitado" | "abstencao"
      fiscal_ambiente: "homologacao" | "producao"
      fiscal_event_tipo:
        | "emissao"
        | "cancelamento"
        | "carta_correcao"
        | "inutilizacao"
        | "consulta"
      fiscal_modelo: "55" | "65"
      fiscal_status:
        | "rascunho"
        | "processando"
        | "autorizada"
        | "rejeitada"
        | "cancelada"
        | "inutilizada"
      fiscal_tipo: "saida" | "entrada" | "devolucao_venda" | "devolucao_compra"
      movement_type: "entrada" | "saida" | "transferencia" | "ajuste"
      operational_demand_priority: "baixa" | "media" | "alta" | "urgente"
      operational_demand_status:
        | "rascunho"
        | "registrada"
        | "em_analise"
        | "em_planejamento"
        | "aguardando_aprovacao"
        | "aguardando_orcamento"
        | "aguardando_compra"
        | "aguardando_equipe"
        | "aguardando_fornecedor"
        | "em_execucao"
        | "pausada"
        | "concluida"
        | "cancelada"
      operational_demand_type:
        | "projeto_operacional"
        | "demanda_administrativa"
        | "melhoria_unidade"
        | "reforma_adequacao"
        | "manutencao_planejada"
        | "apoio_evento"
        | "implantacao_processo"
        | "organizacao_ambiente"
        | "compra_operacao"
        | "ajuste_estrutural"
        | "solicitacao_estrategica"
        | "outro"
      organization_role: "organization_admin" | "manager" | "user"
      product_category:
        | "eletronicos"
        | "escritorio"
        | "limpeza"
        | "manutencao"
        | "outros"
        | "cozinha"
      purchase_priority: "baixa" | "normal" | "alta" | "urgente"
      purchase_status:
        | "nova"
        | "em_analise"
        | "aguardando_aprovacao"
        | "aprovada"
        | "reprovada"
        | "em_cotacao"
        | "compra_realizada"
        | "aguardando_entrega"
        | "recebida"
        | "finalizada"
      regime_tributario:
        | "simples_nacional"
        | "lucro_presumido"
        | "lucro_real"
        | "mei"
      return_status: "rascunho" | "processada" | "cancelada"
      supplier_change_status: "pendente" | "aprovada" | "rejeitada"
      supplier_doc_status:
        | "nao_enviado"
        | "enviado"
        | "em_analise"
        | "aprovado"
        | "reprovado"
        | "vencido"
      supplier_invitation_status:
        | "pendente"
        | "usado"
        | "expirado"
        | "cancelado"
      supplier_invoice_status:
        | "aguardando_envio"
        | "enviada"
        | "em_analise"
        | "aprovada"
        | "recusada"
        | "pagamento_liberado"
      supplier_status:
        | "rascunho"
        | "aguardando_envio"
        | "em_analise"
        | "pendente_correcao"
        | "aprovado"
        | "reprovado"
        | "bloqueado"
        | "documentacao_vencida"
        | "convidado"
        | "acesso_criado"
        | "cadastro_incompleto"
      tipo_credito_devolucao:
        | "estorno_financeiro"
        | "credito_em_conta"
        | "troca"
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
      alert_severity: ["low", "medium", "high", "critical"],
      alert_type: ["low_stock", "expired", "system", "security"],
      app_role: ["super_admin", "org_admin", "manager", "user"],
      approval_request_status: [
        "pendente",
        "aprovado",
        "rejeitado",
        "cancelado",
        "escalonado",
      ],
      approval_step_status: [
        "aguardando",
        "pendente",
        "aprovado",
        "rejeitado",
        "escalonado",
        "pulado",
      ],
      approval_step_type: ["unico", "paralelo", "qualquer_um"],
      asset_condition: ["novo", "bom", "regular", "ruim", "inservivel"],
      asset_status: [
        "ativo",
        "em_uso",
        "em_manutencao",
        "reserva",
        "danificado",
        "sem_localizacao",
        "transferido",
        "baixado",
        "extraviado",
      ],
      ci_channel: ["chatbot", "formulario", "interno"],
      ci_priority: ["baixa", "media", "alta", "urgente"],
      ci_status: [
        "recebida",
        "em_analise",
        "aguardando_aprovacao",
        "aprovada",
        "em_cotacao",
        "pedido_emitido",
        "aguardando_entrega",
        "recebida_estoque",
        "finalizada",
        "cancelada",
        "reprovada",
        "aguardando_validacao_tecnica",
        "ajuste_solicitado_engenheira",
        "aguardando_coordenador",
        "aguardando_gerente",
        "aguardando_conselho",
        "revisao_solicitada",
        "desaprovada_conselho",
        "aguardando_validacao_regulatoria",
        "ajuste_solicitado_regulatorio",
      ],
      council_proposal_status: [
        "rascunho",
        "em_votacao",
        "aprovada",
        "reprovada",
        "retirada",
      ],
      council_vote_value: ["aprovado", "rejeitado", "abstencao"],
      fiscal_ambiente: ["homologacao", "producao"],
      fiscal_event_tipo: [
        "emissao",
        "cancelamento",
        "carta_correcao",
        "inutilizacao",
        "consulta",
      ],
      fiscal_modelo: ["55", "65"],
      fiscal_status: [
        "rascunho",
        "processando",
        "autorizada",
        "rejeitada",
        "cancelada",
        "inutilizada",
      ],
      fiscal_tipo: ["saida", "entrada", "devolucao_venda", "devolucao_compra"],
      movement_type: ["entrada", "saida", "transferencia", "ajuste"],
      operational_demand_priority: ["baixa", "media", "alta", "urgente"],
      operational_demand_status: [
        "rascunho",
        "registrada",
        "em_analise",
        "em_planejamento",
        "aguardando_aprovacao",
        "aguardando_orcamento",
        "aguardando_compra",
        "aguardando_equipe",
        "aguardando_fornecedor",
        "em_execucao",
        "pausada",
        "concluida",
        "cancelada",
      ],
      operational_demand_type: [
        "projeto_operacional",
        "demanda_administrativa",
        "melhoria_unidade",
        "reforma_adequacao",
        "manutencao_planejada",
        "apoio_evento",
        "implantacao_processo",
        "organizacao_ambiente",
        "compra_operacao",
        "ajuste_estrutural",
        "solicitacao_estrategica",
        "outro",
      ],
      organization_role: ["organization_admin", "manager", "user"],
      product_category: [
        "eletronicos",
        "escritorio",
        "limpeza",
        "manutencao",
        "outros",
        "cozinha",
      ],
      purchase_priority: ["baixa", "normal", "alta", "urgente"],
      purchase_status: [
        "nova",
        "em_analise",
        "aguardando_aprovacao",
        "aprovada",
        "reprovada",
        "em_cotacao",
        "compra_realizada",
        "aguardando_entrega",
        "recebida",
        "finalizada",
      ],
      regime_tributario: [
        "simples_nacional",
        "lucro_presumido",
        "lucro_real",
        "mei",
      ],
      return_status: ["rascunho", "processada", "cancelada"],
      supplier_change_status: ["pendente", "aprovada", "rejeitada"],
      supplier_doc_status: [
        "nao_enviado",
        "enviado",
        "em_analise",
        "aprovado",
        "reprovado",
        "vencido",
      ],
      supplier_invitation_status: [
        "pendente",
        "usado",
        "expirado",
        "cancelado",
      ],
      supplier_invoice_status: [
        "aguardando_envio",
        "enviada",
        "em_analise",
        "aprovada",
        "recusada",
        "pagamento_liberado",
      ],
      supplier_status: [
        "rascunho",
        "aguardando_envio",
        "em_analise",
        "pendente_correcao",
        "aprovado",
        "reprovado",
        "bloqueado",
        "documentacao_vencida",
        "convidado",
        "acesso_criado",
        "cadastro_incompleto",
      ],
      tipo_credito_devolucao: [
        "estorno_financeiro",
        "credito_em_conta",
        "troca",
      ],
    },
  },
} as const
