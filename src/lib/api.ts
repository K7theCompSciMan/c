import type { Team, MatchEntry } from './types';

/**
 * Parse FRC match data into a normalized MatchEntry format
 * FRC API structure: teams array with station field like "Red1", "Blue2", etc.
 */
function parseFRCMatch(match: any, teamNumber: string): MatchEntry {
	const teams = match.teams || [];

	// Separate teams by alliance based on station field (e.g., "Red1", "Blue2")
	const redTeams = teams.filter((t: any) => t.station && t.station.startsWith('Red'));
	const blueTeams = teams.filter((t: any) => t.station && t.station.startsWith('Blue'));

	// Find if our team is in this match and which alliance
	const myTeam = teams.find((t: any) => String(t.teamNumber) === teamNumber);
	const alliance = myTeam?.station?.startsWith('Red')
		? 'red'
		: myTeam?.station?.startsWith('Blue')
			? 'blue'
			: 'unknown';

	// Get scores
	const redScore = match.scoreRedFinal ?? match.scoreRed ?? null;
	const blueScore = match.scoreBlueFinal ?? match.scoreBlue ?? null;

	const score = alliance === 'red' ? redScore : alliance === 'blue' ? blueScore : null;
	const opponentScore = alliance === 'red' ? blueScore : alliance === 'blue' ? redScore : null;

	// Determine queue status based on timing
	const now = new Date();
	const scheduledTime = match.startTime
		? new Date(match.startTime)
		: match.autoStartTime
			? new Date(match.autoStartTime)
			: null;
	const actualTime = match.actualStartTime ? new Date(match.actualStartTime) : null;

	let queueStatus: MatchEntry['queueStatus'] = 'upcoming';
	if (actualTime || match.postResultTime) {
		queueStatus = 'completed';
	} else if (scheduledTime && scheduledTime.getTime() - now.getTime() < 5 * 60 * 1000) {
		queueStatus = 'queued';
	}

	return {
		matchNumber: match.matchNumber,
		description: match.description,
		startTime: match.startTime,
		actualStartTime: match.actualStartTime,
		autoStartTime: match.autoStartTime,
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
		isPlayed: actualTime !== null || !!match.postResultTime,
		queueStatus
	};
}

/**
 * Parse FTC match data into a normalized MatchEntry format
 * FTC API structure: teams array with station field containing "Red" or "Blue"
 */
function parseFTCMatch(match: any, teamNumber: string): MatchEntry {
	const teams = match.teams || [];

	// Separate teams by alliance based on station field (contains "Red" or "Blue")
	const redTeams = teams.filter((t: any) => t.station && t.station.includes('Red'));
	const blueTeams = teams.filter((t: any) => t.station && t.station.includes('Blue'));

	// Find if our team is in this match and which alliance
	const myTeam = teams.find((t: any) => String(t.teamNumber) === teamNumber);
	const alliance = myTeam?.station?.includes('Red')
		? 'red'
		: myTeam?.station?.includes('Blue')
			? 'blue'
			: 'unknown';

	// Get scores
	const redScore = match.scoreRedFinal ?? match.scoreRed ?? null;
	const blueScore = match.scoreBlueFinal ?? match.scoreBlue ?? null;

	const score = alliance === 'red' ? redScore : alliance === 'blue' ? blueScore : null;
	const opponentScore = alliance === 'red' ? blueScore : alliance === 'blue' ? redScore : null;

	// Determine queue status
	const now = new Date();
	const scheduledTime = match.startTime ? new Date(match.startTime) : null;
	const actualTime = match.actualStartTime ? new Date(match.actualStartTime) : null;

	let queueStatus: MatchEntry['queueStatus'] = 'upcoming';
	if (actualTime || match.postResultTime) {
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
		allTeams: teams.map((t: any) => ({
			teamNumber: String(t.teamNumber),
			teamNameShort: t.teamNameShort,
			schoolName: t.schoolName
		})),
		isPlayed: actualTime !== null || !!match.postResultTime,
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
	// console.log(matches.map((m: any) => parseFTCMatch(m, team.number)));
	// console.log(matches);
	return matches.map((m: any) => parseFTCMatch(m, team.number));
}
