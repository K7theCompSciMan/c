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
		loading.update((l) => ({ ...l, [key]: true }));
		errors.update((e) => ({ ...e, [key]: '' }));

		try {
			const fetcher = team.type === 'frc' ? fetchFRCMatches : fetchFTCMatches;
			const result = await fetcher(team);
			matches.update((m) => ({ ...m, [key]: result }));
		} catch (err: any) {
			errors.update((e) => ({ ...e, [key]: err.message ?? 'Unknown error' }));
		} finally {
			loading.update((l) => ({ ...l, [key]: false }));
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
			case 'queued':
				return 'bg-yellow-600 text-yellow-100';
			case 'in-progress':
				return 'bg-green-600 text-green-100';
			case 'completed':
				return 'bg-gray-600 text-gray-100';
			default:
				return 'bg-blue-600 text-blue-100';
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
		return matches.filter((m) => !m.isPlayed);
	}

	// Get next match (first upcoming)
	function getNextMatch(matches: MatchEntry[]): MatchEntry | null {
		const upcoming = getUpcomingMatches(matches);
		return upcoming.length > 0 ? upcoming[0] : null;
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6 text-white">
	<!-- HEADER -->
	<div class="mb-6 flex items-start justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">🏆 Worlds Tracker 2026</h1>
			<p class="mt-1 text-sm text-gray-400">
				{$teams.map((t) => `${t.type.toUpperCase()} ${t.number}`).join(' · ')}
			</p>
		</div>
		<button
			onclick={refreshAll}
			class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500 active:scale-95"
		>
			↻ Refresh All
		</button>
	</div>

	<!-- MATCH DETAILS MODAL -->
	{#if $selectedMatch}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
			onclick={closeMatchDetails}
		>
			<div
				class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900"
				onclick={(e) => e.stopPropagation()}
			>
				<div
					class="sticky top-0 flex items-center justify-between border-b border-gray-700 bg-gray-900 px-6 py-4"
				>
					<h2 class="text-xl font-bold">
						Match {$selectedMatch.matchNumber} Details
					</h2>
					<button onclick={closeMatchDetails} class="text-2xl text-gray-400 hover:text-white"
						>×</button
					>
				</div>

				<div class="space-y-6 p-6">
					<!-- Match Info -->
					<div class="flex items-center gap-3">
						<span
							class={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor($selectedMatch.queueStatus)}`}
						>
							{$selectedMatch.queueStatus === 'queued'
								? '🔔 Queued'
								: $selectedMatch.isPlayed
									? '✓ Completed'
									: '⏳ Upcoming'}
						</span>
						{#if $selectedMatch.startTime}
							<span class="text-xl text-gray-400">
								🕐 {formatTime($selectedMatch.startTime)}
							</span>
						{/if}
						{#if $selectedMatch.queueTime}
							<span class="text-xl text-yellow-400">
								📋 Queue: {formatTime($selectedMatch.queueTime)}
							</span>
						{/if}
					</div>

					<!-- Score Display -->
					{#if $selectedMatch.isPlayed && ($selectedMatch.score !== null || $selectedMatch.opponentScore !== null)}
						<div class="rounded-xl bg-gray-800 p-4 text-center">
							<p class="mb-2 text-sm text-gray-400">Final Score</p>
							<div class="flex items-center justify-center gap-4">
								<span
									class={$selectedMatch.alliance === 'red'
										? 'text-3xl font-bold text-red-400'
										: 'text-2xl text-gray-400'}
								>
									{$selectedMatch.alliance === 'red' ? 'Your Alliance' : 'Red'}: {$selectedMatch.alliance ===
									'red'
										? $selectedMatch.score
										: $selectedMatch.opponentScore}
								</span>
								<span class="text-gray-600">vs</span>
								<span
									class={$selectedMatch.alliance === 'blue'
										? 'text-3xl font-bold text-blue-400'
										: 'text-2xl text-gray-400'}
								>
									{$selectedMatch.alliance === 'blue' ? 'Your Alliance' : 'Blue'}: {$selectedMatch.alliance ===
									'blue'
										? $selectedMatch.score
										: $selectedMatch.opponentScore}
								</span>
							</div>
						</div>
					{/if}

					<!-- Red Alliance -->
					<div>
						<h3 class="mb-2 flex items-center gap-2 font-semibold text-red-400">
							<span class="h-3 w-3 rounded-full bg-red-500"></span>
							Red Alliance
						</h3>
						<div class="space-y-2 rounded-lg bg-gray-800 p-3">
							{#if $selectedMatch.redTeams && $selectedMatch.redTeams.length > 0}
								{#each $selectedMatch.redTeams as t}
									<div class="flex items-center justify-between">
										<span class="font-mono text-gray-300">#{t.teamNumber}</span>
										<span class="text-sm text-gray-400"
											>{t.teamNameShort || t.schoolName || ''}</span
										>
									</div>
								{/each}
							{:else}
								<p class="text-sm text-gray-500">No team data available</p>
							{/if}
						</div>
					</div>

					<!-- Blue Alliance -->
					<div>
						<h3 class="mb-2 flex items-center gap-2 font-semibold text-blue-400">
							<span class="h-3 w-3 rounded-full bg-blue-500"></span>
							Blue Alliance
						</h3>
						<div class="space-y-2 rounded-lg bg-gray-800 p-3">
							{#if $selectedMatch.blueTeams && $selectedMatch.blueTeams.length > 0}
								{#each $selectedMatch.blueTeams as t}
									<div class="flex items-center justify-between">
										<span class="font-mono text-gray-300">#{t.teamNumber}</span>
										<span class="text-sm text-gray-400"
											>{t.teamNameShort || t.schoolName || ''}</span
										>
									</div>
								{/each}
							{:else}
								<p class="text-sm text-gray-500">No team data available</p>
							{/if}
						</div>
					</div>

					{#if $selectedMatch.description}
						<div class="text-sm text-gray-400">
							<p class="mb-1 font-medium text-gray-300">Description</p>
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

			<div class="rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-lg">
				<!-- Card Header -->
				<div class="mb-3 flex items-center justify-between">
					<div>
						<h2 class="text-xl font-semibold">
							{team.type.toUpperCase()} Team {team.number}
						</h2>
						<p class="mt-0.5 text-xs text-gray-500">Event: {team.event}</p>
					</div>
					<div class="flex items-center gap-2">
						{#if isLoading}
							<span class="animate-pulse text-xs text-blue-400">Loading…</span>
						{/if}
						<button
							onclick={() => loadTeam(team)}
							class="rounded bg-gray-800 px-2 py-1 text-xs transition hover:bg-gray-700"
						>
							Refresh
						</button>
						<span class="rounded bg-gray-800 px-2 py-1 text-xs text-gray-400">
							{team.type === 'frc' ? '🔵 FRC' : '🟡 FTC'}
						</span>
					</div>
				</div>

				<!-- Error state -->
				{#if error}
					<div class="mb-2 rounded bg-red-950/40 p-2 text-sm text-red-400">
						⚠ {error}
					</div>
				{/if}

				<!-- Next Match Highlight -->
				{#if nextMatch && !isLoading}
					<div
						class="mb-4 rounded-lg border border-blue-700/50 bg-gradient-to-r from-blue-900/50 to-purple-900/50 p-3"
					>
						<div class="mb-2 flex items-center justify-between">
							<span class="text-xs font-semibold tracking-wide text-blue-300 uppercase"
								>Next Match</span
							>
							<span class={`rounded px-2 py-0.5 text-xs ${getStatusColor(nextMatch.queueStatus)}`}>
								{nextMatch.queueStatus === 'queued' ? '🔔 Queued' : '⏳ Upcoming'}
							</span>
						</div>
						<div class="flex items-center justify-between">
							<div>
								<span class="text-2xl font-bold text-white">Q{nextMatch.matchNumber}</span>
								<span class="ml-2 text-sm text-gray-400">
									{nextMatch.alliance === 'red'
										? '🔴 Red'
										: nextMatch.alliance === 'blue'
											? '🔵 Blue'
											: 'IDK'}
								</span>
							</div>
							<div class="text-right">
								{#if nextMatch.startTime}
									<div class="font-mono text-gray-300">{formatTime(nextMatch.startTime)}</div>
								{/if}
								<div class="font-mono text-gray-300 text-lg">{formatTime(nextMatch.autoStartTime)}</div>
								{#if nextMatch.queueTime}
									<div class="text-xs text-yellow-400">
										Queue: {formatTime(nextMatch.queueTime)}
									</div>
								{/if}
							</div>
						</div>
						<button
							onclick={() => openMatchDetails(nextMatch)}
							class="mt-2 w-full text-xs text-blue-400 underline hover:text-blue-300"
						>
							View full details →
						</button>
					</div>
				{/if}

				<!-- Match list -->
				{#if sortedMatches && sortedMatches.length > 0}
					<div>
						<h3 class="mb-2 text-xs tracking-wide text-gray-500 uppercase">
							{getUpcomingMatches(sortedMatches).length > 0 ? 'Upcoming Matches' : 'All Matches'}
						</h3>
						<div class="space-y-1">
							{#each sortedMatches.slice(0, 8) as match}
								<button
									onclick={() => openMatchDetails(match)}
									class="hover:bg-gray-750 group flex w-full cursor-pointer items-center justify-between rounded-lg bg-gray-800 px-3 py-2 text-sm transition"
								>
									<div class="flex items-center gap-2">
										<span class="text-md font-mono text-gray-300 group-hover:text-white"
											>Q{match.matchNumber}</span
										>
										{#if match.queueStatus === 'queued'}
											<span class="text-xs text-yellow-500">🔔</span>
										{/if}
									</div>
									<div class="flex items-center gap-3">
										<span class="text-md text-gray-400">
											{match.alliance === 'red' ? '🔴' : match.alliance === 'blue' ? '🔵' : '⚪'}
											{match.alliance.toUpperCase()}
										</span>
										{#if match.isPlayed}
											<span class="text-md font-mono text-gray-500">
												{match.score ?? '-'}-{match.opponentScore ?? '-'}
											</span>
										{/if}
                                        <span class="text-md rounded-md bg-blue-700 px-2 text-white">
                                            {formatTime(match.autoStartTime)}
                                        </span>
										{#if match.startTime}
											<span class="text-md rounded-md bg-blue-700 px-2 text-white">
												{formatTime(match.startTime)}
											</span>
										{/if}
									</div>
								</button>
							{/each}
							{#if sortedMatches.length > 8}
								<p class="pt-1 text-center text-xs text-gray-600">
									+{sortedMatches.length - 8} more matches
								</p>
							{/if}
						</div>
					</div>
				{:else if !isLoading && !error}
					<div class="py-2 text-sm text-gray-500">No data — press Refresh to load matches.</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
