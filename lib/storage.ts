import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

export interface Sporter {
  id: string;
  naam: string;
  niveau: string;
  favoriet: boolean;
  onderdelen: Record<string, string[]>;
}

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

export const ONDERDELEN_PER_TOESTEL: Record<Toestel, string[]> = {
  Vloer: [
    "Koprol voorwaarts",
    "Koprol achterwaarts",
    "Radslag",
    "Overslag",
    "Flikflak",
    "Salto voorwaarts",
    "Salto achterwaarts",
    "Handstand",
    "Rad",
    "Rondat",
    "Arabier",
    "Schroef",
  ],
  Voltige: [
    "Opsprong",
    "Afsprong",
    "Hurksprong",
    "Streeksprong",
    "Gratssprong",
    "Overslag",
    "Yamashita",
    "Tsukahara",
    "Handspring",
    "Salto voorwaarts",
  ],
  Ringen: [
    "Hang",
    "Steun",
    "Schommel",
    "Spierbal",
    "Hoek",
    "Kruis",
    "Steunzwaaien",
    "Kipstand",
    "Hefwenteling",
    "Afzwaai",
  ],
  Sprong: [
    "Hurksprong",
    "Streeksprong",
    "Gratssprong",
    "Handspring",
    "Overslag",
    "Yamashita",
    "Tsukahara",
    "Salto voorwaarts",
    "Schroefsprong",
    "Rondat afsprong",
  ],
  Brug: [
    "Steunzwaaien",
    "Wende",
    "Kehre",
    "Draai",
    "Felg",
    "Kiep",
    "Kip",
    "Hefwenteling",
    "Diamidov",
    "Afzwaai",
  ],
  Rekstok: [
    "Zweefhang",
    "Kiep",
    "Felg",
    "Reuzendraaien",
    "Steunzwaaien",
    "Staldergrep",
    "Adlerslag",
    "Tkatchev",
    "Afsprong salto",
    "Afsprong schroef",
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

export async function deleteSporter(id: string): Promise<void> {
  const sporters = await getSporters();
  const filtered = sporters.filter((s) => s.id !== id);
  await saveSporters(filtered);
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
