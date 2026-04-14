import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

export interface Sporter {
  id: string;
  naam: string;
  niveau: string;
  favoriet: boolean;
  onderdelen: Record<string, string[]>;
  oefening: Record<string, string[]>; // ordered routine per toestel
}

export interface TurnOnderdeel {
  naam: string;
  niveau: TurnOnderdeelNiveau;
  elementgroep: 1 | 2 | 3 | 4;
}

export const TURN_ONDERDEEL_NIVEAUS = ["tA", "A", "B", "C", "D", "E"] as const;
export type TurnOnderdeelNiveau = (typeof TURN_ONDERDEEL_NIVEAUS)[number];

export const ELEMENTGROEPEN = [1, 2, 3, 4] as const;
export type Elementgroep = 1 | 2 | 3 | 4;
export const ELEMENTGROEP_ROMAN: Record<1 | 2 | 3 | 4, string> = {
  1: "I", 2: "II", 3: "III", 4: "IV",
};

const SPORTERS_KEY = "turnteam_sporters";

export const TOESTELLEN = [
  "Vloer",
  "Voltige",
  "Ringen",
  "Sprong",
  "Brug",
  "Rekstok",
] as const;

export type Toestel = (typeof TOESTELLEN)[number];

export const ONDERDELEN_PER_TOESTEL: Record<Toestel, TurnOnderdeel[]> = {
  Vloer: [
    { naam: "Koprol voorwaarts", niveau: "tA", elementgroep: 1 },
    { naam: "Koprol achterwaarts", niveau: "tA", elementgroep: 1 },
    { naam: "Handstand", niveau: "tA", elementgroep: 2 },
    { naam: "Rad", niveau: "A", elementgroep: 1 },
    { naam: "Radslag", niveau: "A", elementgroep: 1 },
    { naam: "Rondat", niveau: "A", elementgroep: 1 },
    { naam: "Overslag", niveau: "B", elementgroep: 2 },
    { naam: "Flikflak", niveau: "B", elementgroep: 1 },
    { naam: "Arabier", niveau: "C", elementgroep: 1 },
    { naam: "Salto voorwaarts", niveau: "C", elementgroep: 1 },
    { naam: "Salto achterwaarts", niveau: "D", elementgroep: 1 },
    { naam: "Schroef", niveau: "E", elementgroep: 1 },
  ],
  Voltige: [
    { naam: "Opsprong", niveau: "tA", elementgroep: 1 },
    { naam: "Afsprong", niveau: "tA", elementgroep: 4 },
    { naam: "Hurksprong", niveau: "A", elementgroep: 1 },
    { naam: "Streeksprong", niveau: "A", elementgroep: 1 },
    { naam: "Gratssprong", niveau: "B", elementgroep: 2 },
    { naam: "Handspring", niveau: "B", elementgroep: 1 },
    { naam: "Overslag", niveau: "C", elementgroep: 1 },
    { naam: "Yamashita", niveau: "C", elementgroep: 2 },
    { naam: "Tsukahara", niveau: "D", elementgroep: 3 },
    { naam: "Salto voorwaarts", niveau: "E", elementgroep: 4 },
  ],
  Ringen: [
    { naam: "Hang", niveau: "tA", elementgroep: 1 },
    { naam: "Steun", niveau: "tA", elementgroep: 2 },
    { naam: "Schommel", niveau: "A", elementgroep: 1 },
    { naam: "Hoek", niveau: "A", elementgroep: 2 },
    { naam: "Spierbal", niveau: "B", elementgroep: 2 },
    { naam: "Kipstand", niveau: "B", elementgroep: 3 },
    { naam: "Steunzwaaien", niveau: "C", elementgroep: 1 },
    { naam: "Kruis", niveau: "C", elementgroep: 2 },
    { naam: "Hefwenteling", niveau: "D", elementgroep: 3 },
    { naam: "Afzwaai", niveau: "E", elementgroep: 4 },
  ],
  Sprong: [
    { naam: "Hurksprong", niveau: "tA", elementgroep: 1 },
    { naam: "Streeksprong", niveau: "tA", elementgroep: 1 },
    { naam: "Gratssprong", niveau: "A", elementgroep: 2 },
    { naam: "Handspring", niveau: "A", elementgroep: 1 },
    { naam: "Overslag", niveau: "B", elementgroep: 1 },
    { naam: "Yamashita", niveau: "B", elementgroep: 2 },
    { naam: "Tsukahara", niveau: "C", elementgroep: 3 },
    { naam: "Salto voorwaarts", niveau: "C", elementgroep: 4 },
    { naam: "Schroefsprong", niveau: "D", elementgroep: 4 },
    { naam: "Rondat afsprong", niveau: "E", elementgroep: 4 },
  ],
  Brug: [
    { naam: "Steunzwaaien", niveau: "tA", elementgroep: 1 },
    { naam: "Wende", niveau: "tA", elementgroep: 2 },
    { naam: "Kehre", niveau: "A", elementgroep: 2 },
    { naam: "Draai", niveau: "A", elementgroep: 2 },
    { naam: "Kiep", niveau: "B", elementgroep: 3 },
    { naam: "Kip", niveau: "B", elementgroep: 3 },
    { naam: "Felg", niveau: "C", elementgroep: 3 },
    { naam: "Hefwenteling", niveau: "C", elementgroep: 3 },
    { naam: "Diamidov", niveau: "D", elementgroep: 2 },
    { naam: "Afzwaai", niveau: "E", elementgroep: 4 },
  ],
  Rekstok: [
    { naam: "Zweefhang", niveau: "tA", elementgroep: 1 },
    { naam: "Steunzwaaien", niveau: "tA", elementgroep: 1 },
    { naam: "Kiep", niveau: "A", elementgroep: 3 },
    { naam: "Felg", niveau: "A", elementgroep: 3 },
    { naam: "Reuzendraaien", niveau: "B", elementgroep: 1 },
    { naam: "Staldergrep", niveau: "C", elementgroep: 1 },
    { naam: "Adlerslag", niveau: "C", elementgroep: 1 },
    { naam: "Tkatchev", niveau: "D", elementgroep: 1 },
    { naam: "Afsprong salto", niveau: "D", elementgroep: 4 },
    { naam: "Afsprong schroef", niveau: "E", elementgroep: 4 },
  ],
};

