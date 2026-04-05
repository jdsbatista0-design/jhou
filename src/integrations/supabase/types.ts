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
      events: {
        Row: {
          created_at: string
          datetime: string
          duration: number | null
          id: string
          linked_item_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          datetime: string
          duration?: number | null
          id?: string
          linked_item_id?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          datetime?: string
          duration?: number | null
          id?: string
          linked_item_id?: string | null
          title?: string
          type?: string
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
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          text?: string
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
          person: string | null
          photo_url: string | null
          priority: string | null
          tags: Json
          tipo: string
          title: string
          updated_at: string
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
          person?: string | null
          photo_url?: string | null
          priority?: string | null
          tags?: Json
          tipo?: string
          title: string
          updated_at?: string
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
          person?: string | null
          photo_url?: string | null
          priority?: string | null
          tags?: Json
          tipo?: string
          title?: string
          updated_at?: string
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
          id: string
          login: string | null
          password: string | null
          tags: Json
          title: string
          url: string | null
        }
        Insert: {
          area?: string | null
          category?: string
          city?: string | null
          content: string
          created_at?: string
          id?: string
          login?: string | null
          password?: string | null
          tags?: Json
          title: string
          url?: string | null
        }
        Update: {
          area?: string | null
          category?: string
          city?: string | null
          content?: string
          created_at?: string
          id?: string
          login?: string | null
          password?: string | null
          tags?: Json
          title?: string
          url?: string | null
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
