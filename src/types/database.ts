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
      accounts: {
        Row: {
          activity: string
          archived: boolean
          balance: number
          card_label: string
          color: string
          created_at: string
          id: string
          include_in_safe_spend: boolean
          name: string
          opening_balance: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity?: string
          archived?: boolean
          balance?: number
          card_label?: string
          color?: string
          created_at?: string
          id: string
          include_in_safe_spend?: boolean
          name: string
          opening_balance?: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity?: string
          archived?: boolean
          balance?: number
          card_label?: string
          color?: string
          created_at?: string
          id?: string
          include_in_safe_spend?: boolean
          name?: string
          opening_balance?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          archived: boolean
          category: string
          category_id: string | null
          created_at: string
          id: string
          period_month: string | null
          updated_at: string
          used: number
          user_id: string
        }
        Insert: {
          amount?: number
          archived?: boolean
          category: string
          category_id?: string | null
          created_at?: string
          id: string
          period_month?: string | null
          updated_at?: string
          used?: number
          user_id: string
        }
        Update: {
          amount?: number
          archived?: boolean
          category?: string
          category_id?: string | null
          created_at?: string
          id?: string
          period_month?: string | null
          updated_at?: string
          used?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_user_id_category_id_fkey"
            columns: ["user_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      categories: {
        Row: {
          archived: boolean
          color: string
          created_at: string
          id: string
          kind: string
          name: string
          sort_order: number
          spending_nature: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          color?: string
          created_at?: string
          id: string
          kind: string
          name: string
          sort_order?: number
          spending_nature?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          color?: string
          created_at?: string
          id?: string
          kind?: string
          name?: string
          sort_order?: number
          spending_nature?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_error_events: {
        Row: {
          app_version: string
          created_at: string
          error_name: string
          event_type: string
          id: string
          route: string
          user_id: string
        }
        Insert: {
          app_version: string
          created_at?: string
          error_name: string
          event_type: string
          id?: string
          route: string
          user_id: string
        }
        Update: {
          app_version?: string
          created_at?: string
          error_name?: string
          event_type?: string
          id?: string
          route?: string
          user_id?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          category: string
          created_at: string
          due_date: string | null
          id: string
          name: string
          notes: string | null
          paid: number
          person_or_company: string | null
          status: string
          title: string | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          due_date?: string | null
          id: string
          name: string
          notes?: string | null
          paid?: number
          person_or_company?: string | null
          status?: string
          title?: string | null
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          due_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          paid?: number
          person_or_company?: string | null
          status?: string
          title?: string | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_states: {
        Row: {
          created_at: string
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          linked_account_id: string | null
          name: string
          notes: string | null
          saved: number
          status: string
          target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id: string
          linked_account_id?: string | null
          name: string
          notes?: string | null
          saved?: number
          status?: string
          target: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          linked_account_id?: string | null
          name?: string
          notes?: string | null
          saved?: number
          status?: string
          target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_linked_account_id_fkey"
            columns: ["user_id", "linked_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      money_quests: {
        Row: {
          category_id: string | null
          created_at: string
          ends_on: string
          goal_id: string | null
          id: string
          quest_type: string
          starts_on: string
          status: string
          target_amount: number | null
          target_count: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          ends_on: string
          goal_id?: string | null
          id: string
          quest_type: string
          starts_on: string
          status?: string
          target_amount?: number | null
          target_count?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          ends_on?: string
          goal_id?: string | null
          id?: string
          quest_type?: string
          starts_on?: string
          status?: string
          target_amount?: number | null
          target_count?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "money_quests_category_fkey"
            columns: ["user_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "money_quests_goal_fkey"
            columns: ["user_id", "goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      money_wins: {
        Row: {
          cycle_end: string | null
          cycle_start: string | null
          detail: string | null
          earned_at: string
          id: string
          title: string
          user_id: string
          win_type: string
        }
        Insert: {
          cycle_end?: string | null
          cycle_start?: string | null
          detail?: string | null
          earned_at?: string
          id: string
          title: string
          user_id: string
          win_type: string
        }
        Update: {
          cycle_end?: string | null
          cycle_start?: string | null
          detail?: string | null
          earned_at?: string
          id?: string
          title?: string
          user_id?: string
          win_type?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account: string
          account_id: string | null
          amount: number
          category: string | null
          category_id: string | null
          category_name_snapshot: string | null
          created_at: string
          debt_id: string | null
          from_account_id: string | null
          goal_id: string | null
          id: string
          notes: string | null
          payment_method: string | null
          source: string | null
          title: string
          to_account_id: string | null
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account?: string
          account_id?: string | null
          amount: number
          category?: string | null
          category_id?: string | null
          category_name_snapshot?: string | null
          created_at?: string
          debt_id?: string | null
          from_account_id?: string | null
          goal_id?: string | null
          id: string
          notes?: string | null
          payment_method?: string | null
          source?: string | null
          title: string
          to_account_id?: string | null
          transaction_date: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account?: string
          account_id?: string | null
          amount?: number
          category?: string | null
          category_id?: string | null
          category_name_snapshot?: string | null
          created_at?: string
          debt_id?: string | null
          from_account_id?: string | null
          goal_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          source?: string | null
          title?: string
          to_account_id?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_account_id_fkey"
            columns: ["user_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transactions_user_id_category_id_fkey"
            columns: ["user_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transactions_user_id_debt_id_fkey"
            columns: ["user_id", "debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transactions_user_id_from_account_id_fkey"
            columns: ["user_id", "from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transactions_user_id_goal_id_fkey"
            columns: ["user_id", "goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transactions_user_id_to_account_id_fkey"
            columns: ["user_id", "to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      upcoming_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          due_date: string
          id: string
          is_recurring: boolean
          linked_account_id: string | null
          notes: string | null
          paid_transaction_id: string | null
          recurring_frequency: string | null
          reminder_days_before: number | null
          repeat_end_date: string | null
          repeat_start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          due_date: string
          id: string
          is_recurring?: boolean
          linked_account_id?: string | null
          notes?: string | null
          paid_transaction_id?: string | null
          recurring_frequency?: string | null
          reminder_days_before?: number | null
          repeat_end_date?: string | null
          repeat_start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          due_date?: string
          id?: string
          is_recurring?: boolean
          linked_account_id?: string | null
          notes?: string | null
          paid_transaction_id?: string | null
          recurring_frequency?: string | null
          reminder_days_before?: number | null
          repeat_end_date?: string | null
          repeat_start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upcoming_expenses_user_id_linked_account_id_fkey"
            columns: ["user_id", "linked_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "upcoming_expenses_user_id_paid_transaction_id_fkey"
            columns: ["user_id", "paid_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      user_settings: {
        Row: {
          analytics_consent: boolean
          avatar: string | null
          created_at: string
          currency: string
          display_name: string | null
          income_cadence: string | null
          income_source_type: string | null
          next_income_date: string | null
          onboarding_completed: boolean
          onboarding_step: number
          onboarding_version: number
          primary_money_priority: string | null
          safety_reserve: number
          theme: string
          timezone: string
          tour_completed: boolean
          typical_income_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics_consent?: boolean
          avatar?: string | null
          created_at?: string
          currency?: string
          display_name?: string | null
          income_cadence?: string | null
          income_source_type?: string | null
          next_income_date?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
          onboarding_version?: number
          primary_money_priority?: string | null
          safety_reserve?: number
          theme?: string
          timezone?: string
          tour_completed?: boolean
          typical_income_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics_consent?: boolean
          avatar?: string | null
          created_at?: string
          currency?: string
          display_name?: string | null
          income_cadence?: string | null
          income_source_type?: string | null
          next_income_date?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
          onboarding_version?: number
          primary_money_priority?: string | null
          safety_reserve?: number
          theme?: string
          timezone?: string
          tour_completed?: boolean
          typical_income_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          goal_id: string | null
          id: string
          name: string
          reconsider_at: string
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          goal_id?: string | null
          id: string
          name: string
          reconsider_at: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          goal_id?: string | null
          id?: string
          name?: string
          reconsider_at?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_category_fkey"
            columns: ["user_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "wishlist_items_goal_fkey"
            columns: ["user_id", "goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "wishlist_items_transaction_fkey"
            columns: ["user_id", "transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_account_balance: {
        Args: { p_account: Json; p_action: Json }
        Returns: Json
      }
      delete_finance_transaction: { Args: { p_id: string }; Returns: undefined }
      delete_my_finance_data: { Args: { p_user: string }; Returns: undefined }
      mark_upcoming_expense_paid: {
        Args: { p_action: Json; p_next_upcoming?: Json; p_upcoming_id: string }
        Returns: Json
      }
      record_finance_action: { Args: { p_action: Json }; Returns: Json }
      update_finance_transaction: {
        Args: { p_action: Json; p_id: string }
        Returns: Json
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
