import type { Sporter, ToestelScore, Wedstrijd } from "./turnteam-domain";
import { normalizeEuropeanDate } from "./turnteam-dates";

export { normalizeEuropeanDate } from "./turnteam-dates";

function wedstrijdIdentityKey(w: Wedstrijd): string {
  const targets =
    w.targetNiveaus && w.targetNiveaus.length > 0
      ? normalizeTargetNiveaus(w.targetNiveaus).join("|")
      : "";
  return `${w.sporterId}__${targets}__${w.naam}__${normalizeEuropeanDate(w.datum)}__${w.locatie}`;
}

export function normalizeTargetNiveaus(values: string[] | undefined): string[] {
  if (!values || values.length === 0) return [];
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function mergeScores(
  base: Record<string, ToestelScore>,
  incoming: Record<string, ToestelScore>,
): Record<string, ToestelScore> {
  const merged = { ...base };
  for (const toestel of Object.keys(incoming)) {
    const existing = merged[toestel];
    const next = incoming[toestel];
    merged[toestel] = {
      dScore: next.dScore,
      eScore: next.eScore,
      penalty: next.penalty,
      dScoreNote:
        next.dScoreNote && next.dScoreNote.trim() !== ""
          ? next.dScoreNote
          : existing?.dScoreNote,
      eScoreNote:
        next.eScoreNote && next.eScoreNote.trim() !== ""
          ? next.eScoreNote
          : existing?.eScoreNote,
      penaltyNote:
        next.penaltyNote && next.penaltyNote.trim() !== ""
          ? next.penaltyNote
          : existing?.penaltyNote,
    };
  }
  return merged;
}

function mergeWedstrijd(base: Wedstrijd, incoming: Wedstrijd): Wedstrijd {
  const mergedExpected: Record<string, number | null> = {
    ...(base.expectedDWaarde ?? {}),
  };
  for (const [toestel, value] of Object.entries(incoming.expectedDWaarde ?? {})) {
    if (value !== null && value !== undefined) {
      mergedExpected[toestel] = value;
    } else if (!(toestel in mergedExpected)) {
      mergedExpected[toestel] = value;
    }
  }
  return {
    ...base,
    ...incoming,
    id: base.id,
    scores: mergeScores(base.scores ?? {}, incoming.scores ?? {}),
    expectedDWaarde: mergedExpected,
  };
}

export function dedupeWedstrijdenById(all: Wedstrijd[]): Wedstrijd[] {
  const byId = new Map<string, Wedstrijd>();
  for (const wedstrijd of all) {
    byId.set(wedstrijd.id, wedstrijd);
  }
  return Array.from(byId.values());
}

function dedupeAndMergeWedstrijden(all: Wedstrijd[]): Wedstrijd[] {
  const byIdentity = new Map<string, Wedstrijd>();
  for (const wedstrijd of all) {
    const key = wedstrijdIdentityKey(wedstrijd);
    const existing = byIdentity.get(key);
    if (!existing) {
      byIdentity.set(key, wedstrijd);
    } else {
      byIdentity.set(key, mergeWedstrijd(existing, wedstrijd));
    }
  }
  return dedupeWedstrijdenById(Array.from(byIdentity.values()));
}

export function expandNiveauWedstrijdenToPerSporter(
  all: Wedstrijd[],
  sporters: Sporter[],
  newId: () => string,
): Wedstrijd[] {
  const expanded: Wedstrijd[] = [];
  let changed = false;

  for (const wedstrijd of all) {
    const targets = normalizeTargetNiveaus(wedstrijd.targetNiveaus);
    if (targets.length === 0) {
      expanded.push(wedstrijd);
      continue;
    }
    changed = true;
    const targetSporters = sporters
      .filter((s) => targets.includes(s.niveau))
      .sort((a, b) => a.naam.localeCompare(b.naam));
    if (targetSporters.length === 0) {
      expanded.push({ ...wedstrijd, targetNiveaus: [] });
      continue;
    }

    const sharedId = wedstrijd.sharedMatchId ?? wedstrijd.id;
    const preferredAnchor =
      targetSporters.find((s) => s.id === wedstrijd.sporterId) ?? targetSporters[0];

    for (const s of targetSporters) {
      if (s.id === preferredAnchor.id) {
        expanded.push({
          ...wedstrijd,
          sporterId: s.id,
          sharedMatchId: sharedId,
          targetNiveaus: [],
        });
      } else {
        expanded.push({
          ...wedstrijd,
          id: newId(),
          sporterId: s.id,
          sharedMatchId: sharedId,
          targetNiveaus: [],
          scores: {},
          expectedDWaarde: {},
        });
      }
    }
  }

  return changed ? expanded : all;
}

export type NormalizeWedstrijdenResult = {
  rows: Wedstrijd[];
  persistedJson: string;
  /** When true, replace persisted wedstrijden with persistedJson and set migrated meta to "1". */
  shouldRewriteStorage: boolean;
};

export function normalizeStoredWedstrijden(
  rawParsed: Wedstrijd[],
  sporters: Sporter[],
  wedstrijdenMigrated: boolean,
  newId: () => string,
): NormalizeWedstrijdenResult {
  const parsed = rawParsed.map((w) => ({
    ...w,
    targetNiveaus: normalizeTargetNiveaus(w.targetNiveaus),
  }));
  const expanded = expandNiveauWedstrijdenToPerSporter(parsed, sporters, newId);

  if (wedstrijdenMigrated) {
    const normalized = dedupeWedstrijdenById(expanded);
    const persistedJson = JSON.stringify(normalized);
    const shouldRewriteStorage =
      persistedJson !== JSON.stringify(parsed);
    return {
      rows: normalized,
      persistedJson,
      shouldRewriteStorage,
    };
  }

  const normalized = dedupeAndMergeWedstrijden(expanded);
  return {
    rows: normalized,
    persistedJson: JSON.stringify(normalized),
    shouldRewriteStorage: true,
  };
}
