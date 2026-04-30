import type { Team } from './types';

export async function fetchFRCMatches(team: Team) {
  const params = new URLSearchParams({ team: team.number, event: team.event });
  const res = await fetch(`/api/frc?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body?.error ?? `FRC API ${res.status}`);
  }
  const data = await res.json();
  return (data.Matches ?? []) as any[];
}

export async function fetchFTCMatches(team: Team) {
  const params = new URLSearchParams({ team: team.number, event: team.event });
  const res = await fetch(`/api/ftc?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body?.error ?? `FTC API ${res.status}`);
  }
  const data = await res.json();
  return (data.Matches ?? []) as any[];
}