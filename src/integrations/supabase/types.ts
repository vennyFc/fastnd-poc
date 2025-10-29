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
      action_items: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["action_item_priority"]
          project_id: string | null
          status: Database["public"]["Enums"]["action_item_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["action_item_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["action_item_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["action_item_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["action_item_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "customer_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cache: {
        Row: {
          cache_key: string
          cache_type: string
          created_at: string
          id: string
          response_data: Json
          user_id: string
        }
        Insert: {
          cache_key: string
          cache_type: string
          created_at?: string
          id?: string
          response_data: Json
          user_id: string
        }
        Update: {
          cache_key?: string
          cache_type?: string
          created_at?: string
          id?: string
          response_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          application: string
          created_at: string
          id: string
          related_product: string
          user_id: string
        }
        Insert: {
          application: string
          created_at?: string
          id?: string
          related_product: string
          user_id: string
        }
        Update: {
          application?: string
          created_at?: string
          id?: string
          related_product?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_products: {
        Row: {
          added_at: string
          collection_id: string
          id: string
          product_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          id?: string
          product_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_shares: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          shared_with_user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          shared_with_user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          shared_with_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_shares_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["collection_visibility"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["collection_visibility"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["collection_visibility"]
        }
        Relationships: []
      }
      cross_sells: {
        Row: {
          application: string
          base_product: string
          created_at: string
          cross_sell_product: string
          id: string
          user_id: string
        }
        Insert: {
          application: string
          base_product: string
          created_at?: string
          cross_sell_product: string
          id?: string
          user_id: string
        }
        Update: {
          application?: string
          base_product?: string
          created_at?: string
          cross_sell_product?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_sells_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_projects: {
        Row: {
          application: string
          created_at: string
          customer: string
          id: string
          product: string
          project_name: string
          user_id: string
        }
        Insert: {
          application: string
          created_at?: string
          customer: string
          id?: string
          product: string
          project_name: string
          user_id: string
        }
        Update: {
          application?: string
          created_at?: string
          customer?: string
          id?: string
          product?: string
          project_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_alternatives: {
        Row: {
          alternative_product: string
          base_product: string
          created_at: string
          id: string
          similarity: number | null
          user_id: string
        }
        Insert: {
          alternative_product: string
          base_product: string
          created_at?: string
          id?: string
          similarity?: number | null
          user_id: string
        }
        Update: {
          alternative_product?: string
          base_product?: string
          created_at?: string
          id?: string
          similarity?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_alternatives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          id: string
          manufacturer: string | null
          manufacturer_link: string | null
          product: string
          product_description: string | null
          product_family: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manufacturer?: string | null
          manufacturer_link?: string | null
          product: string
          product_description?: string | null
          product_family?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manufacturer?: string | null
          manufacturer_link?: string | null
          product?: string
          product_description?: string | null
          product_family?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      upload_history: {
        Row: {
          data_type: string
          filename: string
          id: string
          row_count: number
          status: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          data_type: string
          filename: string
          id?: string
          row_count?: number
          status?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          data_type?: string
          filename?: string
          id?: string
          row_count?: number
          status?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_column_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          table_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          table_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          table_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_dashboard_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          manufacturers: string[] | null
          product_families: string[] | null
          recent_projects_limit: number
          target_applications: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manufacturers?: string[] | null
          product_families?: string[] | null
          recent_projects_limit?: number
          target_applications?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manufacturers?: string[] | null
          product_families?: string[] | null
          recent_projects_limit?: number
          target_applications?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_project_history: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
          viewed_at?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_can_view_collection: {
        Args: { _collection_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      action_item_priority: "low" | "medium" | "high"
      action_item_status: "open" | "in_progress" | "completed"
      app_role: "admin" | "user"
      collection_visibility: "private" | "selected" | "organization"
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
      action_item_priority: ["low", "medium", "high"],
      action_item_status: ["open", "in_progress", "completed"],
      app_role: ["admin", "user"],
      collection_visibility: ["private", "selected", "organization"],
    },
  },
} as const
