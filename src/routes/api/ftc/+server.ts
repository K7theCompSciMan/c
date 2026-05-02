import { ftcAuth, ftcNexusAuth } from '$lib/server/auth';

export async function GET({ url, fetch }) {
	const team = url.searchParams.get('team');
	const event = url.searchParams.get('event');

	if (!team) {
		return Response.json({ error: 'Missing team' }, { status: 400 });
	}
	if (!event) {
		return Response.json({ error: 'Missing event' }, { status: 400 });
	}

	const auth = ftcAuth();
	const nexus = ftcNexusAuth();

	// FTC API v2.0: endpoint is /matches/{eventCode}
	// Correct URL: GET /v2.0/{season}/matches/{eventCode}?tournamentLevel=qual
	const apiUrl = `https://ftc-api.firstinspires.org/v2.0/2025/matches/${event}/?tournamentLevel=qual`;
	const schedUrl = `https://ftc-api.firstinspires.org/v2.0/2025/schedule/${event}/?tournamentLevel=qual`;
	const elimUrl = `https://ftc-api.firstinspires.org/v2.0/2025/schedule/${event}/?tournamentLevel=playoff`;

	const res = await fetch(apiUrl, {
		headers: {
			Authorization: `Basic ${auth}`,
			Accept: 'application/json'
		}
	});

	const schedRes = await fetch(schedUrl, {
		headers: {
			Authorization: `Basic ${auth}`,
			Accept: 'application/json'
		}
	});

	const elimRes = await fetch(elimUrl, {
		headers: {
			Authorization: `Basic ${auth}`,
			Accept: 'application/json'
		}
	});

	if (!res.ok) {
		const text = await res.text();
		console.error('FTC API error:', text);
		return new Response(JSON.stringify({ error: `FTC API error ${res.status}`, detail: text }), {
			status: res.status,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!schedRes.ok) {
		const text = await schedRes.text();
		console.error('FTC API error:', text);
		return new Response(
			JSON.stringify({ error: `FTC API error ${schedRes.status}`, detail: text }),
			{
				status: schedRes.status,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	if (!elimRes.ok) {
		const text = await elimRes.text();
		console.error('FTC API error:', text);
		return new Response(
			JSON.stringify({ error: `FTC API error ${elimRes.status}`, detail: text }),
			{
				status: elimRes.status,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const raw = await res.text();
	// console.log(raw);
	let data: { matches?: unknown[] };
	try {
		data = JSON.parse(raw);
	} catch {
		return Response.json(
			{ error: 'Invalid JSON from FTC API', rawPreview: raw.slice(0, 300) },
			{ status: 502 }
		);
	}

	// FTC API returns "schedule" array with match details
	const allMatches: any[] = data.matches || [];
	// console.log(allMatches);
	// Filter to only matches involving this team
	const teamMatches = allMatches.filter((match: any) =>
		match.teams?.some((t: any) => String(t.teamNumber) == team)
	);

	const schedRaw = await schedRes.text();
	// console.log(schedRaw);
	let schedData: { schedule?: unknown[] };
	try {
		schedData = JSON.parse(schedRaw);
	} catch {
		return Response.json(
			{ error: 'Invalid JSON from FTC API', rawPreview: schedRaw.slice(0, 300) },
			{ status: 502 }
		);
	}

	const allSchedMatches = schedData.schedule ?? [];

	const teamSchedMatches = allSchedMatches.filter((match: any) =>
		match.teams?.some((t: any) => String(t.teamNumber) == team)
	);

	// console.log(teamSchedMatches.slice(teamMatches.length));

	let finalMatches = teamMatches.concat(teamSchedMatches.slice(teamMatches.length));
	// console.log(allSchedMatches);

	// console.log(teamMatches)

	const elimRaw = await elimRes.text();
	// console.log(elimRaw);
	let elimData: { schedule?: unknown[] };
	try {
		elimData = JSON.parse(elimRaw);
	} catch {
		return Response.json(
			{ error: 'Invalid JSON from FTC API', rawPreview: elimRaw.slice(0, 300) },
			{ status: 502 }
		);
	}
	const allElimMatches = elimData.schedule ?? [];
	const teamElimMatches = allElimMatches.filter((m: any) =>
		m.teams?.some((t: any) => String(t.teamNumber) == team)
	);

    finalMatches = finalMatches.concat(teamElimMatches.filter((m) => {
        
    }))

	const nexusRes = await fetch(`https://ftc.nexus/api/v1/event/2025${event}`, {
		headers: {
			'Nexus-Api-Key': nexus,
			Accept: 'application/json'
		}
	});

	if (!nexusRes.ok) {
		const text = await nexusRes.text();
		console.log(text);
		return new Response(
			JSON.stringify({ error: `FTC Nexus API error ${nexusRes.status}`, detail: text }),
			{
				status: nexusRes.status,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
	const nexusRaw = await nexusRes.text();
	let nexusData;
	try {
		nexusData = JSON.parse(nexusRaw);
	} catch {
		return Response.json(
			{ error: 'Invalid JSON from FTC API', rawPreview: nexusRaw.slice(0, 300) },
			{ status: 502 }
		);
	}
	let matches: any[] = [];
	let nexusMatches: any[] = nexusData.matches;
	finalMatches.forEach((m: any) => {
		let nexusMatch = nexusMatches.filter((s: any) => s.label == m.description)[0];
		matches.push({
			...m,
			estimatedQueueTime: nexusMatch.times.estimatedQueueTime,
			estimatedOnDeckTime: nexusMatch.times.estimatedOnDeckTime,
			estimatedStartTime: nexusMatch.times.estimatedStartTime
		});
	});
	// console.log(matches);

	return Response.json({ Matches: matches });
}