export const NIVEAU_MINIMUM: Record<string, number> = {
  "Instap": 2,
  "Pupil 1": 3,
  "Pupil 2": 4,
  "Jeugd 1": 5,
  "Jeugd 2": 6,
  "Junior": 7,
  "Senior": 8,
  "Selectie": 10,
};

export function getMinimumForNiveau(niveau: string, toestel: Toestel): number {
  const totalOnderdelen = ONDERDELEN_PER_TOESTEL[toestel].length;
  const niveauMin = NIVEAU_MINIMUM[niveau] || 2;
  return Math.min(niveauMin, totalOnderdelen);
}

const ONDERDELEN_KEY = "turnteam_onderdelen";

const NIVEAU_ORDER: Record<string, number> = {
  tA: 0, A: 1, B: 2, C: 3, D: 4, E: 5,
};

function sortOnderdelen(onderdelen: TurnOnderdeel[]): TurnOnderdeel[] {
  return [...onderdelen].sort((a, b) => {
    const diff = (NIVEAU_ORDER[a.niveau] ?? 99) - (NIVEAU_ORDER[b.niveau] ?? 99);
    if (diff !== 0) return diff;
    return a.naam.localeCompare(b.naam);
  });
}

export async function getOnderdelen(toestel: Toestel): Promise<TurnOnderdeel[]> {
  const data = await AsyncStorage.getItem(ONDERDELEN_KEY);
  const parsed: Record<string, TurnOnderdeel[]> = data ? JSON.parse(data) : {};
  if (!parsed[toestel]) {
    parsed[toestel] = [...ONDERDELEN_PER_TOESTEL[toestel]];
    await AsyncStorage.setItem(ONDERDELEN_KEY, JSON.stringify(parsed));
  } else {
    // Migrate: ensure every stored onderdeel has an elementgroep
    let dirty = false;
    parsed[toestel] = parsed[toestel].map((o) => {
      if (o.elementgroep == null) {
        dirty = true;
        const defaultEntry = ONDERDELEN_PER_TOESTEL[toestel].find((d) => d.naam === o.naam);
        return { ...o, elementgroep: defaultEntry?.elementgroep ?? 1 };
      }
      return o;
    });
    if (dirty) await AsyncStorage.setItem(ONDERDELEN_KEY, JSON.stringify(parsed));
  }
  return sortOnderdelen(parsed[toestel]);
}

