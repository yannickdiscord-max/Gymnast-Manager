import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

export interface Sporter {
  id: string;
  naam: string;
  niveau: string;
  favoriet: boolean;
  onderdelen: Record<string, string[]>;
}

export interface TurnOnderdeel {
  naam: string;
  niveau: TurnOnderdeelNiveau;
}

export const TURN_ONDERDEEL_NIVEAUS = ["tA", "A", "B", "C", "D", "E"] as const;
export type TurnOnderdeelNiveau = (typeof TURN_ONDERDEEL_NIVEAUS)[number];

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
    { naam: "Koprol voorwaarts", niveau: "tA" },
    { naam: "Koprol achterwaarts", niveau: "tA" },
    { naam: "Handstand", niveau: "tA" },
    { naam: "Rad", niveau: "A" },
    { naam: "Radslag", niveau: "A" },
    { naam: "Rondat", niveau: "A" },
    { naam: "Overslag", niveau: "B" },
    { naam: "Flikflak", niveau: "B" },
    { naam: "Arabier", niveau: "C" },
    { naam: "Salto voorwaarts", niveau: "C" },
    { naam: "Salto achterwaarts", niveau: "D" },
    { naam: "Schroef", niveau: "E" },
  ],
  Voltige: [
    { naam: "Opsprong", niveau: "tA" },
    { naam: "Afsprong", niveau: "tA" },
    { naam: "Hurksprong", niveau: "A" },
    { naam: "Streeksprong", niveau: "A" },
    { naam: "Gratssprong", niveau: "B" },
    { naam: "Handspring", niveau: "B" },
    { naam: "Overslag", niveau: "C" },
    { naam: "Yamashita", niveau: "C" },
    { naam: "Tsukahara", niveau: "D" },
    { naam: "Salto voorwaarts", niveau: "E" },
  ],
  Ringen: [
    { naam: "Hang", niveau: "tA" },
    { naam: "Steun", niveau: "tA" },
    { naam: "Schommel", niveau: "A" },
    { naam: "Hoek", niveau: "A" },
    { naam: "Spierbal", niveau: "B" },
    { naam: "Kipstand", niveau: "B" },
    { naam: "Steunzwaaien", niveau: "C" },
    { naam: "Kruis", niveau: "C" },
    { naam: "Hefwenteling", niveau: "D" },
    { naam: "Afzwaai", niveau: "E" },
  ],
  Sprong: [
    { naam: "Hurksprong", niveau: "tA" },
    { naam: "Streeksprong", niveau: "tA" },
    { naam: "Gratssprong", niveau: "A" },
    { naam: "Handspring", niveau: "A" },
    { naam: "Overslag", niveau: "B" },
    { naam: "Yamashita", niveau: "B" },
    { naam: "Tsukahara", niveau: "C" },
    { naam: "Salto voorwaarts", niveau: "C" },
    { naam: "Schroefsprong", niveau: "D" },
    { naam: "Rondat afsprong", niveau: "E" },
  ],
  Brug: [
    { naam: "Steunzwaaien", niveau: "tA" },
    { naam: "Wende", niveau: "tA" },
    { naam: "Kehre", niveau: "A" },
    { naam: "Draai", niveau: "A" },
    { naam: "Kiep", niveau: "B" },
    { naam: "Kip", niveau: "B" },
    { naam: "Felg", niveau: "C" },
    { naam: "Hefwenteling", niveau: "C" },
    { naam: "Diamidov", niveau: "D" },
    { naam: "Afzwaai", niveau: "E" },
  ],
  Rekstok: [
    { naam: "Zweefhang", niveau: "tA" },
    { naam: "Steunzwaaien", niveau: "tA" },
    { naam: "Kiep", niveau: "A" },
    { naam: "Felg", niveau: "A" },
    { naam: "Reuzendraaien", niveau: "B" },
    { naam: "Staldergrep", niveau: "C" },
    { naam: "Adlerslag", niveau: "C" },
    { naam: "Tkatchev", niveau: "D" },
    { naam: "Afsprong salto", niveau: "D" },
    { naam: "Afsprong schroef", niveau: "E" },
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
  if (Array.isArray(s.onderdelen)) {
    const newOnderdelen: Record<string, string[]> = {};
    for (const t of TOESTELLEN) {
      newOnderdelen[t] = [];
    }
    return { ...s, onderdelen: newOnderdelen };
  }
  if (!s.onderdelen || typeof s.onderdelen !== "object") {
    const newOnderdelen: Record<string, string[]> = {};
    for (const t of TOESTELLEN) {
      newOnderdelen[t] = [];
    }
    return { ...s, onderdelen: newOnderdelen };
  }
  return s;
}

