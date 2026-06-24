/* ──────────────────────────────────────────────
 *  Database schema types for English Stars
 * ────────────────────────────────────────────── */

// ── Row types ────────────────────────────────

export interface Subject {
  id: string;
  module: number;
  slug: string;
  title_en: string;
  title_th: string;
  emoji: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  subject_id: string;
  word_en: string;
  word_th: string;
  image_url: string | null;
  audio_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface EbookPage {
  id: string;
  subject_id: string;
  page_number: number;
  text_en: string;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
}

export type QuestionType = "word_to_letter" | "fill_blank" | "word_to_picture";

export interface QuizOption {
  text: string;
  image_url?: string;
  is_correct: boolean;
}

export interface QuizQuestion {
  id: string;
  subject_id: string;
  question_type: QuestionType;
  prompt_en: string;
  prompt_th: string | null;
  image_url: string | null;
  audio_url: string | null;
  options: QuizOption[];
  created_at: string;
}

export type Role = "parent" | "child";

export interface Profile {
  id: string;
  role: Role;
  display_name: string;
  parent_id: string | null;
  avatar_emoji: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnswerRecord {
  question_id: string;
  selected_option: number;
  is_correct: boolean;
}

export interface QuizAttempt {
  id: string;
  child_id: string;
  subject_id: string;
  questions_shown: string[];
  answers: AnswerRecord[];
  score: number;
  total: number;
  completed_at: string;
  created_at: string;
}

export type SubscriptionStatus = "active" | "inactive" | "past_due" | "canceled";
export type SubscriptionPlan = "monthly" | "annual";

export type PlanType = "family" | "school";

export interface Subscription {
  user_id: string;
  stripe_customer_id: string | null;
  opn_customer_id: string | null;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  plan_type: PlanType;
  current_period_end: string;
  child_count: number;
  max_students: number;
  created_at: string;
  updated_at: string;
}

export interface SchoolCode {
  id: string;
  user_id: string;
  code: string;
  school_name: string;
  max_students: number;
  created_at: string;
  expires_at: string;
}

export type TrophyType =
  | "first_steps"
  | "perfect_score"
  | "on_fire"
  | "subject_master"
  | "sharp_shooter"
  | "ollies_star";

export interface Trophy {
  id: string;
  child_id: string;
  trophy_type: TrophyType;
  subject_id: string | null;
  earned_at: string;
}

// ── Supabase Database type ───────────────────

export interface Database {
  public: {
    Tables: {
      subjects: {
        Row: Subject;
        Insert: Omit<Subject, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Subject, "id">>;
        Relationships: [];
      };
      flashcards: {
        Row: Flashcard;
        Insert: Omit<Flashcard, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Flashcard, "id">>;
        Relationships: [
          {
            foreignKeyName: "flashcards_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      ebook_pages: {
        Row: EbookPage;
        Insert: Omit<EbookPage, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<EbookPage, "id">>;
        Relationships: [
          {
            foreignKeyName: "ebook_pages_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      quiz_questions: {
        Row: QuizQuestion;
        Insert: Omit<QuizQuestion, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<QuizQuestion, "id">>;
        Relationships: [
          {
            foreignKeyName: "quiz_questions_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, "id">>;
        Relationships: [
          {
            foreignKeyName: "profiles_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      quiz_attempts: {
        Row: QuizAttempt;
        Insert: Omit<QuizAttempt, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<QuizAttempt, "id">>;
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_attempts_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Subscription, "user_id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      question_type: QuestionType;
      role: Role;
      subscription_status: SubscriptionStatus;
      subscription_plan: SubscriptionPlan;
    };
    CompositeTypes: Record<string, never>;
  };
}
