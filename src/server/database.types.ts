/**
 * DB 테이블 타입 (supabase/schema.sql 과 똑같은 모양)
 *
 * `supabase gen types typescript` 가 만드는 형식과 같습니다.
 * 덕분에 getDb().from("clients").select("id, name") 처럼 쓰면 결과 타입이 자동으로 정해지고,
 * 없는 컬럼 이름을 쓰면 빌드할 때 오류로 알려 줍니다.
 *
 * ⚠️ schema.sql 의 테이블/컬럼을 바꾸면 이 파일도 같이 바꿔 주세요.
 *    (생성기와 똑같이 text 컬럼은 string 으로 둡니다. 'draft' | 'shared' 같은 좁은 타입은 코드에서 처리)
 *    (Supabase CLI 를 쓸 수 있다면: npx supabase gen types typescript --project-id <프로젝트ID> > src/server/database.types.ts)
 */

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      counselors: {
        Row: {
          id: string;
          username: string;
          password_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          password_hash: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          password_hash?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          counselor_id: string;
          name: string;
          birth_date: string;
          purpose_note: string | null;
          share_token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          counselor_id: string;
          name: string;
          birth_date: string;
          purpose_note?: string | null;
          share_token: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          counselor_id?: string;
          name?: string;
          birth_date?: string;
          purpose_note?: string | null;
          share_token?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_counselor_id_fkey";
            columns: ["counselor_id"];
            isOneToOne: false;
            referencedRelation: "counselors";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          id: string;
          client_id: string;
          session_number: number;
          session_date: string;
          status: string;
          source_text: string;
          counselor_note: string;
          client_summary: string;
          created_at: string;
          shared_at: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          session_number: number;
          session_date?: string;
          status?: string;
          source_text?: string;
          counselor_note?: string;
          client_summary?: string;
          created_at?: string;
          shared_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          session_number?: number;
          session_date?: string;
          status?: string;
          source_text?: string;
          counselor_note?: string;
          client_summary?: string;
          created_at?: string;
          shared_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      action_items: {
        Row: {
          id: string;
          session_id: string;
          position: number;
          title: string;
          is_completed: boolean;
        };
        Insert: {
          id?: string;
          session_id: string;
          position: number;
          title: string;
          is_completed?: boolean;
        };
        Update: {
          id?: string;
          session_id?: string;
          position?: number;
          title?: string;
          is_completed?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "action_items_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      preparation_questions: {
        Row: {
          id: string;
          session_id: string;
          position: number;
          question: string;
          client_answer: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          position: number;
          question: string;
          client_answer?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          position?: number;
          question?: string;
          client_answer?: string;
        };
        Relationships: [
          {
            foreignKeyName: "preparation_questions_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      save_session: {
        Args: {
          p_counselor_id: string;
          p_client_id: string;
          p_session_id: string;
          p_session_date: string;
          p_source_text: string;
          p_counselor_note: string;
          p_client_summary: string;
          p_action_items: string[];
          p_preparation_questions: string[];
          p_share: boolean;
        };
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