export async function saveSporters(sporters: Sporter[]): Promise<void> {
  await AsyncStorage.setItem(SPORTERS_KEY, JSON.stringify(sporters));
}

export async function addSporter(naam: string, niveau: string): Promise<Sporter> {
  const sporters = await getSporters();
  const onderdelen: Record<string, string[]> = {};
  for (const t of TOESTELLEN) {
    onderdelen[t] = [];
  }
  const newSporter: Sporter = {
    id: Crypto.randomUUID(),
    naam,
    niveau,
    favoriet: false,
    onderdelen,
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
}

export interface Wedstrijd {
  id: string;
  sporterId: string;
  naam: string;
  datum: string;
  locatie: string;
  scores: Record<string, ToestelScore>;
}

const WEDSTRIJDEN_KEY = "turnteam_wedstrijden";

export async function getWedstrijden(sporterId: string): Promise<Wedstrijd[]> {
  const data = await AsyncStorage.getItem(WEDSTRIJDEN_KEY);
  if (!data) return [];
  const all: Wedstrijd[] = JSON.parse(data);
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
  const data = await AsyncStorage.getItem(WEDSTRIJDEN_KEY);
  if (!data) return undefined;
  const all: Wedstrijd[] = JSON.parse(data);
  return all.find((w) => w.id === id);
}

export async function addWedstrijd(
  sporterId: string,
  naam: string,
  datum: string,
  locatie: string
): Promise<Wedstrijd> {
  const data = await AsyncStorage.getItem(WEDSTRIJDEN_KEY);
  const all: Wedstrijd[] = data ? JSON.parse(data) : [];
  const newWedstrijd: Wedstrijd = {
    id: Crypto.randomUUID(),
    sporterId,
    naam,
    datum,
    locatie,
    scores: {},
  };
  all.push(newWedstrijd);
  await AsyncStorage.setItem(WEDSTRIJDEN_KEY, JSON.stringify(all));
  return newWedstrijd;
}

export async function saveWedstrijdScores(
  id: string,
  scores: Record<string, ToestelScore>
): Promise<void> {
  const data = await AsyncStorage.getItem(WEDSTRIJDEN_KEY);
  if (!data) return;
  const all: Wedstrijd[] = JSON.parse(data);
  const index = all.findIndex((w) => w.id === id);
  if (index !== -1) {
    all[index].scores = scores;
    await AsyncStorage.setItem(WEDSTRIJDEN_KEY, JSON.stringify(all));
  }
}

export async function deleteWedstrijd(id: string): Promise<void> {
  const data = await AsyncStorage.getItem(WEDSTRIJDEN_KEY);
  if (!data) return;
  const all: Wedstrijd[] = JSON.parse(data);
  await AsyncStorage.setItem(
    WEDSTRIJDEN_KEY,
    JSON.stringify(all.filter((w) => w.id !== id))
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
  return selectedNamen.reduce((sum, naam) => {
    const found = allOnderdelen.find((o) => o.naam === naam);
    return sum + (found ? (DWAARDE_PER_NIVEAU[found.niveau] ?? 0) : 0);
  }, 0);
}

export const NIVEAUS = [
  "Instap",
  "Pupil 1",
  "Pupil 2",
  "Jeugd 1",
  "Jeugd 2",
  "Junior",
  "Senior",
  "Selectie",
];

