import { writable } from 'svelte/store';

export const teams = writable<any[]>([]);
export const matches = writable<Record<string, any>>({});