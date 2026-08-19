import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const DEVICE_ID_KEY = "trainer_device_id_v1";
const TRAINER_SESSION_KEY = "trainer_session_v1";

export const TRAINER_ACCOUNTS = [
  { id: "trainer:arvid", name: "Arvid" },
  { id: "trainer:luca", name: "Luca" },
  { id: "trainer:yannick", name: "Yannick" },
] as const;

type TrainerAccount = (typeof TRAINER_ACCOUNTS)[number];

export type TrainerSession = {
  deviceId: string;
  trainerId: string;
  trainerName: string;
  loggedInAt: string;
};

function getTrainerAccount(nameInput: string): TrainerAccount | null {
  const normalizedName = nameInput.trim().toLowerCase();
  if (!normalizedName) return null;
  return (
    TRAINER_ACCOUNTS.find(
      (account) => account.name.toLowerCase() === normalizedName,
    ) ?? null
  );
}

function createDeviceIdFallback(): string {
  // crypto.randomUUID() is unavailable on non-secure origins (e.g. http://192.168.x.x).
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing && existing.trim()) return existing.trim();

  let created: string;
  try {
    created = Crypto.randomUUID();
  } catch {
    created = createDeviceIdFallback();
  }
  if (!created || !String(created).trim()) {
    created = createDeviceIdFallback();
  }

  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export async function getStoredTrainerSession(): Promise<TrainerSession | null> {
  const raw = await AsyncStorage.getItem(TRAINER_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TrainerSession>;
    if (!parsed?.trainerName || !parsed?.trainerId || !parsed?.deviceId) {
      return null;
    }
    const account = getTrainerAccount(parsed.trainerName);
    if (!account || account.id !== parsed.trainerId) {
      return null;
    }
    return {
      deviceId: parsed.deviceId,
      trainerId: account.id,
      trainerName: account.name,
      loggedInAt: parsed.loggedInAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function loginTrainerByName(nameInput: string): Promise<TrainerSession> {
  const account = getTrainerAccount(nameInput);
  if (!account) {
    throw new Error("Unknown trainer account");
  }

  const deviceId = await getOrCreateDeviceId();
  const nextSession: TrainerSession = {
    deviceId,
    trainerName: account.name,
    trainerId: account.id,
    loggedInAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(TRAINER_SESSION_KEY, JSON.stringify(nextSession));
  return nextSession;
}

export async function clearTrainerSession(): Promise<void> {
  await AsyncStorage.removeItem(TRAINER_SESSION_KEY);
}

/** Maps persisted trainer user id (e.g. `trainer:arvid`) to display name. */
export function getTrainerDisplayNameFromUserId(
  userId: string | null | undefined,
): string | null {
  if (userId == null || String(userId).trim() === "") return null;
  const found = TRAINER_ACCOUNTS.find((t) => t.id === String(userId).trim());
  return found?.name ?? null;
}
