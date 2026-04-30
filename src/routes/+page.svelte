<script lang="ts">
  import { get } from 'svelte/store';
  import { writable } from 'svelte/store';
  import { fetchFRCMatches, fetchFTCMatches } from '$lib/api';
  import type { Team, MatchEntry } from '$lib/types';

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
  const matches = writable<Record<string, MatchEntry[]>>({});
  const errors = writable<Record<string, string>>({});
  const loading = writable<Record<string, boolean>>({});
  const selectedMatch = writable<MatchEntry | null>(null);

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

  function openMatchDetails(match: MatchEntry) {
    selectedMatch.set(match);
  }

  function closeMatchDetails() {
    selectedMatch.set(null);
  }

  // Format time display
  function formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Get queue status badge color
  function getStatusColor(status?: MatchEntry['queueStatus']): string {
    switch (status) {
      case 'queued': return 'bg-yellow-600 text-yellow-100';
      case 'in-progress': return 'bg-green-600 text-green-100';
      case 'completed': return 'bg-gray-600 text-gray-100';
      default: return 'bg-blue-600 text-blue-100';
    }
  }

  // Sort matches: upcoming first, then by match number
  function sortMatches(matches: MatchEntry[]): MatchEntry[] {
    return [...matches].sort((a, b) => {
      // Completed matches go last
      if (a.isPlayed && !b.isPlayed) return 1;
      if (!a.isPlayed && b.isPlayed) return -1;
      // Otherwise sort by match number
      return a.matchNumber - b.matchNumber;
    });
  }

  // Get upcoming matches (not played yet)
  function getUpcomingMatches(matches: MatchEntry[]): MatchEntry[] {
    return matches.filter(m => !m.isPlayed);
  }

  // Get next match (first upcoming)
  function getNextMatch(matches: MatchEntry[]): MatchEntry | undefined {
    const upcoming = getUpcomingMatches(matches);
    return upcoming.length > 0 ? upcoming[0] : undefined;
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
        onclick={refreshAll}
        class="bg-blue-600 hover:bg-blue-500 active:scale-95 transition px-4 py-2 rounded-lg text-sm font-medium"
      >
        ↻ Refresh All
      </button>
    </div>
  
    <!-- MATCH DETAILS MODAL -->
    {#if $selectedMatch}
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={closeMatchDetails}>
        <div class="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
          <div class="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
            <h2 class="text-xl font-bold">
              Match {$selectedMatch.matchNumber} Details
            </h2>
            <button onclick={closeMatchDetails} class="text-gray-400 hover:text-white text-2xl">×</button>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- Match Info -->
            <div class="flex items-center gap-3">
              <span class={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor($selectedMatch.queueStatus)}`}>
                {$selectedMatch.queueStatus === 'queued' ? '🔔 Queued' : $selectedMatch.isPlayed ? '✓ Completed' : '⏳ Upcoming'}
              </span>
              {#if $selectedMatch.startTime}
                <span class="text-gray-400 text-sm">
                  🕐 {formatTime($selectedMatch.startTime)}
                </span>
              {/if}
              {#if $selectedMatch.queueTime}
                <span class="text-yellow-400 text-sm">
                  📋 Queue: {formatTime($selectedMatch.queueTime)}
                </span>
              {/if}
            </div>
  
            <!-- Score Display -->
            {#if $selectedMatch.isPlayed && ($selectedMatch.score !== null || $selectedMatch.opponentScore !== null)}
              <div class="bg-gray-800 rounded-xl p-4 text-center">
                <p class="text-gray-400 text-sm mb-2">Final Score</p>
                <div class="flex justify-center items-center gap-4">
                  <span class={$selectedMatch.alliance === 'red' ? 'text-red-400 text-3xl font-bold' : 'text-gray-400 text-2xl'}>
                    {$selectedMatch.alliance === 'red' ? 'Your Alliance' : 'Red'}: {$selectedMatch.alliance === 'red' ? $selectedMatch.score : $selectedMatch.score !== null ? $selectedMatch.score : $selectedMatch.opponentScore}
                  </span>
                  <span class="text-gray-600">vs</span>
                  <span class={$selectedMatch.alliance === 'blue' ? 'text-blue-400 text-3xl font-bold' : 'text-gray-400 text-2xl'}>
                    {$selectedMatch.alliance === 'blue' ? 'Your Alliance' : 'Blue'}: {$selectedMatch.alliance === 'blue' ? $selectedMatch.score : $selectedMatch.opponentScore !== null ? $selectedMatch.opponentScore : $selectedMatch.score}
                  </span>
                </div>
              </div>
            {/if}
  
            <!-- Red Alliance -->
            <div>
              <h3 class="text-red-400 font-semibold mb-2 flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-red-500"></span>
                Red Alliance
              </h3>
              <div class="bg-gray-800 rounded-lg p-3 space-y-2">
                {#if $selectedMatch.redTeams && $selectedMatch.redTeams.length > 0}
                  {#each $selectedMatch.redTeams as t}
                    <div class="flex justify-between items-center">
                      <span class="font-mono text-gray-300">#{t.teamNumber}</span>
                      <span class="text-gray-400 text-sm">{t.teamNameShort || t.schoolName || 'Unknown'}</span>
                    </div>
                  {/each}
                {:else}
                  <p class="text-gray-500 text-sm">No team data available</p>
                {/if}
              </div>
            </div>
  
            <!-- Blue Alliance -->
            <div>
              <h3 class="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                Blue Alliance
              </h3>
              <div class="bg-gray-800 rounded-lg p-3 space-y-2">
                {#if $selectedMatch.blueTeams && $selectedMatch.blueTeams.length > 0}
                  {#each $selectedMatch.blueTeams as t}
                    <div class="flex justify-between items-center">
                      <span class="font-mono text-gray-300">#{t.teamNumber}</span>
                      <span class="text-gray-400 text-sm">{t.teamNameShort || t.schoolName || 'Unknown'}</span>
                    </div>
                  {/each}
                {:else}
                  <p class="text-gray-500 text-sm">No team data available</p>
                {/if}
              </div>
            </div>
  
            {#if $selectedMatch.description}
              <div class="text-gray-400 text-sm">
                <p class="font-medium text-gray-300 mb-1">Description</p>
                <p>{$selectedMatch.description}</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  
    <!-- CARDS -->
    <div class="grid gap-4">
      {#each $teams as team (teamKey(team))}
        {@const key = teamKey(team)}
        {@const teamMatches = $matches[key]}
        {@const error = $errors[key]}
        {@const isLoading = $loading[key]}
        {@const sortedMatches = sortMatches(teamMatches || [])}
        {@const nextMatch = getNextMatch(teamMatches || [])}
  
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
                onclick={() => loadTeam(team)}
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
  
          <!-- Next Match Highlight -->
          {#if nextMatch && !isLoading}
            <div class="mb-4 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700/50 rounded-lg p-3">
              <div class="flex justify-between items-center mb-2">
                <span class="text-blue-300 text-xs font-semibold uppercase tracking-wide">Next Match</span>
                <span class={`px-2 py-0.5 rounded text-xs ${getStatusColor(nextMatch.queueStatus)}`}>
                  {nextMatch.queueStatus === 'queued' ? '🔔 Queued' : '⏳ Upcoming'}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <div>
                  <span class="text-2xl font-bold text-white">Q{nextMatch.matchNumber}</span>
                  <span class="text-gray-400 text-sm ml-2">
                    {nextMatch.alliance === 'red' ? '🔴 Red' : nextMatch.alliance === 'blue' ? '🔵 Blue' : 'Alliance TBD'}
                  </span>
                </div>
                <div class="text-right">
                  {#if nextMatch.startTime}
                    <div class="text-gray-300 font-mono">{formatTime(nextMatch.startTime)}</div>
                  {/if}
                  {#if nextMatch.queueTime}
                    <div class="text-yellow-400 text-xs">Queue: {formatTime(nextMatch.queueTime)}</div>
                  {/if}
                </div>
              </div>
              <button 
                onclick={() => openMatchDetails(nextMatch)}
                class="mt-2 w-full text-xs text-blue-400 hover:text-blue-300 underline"
              >
                View full details →
              </button>
            </div>
          {/if}
  
          <!-- Match list -->
          {#if sortedMatches && sortedMatches.length > 0}
            <div>
              <h3 class="text-xs text-gray-500 uppercase tracking-wide mb-2">
                {getUpcomingMatches(sortedMatches).length > 0 ? 'Upcoming Matches' : 'All Matches'}
              </h3>
              <div class="space-y-1">
                {#each sortedMatches.slice(0, 8) as match}
                  <button 
                    onclick={() => openMatchDetails(match)}
                    class="w-full flex justify-between items-center text-sm bg-gray-800 hover:bg-gray-750 px-3 py-2 rounded-lg transition cursor-pointer group"
                  >
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-gray-300 group-hover:text-white">Q{match.matchNumber}</span>
                      {#if match.queueStatus === 'queued'}
                        <span class="text-yellow-500 text-xs">🔔</span>
                      {/if}
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="text-gray-400 text-xs">
                        {match.alliance === 'red' ? '🔴' : match.alliance === 'blue' ? '🔵' : '⚪'}
                        {match.alliance.toUpperCase()}
                      </span>
                      {#if match.isPlayed}
                        <span class="text-gray-500 text-xs font-mono">
                          {match.score ?? '-'}-{match.opponentScore ?? '-'}
                        </span>
                      {/if}
                      {#if match.startTime}
                        <span class="text-gray-500 text-xs">
                          {formatTime(match.startTime)}
                        </span>
                      {/if}
                    </div>
                  </button>
                {/each}
                {#if sortedMatches.length > 8}
                  <p class="text-xs text-gray-600 text-center pt-1">
                    +{sortedMatches.length - 8} more matches
                  </p>
                {/if}
              </div>
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