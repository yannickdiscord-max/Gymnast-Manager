import Constants from "expo-constants";
import { Platform } from "react-native";

function stripTrailingSlash(u: string): string {
  return u.replace(/\/$/, "");
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) {
    return stripTrailingSlash(fromEnv);
  }
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (fromExtra) {
    return stripTrailingSlash(fromExtra);
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return stripTrailingSlash(window.location.origin);
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000";
  }
  return "http://127.0.0.1:5000";
}

function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has("Content-Type") && !headers.has("content-type")) {
    const body = init?.body;
    if (typeof body === "string" && body.length > 0) {
      headers.set("Content-Type", "application/json");
    }
  }
  if (!headers.has("ngrok-skip-browser-warning")) {
    headers.set("ngrok-skip-browser-warning", "true");
  }

  const res = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { message?: string };
      if (j?.message) msg = j.message;
    } catch {
      try {
        msg = await res.text();
      } catch {
        /* noop */
      }
    }
    throw new ApiError(msg || `HTTP ${res.status}`, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export async function apiFetchOptional<T>(
  path: string,
  init?: RequestInit,
): Promise<T | undefined> {
  try {
    return await apiFetch<T>(path, init);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return undefined;
    }
    throw e;
  }
}
