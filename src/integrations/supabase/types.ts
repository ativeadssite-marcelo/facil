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
      api_keys: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          escopos: string[]
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          escopos?: string[]
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          escopos?: string[]
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          cpf_cnpj: string
          created_at: string
          email: string
          endereco: string
          id: string
          nome: string
          observacoes: string
          telefone: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          cpf_cnpj?: string
          created_at?: string
          email?: string
          endereco?: string
          id?: string
          nome: string
          observacoes?: string
          telefone?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          cpf_cnpj?: string
          created_at?: string
          email?: string
          endereco?: string
          id?: string
          nome?: string
          observacoes?: string
          telefone?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          id?: string
          updated_at?: string
          valor?: string
        }
        Update: {
          chave?: string
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      itens_orcamento: {
        Row: {
          created_at: string
          id: string
          orcamento_id: string
          preco_unitario: number
          produto_codigo: string
          produto_codigo_fabrica: string
          produto_codigo_interno: string
          produto_id: string | null
          produto_marca: string
          produto_nome: string
          quantidade: number
          subtotal: number
        }
        Insert: {
          created_at?: string
          id?: string
          orcamento_id: string
          preco_unitario?: number
          produto_codigo?: string
          produto_codigo_fabrica?: string
          produto_codigo_interno?: string
          produto_id?: string | null
          produto_marca?: string
          produto_nome?: string
          quantidade?: number
          subtotal?: number
        }
        Update: {
          created_at?: string
          id?: string
          orcamento_id?: string
          preco_unitario?: number
          produto_codigo?: string
          produto_codigo_fabrica?: string
          produto_codigo_interno?: string
          produto_id?: string | null
          produto_marca?: string
          produto_nome?: string
          quantidade?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_orcamento_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_orcamento_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_venda: {
        Row: {
          id: string
          preco_unitario: number
          produto_codigo: string
          produto_codigo_fabrica: string
          produto_codigo_interno: string
          produto_id: string | null
          produto_marca: string
          produto_nome: string
          quantidade: number
          subtotal: number
          venda_id: string
        }
        Insert: {
          id?: string
          preco_unitario?: number
          produto_codigo?: string
          produto_codigo_fabrica?: string
          produto_codigo_interno?: string
          produto_id?: string | null
          produto_marca?: string
          produto_nome?: string
          quantidade?: number
          subtotal?: number
          venda_id: string
        }
        Update: {
          id?: string
          preco_unitario?: number
          produto_codigo?: string
          produto_codigo_fabrica?: string
          produto_codigo_interno?: string
          produto_id?: string | null
          produto_marca?: string
          produto_nome?: string
          quantidade?: number
          subtotal?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_venda_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          created_at: string
          data_entrada: string
          fornecedor: string
          id: string
          nfe_chave: string | null
          preco_custo: number
          produto_id: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          data_entrada?: string
          fornecedor?: string
          id?: string
          nfe_chave?: string | null
          preco_custo?: number
          produto_id: string
          quantidade?: number
        }
        Update: {
          created_at?: string
          data_entrada?: string
          fornecedor?: string
          id?: string
          nfe_chave?: string | null
          preco_custo?: number
          produto_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "lotes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_importadas: {
        Row: {
          chave_acesso: string
          created_at: string
          data_emissao: string
          destinatario_cnpj: string | null
          emitente_cnpj: string
          emitente_nome: string
          id: string
          imported_by: string | null
          numero: string
          serie: string
          status: string
          tipo: string
          valor_total: number
          xml_raw: string | null
        }
        Insert: {
          chave_acesso: string
          created_at?: string
          data_emissao: string
          destinatario_cnpj?: string | null
          emitente_cnpj: string
          emitente_nome?: string
          id?: string
          imported_by?: string | null
          numero: string
          serie?: string
          status?: string
          tipo?: string
          valor_total?: number
          xml_raw?: string | null
        }
        Update: {
          chave_acesso?: string
          created_at?: string
          data_emissao?: string
          destinatario_cnpj?: string | null
          emitente_cnpj?: string
          emitente_nome?: string
          id?: string
          imported_by?: string | null
          numero?: string
          serie?: string
          status?: string
          tipo?: string
          valor_total?: number
          xml_raw?: string | null
        }
        Relationships: []
      }
      orcamentos: {
        Row: {
          cliente_cpf_cnpj: string
          cliente_id: string | null
          cliente_nome: string
          cliente_telefone: string
          created_at: string
          created_by: string | null
          desconto: number
          frete_transportadora: string
          frete_valor: number
          id: string
          numero: string
          observacoes: string
          simulacoes_custo: Json
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          cliente_cpf_cnpj?: string
          cliente_id?: string | null
          cliente_nome?: string
          cliente_telefone?: string
          created_at?: string
          created_by?: string | null
          desconto?: number
          frete_transportadora?: string
          frete_valor?: number
          id?: string
          numero: string
          observacoes?: string
          simulacoes_custo?: Json
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          cliente_cpf_cnpj?: string
          cliente_id?: string | null
          cliente_nome?: string
          cliente_telefone?: string
          created_at?: string
          created_by?: string | null
          desconto?: number
          frete_transportadora?: string
          frete_valor?: number
          id?: string
          numero?: string
          observacoes?: string
          simulacoes_custo?: Json
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          aplicacao: string
          categoria: string
          codigo: string | null
          codigo_fabrica: string
          codigo_interno: string
          cofins_percentual: number
          created_at: string
          estoque_minimo: number
          estoque_total: number
          frete_custo: number
          icms_percentual: number
          id: string
          ipi_percentual: number
          marca: string
          markup_percentual: number
          ncm: string
          nome: string
          pis_percentual: number
          preco_custo: number
          preco_venda: number
          tipo_veiculo: string
          updated_at: string
        }
        Insert: {
          aplicacao?: string
          categoria?: string
          codigo?: string | null
          codigo_fabrica?: string
          codigo_interno?: string
          cofins_percentual?: number
          created_at?: string
          estoque_minimo?: number
          estoque_total?: number
          frete_custo?: number
          icms_percentual?: number
          id?: string
          ipi_percentual?: number
          marca?: string
          markup_percentual?: number
          ncm?: string
          nome: string
          pis_percentual?: number
          preco_custo?: number
          preco_venda?: number
          tipo_veiculo?: string
          updated_at?: string
        }
        Update: {
          aplicacao?: string
          categoria?: string
          codigo?: string | null
          codigo_fabrica?: string
          codigo_interno?: string
          cofins_percentual?: number
          created_at?: string
          estoque_minimo?: number
          estoque_total?: number
          frete_custo?: number
          icms_percentual?: number
          id?: string
          ipi_percentual?: number
          marca?: string
          markup_percentual?: number
          ncm?: string
          nome?: string
          pis_percentual?: number
          preco_custo?: number
          preco_venda?: number
          tipo_veiculo?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          cliente_id: string | null
          cliente_nome: string
          created_at: string
          created_by: string | null
          forma_pagamento: string
          frete_transportadora: string
          frete_valor: number
          id: string
          numero: string
          orcamento_id: string | null
          total: number
        }
        Insert: {
          cliente_id?: string | null
          cliente_nome?: string
          created_at?: string
          created_by?: string | null
          forma_pagamento?: string
          frete_transportadora?: string
          frete_valor?: number
          id?: string
          numero: string
          orcamento_id?: string | null
          total?: number
        }
        Update: {
          cliente_id?: string | null
          cliente_nome?: string
          created_at?: string
          created_by?: string | null
          forma_pagamento?: string
          frete_transportadora?: string
          frete_valor?: number
          id?: string
          numero?: string
          orcamento_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_stock: { Args: { pid: string; qty: number }; Returns: number }
      get_current_user_role: { Args: never; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "vendedor" | "caixa" | "estoque"
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
      app_role: ["admin", "vendedor", "caixa", "estoque"],
    },
  },
} as const
