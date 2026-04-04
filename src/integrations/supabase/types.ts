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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      coupons: {
        Row: {
          id: string
          code: string
          discount_percent: number
          active: boolean
          max_uses: number | null
          current_uses: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          discount_percent: number
          active?: boolean
          max_uses?: number | null
          current_uses?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          discount_percent?: number
          active?: boolean
          max_uses?: number | null
          current_uses?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string | null
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email?: string | null
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string | null
        }
        Relationships: []
      }
      dumpster_sizes: {
        Row: {
          active: boolean
          created_at: string
          description: string
          id: string
          order_index: number
          price: number
          size: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          order_index?: number
          price?: number
          size: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          order_index?: number
          price?: number
          size?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          ajudantes: number
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          numero: string | null
          numero_atribuido: string | null
          observacoes: string | null
          order_id: string | null
          quantidade: number
          status: string
          tamanho: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          ajudantes?: number
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          numero?: string | null
          numero_atribuido?: string | null
          observacoes?: string | null
          order_id?: string | null
          quantidade?: number
          status?: string
          tamanho: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          ajudantes?: number
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          numero?: string | null
          numero_atribuido?: string | null
          observacoes?: string | null
          order_id?: string | null
          quantidade?: number
          status?: string
          tamanho?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          ajudantes: number
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          coupon_code: string | null
          cpf_cnpj: string | null
          created_at: string
          data_entrega: string | null
          discount_percent: number | null
          email: string | null
          endereco: string | null
          estado: string | null
          fastsoft_external_ref: string | null
          fastsoft_transaction_id: string | null
          forma_pagamento: string
          horario_entrega: string | null
          id: string
          nome: string
          numero: string | null
          observacoes: string | null
          paid_at: string | null
          payment_status: string
          public_access_token: string
          pix_copy_paste: string | null
          pix_expires_at: string | null
          pix_qr_code: string | null
          pix_qr_code_url: string | null
          quantidade: number
          referral_source: string | null
          status: string
          tamanho: string
          updated_at: string
          valor_ajudantes: number
          valor_desconto: number | null
          valor_total: number
          valor_unitario: number
          whatsapp: string
        }
        Insert: {
          ajudantes?: number
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          coupon_code?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_entrega?: string | null
          discount_percent?: number | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          fastsoft_external_ref?: string | null
          fastsoft_transaction_id?: string | null
          forma_pagamento?: string
          horario_entrega?: string | null
          id?: string
          nome: string
          numero?: string | null
          observacoes?: string | null
          paid_at?: string | null
          payment_status?: string
          public_access_token?: string
          pix_copy_paste?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_url?: string | null
          quantidade?: number
          referral_source?: string | null
          status?: string
          tamanho: string
          updated_at?: string
          valor_ajudantes?: number
          valor_desconto?: number | null
          valor_total?: number
          valor_unitario?: number
          whatsapp: string
        }
        Update: {
          ajudantes?: number
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          coupon_code?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_entrega?: string | null
          discount_percent?: number | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          fastsoft_external_ref?: string | null
          fastsoft_transaction_id?: string | null
          forma_pagamento?: string
          horario_entrega?: string | null
          id?: string
          nome?: string
          numero?: string | null
          observacoes?: string | null
          paid_at?: string | null
          payment_status?: string
          public_access_token?: string
          pix_copy_paste?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_url?: string | null
          quantidade?: number
          referral_source?: string | null
          status?: string
          tamanho?: string
          updated_at?: string
          valor_ajudantes?: number
          valor_desconto?: number | null
          valor_total?: number
          valor_unitario?: number
          whatsapp?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_counters: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          name: string
          order_index: number
          suffix: string
          updated_at: string
          value: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          name: string
          order_index?: number
          suffix?: string
          updated_at?: string
          value?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          name?: string
          order_index?: number
          suffix?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      site_offers: {
        Row: {
          active: boolean
          badge: string
          created_at: string
          description: string
          id: string
          order_index: number
          price_current: number
          price_original: number | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge?: string
          created_at?: string
          description?: string
          id?: string
          order_index?: number
          price_current?: number
          price_original?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge?: string
          created_at?: string
          description?: string
          id?: string
          order_index?: number
          price_current?: number
          price_original?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          email_contato: string | null
          endereco_empresa: string | null
          helper_price: number
          id: string
          logo_url: string | null
          site_name: string
          telefone_principal: string | null
          updated_at: string
          whatsapp_principal: string | null
          whatsapp_rotation_size: number
          hero_badge: string
          hero_title: string
          hero_subtitle: string
          hero_cta_primary: string
          hero_cta_secondary: string
          hero_trust_marks: Json
          benefits_title: string
          benefits_items: Json
          howit_title: string
          howit_steps: Json
          discard_title: string
          discard_subtitle: string
          discard_items: Json
          cta_title: string
          cta_subtitle: string
          contact_badge: string
          contact_title: string
          contact_subtitle: string
          business_hours_weekday: string
          business_hours_saturday: string
          business_hours_emergency: string
          sizes_title: string
          sizes_subtitle: string
          regions_title: string
          regions_subtitle: string
        }
        Insert: {
          created_at?: string
          email_contato?: string | null
          endereco_empresa?: string | null
          helper_price?: number
          id?: string
          logo_url?: string | null
          site_name?: string
          telefone_principal?: string | null
          updated_at?: string
          whatsapp_principal?: string | null
          whatsapp_rotation_size?: number
          hero_badge?: string
          hero_title?: string
          hero_subtitle?: string
          hero_cta_primary?: string
          hero_cta_secondary?: string
          hero_trust_marks?: Json
          benefits_title?: string
          benefits_items?: Json
          howit_title?: string
          howit_steps?: Json
          discard_title?: string
          discard_subtitle?: string
          discard_items?: Json
          cta_title?: string
          cta_subtitle?: string
          contact_badge?: string
          contact_title?: string
          contact_subtitle?: string
          business_hours_weekday?: string
          business_hours_saturday?: string
          business_hours_emergency?: string
          sizes_title?: string
          sizes_subtitle?: string
          regions_title?: string
          regions_subtitle?: string
        }
        Update: {
          created_at?: string
          email_contato?: string | null
          endereco_empresa?: string | null
          helper_price?: number
          id?: string
          logo_url?: string | null
          site_name?: string
          telefone_principal?: string | null
          updated_at?: string
          whatsapp_principal?: string | null
          whatsapp_rotation_size?: number
          hero_badge?: string
          hero_title?: string
          hero_subtitle?: string
          hero_cta_primary?: string
          hero_cta_secondary?: string
          hero_trust_marks?: Json
          benefits_title?: string
          benefits_items?: Json
          howit_title?: string
          howit_steps?: Json
          discard_title?: string
          discard_subtitle?: string
          discard_items?: Json
          cta_title?: string
          cta_subtitle?: string
          contact_badge?: string
          contact_title?: string
          contact_subtitle?: string
          business_hours_weekday?: string
          business_hours_saturday?: string
          business_hours_emergency?: string
          sizes_title?: string
          sizes_subtitle?: string
          regions_title?: string
          regions_subtitle?: string
        }
        Relationships: []
      }
      whatsapp_clicks: {
        Row: {
          created_at: string
          id: string
          number_id: string | null
          page_url: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          number_id?: string | null
          page_url?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          number_id?: string | null
          page_url?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_clicks_number_id_fkey"
            columns: ["number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_numbers: {
        Row: {
          active: boolean
          click_count: number
          created_at: string
          id: string
          label: string
          number: string
          order_index: number
          peso_distribuicao: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          click_count?: number
          created_at?: string
          id?: string
          label?: string
          number: string
          order_index?: number
          peso_distribuicao?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          click_count?: number
          created_at?: string
          id?: string
          label?: string
          number?: string
          order_index?: number
          peso_distribuicao?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_click_stats: {
        Args: never
        Returns: {
          clicks_today: number
          clicks_week: number
          number_id: string
          number_label: string
          number_value: string
          total_clicks: number
        }[]
      }
      register_weighted_whatsapp_click: {
        Args: { p_page_url: string; p_visitor_id: string }
        Returns: {
          number_id: string
          number_value: string
        }[]
      }
      register_whatsapp_click: {
        Args: { p_number_id: string; p_page_url: string; p_visitor_id: string }
        Returns: undefined
      }
      get_clicks_by_section: {
        Args: never
        Returns: {
          section: string
          total_clicks: number
          unique_visitors: number
        }[]
      }
      get_whatsapp_unique_visitors: {
        Args: never
        Returns: {
          total_clicks: number
          unique_visitors: number
        }[]
      }
      is_admin_user: {
        Args: never
        Returns: boolean
      }
      validate_coupon: {
        Args: { p_code: string }
        Returns: {
          coupon_id: string
          discount_percent: number
        }[]
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
    Enums: {},
  },
} as const
