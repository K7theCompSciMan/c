export type Team = {
  number: string;
  type: 'frc' | 'ftc';
  /** eventCode as used by the FIRST APIs (e.g. "CMPTX" for Houston FRC Worlds) */
  event: string;
};

export type MatchEntry = {
  matchNumber: number;
  description?: string;
  startTime?: string;
  /** Alliance result for this team: 'red' | 'blue' | unknown */
  alliance?: string;
  /** Score for this team's alliance, if posted */
  score?: number | null;
  /** Opponent score, if posted */
  opponentScore?: number | null;
};