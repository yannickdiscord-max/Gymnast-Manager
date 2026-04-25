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
  const gesprekken = await getAllOuderGesprekken();
  await saveAllOuderGesprekken(gesprekken.filter((g) => g.sporterId !== id));
  await deleteBlessuresForSporter(id);
}

export interface SporterBlessures {
  current: string[];
  previous: string[];
}

const BLESSURES_KEY = "turnteam_blessures_v1";

function normalizeBlessureNaam(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeBlessureList(values: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const normalized = normalizeBlessureNaam(raw);
    const key = normalized.toLocaleLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

async function getBlessuresStoreRaw(): Promise<Record<string, SporterBlessures>> {
  const data = await AsyncStorage.getItem(BLESSURES_KEY);
  if (!data) return {};
  const parsed = JSON.parse(data) as Record<string, SporterBlessures>;
  if (!parsed || typeof parsed !== "object") return {};
  return parsed;
}

async function saveBlessuresStoreRaw(store: Record<string, SporterBlessures>): Promise<void> {
  await AsyncStorage.setItem(BLESSURES_KEY, JSON.stringify(store));
}

export async function getBlessuresForSporter(sporterId: string): Promise<SporterBlessures> {
  const store = await getBlessuresStoreRaw();
  const existing = store[sporterId];
  if (!existing) return { current: [], previous: [] };
  return {
    current: normalizeBlessureList(existing.current ?? []),
    previous: normalizeBlessureList(existing.previous ?? []),
  };
}

export async function addCurrentBlessure(sporterId: string, blessureNaam: string): Promise<SporterBlessures> {
  const normalized = normalizeBlessureNaam(blessureNaam);
  if (!normalized) {
    return getBlessuresForSporter(sporterId);
  }
  const store = await getBlessuresStoreRaw();
  const existing = await getBlessuresForSporter(sporterId);
  const lower = normalized.toLocaleLowerCase();
  const nextCurrent = normalizeBlessureList([...existing.current, normalized]);
  const nextPrevious = existing.previous.filter((item) => item.toLocaleLowerCase() !== lower);
  store[sporterId] = { current: nextCurrent, previous: nextPrevious };
  await saveBlessuresStoreRaw(store);
  return store[sporterId];
}

export async function removeCurrentBlessure(sporterId: string, blessureNaam: string): Promise<SporterBlessures> {
  const key = normalizeBlessureNaam(blessureNaam).toLocaleLowerCase();
  const store = await getBlessuresStoreRaw();
  const existing = await getBlessuresForSporter(sporterId);
  store[sporterId] = {
    current: existing.current.filter((item) => item.toLocaleLowerCase() !== key),
    previous: existing.previous,
  };
  await saveBlessuresStoreRaw(store);
  return store[sporterId];
}

export async function moveCurrentBlessureToPrevious(
  sporterId: string,
  blessureNaam: string
): Promise<SporterBlessures> {
  const normalized = normalizeBlessureNaam(blessureNaam);
  const key = normalized.toLocaleLowerCase();
  if (!normalized) {
    return getBlessuresForSporter(sporterId);
  }
  const store = await getBlessuresStoreRaw();
  const existing = await getBlessuresForSporter(sporterId);
  const currentWithoutItem = existing.current.filter((item) => item.toLocaleLowerCase() !== key);
  const alreadyInPrevious = existing.previous.some((item) => item.toLocaleLowerCase() === key);
  store[sporterId] = {
    current: currentWithoutItem,
    previous: alreadyInPrevious ? existing.previous : [normalized, ...existing.previous],
  };
  await saveBlessuresStoreRaw(store);
  return store[sporterId];
}

export async function removePreviousBlessure(
  sporterId: string,
  blessureNaam: string
): Promise<SporterBlessures> {
  const key = normalizeBlessureNaam(blessureNaam).toLocaleLowerCase();
  const store = await getBlessuresStoreRaw();
  const existing = await getBlessuresForSporter(sporterId);
  store[sporterId] = {
    current: existing.current,
    previous: existing.previous.filter((item) => item.toLocaleLowerCase() !== key),
  };
  await saveBlessuresStoreRaw(store);
  return store[sporterId];
}

async function deleteBlessuresForSporter(sporterId: string): Promise<void> {
  const store = await getBlessuresStoreRaw();
  if (!(sporterId in store)) return;
  delete store[sporterId];
  await saveBlessuresStoreRaw(store);
}

/** Eén training per kalenderdag (datum DD-MM-JJJJ); wie er aanwezig was. */
export interface TrainingSession {
  id: string;
  datum: string;
  attendeeSporterIds: string[];
}

const TRAINING_SESSIONS_KEY = "turnteam_training_sessions_v1";

export const DUPLICATE_TRAINING_SESSION_ERROR = "DUPLICATE_TRAINING_SESSION_ERROR";
export const INVALID_TRAINING_SESSION_DATUM = "INVALID_TRAINING_SESSION_DATUM";

function isValidEuropeanDateString(val: string): boolean {
  const match = val.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return false;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function normalizeTrainingSessionDatum(value: string): string {
  const match = value.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return value.trim();
  return `${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}-${match[3]}`;
}

function trainingSessionDatumToTime(datum: string): number {
  const [dd, mm, yyyy] = datum.split("-").map(Number);
  return new Date(yyyy, mm - 1, dd).getTime();
}

async function getTrainingSessionsRaw(): Promise<TrainingSession[]> {
  const data = await AsyncStorage.getItem(TRAINING_SESSIONS_KEY);
  if (!data) return [];
  const parsed = JSON.parse(data) as TrainingSession[];
  return Array.isArray(parsed) ? parsed : [];
}

async function saveTrainingSessionsRaw(sessions: TrainingSession[]): Promise<void> {
  await AsyncStorage.setItem(TRAINING_SESSIONS_KEY, JSON.stringify(sessions));
}

export async function getTrainingSessions(): Promise<TrainingSession[]> {
  return getTrainingSessionsRaw();
}

export async function getTrainingSessionForDatum(
  datumInput: string
): Promise<TrainingSession | undefined> {
  if (!isValidEuropeanDateString(datumInput)) return undefined;
  const norm = normalizeTrainingSessionDatum(datumInput);
  const all = await getTrainingSessionsRaw();
  return all.find((s) => s.datum === norm);
}

export async function addTrainingSession(
  datumInput: string,
  attendeeSporterIds: string[]
): Promise<TrainingSession> {
  const trimmed = datumInput.trim();
  if (!isValidEuropeanDateString(trimmed)) {
    throw new Error(INVALID_TRAINING_SESSION_DATUM);
  }
  const datum = normalizeTrainingSessionDatum(trimmed);
  const all = await getTrainingSessionsRaw();
  if (all.some((s) => s.datum === datum)) {
    throw new Error(DUPLICATE_TRAINING_SESSION_ERROR);
  }
  const uniqueIds = [...new Set(attendeeSporterIds.filter(Boolean))];
  const session: TrainingSession = {
    id: Crypto.randomUUID(),
    datum,
    attendeeSporterIds: uniqueIds,
  };
  all.push(session);
  await saveTrainingSessionsRaw(all);
  return session;
}

const RECENT_TRAINING_SESSIONS_SHOWN = 16;

export async function getSporterAttendanceSummary(sporterId: string): Promise<{
  totalSessions: number;
  attendedSessions: number;
  percentage: number | null;
  recentMarks: { attended: boolean }[];
}> {
  const all = await getTrainingSessionsRaw();
  const sorted = [...all].sort(
    (a, b) => trainingSessionDatumToTime(a.datum) - trainingSessionDatumToTime(b.datum)
  );
  const totalSessions = sorted.length;
  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      attendedSessions: 0,
      percentage: null,
      recentMarks: [],
    };
  }
  const attendedSessions = sorted.filter((s) =>
    s.attendeeSporterIds.includes(sporterId)
  ).length;
  const percentage = Math.round((attendedSessions / totalSessions) * 100);
  const recentSlice = sorted.slice(-RECENT_TRAINING_SESSIONS_SHOWN);
  const recentMarks = recentSlice.map((s) => ({
    attended: s.attendeeSporterIds.includes(sporterId),
  }));
  return { totalSessions, attendedSessions, percentage, recentMarks };
}

/** Gesprek met ouders: POP of gewoon gesprek, met datum en notities. */
export type OuderGesprekType = "pop" | "normaal";

export interface OuderGesprek {
  id: string;
  sporterId: string;
  datum: string;
  type: OuderGesprekType;
  notities: string;
}

const OUDER_GESPREKKEN_KEY = "turnteam_ouder_gesprekken_v1";

export const INVALID_OUDER_GESPREK_DATUM = "INVALID_OUDER_GESPREK_DATUM";

async function getAllOuderGesprekken(): Promise<OuderGesprek[]> {
  const data = await AsyncStorage.getItem(OUDER_GESPREKKEN_KEY);
  if (!data) return [];
  const parsed = JSON.parse(data) as OuderGesprek[];
  return Array.isArray(parsed) ? parsed : [];
}

async function saveAllOuderGesprekken(items: OuderGesprek[]): Promise<void> {
  await AsyncStorage.setItem(OUDER_GESPREKKEN_KEY, JSON.stringify(items));
}

function normalizeOuderGesprekDatum(value: string): string {
  const match = value.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return value.trim();
  return `${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}-${match[3]}`;
}

function calendarDaysBetweenLocalDates(earlier: Date, later: Date): number {
  const u1 = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  const u2 = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
  return Math.floor((u2 - u1) / 86400000);
}

function europeanDatumStringToLocalDate(datum: string): Date {
  const [dd, mm, yyyy] = datum.split("-").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

export async function getOuderGesprekkenForSporter(sporterId: string): Promise<OuderGesprek[]> {
  const all = await getAllOuderGesprekken();
  return all
    .filter((g) => g.sporterId === sporterId)
    .sort(
      (a, b) =>
        trainingSessionDatumToTime(b.datum) - trainingSessionDatumToTime(a.datum)
    );
}

/** POP telt pas mee nadat de planningsdag voorbij is (niet vandaag of in de toekomst). */
function isOuderGesprekDatumBeforeToday(datum: string, todayStartMs: number): boolean {
  const ts = trainingSessionDatumToTime(datum);
  return ts < todayStartMs;
}

export async function getLastPopGesprekLabel(sporterId: string): Promise<string> {
  const list = await getOuderGesprekkenForSporter(sporterId);
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const pastPops = list.filter(
    (g) => g.type === "pop" && isOuderGesprekDatumBeforeToday(g.datum, todayStart)
  );
  if (pastPops.length === 0) {
    return "Nog geen POP-gesprek geregistreerd";
  }
  const last = pastPops.reduce((a, b) =>
    trainingSessionDatumToTime(b.datum) > trainingSessionDatumToTime(a.datum) ? b : a
  );
  const lastDay = europeanDatumStringToLocalDate(last.datum);
  const today = new Date();
  const daysAgo = Math.max(0, calendarDaysBetweenLocalDates(lastDay, today));
  if (daysAgo <= 0) {
    return "Laatste POP-gesprek: vandaag";
  }
  if (daysAgo === 1) {
    return "Laatste POP-gesprek: gisteren";
  }
  return `Laatste POP-gesprek: ${daysAgo} dagen geleden`;
}

export async function addOuderGesprek(
  sporterId: string,
  datumInput: string,
  type: OuderGesprekType,
  notities: string
): Promise<OuderGesprek> {
  const trimmed = datumInput.trim();
  if (!isValidEuropeanDateString(trimmed)) {
    throw new Error(INVALID_OUDER_GESPREK_DATUM);
  }
  const datum = normalizeOuderGesprekDatum(trimmed);
  const gesprek: OuderGesprek = {
    id: Crypto.randomUUID(),
    sporterId,
    datum,
    type,
    notities: notities.trim(),
  };
  const all = await getAllOuderGesprekken();
  all.push(gesprek);
  await saveAllOuderGesprekken(all);
  return gesprek;
}

export async function updateOuderGesprek(
  id: string,
  updates: { datum?: string; type?: OuderGesprekType; notities?: string }
): Promise<OuderGesprek | undefined> {
  const all = await getAllOuderGesprekken();
  const index = all.findIndex((g) => g.id === id);
  if (index === -1) return undefined;
  const cur = all[index];
  let datum = cur.datum;
  if (updates.datum !== undefined) {
    const t = updates.datum.trim();
    if (!isValidEuropeanDateString(t)) {
      throw new Error(INVALID_OUDER_GESPREK_DATUM);
    }
    datum = normalizeOuderGesprekDatum(t);
  }
  const next: OuderGesprek = {
    ...cur,
    datum,
    type: updates.type ?? cur.type,
    notities: updates.notities !== undefined ? updates.notities.trim() : cur.notities,
  };
  all[index] = next;
  await saveAllOuderGesprekken(all);
  return next;
}

export async function deleteOuderGesprek(id: string): Promise<void> {
  const all = await getAllOuderGesprekken();
  await saveAllOuderGesprekken(all.filter((g) => g.id !== id));
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
  sharedMatchId?: string;
  naam: string;
  datum: string;
  locatie: string;
  scores: Record<string, ToestelScore>;
  expectedDWaarde?: Record<string, number | null>;
  targetNiveaus?: string[];
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
  const targets =
    w.targetNiveaus && w.targetNiveaus.length > 0
      ? normalizeTargetNiveaus(w.targetNiveaus).join("|")
      : "";
  return `${w.sporterId}__${targets}__${w.naam}__${normalizeEuropeanDate(w.datum)}__${w.locatie}`;
}

function normalizeTargetNiveaus(values: string[] | undefined): string[] {
  if (!values || values.length === 0) return [];
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

async function expandNiveauWedstrijdenToPerSporter(all: Wedstrijd[]): Promise<Wedstrijd[]> {
  const sporters = await getSporters();
  const sportersByNiveau = new Map<string, Sporter[]>();
  for (const s of sporters) {
    const list = sportersByNiveau.get(s.niveau) ?? [];
    list.push(s);
    sportersByNiveau.set(s.niveau, list);
  }

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
      // Preserve data even if target group currently has no athletes.
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
          id: Crypto.randomUUID(),
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
  const parsed = (JSON.parse(data) as Wedstrijd[]).map((w) => ({
    ...w,
    targetNiveaus: normalizeTargetNiveaus(w.targetNiveaus),
  }));
  const expanded = await expandNiveauWedstrijdenToPerSporter(parsed);
  const migrated = await AsyncStorage.getItem(WEDSTRIJDEN_MIGRATED_KEY);
  if (migrated === "1") {
    const normalized = dedupeWedstrijdenById(expanded);
    if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
      await AsyncStorage.setItem(WEDSTRIJDEN_KEY, JSON.stringify(normalized));
    }
    return normalized;
  }

  const normalized = dedupeAndMergeWedstrijden(expanded);
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

export type AgendaWedstrijdItem = Wedstrijd & { sporterNaam: string };

/** Agenda entries that are not wedstrijden (feestdagen, vrije dagen, etc.). */
export type AgendaKalenderCategorie = "vrij" | "feestdag" | "overig";

export interface CustomAgendaEvent {
  id: string;
  titel: string;
  datum: string;
  locatie: string;
  categorie: AgendaKalenderCategorie;
  notitie: string;
}

export const AGENDA_CATEGORIE_LABELS: Record<AgendaKalenderCategorie, string> = {
  vrij: "Vrije dag / vakantie",
  feestdag: "Feestdag",
  overig: "Anders",
};

export type AgendaItemWedstrijd = AgendaWedstrijdItem & { source: "wedstrijd" };
export type AgendaItemKalender = {
  source: "kalender";
  id: string;
  titel: string;
  datum: string;
  locatie: string;
  categorie: AgendaKalenderCategorie;
  notitie: string;
  categorieLabel: string;
};

/** Geplande oudergesprekken (vandaag of later) in de agenda. */
export type AgendaItemOuderGesprek = {
  source: "ouder_gesprek";
  id: string;
  titel: string;
  datum: string;
  locatie: string;
  notitie: string;
  gesprekType: OuderGesprekType;
  sporterId: string;
  sporterNaam: string;
};

export type AgendaItem = AgendaItemWedstrijd | AgendaItemKalender | AgendaItemOuderGesprek;

const CUSTOM_AGENDA_KEY = "turnteam_custom_agenda_v1";

async function getCustomAgendaEvents(): Promise<CustomAgendaEvent[]> {
  const data = await AsyncStorage.getItem(CUSTOM_AGENDA_KEY);
  if (!data) return [];
  const parsed = JSON.parse(data) as CustomAgendaEvent[];
  let dirty = false;
  const migrated = parsed.map((e) => {
    const c = e.categorie as string;
    if (c === "nationale_feestdag") {
      dirty = true;
      return { ...e, categorie: "feestdag" as AgendaKalenderCategorie };
    }
    return e;
  });
  if (dirty) {
    await AsyncStorage.setItem(CUSTOM_AGENDA_KEY, JSON.stringify(migrated));
  }
  return migrated;
}

async function saveCustomAgendaEvents(events: CustomAgendaEvent[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_AGENDA_KEY, JSON.stringify(events));
}

export const MISSING_AGENDA_TITEL = "MISSING_AGENDA_TITEL";
export const INVALID_AGENDA_DATUM = "INVALID_AGENDA_DATUM";

export async function addCustomAgendaEvent(
  titel: string,
  datum: string,
  locatie: string,
  categorie: AgendaKalenderCategorie,
  notitie: string
): Promise<CustomAgendaEvent> {
  const trimmedTitel = titel.trim();
  if (!trimmedTitel) {
    throw new Error(MISSING_AGENDA_TITEL);
  }
  const normalizedDatum = normalizeEuropeanDate(datum);
  if (wedstrijdDatumToTimestamp(normalizedDatum) === null) {
    throw new Error(INVALID_AGENDA_DATUM);
  }
  const ev: CustomAgendaEvent = {
    id: Crypto.randomUUID(),
    titel: trimmedTitel,
    datum: normalizedDatum,
    locatie: locatie.trim(),
    categorie,
    notitie: notitie.trim(),
  };
  const all = await getCustomAgendaEvents();
  all.push(ev);
  await saveCustomAgendaEvents(all);
  return ev;
}

function wedstrijdDatumToTimestamp(datum: string): number | null {
  const parts = datum.split("-");
  if (parts.length !== 3) return null;
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!day || !month || !year) return null;
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d.getTime();
}

/** Wedstrijden and kalender-items from today onward, sorted by date ascending. */
export async function getUpcomingAgendaItems(options: {
  onlyFavorieten?: boolean;
} = {}): Promise<AgendaItem[]> {
  const all = await getNormalizedWedstrijden();
  const sporters = await getSporters();
  const sporterById = new Map(sporters.map((s) => [s.id, s]));
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  const favorietIds = options.onlyFavorieten
    ? new Set(sporters.filter((s) => s.favoriet).map((s) => s.id))
    : null;

  const items: AgendaItem[] = [];
  const grouped = new Map<string, Wedstrijd[]>();
  for (const w of all) {
    const key = w.sharedMatchId ?? w.id;
    const bucket = grouped.get(key) ?? [];
    bucket.push(w);
    grouped.set(key, bucket);
  }
  for (const [, group] of grouped) {
    const representative = group[0];
    const ts = wedstrijdDatumToTimestamp(representative.datum);
    if (ts === null || ts < todayStart) continue;
    if (favorietIds !== null && !group.some((g) => favorietIds.has(g.sporterId))) continue;
    const niveaus = [...new Set(group.map((g) => sporterById.get(g.sporterId)?.niveau).filter(Boolean) as string[])];
    const label =
      niveaus.length > 0 ? `Niveaus: ${niveaus.join(", ")}` : sporterById.get(representative.sporterId)?.naam ?? "Onbekend";
    items.push({
      source: "wedstrijd",
      ...representative,
      sporterNaam: label,
    });
  }

  const customAll = await getCustomAgendaEvents();
  for (const c of customAll) {
    const ts = wedstrijdDatumToTimestamp(c.datum);
    if (ts === null || ts < todayStart) continue;
    items.push({
      source: "kalender",
      id: c.id,
      titel: c.titel,
      datum: c.datum,
      locatie: c.locatie,
      categorie: c.categorie,
      notitie: c.notitie,
      categorieLabel: AGENDA_CATEGORIE_LABELS[c.categorie],
    });
  }

  const gesprekkenAll = await getAllOuderGesprekken();
  for (const g of gesprekkenAll) {
    if (favorietIds !== null && !favorietIds.has(g.sporterId)) continue;
    const ts = wedstrijdDatumToTimestamp(g.datum);
    if (ts === null || ts < todayStart) continue;
    const naam = sporterById.get(g.sporterId)?.naam ?? "Onbekend";
    items.push({
      source: "ouder_gesprek",
      id: g.id,
      titel: naam,
      datum: g.datum,
      locatie: "",
      notitie: g.notities,
      gesprekType: g.type,
      sporterId: g.sporterId,
      sporterNaam: naam,
    });
  }

  items.sort(
    (a, b) =>
      wedstrijdDatumToTimestamp(a.datum)! - wedstrijdDatumToTimestamp(b.datum)!
  );
  return items;
}

export async function addWedstrijd(
  sporterId: string,
  naam: string,
  datum: string,
  locatie: string,
  expectedDWaarde?: Record<string, number | null>,
  options?: { targetNiveaus?: string[] }
): Promise<Wedstrijd> {
  const all = await getNormalizedWedstrijden();
  const normalizedDatum = normalizeEuropeanDate(datum);
  const targetNiveaus = normalizeTargetNiveaus(options?.targetNiveaus);
  const existingIndex = all.findIndex(
    (w) =>
      w.sporterId === sporterId &&
      w.naam === naam &&
      normalizeEuropeanDate(w.datum) === normalizedDatum &&
      w.locatie === locatie &&
      normalizeTargetNiveaus(w.targetNiveaus).join("|") === targetNiveaus.join("|")
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
    targetNiveaus,
  };
  all.push(newWedstrijd);
  await AsyncStorage.setItem(WEDSTRIJDEN_KEY, JSON.stringify(dedupeWedstrijdenById(all)));
  return newWedstrijd;
}

export async function addWedstrijdForSporters(input: {
  sporterIds: string[];
  naam: string;
  datum: string;
  locatie: string;
  expectedDWaardeBySporterId?: Record<string, Record<string, number | null>>;
}): Promise<Wedstrijd[]> {
  const all = await getNormalizedWedstrijden();
  const sporterIds = [...new Set(input.sporterIds.filter(Boolean))];
  if (sporterIds.length === 0) return [];
  const normalizedDatum = normalizeEuropeanDate(input.datum);
  const sharedMatchId = Crypto.randomUUID();
  const created: Wedstrijd[] = [];
  for (let i = 0; i < sporterIds.length; i++) {
    const sporterId = sporterIds[i];
    const expectedSnapshot = input.expectedDWaardeBySporterId?.[sporterId] ?? {};
    const duplicate = all.find(
      (w) =>
        w.sporterId === sporterId &&
        w.naam === input.naam &&
        normalizeEuropeanDate(w.datum) === normalizedDatum &&
        w.locatie === input.locatie
    );
    if (duplicate) {
      throw new Error(DUPLICATE_WEDSTRIJD_ERROR);
    }
    const wedstrijd: Wedstrijd = {
      id: Crypto.randomUUID(),
      sporterId,
      sharedMatchId,
      naam: input.naam,
      datum: normalizedDatum,
      locatie: input.locatie,
      scores: {},
      expectedDWaarde: expectedSnapshot,
      targetNiveaus: [],
    };
    all.push(wedstrijd);
    created.push(wedstrijd);
  }
  await AsyncStorage.setItem(WEDSTRIJDEN_KEY, JSON.stringify(dedupeWedstrijdenById(all)));
  return created;
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
    const sharedId = all[index].sharedMatchId;
    if (sharedId) {
      for (const w of all) {
        if (w.sharedMatchId === sharedId) w.naam = naam;
      }
    } else {
      all[index].naam = naam;
    }
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
    const sharedId = all[index].sharedMatchId;
    const normalizedDatum = normalizeEuropeanDate(datum);
    if (sharedId) {
      for (const w of all) {
        if (w.sharedMatchId === sharedId) {
          w.naam = naam;
          w.datum = normalizedDatum;
          w.locatie = locatie;
        }
      }
    } else {
      all[index].naam = naam;
      all[index].datum = normalizedDatum;
      all[index].locatie = locatie;
    }
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

