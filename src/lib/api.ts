import type { Team, MatchEntry } from './types';

/**
 * Parse FRC match data into a normalized MatchEntry format
 */
function parseFRCMatch(match: any, teamNumber: string): MatchEntry {
  const redTeams = match.red?.teams || [];
  const blueTeams = match.blue?.teams || [];
  
  const isRedAlliance = redTeams.some((t: any) => String(t.teamNumber) === teamNumber);
  const isBlueAlliance = blueTeams.some((t: any) => String(t.teamNumber) === teamNumber);
  const alliance = isRedAlliance ? 'red' : isBlueAlliance ? 'blue' : 'unknown';
  
  const redScore = match.red?.score ?? null;
  const blueScore = match.blue?.score ?? null;
  
  const score = alliance === 'red' ? redScore : alliance === 'blue' ? blueScore : null;
  const opponentScore = alliance === 'red' ? blueScore : alliance === 'blue' ? redScore : null;
  
  // Determine queue status based on timing
  const now = new Date();
  const scheduledTime = match.startTime ? new Date(match.startTime) : null;
  const actualTime = match.actualStartTime ? new Date(match.actualStartTime) : null;
  
  let queueStatus: MatchEntry['queueStatus'] = 'upcoming';
  if (actualTime) {
    queueStatus = 'completed';
  } else if (scheduledTime && scheduledTime.getTime() - now.getTime() < 5 * 60 * 1000) {
    queueStatus = 'queued';
  }
  
  return {
    matchNumber: match.matchNumber,
    description: match.description,
    startTime: match.startTime,
    actualStartTime: match.actualStartTime,
    queueTime: match.queueTime,
    alliance,
    score,
    opponentScore,
    redTeams: redTeams.map((t: any) => ({
      teamNumber: String(t.teamNumber),
      teamNameShort: t.teamNameShort,
      schoolName: t.schoolName
    })),
    blueTeams: blueTeams.map((t: any) => ({
      teamNumber: String(t.teamNumber),
      teamNameShort: t.teamNameShort,
      schoolName: t.schoolName
    })),
    allTeams: [...redTeams, ...blueTeams].map((t: any) => ({
      teamNumber: String(t.teamNumber),
      teamNameShort: t.teamNameShort,
      schoolName: t.schoolName
    })),
    isPlayed: actualTime !== null,
    queueStatus
  };
}

/**
 * Parse FTC match data into a normalized MatchEntry format
 */
function parseFTCMatch(match: any, teamNumber: string): MatchEntry {
  const teams = match.teams || [];
  
  const myTeam = teams.find((t: any) => String(t.teamNumber) === teamNumber);
  const alliance = myTeam?.alliance === 'RED' ? 'red' : myTeam?.alliance === 'BLUE' ? 'blue' : 'unknown';
  
  // Extract red and blue teams
  const redTeams = teams.filter((t: any) => t.alliance === 'RED');
  const blueTeams = teams.filter((t: any) => t.alliance === 'BLUE');
  
  // Get scores if available
  const redScore = match.scoreRedFinal ?? match.scoreRed ?? null;
  const blueScore = match.scoreBlueFinal ?? match.scoreBlue ?? null;
  
  const score = alliance === 'red' ? redScore : alliance === 'blue' ? blueScore : null;
  const opponentScore = alliance === 'red' ? blueScore : alliance === 'blue' ? redScore : null;
  
  // Determine queue status
  const now = new Date();
  const scheduledTime = match.startTime ? new Date(match.startTime) : null;
  const actualTime = match.actualStartTime ? new Date(match.actualStartTime) : null;
  
  let queueStatus: MatchEntry['queueStatus'] = 'upcoming';
  if (actualTime || match.isCompleted) {
    queueStatus = 'completed';
  } else if (match.isQueued) {
    queueStatus = 'queued';
  } else if (scheduledTime && scheduledTime.getTime() - now.getTime() < 5 * 60 * 1000) {
    queueStatus = 'queued';
  }
  
  return {
    matchNumber: match.matchNumber,
    description: match.description,
    startTime: match.startTime,
    actualStartTime: match.actualStartTime,
    queueTime: match.queueTime,
    alliance,
    score,
    opponentScore,
    redTeams: redTeams.map((t: any) => ({
      teamNumber: String(t.teamNumber),
      teamNameShort: t.teamNameShort,
      schoolName: t.schoolName
    })),
    blueTeams: blueTeams.map((t: any) => ({
      teamNumber: String(t.teamNumber),
      teamNameShort: t.teamNameShort,
      schoolName: t.schoolName
    })),
    allTeams: teams.map((t: any) => ({
      teamNumber: String(t.teamNumber),
      teamNameShort: t.teamNameShort,
      schoolName: t.schoolName
    })),
    isPlayed: actualTime !== null || !!match.isCompleted,
    queueStatus
  };
}

export async function fetchFRCMatches(team: Team): Promise<MatchEntry[]> {
  const params = new URLSearchParams({ team: team.number, event: team.event });
  const res = await fetch(`/api/frc?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body?.error ?? `FRC API ${res.status}`);
  }
  const data = await res.json();
  const matches = data.Matches ?? [];
  return matches.map((m: any) => parseFRCMatch(m, team.number));
}

export async function fetchFTCMatches(team: Team): Promise<MatchEntry[]> {
  const params = new URLSearchParams({ team: team.number, event: team.event });
  const res = await fetch(`/api/ftc?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body?.error ?? `FTC API ${res.status}`);
  }
  const data = await res.json();
  const matches = data.Matches ?? [];
  return matches.map((m: any) => parseFTCMatch(m, team.number));
}