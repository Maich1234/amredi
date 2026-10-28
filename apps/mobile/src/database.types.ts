export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string;
          id: string;
          member_id: string;
          programme_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          member_id: string;
          programme_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          member_id?: string;
          programme_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_programme_id_fkey";
            columns: ["programme_id"];
            isOneToOne: false;
            referencedRelation: "programmes";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_events: {
        Row: {
          action: string;
          actor_id: string | null;
          after_state: string | null;
          before_state: string | null;
          created_at: string;
          id: number;
          resource: string;
          resource_id: string;
          source: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          after_state?: string | null;
          before_state?: string | null;
          created_at?: string;
          id?: never;
          resource: string;
          resource_id: string;
          source: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after_state?: string | null;
          before_state?: string | null;
          created_at?: string;
          id?: never;
          resource?: string;
          resource_id?: string;
          source?: string;
        };
        Relationships: [];
      };
      community_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
        };
        Relationships: [];
      };
      community_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          hidden: boolean;
          id: string;
          post_id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          hidden?: boolean;
          id?: string;
          post_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          hidden?: boolean;
          id?: string;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "community_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      community_likes: {
        Row: {
          post_id: string;
          user_id: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
        };
        Update: {
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      community_posts: {
        Row: {
          author_id: string;
          body: string;
          comments_enabled: boolean;
          created_at: string;
          hidden: boolean;
          id: string;
          image_alt: string;
          image_path: string | null;
        };
        Insert: {
          author_id: string;
          body: string;
          comments_enabled?: boolean;
          created_at?: string;
          hidden?: boolean;
          id?: string;
          image_alt?: string;
          image_path?: string | null;
        };
        Update: {
          author_id?: string;
          body?: string;
          comments_enabled?: boolean;
          created_at?: string;
          hidden?: boolean;
          id?: string;
          image_alt?: string;
          image_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "community_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      community_profiles: {
        Row: {
          avatar_path: string | null;
          bio: string;
          display_name: string;
          id: string;
          interests: string;
          role_intent: string;
        };
        Insert: {
          avatar_path?: string | null;
          bio?: string;
          display_name: string;
          id: string;
          interests?: string;
          role_intent?: string;
        };
        Update: {
          avatar_path?: string | null;
          bio?: string;
          display_name?: string;
          id?: string;
          interests?: string;
          role_intent?: string;
        };
        Relationships: [];
      };
      community_reports: {
        Row: {
          comment_id: string | null;
          created_at: string;
          excerpt: string;
          id: string;
          post_id: string | null;
          reason: string;
          reporter_id: string;
          resolved: boolean;
        };
        Insert: {
          comment_id?: string | null;
          created_at?: string;
          excerpt?: string;
          id?: string;
          post_id?: string | null;
          reason: string;
          reporter_id: string;
          resolved?: boolean;
        };
        Update: {
          comment_id?: string | null;
          created_at?: string;
          excerpt?: string;
          id?: string;
          post_id?: string | null;
          reason?: string;
          reporter_id?: string;
          resolved?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "community_reports_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "community_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_reports_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      community_saves: {
        Row: {
          post_id: string;
          user_id: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
        };
        Update: {
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_saves_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          blocked_by: string | null;
          id: string;
          mentorship_id: string;
        };
        Insert: {
          blocked_by?: string | null;
          id?: string;
          mentorship_id: string;
        };
        Update: {
          blocked_by?: string | null;
          id?: string;
          mentorship_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_mentorship_id_fkey";
            columns: ["mentorship_id"];
            isOneToOne: true;
            referencedRelation: "mentorships";
            referencedColumns: ["id"];
          },
        ];
      };
      mentor_requests: {
        Row: {
          created_at: string;
          id: string;
          member_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          member_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          member_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mentor_requests_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      mentors: {
        Row: {
          bio: string;
          display_name: string;
          id: string;
          verified: boolean;
        };
        Insert: {
          bio: string;
          display_name: string;
          id: string;
          verified?: boolean;
        };
        Update: {
          bio?: string;
          display_name?: string;
          id?: string;
          verified?: boolean;
        };
        Relationships: [];
      };
      mentorships: {
        Row: {
          created_at: string;
          id: string;
          member_id: string;
          mentor_id: string;
          request_id: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          member_id: string;
          mentor_id: string;
          request_id?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          member_id?: string;
          mentor_id?: string;
          request_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mentorships_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mentorships_mentor_id_fkey";
            columns: ["mentor_id"];
            isOneToOne: false;
            referencedRelation: "mentors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mentorships_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: true;
            referencedRelation: "mentor_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      message_reports: {
        Row: {
          created_at: string;
          id: string;
          message_excerpt: string;
          message_id: number;
          outcome: string;
          reason: string;
          reporter_id: string;
          review_state: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message_excerpt?: string;
          message_id: number;
          outcome?: string;
          reason: string;
          reporter_id: string;
          review_state?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message_excerpt?: string;
          message_id?: number;
          outcome?: string;
          reason?: string;
          reporter_id?: string;
          review_state?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_reports_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          client_nonce: string;
          conversation_id: string;
          created_at: string;
          id: number;
          sender_id: string;
        };
        Insert: {
          body: string;
          client_nonce: string;
          conversation_id: string;
          created_at?: string;
          id?: never;
          sender_id: string;
        };
        Update: {
          body?: string;
          client_nonce?: string;
          conversation_id?: string;
          created_at?: string;
          id?: never;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      milestones: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          mentorship_id: string;
          status: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          mentorship_id: string;
          status?: string;
          title: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          mentorship_id?: string;
          status?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "milestones_mentorship_id_fkey";
            columns: ["mentorship_id"];
            isOneToOne: false;
            referencedRelation: "mentorships";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          display_name: string;
          goal: string;
          id: string;
        };
        Insert: {
          display_name: string;
          goal: string;
          id: string;
        };
        Update: {
          display_name?: string;
          goal?: string;
          id?: string;
        };
        Relationships: [];
      };
      programmes: {
        Row: {
          category: string;
          cost_kes: number;
          created_at: string;
          description: string;
          id: string;
          location: string;
          published: boolean;
          schedule: string;
          title: string;
        };
        Insert: {
          category: string;
          cost_kes?: number;
          created_at?: string;
          description: string;
          id?: string;
          location: string;
          published?: boolean;
          schedule: string;
          title: string;
        };
        Update: {
          category?: string;
          cost_kes?: number;
          created_at?: string;
          description?: string;
          id?: string;
          location?: string;
          published?: boolean;
          schedule?: string;
          title?: string;
        };
        Relationships: [];
      };
      staff_members: {
        Row: {
          active: boolean;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          user_id: string;
        };
        Update: {
          active?: boolean;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      close_mentorship: { Args: { p_mentorship: string }; Returns: undefined };
      match_mentor: {
        Args: { p_mentor: string; p_request: string };
        Returns: string;
      };
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

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
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
