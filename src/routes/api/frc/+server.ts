import { frcAuth } from '$lib/server/auth';

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

  // The FRC v3.0 API exposes a "hybrid schedule" endpoint that merges the
  // qualification schedule with posted results. It accepts an optional
  // teamNumber query param so the API does the filtering server-side.
  // Endpoint: GET /v3.0/{season}/schedule/hybrid/{eventCode}?teamNumber={n}&tournamentLevel=qual
  const apiUrl =
    `https://frc-api.firstinspires.org/v3.0/2026/schedule/${event}` +
    `?teamNumber=${team}&tournamentLevel=qual`;

  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    console.log(text);
    return new Response(
      JSON.stringify({ error: `FRC API error ${res.status}`, detail: text }),
      { status: res.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Read the body ONCE — never pre-consume with getReader() before res.text()/res.json()
  const raw = await res.text();

  let data: { Schedule?: unknown[] };
  try {
    data = JSON.parse(raw);
  } catch {
    return Response.json(
      { error: 'Invalid JSON from FRC API', rawPreview: raw.slice(0, 300) },
      { status: 502 }
    );
  }

  // Hybrid schedule wraps results in "Schedule", not "Matches"
  return Response.json({ Matches: data.Schedule ?? [] });
}