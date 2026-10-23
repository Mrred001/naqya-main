export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      content: {
        Row: {
          category_id: string | null;
          channel: string;
          content_type: string;
          created_at: string;
          date_added: string;
          duration_seconds: number;
          featured: boolean;
          id: string;
          language: string;
          music_reviewed_at: string | null;
          music_skip_ranges: string | null;
          music_status: string;
          recommendation: string | null;
          thumbnail_url: string | null;
          title: string;
          youtube_id: string;
          youtube_url: string;
        };
        Insert: {
          category_id?: string | null;
          channel: string;
          content_type?: string;
          created_at?: string;
          date_added?: string;
          duration_seconds?: number;
          featured?: boolean;
          id?: string;
          language?: string;
          music_reviewed_at?: string | null;
          music_skip_ranges?: string | null;
          music_status: string;
          recommendation?: string | null;
          thumbnail_url?: string | null;
          title: string;
          youtube_id: string;
          youtube_url: string;
        };
        Update: {
          category_id?: string | null;
          channel?: string;
          content_type?: string;
          created_at?: string;
          date_added?: string;
          duration_seconds?: number;
          featured?: boolean;
          id?: string;
          language?: string;
          music_reviewed_at?: string | null;
          music_skip_ranges?: string | null;
          music_status?: string;
          recommendation?: string | null;
          thumbnail_url?: string | null;
          title?: string;
          youtube_id?: string;
          youtube_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      content_tags: {
        Row: {
          content_id: string;
          tag_id: string;
        };
        Insert: {
          content_id: string;
          tag_id: string;
        };
        Update: {
          content_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_tags_content_id_fkey";
            columns: ["content_id"];
            isOneToOne: false;
            referencedRelation: "content";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      fcds_courses: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
          semester: number | null;
          slug: string;
          specialization: string;
          year: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          semester?: number | null;
          slug: string;
          specialization?: string;
          year: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          semester?: number | null;
          slug?: string;
          specialization?: string;
          year?: string;
        };
        Relationships: [];
      };
      fcds_playlist_suggestions: {
        Row: {
          channel: string | null;
          course_slug: string;
          created_at: string;
          id: string;
          note: string | null;
          status: string;
          title: string;
          user_id: string | null;
          youtube_url: string;
        };
        Insert: {
          channel?: string | null;
          course_slug: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          status?: string;
          title: string;
          user_id?: string | null;
          youtube_url: string;
        };
        Update: {
          channel?: string | null;
          course_slug?: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          status?: string;
          title?: string;
          user_id?: string | null;
          youtube_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fcds_playlist_suggestions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      fcds_playlists: {
        Row: {
          channel: string | null;
          course_slug: string;
          created_at: string;
          id: string;
          language: string;
          music_reviewed_at: string | null;
          music_skip_ranges: string | null;
          music_status: string | null;
          thumbnail_url: string | null;
          title: string;
          youtube_url: string;
        };
        Insert: {
          channel?: string | null;
          course_slug: string;
          created_at?: string;
          id?: string;
          language?: string;
          music_reviewed_at?: string | null;
          music_skip_ranges?: string | null;
          music_status?: string | null;
          thumbnail_url?: string | null;
          title: string;
          youtube_url: string;
        };
        Update: {
          channel?: string | null;
          course_slug?: string;
          created_at?: string;
          id?: string;
          language?: string;
          music_reviewed_at?: string | null;
          music_skip_ranges?: string | null;
          music_status?: string | null;
          thumbnail_url?: string | null;
          title?: string;
          youtube_url?: string;
        };
        Relationships: [];
      };
      fcds_resource_opens: {
        Row: {
          last_opened_at: string;
          open_count: number;
          resource_id: string;
          visitor_id: string;
        };
        Insert: {
          last_opened_at?: string;
          open_count?: number;
          resource_id: string;
          visitor_id: string;
        };
        Update: {
          last_opened_at?: string;
          open_count?: number;
          resource_id?: string;
          visitor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fcds_resource_opens_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "fcds_playlists";
            referencedColumns: ["id"];
          },
        ];
      };
      general_content_suggestions: {
        Row: {
          channel: string | null;
          content_type: string;
          created_at: string;
          id: string;
          language: string;
          note: string | null;
          status: string;
          thumbnail_url: string | null;
          title: string;
          user_id: string | null;
          youtube_id: string;
          youtube_url: string;
        };
        Insert: {
          channel?: string | null;
          content_type: string;
          created_at?: string;
          id?: string;
          language?: string;
          note?: string | null;
          status?: string;
          thumbnail_url?: string | null;
          title: string;
          user_id?: string | null;
          youtube_id: string;
          youtube_url: string;
        };
        Update: {
          channel?: string | null;
          content_type?: string;
          created_at?: string;
          id?: string;
          language?: string;
          note?: string | null;
          status?: string;
          thumbnail_url?: string | null;
          title?: string;
          user_id?: string | null;
          youtube_id?: string;
          youtube_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "general_content_suggestions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          username: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          username: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          username?: string;
        };
        Relationships: [];
      };
      site_reports: {
        Row: {
          created_at: string;
          details: string;
          id: string;
          library: string;
          page_path: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          details: string;
          id?: string;
          library: string;
          page_path: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          details?: string;
          id?: string;
          library?: string;
          page_path?: string;
          status?: string;
        };
        Relationships: [];
      };
      site_visits: {
        Row: {
          created_at: string;
          id: string;
          visit_date: string;
          visitor_key: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          visit_date?: string;
          visitor_key: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          visit_date?: string;
          visitor_key?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      user_bookmarks: {
        Row: {
          content_id: string | null;
          created_at: string;
          fcds_playlist_id: string | null;
          id: string;
          user_id: string;
        };
        Insert: {
          content_id?: string | null;
          created_at?: string;
          fcds_playlist_id?: string | null;
          id?: string;
          user_id: string;
        };
        Update: {
          content_id?: string | null;
          created_at?: string;
          fcds_playlist_id?: string | null;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_bookmarks_content_id_fkey";
            columns: ["content_id"];
            isOneToOne: false;
            referencedRelation: "content";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_bookmarks_fcds_playlist_id_fkey";
            columns: ["fcds_playlist_id"];
            isOneToOne: false;
            referencedRelation: "fcds_playlists";
            referencedColumns: ["id"];
          },
        ];
      };
      user_resource_progress: {
        Row: {
          fcds_playlist_id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          fcds_playlist_id: string;
          status: string;
          user_id: string;
        };
        Update: {
          fcds_playlist_id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_resource_progress_fcds_playlist_id_fkey";
            columns: ["fcds_playlist_id"];
            isOneToOne: false;
            referencedRelation: "fcds_playlists";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_daily_site_visits: {
        Args: { days?: number };
        Returns: {
          total: number;
          visit_date: string;
        }[];
      };
      get_site_analytics: {
        Args: { p_days?: number; p_library?: string };
        Returns: Json;
      };
      get_top_fcds_videos: {
        Args: never;
        Returns: {
          channel: string;
          course_slug: string;
          created_at: string;
          id: string;
          thumbnail_url: string;
          title: string;
          total_opens: number;
          youtube_url: string;
        }[];
      };
      record_fcds_open: {
        Args: { resource_id: string; visitor_id: string };
        Returns: undefined;
      };
      record_site_event: {
        Args: {
          p_campaign?: string;
          p_course?: string;
          p_event: string;
          p_library: string;
          p_path?: string;
          p_resource?: string;
          p_results?: number;
          p_session: string;
          p_source?: string;
          p_term?: string;
          p_visitor: string;
        };
        Returns: undefined;
      };
      suggestion_link_status: {
        Args: { resource_url: string };
        Returns: string;
      };
      youtube_resource_key: { Args: { resource_url: string }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
