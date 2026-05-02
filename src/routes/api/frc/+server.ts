import { frcAuth, frcNexusAuth } from '$lib/server/auth';

export async function GET({ url, fetch }) {
	const team = url.searchParams.get('team');
	const event = url.searchParams.get('event');

	if (!team) {
		return Response.json({ error: 'Missing team' }, { status: 400 });
	}
	if (!event) {
		return Response.json({ error: 'Missing event' }, { status: 400 });
	}

	const auth = frcAuth();
	const nexus = frcNexusAuth();

	// The FRC v3.0 API exposes a "hybrid schedule" endpoint that merges the
	// qualification schedule with posted results. It accepts an optional
	// teamNumber query param so the API does the filtering server-side.
	// Endpoint: GET /v3.0/{season}/schedule/hybrid/{eventCode}?teamNumber={n}&tournamentLevel=qual
	const apiUrl = `https://frc-api.firstinspires.org/v3.0/2026/matches/${event}?tournamentLevel=Qualification&?teamNumber=${team}`;

	const res = await fetch(apiUrl, {
		headers: {
			Authorization: `Basic ${auth}`,
			Accept: 'application/json'
		}
	});

	if (!res.ok) {
		const text = await res.text();
		console.log(text);
		return new Response(JSON.stringify({ error: `FRC API error ${res.status}`, detail: text }), {
			status: res.status,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Read the body ONCE — never pre-consume with getReader() before res.text()/res.json()
	const raw = await res.text();
	// console.log(raw);
	let data: { Matches?: unknown[] };
	try {
		data = JSON.parse(raw);
	} catch {
		return Response.json(
			{ error: 'Invalid JSON from FRC API', rawPreview: raw.slice(0, 300) },
			{ status: 502 }
		);
	}

	const allMatches = data.Matches ?? [];

	const teamMatches = allMatches.filter((match: any) =>
		match.teams?.some((t: any) => String(t.teamNumber) == team)
	);
	// console.log(teamMatches)

	const nexusRes = await fetch(`https://frc.nexus/api/v1/event/2026${event}`, {
		headers: {
			'Nexus-Api-Key': nexus,
			Accept: 'application/json'
		}
	});

	if (!nexusRes.ok) {
		const text = await nexusRes.text();
		console.log(text);
		return new Response(
			JSON.stringify({ error: `FRC Nexus API error ${nexusRes.status}`, detail: text }),
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
			{ error: 'Invalid JSON from FRC API', rawPreview: nexusRaw.slice(0, 300) },
			{ status: 502 }
		);
	}
	let matches: any[] = [];
	let nexusMatches: any[] = nexusData.matches;
	teamMatches.forEach((m: any) => {
		let nexusMatch = nexusMatches.filter((s: any) => s.label == m.description)[0];
		matches.push({
			...m,
			estimatedQueueTime: nexusMatch.times.estimatedQueueTime,
			estimatedOnDeckTime: nexusMatch.times.estimatedOnDeckTime,
			estimatedStartTime: nexusMatch.times.estimatedStartTime
		});
	});
	// console.log(matches);

	//statbotics stuff
	let statRes = await fetch('https://api.statbotics.io/v3/team_event/1002/2026joh', {
		headers: {
			accept: 'application/json'
		}
	});
	if (!statRes.ok) {
		const text = await statRes.text();
		console.log(text);
		return new Response(
			JSON.stringify({ error: `Statbotics API error ${statRes.status}`, detail: text }),
			{
				status: statRes.status,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
	const statRaw = await statRes.text();
	let statData;
	try {
		statData = JSON.parse(statRaw);
	} catch {
		return Response.json(
			{ error: 'Invalid JSON from FRC API', rawPreview: statRaw.slice(0, 300) },
			{ status: 502 }
		);
	}
	let matchRes = await fetch(
		'https://api.statbotics.io/v3/matches?team=1002&year=2026&event=2026joh&week=8&elim=false',
		{
			headers: {
				accept: 'application/json'
			}
		}
	);
	if (!matchRes.ok) {
		const text = await matchRes.text();
		console.log(text);
		return new Response(
			JSON.stringify({ error: `Statbotics API error ${matchRes.status}`, detail: text }),
			{
				status: matchRes.status,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
	const matchRaw = await matchRes.text();
	let matchData: any[] = [];
	try {
		matchData = JSON.parse(matchRaw);
	} catch {
		return Response.json(
			{ error: 'Invalid JSON from FRC API', rawPreview: matchRaw.slice(0, 300) },
			{ status: 502 }
		);
	}
	// Hybrid schedule wraps results in "Schedule", not "Matches"
	return Response.json({ Matches: matches, StatboticsData: statData });
}
