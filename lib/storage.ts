import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

export interface Sporter {
  id: string;
  naam: string;
  niveau: string;
  favoriet: boolean;
  onderdelen: string[];
}

const SPORTERS_KEY = "turnteam_sporters";

export async function getSporters(): Promise<Sporter[]> {
  const data = await AsyncStorage.getItem(SPORTERS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function saveSporters(sporters: Sporter[]): Promise<void> {
  await AsyncStorage.setItem(SPORTERS_KEY, JSON.stringify(sporters));
}

export async function addSporter(naam: string, niveau: string): Promise<Sporter> {
  const sporters = await getSporters();
  const newSporter: Sporter = {
    id: Crypto.randomUUID(),
    naam,
    niveau,
    favoriet: false,
    onderdelen: [],
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

export async function updateSporterOnderdelen(id: string, onderdelen: string[]): Promise<void> {
  const sporters = await getSporters();
  const index = sporters.findIndex((s) => s.id === id);
  if (index !== -1) {
    sporters[index].onderdelen = onderdelen;
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

export const ONDERDELEN_OPTIONS = [
  "Vloer",
  "Sprong",
  "Brug",
  "Balk",
  "Ringen",
  "Rekstok",
  "Voltige",
  "Paard",
  "Brug ongelijk",
  "Minitrampoline",
  "Trampoline",
  "Tumbling",
  "Rad",
  "Flikflak",
  "Salto voorwaarts",
  "Salto achterwaarts",
  "Handstand",
  "Overslag",
  "Radslag",
  "Koprol",
  "Steunzwaaien",
  "Kiep",
  "Felg",
  "Reuzendraaien",
];
