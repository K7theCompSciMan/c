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

	// FTC API v2.0: eventCode is a path segment, NOT a query param.
	// Correct URL: GET /v2.0/{season}/{eventCode}/matches
	const apiUrl = `https://ftc-api.firstinspires.org/v2.0/2025/schedule/${event}/?tournamentLevel=qual&?teamNumber=${team}`;

	const res = await fetch(apiUrl, {
		headers: {
			Authorization: `Basic ${auth}`,
			Accept: 'application/json'
		}
	});

	if (!res.ok) {
		const text = await res.text();
		console.log(text);
		return new Response(JSON.stringify({ error: `FTC API error ${res.status}`, detail: text }), {
			status: res.status,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const raw = await res.text();
    console.log(raw);
	let data: { schedule?: unknown[] };
	try {
		data = JSON.parse(raw);
	} catch {
		return Response.json(
			{ error: 'Invalid JSON from FTC API', rawPreview: raw.slice(0, 300) },
			{ status: 502 }
		);
	}

	// FTC API returns lowercase "matches" array; filter by teamNumber client-side
    const teamMatches: any[] = data.schedule!;

	return Response.json({ Matches: teamMatches });
}