export async function addOnderdeel(
  toestel: Toestel,
  onderdeel: TurnOnderdeel
): Promise<void> {
  const data = await AsyncStorage.getItem(ONDERDELEN_KEY);
  const parsed: Record<string, TurnOnderdeel[]> = data ? JSON.parse(data) : {};
  const existing = parsed[toestel] ?? [...ONDERDELEN_PER_TOESTEL[toestel]];
  if (!existing.some((o) => o.naam === onderdeel.naam)) {
    parsed[toestel] = [...existing, onderdeel];
    await AsyncStorage.setItem(ONDERDELEN_KEY, JSON.stringify(parsed));
  }
}

export async function deleteOnderdeel(
  toestel: Toestel,
  naam: string
): Promise<void> {
  const data = await AsyncStorage.getItem(ONDERDELEN_KEY);
  if (!data) return;
  const parsed: Record<string, TurnOnderdeel[]> = JSON.parse(data);
  parsed[toestel] = (parsed[toestel] ?? []).filter((o) => o.naam !== naam);
  await AsyncStorage.setItem(ONDERDELEN_KEY, JSON.stringify(parsed));
}

export async function getSporters(): Promise<Sporter[]> {
  const data = await AsyncStorage.getItem(SPORTERS_KEY);
  if (!data) return [];
  const parsed = JSON.parse(data);
  return parsed.map(migrateSporter);
}

function migrateSporter(s: any): Sporter {
  const emptyToestellen = () => {
    const r: Record<string, string[]> = {};
    for (const t of TOESTELLEN) r[t] = [];
    return r;
  };
  if (Array.isArray(s.onderdelen)) {
    return { ...s, onderdelen: emptyToestellen(), oefening: emptyToestellen() };
  }
  if (!s.onderdelen || typeof s.onderdelen !== "object") {
    return { ...s, onderdelen: emptyToestellen(), oefening: emptyToestellen() };
  }
  if (!s.oefening || typeof s.oefening !== "object") {
    return { ...s, oefening: emptyToestellen() };
  }
  return s;
}

export async function saveSporters(sporters: Sporter[]): Promise<void> {
  await AsyncStorage.setItem(SPORTERS_KEY, JSON.stringify(sporters));
}

export async function addSporter(naam: string, niveau: string): Promise<Sporter> {
  const sporters = await getSporters();
  const onderdelen: Record<string, string[]> = {};
  const oefening: Record<string, string[]> = {};
  for (const t of TOESTELLEN) {
    onderdelen[t] = [];
    oefening[t] = [];
  }
  const newSporter: Sporter = {
    id: Crypto.randomUUID(),
    naam,
    niveau,
    favoriet: false,
    onderdelen,
    oefening,
  };
  sporters.push(newSporter);
  await saveSporters(sporters);
  return newSporter;
}

export async function toggleFavoriet(id: string): Promise<Sporter[]> {
  const sporters = await getSporters();
  const index = sporters.findIndex((s) => s.id === id);
  if (index !== -1) {
    sporters[index].favoriet = !sporters[index].favoriet;
    await saveSporters(sporters);
  }
  return sporters;
}

export async function getSporter(id: string): Promise<Sporter | undefined> {
  const sporters = await getSporters();
  return sporters.find((s) => s.id === id);
}

export async function updateSporterOnderdelen(
  id: string,
  toestel: Toestel,
  onderdelen: string[]
): Promise<void> {
  const sporters = await getSporters();
  const index = sporters.findIndex((s) => s.id === id);
  if (index !== -1) {
    sporters[index].onderdelen[toestel] = onderdelen;
    await saveSporters(sporters);
  }
}

export async function updateSporterOefening(
  id: string,
  toestel: Toestel,
  oefening: string[]
): Promise<void> {
  const sporters = await getSporters();
  const index = sporters.findIndex((s) => s.id === id);
  if (index !== -1) {
    if (!sporters[index].oefening) sporters[index].oefening = {};
    sporters[index].oefening[toestel] = oefening;
    await saveSporters(sporters);
  }
}

export async function updateSporterNiveau(id: string, niveau: string): Promise<Sporter | undefined> {
  const sporters = await getSporters();
  const index = sporters.findIndex((s) => s.id === id);
  if (index !== -1) {
    sporters[index].niveau = niveau;
    await saveSporters(sporters);
    return sporters[index];
  }
  return undefined;
}

export async function deleteSporter(id: string): Promise<void> {
  const sporters = await getSporters();
  const filtered = sporters.filter((s) => s.id !== id);
  await saveSporters(filtered);
}

export interface ToestelScore {
  dScore: number;
  eScore: number;
  penalty: number;
  dScoreNote?: string;
  eScoreNote?: string;
  penaltyNote?: string;
}

