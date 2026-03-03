/** Base database row types — map 1:1 to Supabase tables */

export interface Group {
  id: string;
  name: string;
  slug: string;
  songs_per_round: number;
  created_at: string;
}

export interface Member {
  id: string;
  group_id: string;
  name: string;
  avatar: string;
  is_admin: boolean;
  created_at: string;
}

export interface Round {
  id: string;
  group_id: string;
  number: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

export interface Song {
  id: string;
  round_id: string;
  member_id: string;
  title: string;
  artist: string;
  album: string | null;
  thumbnail_url: string | null;
  platform_links: { platform: string; url: string }[];
  odesli_page_url: string | null;
  genre: string | null;
  created_at: string;
}

export interface Vote {
  id: string;
  song_id: string;
  member_id: string;
  rating: number;
  created_at: string;
}

/** Song enriched with its votes and computed stats */
export interface SongWithVotes extends Song {
  votes: Vote[];
  avgRating: number;
  totalVotes: number;
}

/** Member enriched with aggregate performance stats */
export interface MemberStats extends Member {
  totalScore: number;
  songsAdded: number;
  avgReceived: number;
  roundsWon: number;
}
