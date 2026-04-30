export type Team = {
  number: string;
  type: 'frc' | 'ftc';
  /** eventCode as used by the FIRST APIs (e.g. "CMPTX" for Houston FRC Worlds) */
  event: string;
};

export type TeamInfo = {
  teamNumber: string;
  teamNameShort?: string;
  teamNameFull?: string;
  schoolName?: string;
  city?: string;
  stateProv?: string;
  country?: string;
};

export type MatchEntry = {
  autoStartTime?: string;
  matchNumber: number;
  description?: string;
  startTime?: string;
  actualStartTime?: string;
  queueTime?: string;
  /** Alliance result for this team: 'red' | 'blue' | unknown */
  alliance?: 'red' | 'blue' | 'unknown';
  /** Score for this team's alliance, if posted */
  score?: number | null;
  /** Opponent score, if posted */
  opponentScore?: number | null;
  /** Teams on red alliance */
  redTeams?: TeamInfo[];
  /** Teams on blue alliance */
  blueTeams?: TeamInfo[];
  /** All teams in this match */
  allTeams?: TeamInfo[];
  /** Whether the match has been played */
  isPlayed?: boolean;
  /** Queue status */
  queueStatus?: 'upcoming' | 'queued' | 'in-progress' | 'completed';
};

export type FTCMatchEntry