export type Player = {
  id: string;
  nickname: string;
  email: string;
  created_at: string;
};

export type Prompt = {
  id: string;
  text: string;
  category: string;
  difficulty: string;
  is_active: boolean;
  times_used: number;
  created_at: string;
};

export type Score = {
  id: string;
  player_id: string;
  prompt_id: string;
  wpm: number;
  accuracy: number;
  score: number;
  created_at: string;
  player?: Player;
};

export type LeaderboardEntry = {
  rank: number;
  nickname: string;
  wpm: number;
  accuracy: number;
  score: number;
  created_at: string;
};

export type LeaderboardResponse = {
  date: string;
  leaderboard: LeaderboardEntry[];
};

export type EventConsentConfig = {
  enabled: boolean;
  label: string;
  required: boolean;
};

export type EventConfig = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  config: {
    subtitle?: string;
    consent?: EventConsentConfig;
    leaderboard_title?: string;
  };
};

export type GameState = 'welcome' | 'getReady' | 'countdown' | 'playing' | 'results' | 'leaderboard';

export type GameStats = {
  wpm: number;
  accuracy: number;
  score: number;
  correctChars: number;
  totalChars: number;
  timeRemaining: number;
};
