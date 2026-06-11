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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          user_id?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          datetime: string
          duration: number | null
          id: string
          linked_item_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          datetime: string
          duration?: number | null
          id?: string
          linked_item_id?: string | null
          title: string
          type?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          datetime?: string
          duration?: number | null
          id?: string
          linked_item_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_linked_item_id_fkey"
            columns: ["linked_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_accounts: {
        Row: {
          archived: boolean
          bank: string | null
          color: string
          company_id: string | null
          created_at: string
          id: string
          initial_balance: number
          name: string
          scope: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          bank?: string | null
          color?: string
          company_id?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          name: string
          scope: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived?: boolean
          bank?: string | null
          color?: string
          company_id?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          name?: string
          scope?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fin_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_cards: {
        Row: {
          account_id: string | null
          archived: boolean
          brand: string | null
          closing_day: number | null
          color: string
          company_id: string | null
          created_at: string
          due_day: number | null
          id: string
          limit_amount: number
          name: string
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          archived?: boolean
          brand?: string | null
          closing_day?: number | null
          color?: string
          company_id?: string | null
          created_at?: string
          due_day?: number | null
          id?: string
          limit_amount?: number
          name: string
          scope: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          archived?: boolean
          brand?: string | null
          closing_day?: number | null
          color?: string
          company_id?: string | null
          created_at?: string
          due_day?: number | null
          id?: string
          limit_amount?: number
          name?: string
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fin_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_categories: {
        Row: {
          archived: boolean
          color: string
          created_at: string
          icon: string | null
          id: string
          kind: string
          monthly_budget: number | null
          name: string
          scope: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          kind?: string
          monthly_budget?: number | null
          name: string
          scope: string
          user_id?: string
        }
        Update: {
          archived?: boolean
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          kind?: string
          monthly_budget?: number | null
          name?: string
          scope?: string
          user_id?: string
        }
        Relationships: []
      }
      fin_companies: {
        Row: {
          archived: boolean
          cnpj: string | null
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          cnpj?: string | null
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived?: boolean
          cnpj?: string | null
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fin_people: {
        Row: {
          archived: boolean
          company_id: string | null
          created_at: string
          document: string | null
          id: string
          name: string
          note: string | null
          role: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          company_id?: string | null
          created_at?: string
          document?: string | null
          id?: string
          name: string
          note?: string | null
          role?: string
          user_id?: string
        }
        Update: {
          archived?: boolean
          company_id?: string | null
          created_at?: string
          document?: string | null
          id?: string
          name?: string
          note?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fin_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_recurrences: {
        Row: {
          account_id: string | null
          active: boolean
          amount: number
          card_id: string | null
          category_id: string | null
          company_id: string | null
          created_at: string
          day_of_month: number | null
          description: string
          end_on: string | null
          frequency: string
          id: string
          kind: string
          last_generated_on: string | null
          scope: string
          start_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          amount: number
          card_id?: string | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          day_of_month?: number | null
          description: string
          end_on?: string | null
          frequency?: string
          id?: string
          kind: string
          last_generated_on?: string | null
          scope: string
          start_on: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          amount?: number
          card_id?: string | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          day_of_month?: number | null
          description?: string
          end_on?: string | null
          frequency?: string
          id?: string
          kind?: string
          last_generated_on?: string | null
          scope?: string
          start_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_recurrences_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_recurrences_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "fin_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_recurrences_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fin_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_recurrences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fin_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_transactions: {
        Row: {
          account_id: string | null
          amount: number
          attachment_url: string | null
          card_id: string | null
          category_id: string | null
          company_id: string | null
          created_at: string
          description: string
          id: string
          kind: string
          notes: string | null
          occurred_on: string
          person_id: string | null
          recurrence_id: string | null
          scope: string
          source: string
          status: string
          transfer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          attachment_url?: string | null
          card_id?: string | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          description: string
          id?: string
          kind: string
          notes?: string | null
          occurred_on?: string
          person_id?: string | null
          recurrence_id?: string | null
          scope: string
          source?: string
          status?: string
          transfer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          attachment_url?: string | null
          card_id?: string | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string
          id?: string
          kind?: string
          notes?: string | null
          occurred_on?: string
          person_id?: string | null
          recurrence_id?: string | null
          scope?: string
          source?: string
          status?: string
          transfer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "fin_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fin_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fin_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "fin_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "fin_recurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      gcal_state: {
        Row: {
          calendar_id: string | null
          created_at: string
          last_pull_at: string | null
          last_push_at: string | null
          sync_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string
          last_pull_at?: string | null
          last_push_at?: string | null
          sync_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string | null
          created_at?: string
          last_pull_at?: string | null
          last_push_at?: string | null
          sync_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gcal_sync: {
        Row: {
          created_at: string
          deleted: boolean
          google_calendar_id: string
          google_event_id: string
          id: string
          item_id: string | null
          last_local_updated_at: string | null
          last_remote_updated_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          google_calendar_id: string
          google_event_id: string
          id?: string
          item_id?: string | null
          last_local_updated_at?: string | null
          last_remote_updated_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted?: boolean
          google_calendar_id?: string
          google_event_id?: string
          id?: string
          item_id?: string | null
          last_local_updated_at?: string | null
          last_remote_updated_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inbox_entries: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string
          id: string
          photo_url: string | null
          source: string
          status: string
          type: string
          user_id: string
          whatsapp_from: string | null
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string
          id?: string
          photo_url?: string | null
          source?: string
          status?: string
          type?: string
          user_id?: string
          whatsapp_from?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string
          id?: string
          photo_url?: string | null
          source?: string
          status?: string
          type?: string
          user_id?: string
          whatsapp_from?: string | null
        }
        Relationships: []
      }
      item_comments: {
        Row: {
          created_at: string
          id: string
          item_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          text: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          area: string
          asset: string | null
          created_at: string
          deadline: string | null
          deadline_time: string | null
          description: string | null
          fase: string
          id: string
          linked_agenda_ids: Json
          origin: string
          person: string | null
          photo_url: string | null
          previous_fase: string | null
          priority: string | null
          recurrence_id: string | null
          reminder_minutes: number | null
          reminder_sent_at: string | null
          tags: Json
          tipo: string
          title: string
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          area?: string
          asset?: string | null
          created_at?: string
          deadline?: string | null
          deadline_time?: string | null
          description?: string | null
          fase?: string
          id?: string
          linked_agenda_ids?: Json
          origin?: string
          person?: string | null
          photo_url?: string | null
          previous_fase?: string | null
          priority?: string | null
          recurrence_id?: string | null
          reminder_minutes?: number | null
          reminder_sent_at?: string | null
          tags?: Json
          tipo?: string
          title: string
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Update: {
          area?: string
          asset?: string | null
          created_at?: string
          deadline?: string | null
          deadline_time?: string | null
          description?: string | null
          fase?: string
          id?: string
          linked_agenda_ids?: Json
          origin?: string
          person?: string | null
          photo_url?: string | null
          previous_fase?: string | null
          priority?: string | null
          recurrence_id?: string | null
          reminder_minutes?: number | null
          reminder_sent_at?: string | null
          tags?: Json
          tipo?: string
          title?: string
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: []
      }
      memories: {
        Row: {
          area: string | null
          category: string
          city: string | null
          content: string
          created_at: string
          decisions: string | null
          id: string
          linked_item_id: string | null
          login: string | null
          meeting_date: string | null
          next_steps: string | null
          participants: string | null
          password: string | null
          tags: Json
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          area?: string | null
          category?: string
          city?: string | null
          content: string
          created_at?: string
          decisions?: string | null
          id?: string
          linked_item_id?: string | null
          login?: string | null
          meeting_date?: string | null
          next_steps?: string | null
          participants?: string | null
          password?: string | null
          tags?: Json
          title: string
          url?: string | null
          user_id?: string
        }
        Update: {
          area?: string | null
          category?: string
          city?: string | null
          content?: string
          created_at?: string
          decisions?: string | null
          id?: string
          linked_item_id?: string | null
          login?: string | null
          meeting_date?: string | null
          next_steps?: string | null
          participants?: string | null
          password?: string | null
          tags?: Json
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recurrences: {
        Row: {
          active: boolean
          area: string
          created_at: string
          end_date: string | null
          id: string
          last_materialized_until: string | null
          reminder_minutes: number
          start_date: string
          time: string
          title: string
          type: string
          updated_at: string
          user_id: string
          weekdays: Json
        }
        Insert: {
          active?: boolean
          area?: string
          created_at?: string
          end_date?: string | null
          id?: string
          last_materialized_until?: string | null
          reminder_minutes?: number
          start_date?: string
          time: string
          title: string
          type?: string
          updated_at?: string
          user_id?: string
          weekdays?: Json
        }
        Update: {
          active?: boolean
          area?: string
          created_at?: string
          end_date?: string | null
          id?: string
          last_materialized_until?: string | null
          reminder_minutes?: number
          start_date?: string
          time?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          weekdays?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
