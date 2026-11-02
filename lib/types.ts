export type Topic = {
  id: string;
  name: string;
  grade: 10 | 11 | 12;
  kinh_title?: string;
  kinh?: string[];
};

export type PublicQuestion = {
  id: number;
  level: 1 | 2 | 3 | 4;
  content: string;
  options: string[];
  topic: Topic | null;
};

export type Penalty = {
  minutes: number;
  elapsed: number;
  seated: boolean;
  topic: Required<Topic> | null;
  question: {
    content: string;
    options: string[];
    answer: Letter;
    explanation: string | null;
  } | null;
};

export type GameState = {
  id: string;
  display_name: string;
  gender: "nam" | "nu" | null;
  school: string | null;
  class_name: string | null;
  tiktok_username: string | null;
  role: "student" | "admin";
  cong_duc: number;
  huong: number;
  level: number;
  tier: 1 | 2 | 3 | 4;
  correct_streak: number;
  best_streak: number;
  wrong_streak: number;
  total_correct: number;
  total_wrong: number;
  sam_hoi_at: string | null;
  has_question: boolean;
  penalty: Penalty | null;
  config: {
    max_level: number;
    levels_per_tier: number;
    incense_level_boost: number;
    incense_cost_merit: number;
    room_capacity: number;
  };
};

export type Letter = "A" | "B" | "C" | "D";

export type AnswerResult = {
  is_correct: boolean;
  correct_choice: Letter;
  explanation: string | null;
  merit: number;
  already: boolean;
  old_level: number;
  new_level: number;
  penalty_minutes: number;
  sam_hoi: boolean;
  state: GameState;
};

export type RoomSeat = { name: string; me: boolean; remaining: number };

export type DienToResult = {
  done: boolean;
  server_now: string;
  state: GameState;
  room: {
    capacity: number;
    seated: RoomSeat[];
    waiting: number;
    my_position: number | null;
  };
};

export type AdminQuestion = {
  id: number;
  topic_id: string;
  level: 1 | 2 | 3 | 4;
  content: string;
  options: string[];
  answer: Letter;
  explanation: string | null;
  is_published: boolean;
  updated_at: string;
};
