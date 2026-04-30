import { ftcAuth } from '$lib/server/auth';

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

	// FTC API v2.0: endpoint is /matches/{eventCode}
	// Correct URL: GET /v2.0/{season}/matches/{eventCode}?tournamentLevel=qual
	const apiUrl = `https://ftc-api.firstinspires.org/v2.0/2025/matches/${event}?tournamentLevel=qual`;

	const res = await fetch(apiUrl, {
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

	const raw = await res.text();
	let data: { schedule?: unknown[] };
	try {
		data = JSON.parse(raw);
	} catch {
		return Response.json(
			{ error: 'Invalid JSON from FTC API', rawPreview: raw.slice(0, 300) },
			{ status: 502 }
		);
	}

	// FTC API returns "schedule" array with match details
	const allMatches: any[] = data.schedule || [];
	
	// Filter to only matches involving this team
	const teamMatches = allMatches.filter((match: any) => 
		match.teams?.some((t: any) => String(t.teamNumber) === team)
	);

	return Response.json({ Matches: teamMatches });
}
