<script lang="ts">
    import { get } from 'svelte/store';
    import { writable } from 'svelte/store';
    import { fetchFRCMatches, fetchFTCMatches } from '$lib/api';
    import type { Team } from '$lib/types';
  
    // 2026 FRC Worlds Houston event codes:
    //   Archimedes: CMPTX1 | Curie: CMPTX2 | Daly: CMPTX3 | Galileo: CMPTX4
    //   Hopper: CMPTX5 | Johnson: CMPTX6 | Newton: CMPTX7 | Roebling: CMPTX8
    //   Einstein (finals): CMPTX
    // 2026 FTC Worlds Houston event code: USHOUSTON (update to your assigned division code)
    // ↓ Edit these to match your actual teams + their division event codes ↓
    const teamList: Team[] = [
      { number: '1002', type: 'frc', event: 'JOHNSON' },
      { number: '1002', type: 'ftc', event: 'FTCCMP1EDIS' },
      { number: '11347', type: 'ftc', event: 'FTCCMP1ROSS' }
    ];
  
    const teams = writable<Team[]>(teamList);
    const matches = writable<Record<string, any[]>>({});
    const errors = writable<Record<string, string>>({});
    const loading = writable<Record<string, boolean>>({});
  
    function teamKey(team: Team) {
      return `${team.type}-${team.number}-${team.event}`;
    }
  
    async function loadTeam(team: Team) {
      const key = teamKey(team);
      loading.update(l => ({ ...l, [key]: true }));
      errors.update(e => ({ ...e, [key]: '' }));
  
      try {
        const fetcher = team.type === 'frc' ? fetchFRCMatches : fetchFTCMatches;
        const result = await fetcher(team);
        matches.update(m => ({ ...m, [key]: result }));
      } catch (err: any) {
        errors.update(e => ({ ...e, [key]: err.message ?? 'Unknown error' }));
      } finally {
        loading.update(l => ({ ...l, [key]: false }));
      }
    }
  
    async function refreshAll() {
      await Promise.all(get(teams).map(loadTeam));
    }
  
    // Helper: extract match number from FRC hybrid schedule or FTC matches
    function matchNumber(match: any): number {
      // FRC hybrid schedule uses "matchNumber"; FTC uses "matchNumber" too
      return match.matchNumber ?? match.match ?? '?';
    }
  
    // Helper: find which alliance our team is on (FRC hybrid schedule)
    function allianceInfo(match: any, teamNum: string): string {
      // FRC hybrid: match.red.teams[] and match.blue.teams[] with teamNumber
      for (const side of ['red', 'blue'] as const) {
        const alliance = match[side];
        if (alliance?.teams?.some((t: any) => String(t.teamNumber) === teamNum)) {
          const score = alliance.score ?? null;
          return `${side.toUpperCase()}${score !== null ? ` · ${score} pts` : ''}`;
        }
      }
      // FTC: match.teams[] with alliance field
      const ftcTeam = match.teams?.find((t: any) => String(t.teamNumber) === teamNum);
      if (ftcTeam) {
        const side = ftcTeam.station?.startsWith('Red') ? 'RED' : 'BLUE';
        return side;
      }
      return '—';
    }
  </script>
  
  <div class="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-6">
    <!-- HEADER -->
    <div class="mb-6 flex items-start justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">🏆 Worlds Tracker 2026</h1>
        <p class="text-gray-400 mt-1 text-sm">
          {$teams.map(t => `${t.type.toUpperCase()} ${t.number}`).join(' · ')}
        </p>
      </div>
      <button
        on:click={refreshAll}
        class="bg-blue-600 hover:bg-blue-500 active:scale-95 transition px-4 py-2 rounded-lg text-sm font-medium"
      >
        ↻ Refresh All
      </button>
    </div>
  
    <!-- CARDS -->
    <div class="grid gap-4">
      {#each $teams as team (teamKey(team))}
        {@const key = teamKey(team)}
        {@const teamMatches = $matches[key]}
        {@const error = $errors[key]}
        {@const isLoading = $loading[key]}
  
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg">
          <!-- Card Header -->
          <div class="flex justify-between items-center mb-3">
            <div>
              <h2 class="text-xl font-semibold">
                {team.type.toUpperCase()} Team {team.number}
              </h2>
              <p class="text-xs text-gray-500 mt-0.5">Event: {team.event}</p>
            </div>
            <div class="flex gap-2 items-center">
              {#if isLoading}
                <span class="text-xs text-blue-400 animate-pulse">Loading…</span>
              {/if}
              <button
                on:click={() => loadTeam(team)}
                class="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition"
              >
                Refresh
              </button>
              <span class="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400">
                {team.type === 'frc' ? '🔵 FRC' : '🟡 FTC'}
              </span>
            </div>
          </div>
  
          <!-- Error state -->
          {#if error}
            <div class="text-red-400 text-sm bg-red-950/40 rounded p-2 mb-2">
              ⚠ {error}
            </div>
          {/if}
  
          <!-- Match list -->
          {#if teamMatches && teamMatches.length > 0}
            <div class="space-y-1">
              {#each teamMatches.slice(0, 8) as match}
                <div class="flex justify-between items-center text-sm bg-gray-800 px-3 py-2 rounded-lg">
                  <span class="font-mono text-gray-300">
                    Q{matchNumber(match)}
                  </span>
                  <span class="text-gray-400 text-xs">
                    {allianceInfo(match, team.number)}
                  </span>
                  {#if match.startTime}
                    <span class="text-gray-500 text-xs">
                      {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  {/if}
                </div>
              {/each}
              {#if teamMatches.length > 8}
                <p class="text-xs text-gray-600 text-center pt-1">
                  +{teamMatches.length - 8} more matches
                </p>
              {/if}
            </div>
          {:else if !isLoading && !error}
            <div class="text-gray-500 text-sm py-2">
              No data — press Refresh to load matches.
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>