export interface Wedstrijd {
  id: string;
  sporterId: string;
  naam: string;
  datum: string;
  locatie: string;
  scores: Record<string, ToestelScore>;
  expectedDWaarde?: Record<string, number | null>;
}

const WEDSTRIJDEN_KEY = "turnteam_wedstrijden";
const WEDSTRIJDEN_MIGRATED_KEY = "turnteam_wedstrijden_dedupe_v1_done";

export const DUPLICATE_WEDSTRIJD_ERROR = "DUPLICATE_WEDSTRIJD_ERROR";

function normalizeEuropeanDate(value: string): string {
  const match = value.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return value.trim();
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];
  return `${day}-${month}-${year}`;
}

function wedstrijdIdentityKey(w: Wedstrijd): string {
  return `${w.sporterId}__${w.naam}__${normalizeEuropeanDate(w.datum)}__${w.locatie}`;
}

function dedupeWedstrijdenById(all: Wedstrijd[]): Wedstrijd[] {
  const byId = new Map<string, Wedstrijd>();
  for (const wedstrijd of all) {
    // Keep the latest occurrence when duplicates exist.
    byId.set(wedstrijd.id, wedstrijd);
  }
  return Array.from(byId.values());
}

function mergeScores(
  base: Record<string, ToestelScore>,
  incoming: Record<string, ToestelScore>
): Record<string, ToestelScore> {
  const merged: Record<string, ToestelScore> = { ...base };
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

async function getNormalizedWedstrijden(): Promise<Wedstrijd[]> {
  const data = await AsyncStorage.getItem(WEDSTRIJDEN_KEY);
  if (!data) return [];
  const parsed = JSON.parse(data) as Wedstrijd[];
  const migrated = await AsyncStorage.getItem(WEDSTRIJDEN_MIGRATED_KEY);
  if (migrated === "1") return dedupeWedstrijdenById(parsed);

  const normalized = dedupeAndMergeWedstrijden(parsed);
  await AsyncStorage.setItem(WEDSTRIJDEN_KEY, JSON.stringify(normalized));
  await AsyncStorage.setItem(WEDSTRIJDEN_MIGRATED_KEY, "1");
  return normalized;
}

export async function getLastWedstrijdFromOtherSporters(
  sporterId: string
): Promise<Wedstrijd | undefined> {
  const all = await getNormalizedWedstrijden();
  // Traverse in reverse (newest push = last in array) to find most recent from another sporter
  for (let i = all.length - 1; i >= 0; i--) {
    if (all[i].sporterId !== sporterId) return all[i];
  }
  return undefined;
}

export async function getWedstrijden(sporterId: string): Promise<Wedstrijd[]> {
  const all = await getNormalizedWedstrijden();
  const toTimestamp = (datum: string): number => {
    const parts = datum.split("-");
    if (parts.length !== 3) return 0;
    const [day, month, year] = parts.map(Number);
    return new Date(year, month - 1, day).getTime();
  };
  return all
    .filter((w) => w.sporterId === sporterId)
    .sort((a, b) => toTimestamp(b.datum) - toTimestamp(a.datum));
}

export async function getWedstrijd(id: string): Promise<Wedstrijd | undefined> {
  const all = await getNormalizedWedstrijden();
  return all.find((w) => w.id === id);
}

export async function addWedstrijd(
  sporterId: string,
  naam: string,
  datum: string,
  locatie: string,
  expectedDWaarde?: Record<string, number | null>
): Promise<Wedstrijd> {
  const all = await getNormalizedWedstrijden();
  const normalizedDatum = normalizeEuropeanDate(datum);
  const existingIndex = all.findIndex(
    (w) =>
      w.sporterId === sporterId &&
      w.naam === naam &&
      normalizeEuropeanDate(w.datum) === normalizedDatum &&
      w.locatie === locatie
  );
  if (existingIndex !== -1) {
    throw new Error(DUPLICATE_WEDSTRIJD_ERROR);
  }
  const newWedstrijd: Wedstrijd = {
    id: Crypto.randomUUID(),
    sporterId,
    naam,
    datum: normalizedDatum,
    locatie,
    scores: {},
    expectedDWaarde: expectedDWaarde ?? {},
  };
  all.push(newWedstrijd);
  await AsyncStorage.setItem(WEDSTRIJDEN_KEY, JSON.stringify(dedupeWedstrijdenById(all)));
  return newWedstrijd;
}

export async function saveWedstrijdScores(
  id: string,
  scores: Record<string, ToestelScore>
): Promise<void> {
  const all = await getNormalizedWedstrijden();
  const index = all.findIndex((w) => w.id === id);
  if (index !== -1) {
    const mergedScores: Record<string, ToestelScore> = {};
    for (const toestel of Object.keys(scores)) {
      const incoming = scores[toestel];
      const existing = all[index].scores[toestel];
      mergedScores[toestel] = {
        dScore: incoming.dScore,
        eScore: incoming.eScore,
        penalty: incoming.penalty,
        dScoreNote: existing?.dScoreNote,
        eScoreNote: existing?.eScoreNote,
        penaltyNote: existing?.penaltyNote,
      };
    }
    all[index].scores = mergedScores;
    await AsyncStorage.setItem(WEDSTRIJDEN_KEY, JSON.stringify(dedupeWedstrijdenById(all)));
  }
}

export async function saveToestelNotes(
  wedstrijdId: string,
  toestel: string,
  dScoreNote: string,
  eScoreNote: string,
  penaltyNote: string
): Promise<void> {
  const all = await getNormalizedWedstrijden();
  const index = all.findIndex((w) => w.id === wedstrijdId);
  if (index !== -1) {
    const existing = all[index].scores[toestel] ?? { dScore: 0, eScore: 0, penalty: 0 };
    all[index].scores[toestel] = { ...existing, dScoreNote, eScoreNote, penaltyNote };
    await AsyncStorage.setItem(WEDSTRIJDEN_KEY, JSON.stringify(dedupeWedstrijdenById(all)));
  }
}

export async function saveExpectedDWaarde(
  wedstrijdId: string,
  toestel: string,
  value: number | null
): Promise<void> {
  const all = await getNormalizedWedstrijden();
  const index = all.findIndex((w) => w.id === wedstrijdId);
  if (index !== -1) {
    if (!all[index].expectedDWaarde) all[index].expectedDWaarde = {};
    all[index].expectedDWaarde![toestel] = value;
    await AsyncStorage.setItem(WEDSTRIJDEN_KEY, JSON.stringify(dedupeWedstrijdenById(all)));
  }
}

export async function saveWedstrijdNaam(
  wedstrijdId: string,
  naam: string
): Promise<void> {
  const all = await getNormalizedWedstrijden();
  const index = all.findIndex((w) => w.id === wedstrijdId);
  if (index !== -1) {
    all[index].naam = naam;
    await AsyncStorage.setItem(WEDSTRIJDEN_KEY, JSON.stringify(dedupeWedstrijdenById(all)));
  }
}

export async function saveWedstrijdInfo(
  wedstrijdId: string,
  naam: string,
  datum: string,
  locatie: string
): Promise<void> {
  const all = await getNormalizedWedstrijden();
  const index = all.findIndex((w) => w.id === wedstrijdId);
  if (index !== -1) {
    all[index].naam = naam;
    all[index].datum = normalizeEuropeanDate(datum);
    all[index].locatie = locatie;
    await AsyncStorage.setItem(WEDSTRIJDEN_KEY, JSON.stringify(dedupeWedstrijdenById(all)));
  }
}

export async function deleteWedstrijd(id: string): Promise<void> {
  const all = await getNormalizedWedstrijden();
  await AsyncStorage.setItem(
    WEDSTRIJDEN_KEY,
    JSON.stringify(dedupeWedstrijdenById(all.filter((w) => w.id !== id)))
  );
}

export const DWAARDE_PER_NIVEAU: Record<TurnOnderdeelNiveau, number> = {
  tA: 0.1,
  A: 0.1,
  B: 0.2,
  C: 0.3,
  D: 0.4,
  E: 0.5,
};

export function calculateDWaarde(
  selectedNamen: string[],
  allOnderdelen: TurnOnderdeel[]
): number {
  const oefeningItems = selectedNamen
    .map((naam) => allOnderdelen.find((o) => o.naam === naam))
    .filter((o): o is TurnOnderdeel => o !== undefined);

  const niveauScore = oefeningItems.reduce(
    (sum, o) => sum + (DWAARDE_PER_NIVEAU[o.niveau] ?? 0),
    0
  );

  const presentGroepen = new Set(oefeningItems.map((o) => o.elementgroep ?? 1));
  const elementgroepBonus = presentGroepen.size * 0.5;

  return niveauScore + elementgroepBonus;
}

export const NIVEAUS = [
  "Instap",
  "Pupil 1",
  "Pupil 2",
  "Jeugd 1",
  "Jeugd 2",
  "Junior",
  "Senior",
];

