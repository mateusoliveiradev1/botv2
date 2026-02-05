export interface LovableResponse<T> {
  success: boolean;
  action?: string;
  data?: T;
  error?: string;
  is_mock?: boolean;
}

export interface PlayerStats {
  player_name: string;
  kd_ratio: number;
  wins: number;
  average_damage: number;
  total_kills: number;
  matches_played: number;
  top_10s: number;
  current_rank: string;
  total_rp: number;
  clan_name?: string;
  clan_tag?: string;
  avatar_url?: string;
}

export interface RankingEntry {
  position: number;
  player_name: string;
  display_name: string;
  total_rp: number;
  current_rank: string;
  clan_tag?: string;
  clan_name?: string;
  avatar_url?: string;
  discord_id?: string;
  // Stats extras
  kd_ratio?: number;
  wins?: number;
  matches_played?: number;
  total_kills?: number;
}

export interface LoginLink {
  login_url: string;
  expires_at: string;
  expires_in: string;
  message: string;
}

export interface LinkStatus {
  is_linked: boolean;
  player_name?: string;
  linked_at?: string;
}

export interface SeasonPass {
  current_level: number;
  season_xp: number;
  progress_percent: number;
}

export interface ClanInfo {
  name: string;
  tag: string;
  member_count: number;
  current_level: number;
}
