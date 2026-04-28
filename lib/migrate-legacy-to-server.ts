import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "./api";

const MIGRATION_FLAG = "turnteam_migrated_to_postgres_v1";

const SPORTERS_KEY = "turnteam_sporters";
const ONDERDELEN_KEY = "turnteam_onderdelen";
const BLESSURES_KEY = "turnteam_blessures_v1";
const TRAINING_SESSIONS_KEY = "turnteam_training_sessions_v1";
const OUDER_GESPREKKEN_KEY = "turnteam_ouder_gesprekken_v1";
const WEDSTRIJDEN_KEY = "turnteam_wedstrijden";
const WEDSTRIJDEN_MIGRATED_KEY = "turnteam_wedstrijden_dedupe_v1_done";
const CUSTOM_AGENDA_KEY = "turnteam_custom_agenda_v1";

/**
 * One-time upload of legacy AsyncStorage into the PostgreSQL-backed API when the
 * server is empty but this device still has local Turnteam data.
 */
export async function maybeMigrateLocalDataToServer(): Promise<void> {
  const done = await AsyncStorage.getItem(MIGRATION_FLAG);
  if (done === "1") return;

  const sportersJson = await AsyncStorage.getItem(SPORTERS_KEY);
  const hasLocal =
    !!(sportersJson &&
      sportersJson !== "[]" &&
      sportersJson.trim() !== "");
  if (!hasLocal) {
    await AsyncStorage.setItem(MIGRATION_FLAG, "1");
    return;
  }

  const base = getApiBaseUrl();

  try {
    const health = await fetch(`${base}/api/health`);
    if (!health.ok) return;

    const remote = await fetch(`${base}/api/sporters`);
    if (!remote.ok) return;
    const remoteList = (await remote.json()) as unknown;
    if (Array.isArray(remoteList) && remoteList.length > 0) {
      await AsyncStorage.setItem(MIGRATION_FLAG, "1");
      return;
    }

    const onderdelenRaw = await AsyncStorage.getItem(ONDERDELEN_KEY);
    const blessuresRaw = await AsyncStorage.getItem(BLESSURES_KEY);
    const trainingRaw = await AsyncStorage.getItem(TRAINING_SESSIONS_KEY);
    const gesprekkenRaw = await AsyncStorage.getItem(OUDER_GESPREKKEN_KEY);
    const wedstrRaw = await AsyncStorage.getItem(WEDSTRIJDEN_KEY);
    const wedstrMigrated = await AsyncStorage.getItem(WEDSTRIJDEN_MIGRATED_KEY);
    const agendaRaw = await AsyncStorage.getItem(CUSTOM_AGENDA_KEY);

    const body = {
      sporters: sportersJson ? (JSON.parse(sportersJson) as unknown) : [],
      onderdelen: onderdelenRaw ? (JSON.parse(onderdelenRaw) as unknown) : {},
      blessures: blessuresRaw ? (JSON.parse(blessuresRaw) as unknown) : {},
      trainingSessions: trainingRaw ? (JSON.parse(trainingRaw) as unknown) : [],
      ouderGesprekken: gesprekkenRaw
        ? (JSON.parse(gesprekkenRaw) as unknown)
        : [],
      wedstrijden: wedstrRaw ? (JSON.parse(wedstrRaw) as unknown) : [],
      wedstrijdenMigrated: wedstrMigrated === "1",
      customAgendaEvents: agendaRaw ? (JSON.parse(agendaRaw) as unknown) : [],
    };

    const imp = await fetch(`${base}/api/migration/import-legacy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!imp.ok) return;

    await AsyncStorage.setItem(MIGRATION_FLAG, "1");
  } catch {
    /* Server unreachable — try again on next app start. */
  }
}
