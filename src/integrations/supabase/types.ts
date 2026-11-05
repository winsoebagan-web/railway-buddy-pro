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
      ai_auto_reply_state: {
        Row: {
          id: boolean
          knowledge_version: number
          lease_token: string | null
          lease_until: string | null
          paused_reason: string | null
          retry_after: string | null
        }
        Insert: {
          id?: boolean
          knowledge_version?: number
          lease_token?: string | null
          lease_until?: string | null
          paused_reason?: string | null
          retry_after?: string | null
        }
        Update: {
          id?: boolean
          knowledge_version?: number
          lease_token?: string | null
          lease_until?: string | null
          paused_reason?: string | null
          retry_after?: string | null
        }
        Relationships: []
      }
      ai_info: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_visible: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          is_visible?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          auto_attempted_at: string | null
          auto_attempts: number
          auto_knowledge_version: number
          auto_request_error: string | null
          auto_requested_at: string | null
          created_at: string
          device_id: string
          estate_guest_access_hash: string | null
          estate_listing_id: string | null
          guest_name: string
          id: string
          question: string
          status: string
          submitter_id: string | null
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          auto_attempted_at?: string | null
          auto_attempts?: number
          auto_knowledge_version?: number
          auto_request_error?: string | null
          auto_requested_at?: string | null
          created_at?: string
          device_id: string
          estate_guest_access_hash?: string | null
          estate_listing_id?: string | null
          guest_name?: string
          id?: string
          question: string
          status?: string
          submitter_id?: string | null
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          auto_attempted_at?: string | null
          auto_attempts?: number
          auto_knowledge_version?: number
          auto_request_error?: string | null
          auto_requested_at?: string | null
          created_at?: string
          device_id?: string
          estate_guest_access_hash?: string | null
          estate_listing_id?: string | null
          guest_name?: string
          id?: string
          question?: string
          status?: string
          submitter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_questions_estate_listing_id_fkey"
            columns: ["estate_listing_id"]
            isOneToOne: false
            referencedRelation: "estate_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audios: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          sort_order: number
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          sort_order?: number
          title?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          sort_order?: number
          title?: string
          url?: string
        }
        Relationships: []
      }
      demu_schedules: {
        Row: {
          arrive_time: string | null
          city: string
          created_at: string
          depart_time: string | null
          fare_ordinary: number | null
          fare_upper: number | null
          id: string
          is_visible: boolean
          note: string | null
          route: string
          sort_order: number
          train_no: string
          updated_at: string
        }
        Insert: {
          arrive_time?: string | null
          city: string
          created_at?: string
          depart_time?: string | null
          fare_ordinary?: number | null
          fare_upper?: number | null
          id?: string
          is_visible?: boolean
          note?: string | null
          route?: string
          sort_order?: number
          train_no?: string
          updated_at?: string
        }
        Update: {
          arrive_time?: string | null
          city?: string
          created_at?: string
          depart_time?: string | null
          fare_ordinary?: number | null
          fare_upper?: number | null
          id?: string
          is_visible?: boolean
          note?: string | null
          route?: string
          sort_order?: number
          train_no?: string
          updated_at?: string
        }
        Relationships: []
      }
      estate_comments: {
        Row: {
          body: string
          created_at: string
          guest_name: string
          id: string
          listing_id: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          guest_name?: string
          id?: string
          listing_id: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          guest_name?: string
          id?: string
          listing_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estate_comments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "estate_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      estate_listings: {
        Row: {
          area: string
          created_at: string
          description: string
          guest_access_hash: string | null
          guest_name: string
          id: string
          land_type: string
          length: string
          location: string
          phone: string
          price: number
          property_type: string
          status: string
          title: string
          updated_at: string
          user_id: string | null
          viber: string
          width: string
        }
        Insert: {
          area?: string
          created_at?: string
          description?: string
          guest_access_hash?: string | null
          guest_name?: string
          id?: string
          land_type?: string
          length?: string
          location?: string
          phone?: string
          price?: number
          property_type?: string
          status?: string
          title: string
          updated_at?: string
          user_id?: string | null
          viber?: string
          width?: string
        }
        Update: {
          area?: string
          created_at?: string
          description?: string
          guest_access_hash?: string | null
          guest_name?: string
          id?: string
          land_type?: string
          length?: string
          location?: string
          phone?: string
          price?: number
          property_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          viber?: string
          width?: string
        }
        Relationships: []
      }
      estate_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          inquiry_id: string
          sender: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          inquiry_id: string
          sender: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          inquiry_id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "estate_messages_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "ai_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_board_settings: {
        Row: {
          auto_enabled: boolean
          color: string
          id: number
          lead_minutes: number
          sound_url: string | null
          style: string
        }
        Insert: {
          auto_enabled?: boolean
          color?: string
          id?: number
          lead_minutes?: number
          sound_url?: string | null
          style?: string
        }
        Update: {
          auto_enabled?: boolean
          color?: string
          id?: number
          lead_minutes?: number
          sound_url?: string | null
          style?: string
        }
        Relationships: []
      }
      live_notices: {
        Row: {
          color: string
          created_at: string
          end_time: string | null
          id: string
          is_visible: boolean
          message: string
          sort_order: number
          sound_url: string | null
          start_time: string | null
          style: string
        }
        Insert: {
          color?: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_visible?: boolean
          message: string
          sort_order?: number
          sound_url?: string | null
          start_time?: string | null
          style?: string
        }
        Update: {
          color?: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_visible?: boolean
          message?: string
          sort_order?: number
          sound_url?: string | null
          start_time?: string | null
          style?: string
        }
        Relationships: []
      }
      marquees: {
        Row: {
          color: string
          created_at: string
          id: string
          is_visible: boolean
          position: string
          sort_order: number
          text: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: string
          sort_order?: number
          text: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: string
          sort_order?: number
          text?: string
        }
        Relationships: []
      }
      notice_letters: {
        Row: {
          body: string
          color: string
          created_at: string
          id: string
          is_visible: boolean
          sort_order: number
          style: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          color?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          sort_order?: number
          style?: string
          title?: string
          updated_at?: string
        }
        Update: {
          body?: string
          color?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          sort_order?: number
          style?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notice_videos: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          is_visible: boolean
          sort_order: number
          start_time: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_visible?: boolean
          sort_order?: number
          start_time?: string | null
          title?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_visible?: boolean
          sort_order?: number
          start_time?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_visible: boolean
          message: string
          send_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_visible?: boolean
          message?: string
          send_at?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_visible?: boolean
          message?: string
          send_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          body: string
          created_at: string
          facebook_label: string | null
          facebook_url: string | null
          id: string
          image_url: string | null
          is_pinned: boolean
          is_visible: boolean
          link_color: string | null
          tiktok_label: string | null
          tiktok_url: string | null
          title: string
          updated_at: string
          website_label: string | null
          website_url: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          facebook_label?: string | null
          facebook_url?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          is_visible?: boolean
          link_color?: string | null
          tiktok_label?: string | null
          tiktok_url?: string | null
          title?: string
          updated_at?: string
          website_label?: string | null
          website_url?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          facebook_label?: string | null
          facebook_url?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          is_visible?: boolean
          link_color?: string | null
          tiktok_label?: string | null
          tiktok_url?: string | null
          title?: string
          updated_at?: string
          website_label?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          report_time: string
          station_name: string
          train_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          report_time?: string
          station_name: string
          train_name: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          report_time?: string
          station_name?: string
          train_name?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          id: string
          is_visible: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_visible?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_visible?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      splash_slides: {
        Row: {
          color: string
          created_at: string
          id: string
          image_url: string | null
          is_visible: boolean
          sort_order: number
          style: string
          subtext: string | null
          text: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_visible?: boolean
          sort_order?: number
          style?: string
          subtext?: string | null
          text?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_visible?: boolean
          sort_order?: number
          style?: string
          subtext?: string | null
          text?: string
        }
        Relationships: []
      }
      stations: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      train_stops: {
        Row: {
          arrive_time: string | null
          created_at: string
          depart_time: string | null
          fare_ordinary: number | null
          fare_upper: number | null
          id: string
          note: string | null
          station_name: string
          stop_order: number
          stops: boolean
          train_id: string
        }
        Insert: {
          arrive_time?: string | null
          created_at?: string
          depart_time?: string | null
          fare_ordinary?: number | null
          fare_upper?: number | null
          id?: string
          note?: string | null
          station_name: string
          stop_order?: number
          stops?: boolean
          train_id: string
        }
        Update: {
          arrive_time?: string | null
          created_at?: string
          depart_time?: string | null
          fare_ordinary?: number | null
          fare_upper?: number | null
          id?: string
          note?: string | null
          station_name?: string
          stop_order?: number
          stops?: boolean
          train_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "train_stops_train_id_fkey"
            columns: ["train_id"]
            isOneToOne: false
            referencedRelation: "trains"
            referencedColumns: ["id"]
          },
        ]
      }
      trains: {
        Row: {
          created_at: string
          depart_time: string
          destination: string
          direction: string
          has_upper_class: boolean
          id: string
          is_visible: boolean
          name: string
          number: string
          origin: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          depart_time?: string
          destination: string
          direction?: string
          has_upper_class?: boolean
          id?: string
          is_visible?: boolean
          name: string
          number: string
          origin: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          depart_time?: string
          destination?: string
          direction?: string
          has_upper_class?: boolean
          id?: string
          is_visible?: boolean
          name?: string
          number?: string
          origin?: string
          sort_order?: number
          updated_at?: string
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
      viewer_counter: {
        Row: {
          count: number
          id: number
        }
        Insert: {
          count?: number
          id?: number
        }
        Update: {
          count?: number
          id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_ai_auto_reply: {
        Args: { p_token: string }
        Returns: {
          id: boolean
          knowledge_version: number
          lease_token: string | null
          lease_until: string | null
          paused_reason: string | null
          retry_after: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "ai_auto_reply_state"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ai_auto_reply_candidates: {
        Args: { p_version: number }
        Returns: {
          answer: string | null
          answered_at: string | null
          auto_attempted_at: string | null
          auto_attempts: number
          auto_knowledge_version: number
          auto_request_error: string | null
          auto_requested_at: string | null
          created_at: string
          device_id: string
          estate_guest_access_hash: string | null
          estate_listing_id: string | null
          guest_name: string
          id: string
          question: string
          status: string
          submitter_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "ai_questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      bump_viewers: { Args: { _by?: number }; Returns: number }
      estate_mobile_history: { Args: { p_token: string }; Returns: Json }
      estate_send_message: {
        Args: { p_body: string; p_inquiry: string; p_token: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      save_estate_ai_answer: {
        Args: { p_answer: string; p_question: string; p_revision: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
