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
      billing_alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          colour_id: string | null
          created_at: string
          id: string
          is_resolved: boolean
          message: string | null
          quality_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          colour_id?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          message?: string | null
          quality_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title: string
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          colour_id?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          message?: string | null
          quality_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_alerts_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "colours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_alerts_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "billing_alerts_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "billing_alerts_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "qualities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_alerts_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "billing_alerts_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "billing_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      colours: {
        Row: {
          colour_code: string
          colour_family: string | null
          colour_name: string
          created_at: string
          hex_preview: string | null
          id: string
          is_active: boolean
          quality_id: string
          shade_band: string | null
        }
        Insert: {
          colour_code: string
          colour_family?: string | null
          colour_name: string
          created_at?: string
          hex_preview?: string | null
          id?: string
          is_active?: boolean
          quality_id: string
          shade_band?: string | null
        }
        Update: {
          colour_code?: string
          colour_family?: string | null
          colour_name?: string
          created_at?: string
          hex_preview?: string | null
          id?: string
          is_active?: boolean
          quality_id?: string
          shade_band?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colours_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "qualities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colours_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "colours_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["quality_id"]
          },
        ]
      }
      customers: {
        Row: {
          city: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          credit_limit: number | null
          gstin: string | null
          id: string
          name: string
          payment_terms: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          credit_limit?: number | null
          gstin?: string | null
          id?: string
          name: string
          payment_terms?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          credit_limit?: number | null
          gstin?: string | null
          id?: string
          name?: string
          payment_terms?: string | null
          state?: string | null
        }
        Relationships: []
      }
      dispatch_items: {
        Row: {
          colour_id: string
          dispatch_note_id: string
          id: string
          l_length_metres: number
          l_value_id: string
          lot_id: string | null
          metres: number
          pieces: number
          quality_id: string
          roll_id: string | null
        }
        Insert: {
          colour_id: string
          dispatch_note_id: string
          id?: string
          l_length_metres: number
          l_value_id: string
          lot_id?: string | null
          metres: number
          pieces: number
          quality_id: string
          roll_id?: string | null
        }
        Update: {
          colour_id?: string
          dispatch_note_id?: string
          id?: string
          l_length_metres?: number
          l_value_id?: string
          lot_id?: string | null
          metres?: number
          pieces?: number
          quality_id?: string
          roll_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_items_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "colours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_items_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "dispatch_items_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "dispatch_items_dispatch_note_id_fkey"
            columns: ["dispatch_note_id"]
            isOneToOne: false
            referencedRelation: "dispatch_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_items_l_value_id_fkey"
            columns: ["l_value_id"]
            isOneToOne: false
            referencedRelation: "l_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_items_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_items_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "qualities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_items_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "dispatch_items_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "dispatch_items_roll_id_fkey"
            columns: ["roll_id"]
            isOneToOne: false
            referencedRelation: "rolls"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_notes: {
        Row: {
          approved_by: string | null
          created_at: string
          dispatch_by: string | null
          dispatch_date: string | null
          dn_code: string
          id: string
          lr_number: string | null
          notes: string | null
          rejection_note: string | null
          sales_order_id: string
          status: Database["public"]["Enums"]["dispatch_status"]
          total_metres: number | null
          total_pieces: number | null
          transport_partner: string | null
          vehicle_number: string | null
          warehouse_id: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          dispatch_by?: string | null
          dispatch_date?: string | null
          dn_code: string
          id?: string
          lr_number?: string | null
          notes?: string | null
          rejection_note?: string | null
          sales_order_id: string
          status?: Database["public"]["Enums"]["dispatch_status"]
          total_metres?: number | null
          total_pieces?: number | null
          transport_partner?: string | null
          vehicle_number?: string | null
          warehouse_id?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          dispatch_by?: string | null
          dispatch_date?: string | null
          dn_code?: string
          id?: string
          lr_number?: string | null
          notes?: string | null
          rejection_note?: string | null
          sales_order_id?: string
          status?: Database["public"]["Enums"]["dispatch_status"]
          total_metres?: number | null
          total_pieces?: number | null
          transport_partner?: string | null
          vehicle_number?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_notes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_notes_dispatch_by_fkey"
            columns: ["dispatch_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_notes_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_notes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_entries: {
        Row: {
          challan_number: string | null
          created_at: string
          grn_code: string
          grn_date: string
          id: string
          notes: string | null
          purchase_order_id: string | null
          received_by: string | null
          status: Database["public"]["Enums"]["grn_status"]
          supplier_id: string | null
          total_metres: number | null
          total_pieces: number | null
          vehicle_number: string | null
          warehouse_id: string
        }
        Insert: {
          challan_number?: string | null
          created_at?: string
          grn_code: string
          grn_date?: string
          id?: string
          notes?: string | null
          purchase_order_id?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["grn_status"]
          supplier_id?: string | null
          total_metres?: number | null
          total_pieces?: number | null
          vehicle_number?: string | null
          warehouse_id: string
        }
        Update: {
          challan_number?: string | null
          created_at?: string
          grn_code?: string
          grn_date?: string
          id?: string
          notes?: string | null
          purchase_order_id?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["grn_status"]
          supplier_id?: string | null
          total_metres?: number | null
          total_pieces?: number | null
          vehicle_number?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grn_entries_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_entries_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          billing_user_id: string | null
          cgst: number | null
          created_at: string
          customer_id: string
          dispatch_note_id: string | null
          id: string
          igst: number | null
          invoice_code: string
          invoice_date: string
          payment_due_date: string | null
          sales_order_id: string | null
          sgst: number | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number | null
          total: number | null
          total_metres: number | null
          total_pieces: number | null
          transport_charges: number | null
        }
        Insert: {
          billing_user_id?: string | null
          cgst?: number | null
          created_at?: string
          customer_id: string
          dispatch_note_id?: string | null
          id?: string
          igst?: number | null
          invoice_code: string
          invoice_date?: string
          payment_due_date?: string | null
          sales_order_id?: string | null
          sgst?: number | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number | null
          total?: number | null
          total_metres?: number | null
          total_pieces?: number | null
          transport_charges?: number | null
        }
        Update: {
          billing_user_id?: string | null
          cgst?: number | null
          created_at?: string
          customer_id?: string
          dispatch_note_id?: string | null
          id?: string
          igst?: number | null
          invoice_code?: string
          invoice_date?: string
          payment_due_date?: string | null
          sales_order_id?: string | null
          sgst?: number | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number | null
          total?: number | null
          total_metres?: number | null
          total_pieces?: number | null
          transport_charges?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_billing_user_id_fkey"
            columns: ["billing_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_dispatch_note_id_fkey"
            columns: ["dispatch_note_id"]
            isOneToOne: false
            referencedRelation: "dispatch_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      jobwork_challans: {
        Row: {
          actual_return: string | null
          challan_code: string
          colour_id: string
          created_at: string
          id: string
          l_length_metres: number
          l_value_id: string
          lot_id: string | null
          metres_returned: number | null
          metres_sent: number
          notes: string | null
          pieces_returned: number | null
          pieces_sent: number
          process_type: string | null
          processor_id: string | null
          promised_return: string | null
          quality_id: string
          sent_date: string
          status: Database["public"]["Enums"]["jobwork_status"]
          yield_loss_metres: number | null
        }
        Insert: {
          actual_return?: string | null
          challan_code: string
          colour_id: string
          created_at?: string
          id?: string
          l_length_metres: number
          l_value_id: string
          lot_id?: string | null
          metres_returned?: number | null
          metres_sent: number
          notes?: string | null
          pieces_returned?: number | null
          pieces_sent: number
          process_type?: string | null
          processor_id?: string | null
          promised_return?: string | null
          quality_id: string
          sent_date?: string
          status?: Database["public"]["Enums"]["jobwork_status"]
          yield_loss_metres?: number | null
        }
        Update: {
          actual_return?: string | null
          challan_code?: string
          colour_id?: string
          created_at?: string
          id?: string
          l_length_metres?: number
          l_value_id?: string
          lot_id?: string | null
          metres_returned?: number | null
          metres_sent?: number
          notes?: string | null
          pieces_returned?: number | null
          pieces_sent?: number
          process_type?: string | null
          processor_id?: string | null
          promised_return?: string | null
          quality_id?: string
          sent_date?: string
          status?: Database["public"]["Enums"]["jobwork_status"]
          yield_loss_metres?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jobwork_challans_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "colours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobwork_challans_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "jobwork_challans_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "jobwork_challans_l_value_id_fkey"
            columns: ["l_value_id"]
            isOneToOne: false
            referencedRelation: "l_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobwork_challans_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobwork_challans_processor_id_fkey"
            columns: ["processor_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobwork_challans_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "qualities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobwork_challans_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "jobwork_challans_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["quality_id"]
          },
        ]
      }
      l_values: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          l_code: string
          length_metres: number
          notes: string | null
          quality_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          l_code: string
          length_metres: number
          notes?: string | null
          quality_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          l_code?: string
          length_metres?: number
          notes?: string | null
          quality_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "l_values_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "qualities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "l_values_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "l_values_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["quality_id"]
          },
        ]
      }
      lots: {
        Row: {
          available_metres: number
          available_pieces: number
          colour_id: string
          created_at: string
          grn_id: string | null
          id: string
          l_length_metres: number
          l_value_id: string
          lot_code: string
          lot_date: string
          lot_status: Database["public"]["Enums"]["lot_status"]
          notes: string | null
          quality_id: string
          supplier_id: string | null
          total_metres: number
          total_pieces: number
          warehouse_id: string
        }
        Insert: {
          available_metres?: number
          available_pieces?: number
          colour_id: string
          created_at?: string
          grn_id?: string | null
          id?: string
          l_length_metres: number
          l_value_id: string
          lot_code: string
          lot_date?: string
          lot_status?: Database["public"]["Enums"]["lot_status"]
          notes?: string | null
          quality_id: string
          supplier_id?: string | null
          total_metres?: number
          total_pieces?: number
          warehouse_id: string
        }
        Update: {
          available_metres?: number
          available_pieces?: number
          colour_id?: string
          created_at?: string
          grn_id?: string | null
          id?: string
          l_length_metres?: number
          l_value_id?: string
          lot_code?: string
          lot_date?: string
          lot_status?: Database["public"]["Enums"]["lot_status"]
          notes?: string | null
          quality_id?: string
          supplier_id?: string | null
          total_metres?: number
          total_pieces?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lots_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "colours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "lots_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "lots_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "grn_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_l_value_id_fkey"
            columns: ["l_value_id"]
            isOneToOne: false
            referencedRelation: "l_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "qualities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "lots_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "lots_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      metre_calculation_items: {
        Row: {
          calculation_id: string
          colour_id: string | null
          id: string
          l_length_metres: number | null
          l_value_id: string | null
          metres: number | null
          pieces: number | null
          quality_id: string | null
        }
        Insert: {
          calculation_id: string
          colour_id?: string | null
          id?: string
          l_length_metres?: number | null
          l_value_id?: string | null
          metres?: number | null
          pieces?: number | null
          quality_id?: string | null
        }
        Update: {
          calculation_id?: string
          colour_id?: string | null
          id?: string
          l_length_metres?: number | null
          l_value_id?: string | null
          metres?: number | null
          pieces?: number | null
          quality_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metre_calculation_items_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "metre_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metre_calculation_items_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "colours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metre_calculation_items_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "metre_calculation_items_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "metre_calculation_items_l_value_id_fkey"
            columns: ["l_value_id"]
            isOneToOne: false
            referencedRelation: "l_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metre_calculation_items_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "qualities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metre_calculation_items_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "metre_calculation_items_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["quality_id"]
          },
        ]
      }
      metre_calculations: {
        Row: {
          calculation_name: string | null
          created_at: string
          created_by: string | null
          grand_total_metres: number | null
          id: string
          notes: string | null
        }
        Insert: {
          calculation_name?: string | null
          created_at?: string
          created_by?: string | null
          grand_total_metres?: number | null
          id?: string
          notes?: string | null
        }
        Update: {
          calculation_name?: string | null
          created_at?: string
          created_by?: string | null
          grand_total_metres?: number | null
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metre_calculations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          colour_id: string
          id: string
          l_length_metres: number
          l_value_id: string
          metres: number
          pieces: number
          po_id: string
          quality_id: string
          unit_rate: number | null
        }
        Insert: {
          colour_id: string
          id?: string
          l_length_metres: number
          l_value_id: string
          metres: number
          pieces: number
          po_id: string
          quality_id: string
          unit_rate?: number | null
        }
        Update: {
          colour_id?: string
          id?: string
          l_length_metres?: number
          l_value_id?: string
          metres?: number
          pieces?: number
          po_id?: string
          quality_id?: string
          unit_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "colours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "purchase_order_items_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "purchase_order_items_l_value_id_fkey"
            columns: ["l_value_id"]
            isOneToOne: false
            referencedRelation: "l_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "qualities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "purchase_order_items_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["quality_id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_by: string | null
          created_at: string
          expected_delivery: string | null
          id: string
          notes: string | null
          po_code: string
          po_date: string
          raised_by: string | null
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          total_metres: number | null
          total_pieces: number | null
          total_value: number | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          po_code: string
          po_date?: string
          raised_by?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          total_metres?: number | null
          total_pieces?: number | null
          total_value?: number | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          po_code?: string
          po_date?: string
          raised_by?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string
          total_metres?: number | null
          total_pieces?: number | null
          total_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      qualities: {
        Row: {
          category: string | null
          composition: string | null
          created_at: string
          gsm: number | null
          id: string
          is_active: boolean
          is_seasonal: boolean | null
          max_stock: number | null
          notes: string | null
          quality_code: string
          quality_name: string
          reorder_point: number | null
          safety_stock: number | null
          season_end: string | null
          season_start: string | null
          updated_at: string
          weave: string | null
          width_inches: number | null
        }
        Insert: {
          category?: string | null
          composition?: string | null
          created_at?: string
          gsm?: number | null
          id?: string
          is_active?: boolean
          is_seasonal?: boolean | null
          max_stock?: number | null
          notes?: string | null
          quality_code: string
          quality_name: string
          reorder_point?: number | null
          safety_stock?: number | null
          season_end?: string | null
          season_start?: string | null
          updated_at?: string
          weave?: string | null
          width_inches?: number | null
        }
        Update: {
          category?: string | null
          composition?: string | null
          created_at?: string
          gsm?: number | null
          id?: string
          is_active?: boolean
          is_seasonal?: boolean | null
          max_stock?: number | null
          notes?: string | null
          quality_code?: string
          quality_name?: string
          reorder_point?: number | null
          safety_stock?: number | null
          season_end?: string | null
          season_start?: string | null
          updated_at?: string
          weave?: string | null
          width_inches?: number | null
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          colour_id: string
          id: string
          l_length_metres: number
          l_value_id: string
          line_value: number | null
          metres: number
          pieces: number
          quality_id: string
          quote_id: string
          unit_rate: number | null
        }
        Insert: {
          colour_id: string
          id?: string
          l_length_metres: number
          l_value_id: string
          line_value?: number | null
          metres: number
          pieces: number
          quality_id: string
          quote_id: string
          unit_rate?: number | null
        }
        Update: {
          colour_id?: string
          id?: string
          l_length_metres?: number
          l_value_id?: string
          line_value?: number | null
          metres?: number
          pieces?: number
          quality_id?: string
          quote_id?: string
          unit_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "colours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "quote_items_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "quote_items_l_value_id_fkey"
            columns: ["l_value_id"]
            isOneToOne: false
            referencedRelation: "l_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "qualities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "quote_items_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          challan_number: string | null
          created_at: string
          customer_id: string | null
          expires_at: string | null
          id: string
          notes: string | null
          quote_code: string
          salesman_id: string | null
          status: Database["public"]["Enums"]["quote_status"]
          total_metres: number | null
          total_pieces: number | null
          total_value: number | null
        }
        Insert: {
          challan_number?: string | null
          created_at?: string
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          quote_code: string
          salesman_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          total_metres?: number | null
          total_pieces?: number | null
          total_value?: number | null
        }
        Update: {
          challan_number?: string | null
          created_at?: string
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          quote_code?: string
          salesman_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          total_metres?: number | null
          total_pieces?: number | null
          total_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          colour_id: string
          created_at: string
          expires_at: string | null
          id: string
          l_value_id: string
          lot_id: string | null
          metres: number
          pieces: number
          quality_id: string
          quote_id: string | null
          reservation_type: Database["public"]["Enums"]["reservation_type"]
          reserved_by: string | null
          sales_order_id: string | null
          status: Database["public"]["Enums"]["reservation_status"]
        }
        Insert: {
          colour_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          l_value_id: string
          lot_id?: string | null
          metres: number
          pieces: number
          quality_id: string
          quote_id?: string | null
          reservation_type?: Database["public"]["Enums"]["reservation_type"]
          reserved_by?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Update: {
          colour_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          l_value_id?: string
          lot_id?: string | null
          metres?: number
          pieces?: number
          quality_id?: string
          quote_id?: string | null
          reservation_type?: Database["public"]["Enums"]["reservation_type"]
          reserved_by?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reservations_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "colours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "reservations_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "reservations_l_value_id_fkey"
            columns: ["l_value_id"]
            isOneToOne: false
            referencedRelation: "l_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "qualities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "reservations_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "reservations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_reserved_by_fkey"
            columns: ["reserved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rolls: {
        Row: {
          created_at: string
          defect_notes: string | null
          id: string
          lot_id: string
          metres: number | null
          qc_status: Database["public"]["Enums"]["qc_status"]
          roll_number: string
          status: string | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          defect_notes?: string | null
          id?: string
          lot_id: string
          metres?: number | null
          qc_status?: Database["public"]["Enums"]["qc_status"]
          roll_number: string
          status?: string | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          defect_notes?: string | null
          id?: string
          lot_id?: string
          metres?: number | null
          qc_status?: Database["public"]["Enums"]["qc_status"]
          roll_number?: string
          status?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rolls_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          colour_id: string
          dispatched_metres: number | null
          dispatched_pieces: number | null
          id: string
          l_length_metres: number
          l_value_id: string
          lot_id: string | null
          ordered_metres: number
          ordered_pieces: number
          quality_id: string
          sales_order_id: string
          unit_rate: number | null
        }
        Insert: {
          colour_id: string
          dispatched_metres?: number | null
          dispatched_pieces?: number | null
          id?: string
          l_length_metres: number
          l_value_id: string
          lot_id?: string | null
          ordered_metres: number
          ordered_pieces: number
          quality_id: string
          sales_order_id: string
          unit_rate?: number | null
        }
        Update: {
          colour_id?: string
          dispatched_metres?: number | null
          dispatched_pieces?: number | null
          id?: string
          l_length_metres?: number
          l_value_id?: string
          lot_id?: string | null
          ordered_metres?: number
          ordered_pieces?: number
          quality_id?: string
          sales_order_id?: string
          unit_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "colours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "sales_order_items_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "sales_order_items_l_value_id_fkey"
            columns: ["l_value_id"]
            isOneToOne: false
            referencedRelation: "l_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "qualities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "sales_order_items_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          created_at: string
          customer_id: string
          customer_po: string | null
          expected_delivery: string | null
          id: string
          notes: string | null
          order_code: string
          order_date: string
          payment_terms: string | null
          quote_id: string | null
          salesman_id: string | null
          status: Database["public"]["Enums"]["sales_order_status"]
          total_metres: number | null
          total_pieces: number | null
          total_value: number | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          customer_po?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_code: string
          order_date?: string
          payment_terms?: string | null
          quote_id?: string | null
          salesman_id?: string | null
          status?: Database["public"]["Enums"]["sales_order_status"]
          total_metres?: number | null
          total_pieces?: number | null
          total_value?: number | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          customer_po?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_code?: string
          order_date?: string
          payment_terms?: string | null
          quote_id?: string | null
          salesman_id?: string | null
          status?: Database["public"]["Enums"]["sales_order_status"]
          total_metres?: number | null
          total_pieces?: number | null
          total_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_salesman_id_fkey"
            columns: ["salesman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_ledger: {
        Row: {
          approval_at: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_by: string | null
          colour_id: string
          created_at: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id: string
          is_committed: boolean
          l_length_metres: number
          l_value_id: string
          lot_id: string | null
          metres: number
          notes: string | null
          pieces: number
          proposed_by: string | null
          quality_id: string
          reference_id: string | null
          reference_type: string | null
          rejection_note: string | null
          warehouse_id: string
        }
        Insert: {
          approval_at?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_by?: string | null
          colour_id: string
          created_at?: string
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          is_committed?: boolean
          l_length_metres: number
          l_value_id: string
          lot_id?: string | null
          metres: number
          notes?: string | null
          pieces: number
          proposed_by?: string | null
          quality_id: string
          reference_id?: string | null
          reference_type?: string | null
          rejection_note?: string | null
          warehouse_id: string
        }
        Update: {
          approval_at?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_by?: string | null
          colour_id?: string
          created_at?: string
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          is_committed?: boolean
          l_length_metres?: number
          l_value_id?: string
          lot_id?: string | null
          metres?: number
          notes?: string | null
          pieces?: number
          proposed_by?: string | null
          quality_id?: string
          reference_id?: string | null
          reference_type?: string | null
          rejection_note?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "colours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "stock_ledger_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "stock_ledger_l_value_id_fkey"
            columns: ["l_value_id"]
            isOneToOne: false
            referencedRelation: "l_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "qualities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "stock_ledger_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "stock_ledger_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          city: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          gstin: string | null
          id: string
          is_blacklisted: boolean | null
          is_preferred: boolean | null
          name: string
          payment_terms: string | null
          score: number | null
          supplier_type: string | null
        }
        Insert: {
          city?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          is_blacklisted?: boolean | null
          is_preferred?: boolean | null
          name: string
          payment_terms?: string | null
          score?: number | null
          supplier_type?: string | null
        }
        Update: {
          city?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          is_blacklisted?: boolean | null
          is_preferred?: boolean | null
          name?: string
          payment_terms?: string | null
          score?: number | null
          supplier_type?: string | null
        }
        Relationships: []
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
      warehouses: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          warehouse_type: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          warehouse_type?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name?: string
          warehouse_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_available_to_sell: {
        Row: {
          available_metres: number | null
          colour_code: string | null
          colour_family: string | null
          colour_id: string | null
          colour_name: string | null
          hex_preview: string | null
          quality_code: string | null
          quality_id: string | null
          quality_name: string | null
          reserved_metres: number | null
          shade_band: string | null
          total_metres: number | null
        }
        Relationships: []
      }
      v_pitch_score: {
        Row: {
          available_metres: number | null
          colour_id: string | null
          pitch_score: number | null
          quality_id: string | null
          reserved_metres: number | null
          total_metres: number | null
        }
        Relationships: []
      }
      v_stock_position: {
        Row: {
          colour_id: string | null
          lot_id: string | null
          quality_id: string | null
          total_metres: number | null
          total_pieces: number | null
          warehouse_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "colours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "stock_ledger_colour_id_fkey"
            columns: ["colour_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["colour_id"]
          },
          {
            foreignKeyName: "stock_ledger_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "qualities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_available_to_sell"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "stock_ledger_quality_id_fkey"
            columns: ["quality_id"]
            isOneToOne: false
            referencedRelation: "v_pitch_score"
            referencedColumns: ["quality_id"]
          },
          {
            foreignKeyName: "stock_ledger_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
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
      alert_severity: "info" | "warning" | "critical"
      alert_type:
        | "low_stock"
        | "demanding_colour"
        | "peak_time"
        | "procurement_gap"
        | "dead_stock"
        | "processor_overdue"
        | "shade_mismatch"
        | "ageing_trigger"
      app_role: "admin" | "inventory" | "salesman" | "dispatch" | "billing"
      approval_status: "pending" | "approved" | "rejected" | "auto_committed"
      dispatch_status:
        | "ready_to_pick"
        | "awaiting_billing_auth"
        | "approved"
        | "dispatched"
        | "rejected"
      grn_status: "draft" | "qc_pending" | "completed" | "cancelled"
      invoice_status:
        | "issued"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "cancelled"
      jobwork_status:
        | "sent"
        | "partial_return"
        | "returned"
        | "overdue"
        | "cancelled"
      ledger_entry_type:
        | "inward_grn"
        | "inward_return"
        | "inward_adjustment"
        | "deduct_dispatch"
        | "deduct_transfer"
        | "deduct_jobwork_out"
        | "reserve"
        | "unreserve"
        | "block"
        | "unblock"
        | "jobwork_return"
        | "deduct_adjustment"
      lot_status:
        | "pending_qc"
        | "active"
        | "depleted"
        | "blocked"
        | "at_processor"
      po_status:
        | "raised"
        | "acknowledged"
        | "in_production"
        | "dispatched"
        | "partially_received"
        | "completed"
        | "cancelled"
      qc_status: "pending" | "passed" | "failed" | "conditional"
      quote_status:
        | "draft"
        | "submitted"
        | "reservation_active"
        | "expired"
        | "converted"
        | "cancelled"
      reservation_status: "active" | "expired" | "released" | "consumed"
      reservation_type: "soft" | "hard"
      sales_order_status:
        | "confirmed"
        | "partial_dispatch"
        | "dispatched"
        | "invoiced"
        | "closed"
        | "cancelled"
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
      alert_severity: ["info", "warning", "critical"],
      alert_type: [
        "low_stock",
        "demanding_colour",
        "peak_time",
        "procurement_gap",
        "dead_stock",
        "processor_overdue",
        "shade_mismatch",
        "ageing_trigger",
      ],
      app_role: ["admin", "inventory", "salesman", "dispatch", "billing"],
      approval_status: ["pending", "approved", "rejected", "auto_committed"],
      dispatch_status: [
        "ready_to_pick",
        "awaiting_billing_auth",
        "approved",
        "dispatched",
        "rejected",
      ],
      grn_status: ["draft", "qc_pending", "completed", "cancelled"],
      invoice_status: [
        "issued",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
      ],
      jobwork_status: [
        "sent",
        "partial_return",
        "returned",
        "overdue",
        "cancelled",
      ],
      ledger_entry_type: [
        "inward_grn",
        "inward_return",
        "inward_adjustment",
        "deduct_dispatch",
        "deduct_transfer",
        "deduct_jobwork_out",
        "reserve",
        "unreserve",
        "block",
        "unblock",
        "jobwork_return",
        "deduct_adjustment",
      ],
      lot_status: [
        "pending_qc",
        "active",
        "depleted",
        "blocked",
        "at_processor",
      ],
      po_status: [
        "raised",
        "acknowledged",
        "in_production",
        "dispatched",
        "partially_received",
        "completed",
        "cancelled",
      ],
      qc_status: ["pending", "passed", "failed", "conditional"],
      quote_status: [
        "draft",
        "submitted",
        "reservation_active",
        "expired",
        "converted",
        "cancelled",
      ],
      reservation_status: ["active", "expired", "released", "consumed"],
      reservation_type: ["soft", "hard"],
      sales_order_status: [
        "confirmed",
        "partial_dispatch",
        "dispatched",
        "invoiced",
        "closed",
        "cancelled",
      ],
    },
  },
} as const
