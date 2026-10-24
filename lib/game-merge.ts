import type { ConnectionsState, CrosswordState, GameState } from '@/types/game';

/**
 * Merge two snapshots of the same game by game rules, so replaying an old snapshot can never
 * undo progress made later (offline-sync audit risk 4). Device clocks are only a tie-break.
 */
function isConnections(s: unknown): s is ConnectionsState {
    return !!s && Array.isArray((s as ConnectionsState).completedGroups);
}
function isCrossword(s: unknown): s is CrosswordState {
    return !!s && typeof (s as CrosswordState).userAnswers === 'object' && (s as CrosswordState).userAnswers !== null;
}

function minDefined(a?: number | null, b?: number | null): number | undefined {
    const xs = [a, b].filter((x): x is number => typeof x === 'number');
    return xs.length ? Math.min(...xs) : undefined;
}

export function mergeConnections(a: ConnectionsState, b: ConnectionsState): ConnectionsState {
    const completedGroups = [...new Set([...a.completedGroups, ...b.completedGroups])];
    const seen = new Set<string>();
    const history: string[][] = [];
    for (const guess of [...a.history, ...b.history]) {
        const key = [...guess].sort().join('|');
        if (!seen.has(key)) {
            seen.add(key);
            history.push(guess);
        }
    }
    const mistakesRemaining = Math.min(a.mistakesRemaining, b.mistakesRemaining);
    // A finished game stays finished. A win (all four groups) beats a loss.
    let status: ConnectionsState['status'] = 'playing';
    if (completedGroups.length >= 4 && (a.status === 'won' || b.status === 'won')) status = 'won';
    else if (a.status === 'lost' || b.status === 'lost' || mistakesRemaining <= 0) status = 'lost';
    else if (a.status === 'won' || b.status === 'won') status = 'won';
    const finished = [a, b].filter(s => s.status === status && s.endTime != null);
    const endTime = status === 'playing' ? null : minDefined(...finished.map(s => s.endTime)) ?? a.endTime ?? b.endTime ?? null;
    return {
        ...a,
        completedGroups,
        history,
        mistakesRemaining,
        status,
        startTime: minDefined(a.startTime, b.startTime) ?? a.startTime,
        endTime,
    };
}

/** `newer` is the snapshot with the later lastUpdated; its letters win per cell. */
export function mergeCrossword(older: CrosswordState, newer: CrosswordState): CrosswordState {
    const done = [older, newer].find(s => s.completed);
    if (done) return { ...done, startTime: minDefined(older.startTime, newer.startTime) };
    return {
        ...newer,
        userAnswers: { ...older.userAnswers, ...newer.userAnswers },
        startTime: minDefined(older.startTime, newer.startTime),
        accumulatedPause: Math.max(older.accumulatedPause ?? 0, newer.accumulatedPause ?? 0) || undefined,
    };
}

/** Merge local and server copies of one game. Returns a new GameState based on `local`. */
export function mergeGameStates(local: GameState, server: GameState): GameState {
    const localTs = Date.parse(local.lastUpdated) || 0;
    const serverTs = Date.parse(server.lastUpdated) || 0;
    const [older, newer] = localTs >= serverTs ? [server, local] : [local, server];
    let state: GameState['state'];
    if (isConnections(local.state) && isConnections(server.state)) {
        state = mergeConnections(local.state, server.state);
    } else if (isCrossword(local.state) && isCrossword(server.state)) {
        state = mergeCrossword(older.state as CrosswordState, newer.state as CrosswordState);
    } else {
        state = newer.state;
    }
    return {
        ...local,
        state,
        version: Math.max(local.version ?? 0, server.version ?? 0),
        lastUpdated: new Date(Math.max(localTs, serverTs) || Date.now()).toISOString(),
    };
}
