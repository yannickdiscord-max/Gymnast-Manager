import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";
import * as schema from "../shared/schema";
import {
  AGENDA_CATEGORIE_LABELS,
  type AgendaItem,
  type AgendaKalenderCategorie,
  type CustomAgendaEvent,
  type OuderGesprek,
  type OuderGesprekType,
  type Sporter,
  type SporterAttendanceArchive,
  type SporterBlessures,
  type ToestelScore,
  type TrainingSession,
  type TurnOnderdeel,
  type Wedstrijd,
  DUPLICATE_TRAINING_SESSION_ERROR,
  DUPLICATE_WEDSTRIJD_ERROR,
  INVALID_TRAINING_SESSION_DATUM,
  TRAINING_SESSION_NOT_FOUND,
  NO_TRAINING_SESSIONS_TO_ARCHIVE,
  INVALID_AGENDA_DATUM,
  INVALID_OUDER_GESPREK_DATUM,
  INVALID_GEBOORTEDATUM,
  MISSING_AGENDA_LESPLAN_PLAN,
  MISSING_AGENDA_TITEL,
  LESPLAN_ACTION_FORBIDDEN,
  type LesplanVisibility,
  ONDERDELEN_PER_TOESTEL,
  TOESTELLEN,
  sortOnderdelen,
  type Toestel,
} from "../shared/turnteam-domain";
import {
  calendarDaysBetweenLocalDates,
  calculateAgeOnDate,
  europeanDatumStringToLocalDate,
  formatLocalDateEuropean,
  getBirthdayAgendaWindowDays,
  isValidEuropeanDateString,
  normalizeEuropeanDate,
  normalizeOuderGesprekDatum,
  normalizeTrainingSessionDatum,
  defaultTurnSeasonLabel,
  formatTodayEuropean,
  trainingSessionDatumToTime,
  wedstrijdDatumToTimestamp,
} from "../shared/turnteam-dates";
import {
  dedupeWedstrijdenById,
  normalizeStoredWedstrijden,
  normalizeTargetNiveaus,
} from "../shared/wedstrijden-normalize";

const META_WEDSTRIJDEN_MIGRATED = "wedstrijden_migrated";

function normalizeAgendaKalenderCategorieFromDb(raw: string): AgendaKalenderCategorie {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (key === "vrij") return "vrij";
  if (key === "lesplan") return "lesplan";
  if (key === "feestdag" || key === "nationale_feestdag") return "overig";
  if (key === "overig") return "overig";
  return "overig";
}

/**
 * Private lesplans are hidden from other users once `viewerUserId` and `ownerUserId` are both set.
 * If the client sends no `viewerUserId` (current single-tenant app), all lesplans are shown.
 */
function shouldIncludeKalenderEventForViewer(
  c: CustomAgendaEvent,
  viewerUserId: string | undefined,
): boolean {
  if (c.categorie !== "lesplan") return true;
  const vis = c.lesplanVisibility === "private" ? "private" : "public";
  if (vis !== "private") return true;
  const owner = c.ownerUserId ?? null;
  if (owner === null) return true;
  if (viewerUserId === undefined || viewerUserId === "") return true;
  return viewerUserId === owner;
}

function assertLesplanActorAllowed(
  rowOwnerUserId: string | null | undefined,
  actorUserId: string,
): void {
  const owner = rowOwnerUserId?.trim() ?? "";
  const actor = actorUserId.trim();
  if (!actor) {
    throw new Error(LESPLAN_ACTION_FORBIDDEN);
  }
  if (owner && owner !== actor) {
    throw new Error(LESPLAN_ACTION_FORBIDDEN);
  }
}
const CATALOG_ID = "default";

async function getMeta(key: string): Promise<string | undefined> {
  const r = await db
    .select()
    .from(schema.appMeta)
    .where(eq(schema.appMeta.key, key))
    .limit(1);
  return r[0]?.value;
}

function migrateSporterRow(s: unknown): Sporter {
  const emptyToestellen = () => {
    const r: Record<string, string[]> = {};
    for (const t of TOESTELLEN) r[t] = [];
    return r;
  };
  const row = s as Partial<Sporter>;
  const withGeboortedatum = (base: Sporter): Sporter => ({
    ...base,
    geboortedatum: base.geboortedatum ?? "",
  });
  if (Array.isArray(row.onderdelen)) {
    return withGeboortedatum({
      ...(row as Sporter),
      onderdelen: emptyToestellen(),
      oefening: emptyToestellen(),
    });
  }
  if (!row.onderdelen || typeof row.onderdelen !== "object") {
    return withGeboortedatum({
      ...(row as Sporter),
      onderdelen: emptyToestellen(),
      oefening: emptyToestellen(),
    });
  }
  if (!row.oefening || typeof row.oefening !== "object") {
    return withGeboortedatum({ ...(row as Sporter), oefening: emptyToestellen() });
  }
  return withGeboortedatum(row as Sporter);
}

export async function listSporters(): Promise<Sporter[]> {
  const rows = await db.select().from(schema.sporters);
  return rows.map((r) =>
    migrateSporterRow({
      id: r.id,
      naam: r.naam,
      geboortedatum: r.geboortedatum,
      niveau: r.niveau,
      favoriet: r.favoriet,
      onderdelen: r.onderdelen,
      oefening: r.oefening,
    }),
  );
}

async function ensureOnderdelenCatalogRow(): Promise<void> {
  const existing = await db
    .select()
    .from(schema.onderdelenCatalog)
    .where(eq(schema.onderdelenCatalog.id, CATALOG_ID))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(schema.onderdelenCatalog).values({
      id: CATALOG_ID,
      data: {},
    });
  }
}

export async function getOnderdelen(toestel: Toestel): Promise<TurnOnderdeel[]> {
  await ensureOnderdelenCatalogRow();
  const rows = await db
    .select()
    .from(schema.onderdelenCatalog)
    .where(eq(schema.onderdelenCatalog.id, CATALOG_ID))
    .limit(1);
  const parsed =
    (rows[0]?.data as Record<string, TurnOnderdeel[]>) ?? {};
  if (!parsed[toestel]) {
    parsed[toestel] = [...ONDERDELEN_PER_TOESTEL[toestel]];
    await db
      .update(schema.onderdelenCatalog)
      .set({ data: parsed })
      .where(eq(schema.onderdelenCatalog.id, CATALOG_ID));
  } else {
    let dirty = false;
    parsed[toestel] = parsed[toestel].map((o) => {
      if (o.elementgroep == null) {
        dirty = true;
        const defaultEntry = ONDERDELEN_PER_TOESTEL[toestel].find(
          (d) => d.naam === o.naam,
        );
        return { ...o, elementgroep: defaultEntry?.elementgroep ?? 1 };
      }
      return o;
    });
    if (dirty) {
      await db
        .update(schema.onderdelenCatalog)
        .set({ data: parsed })
        .where(eq(schema.onderdelenCatalog.id, CATALOG_ID));
    }
  }
  return sortOnderdelen(parsed[toestel]);
}

export async function addOnderdeel(
  toestel: Toestel,
  onderdeel: TurnOnderdeel,
): Promise<void> {
  await ensureOnderdelenCatalogRow();
  const rows = await db
    .select()
    .from(schema.onderdelenCatalog)
    .where(eq(schema.onderdelenCatalog.id, CATALOG_ID))
    .limit(1);
  const parsed =
    (rows[0]?.data as Record<string, TurnOnderdeel[]>) ?? {};
  const existing =
    parsed[toestel] ?? [...ONDERDELEN_PER_TOESTEL[toestel]];
  if (!existing.some((o) => o.naam === onderdeel.naam)) {
    parsed[toestel] = [...existing, onderdeel];
    await db
      .update(schema.onderdelenCatalog)
      .set({ data: parsed })
      .where(eq(schema.onderdelenCatalog.id, CATALOG_ID));
  }
}

export async function deleteOnderdeel(
  toestel: Toestel,
  naam: string,
): Promise<void> {
  const rows = await db
    .select()
    .from(schema.onderdelenCatalog)
    .where(eq(schema.onderdelenCatalog.id, CATALOG_ID))
    .limit(1);
  if (!rows[0]) return;
  const parsed =
    (rows[0].data as Record<string, TurnOnderdeel[]>) ?? {};
  parsed[toestel] = (parsed[toestel] ?? []).filter((o) => o.naam !== naam);
  await db
    .update(schema.onderdelenCatalog)
    .set({ data: parsed })
    .where(eq(schema.onderdelenCatalog.id, CATALOG_ID));
}

export async function addSporter(
  naam: string,
  niveau: string,
  geboortedatumInput: string,
): Promise<Sporter> {
  const trimmed = geboortedatumInput.trim();
  if (!isValidEuropeanDateString(trimmed)) {
    throw new Error(INVALID_GEBOORTEDATUM);
  }
  const geboortedatum = normalizeEuropeanDate(trimmed);
  const onderdelen: Record<string, string[]> = {};
  const oefening: Record<string, string[]> = {};
  for (const t of TOESTELLEN) {
    onderdelen[t] = [];
    oefening[t] = [];
  }
  const id = randomUUID();
  const row: typeof schema.sporters.$inferInsert = {
    id,
    naam,
    geboortedatum,
    niveau,
    favoriet: false,
    onderdelen,
    oefening,
  };
  await db.insert(schema.sporters).values(row);
  return migrateSporterRow(row);
}

export async function toggleFavoriet(id: string): Promise<Sporter[]> {
  const cur = await db
    .select()
    .from(schema.sporters)
    .where(eq(schema.sporters.id, id))
    .limit(1);
  if (!cur[0]) return listSporters();
  await db
    .update(schema.sporters)
    .set({ favoriet: !cur[0].favoriet })
    .where(eq(schema.sporters.id, id));
  return listSporters();
}

export async function getSporter(id: string): Promise<Sporter | undefined> {
  const rows = await db
    .select()
    .from(schema.sporters)
    .where(eq(schema.sporters.id, id))
    .limit(1);
  if (!rows[0]) return undefined;
  return migrateSporterRow({
    id: rows[0].id,
    naam: rows[0].naam,
    geboortedatum: rows[0].geboortedatum,
    niveau: rows[0].niveau,
    favoriet: rows[0].favoriet,
    onderdelen: rows[0].onderdelen,
    oefening: rows[0].oefening,
  });
}

export async function updateSporterOnderdelen(
  id: string,
  toestel: Toestel,
  onderdelen: string[],
): Promise<void> {
  const sp = await getSporter(id);
  if (!sp) return;
  const next = { ...sp.onderdelen, [toestel]: onderdelen };
  await db
    .update(schema.sporters)
    .set({ onderdelen: next })
    .where(eq(schema.sporters.id, id));
}

export async function updateSporterOefening(
  id: string,
  toestel: Toestel,
  oefening: string[],
): Promise<void> {
  const sp = await getSporter(id);
  if (!sp) return;
  const oe = { ...(sp.oefening ?? {}), [toestel]: oefening };
  await db
    .update(schema.sporters)
    .set({ oefening: oe })
    .where(eq(schema.sporters.id, id));
}

export async function updateSporterNiveau(
  id: string,
  niveau: string,
): Promise<Sporter | undefined> {
  const sp = await getSporter(id);
  if (!sp) return undefined;
  await db
    .update(schema.sporters)
    .set({ niveau })
    .where(eq(schema.sporters.id, id));
  return getSporter(id);
}

async function stripSporterFromTrainingSessions(sporterId: string): Promise<void> {
  const sessions = await db.select().from(schema.trainingSessions);
  for (const s of sessions) {
    const ids = (s.attendeeSporterIds as string[]).filter((x) => x !== sporterId);
    if (ids.length !== (s.attendeeSporterIds as string[]).length) {
      await db
        .update(schema.trainingSessions)
        .set({ attendeeSporterIds: ids })
        .where(eq(schema.trainingSessions.id, s.id));
    }
  }
}

export async function deleteSporter(id: string): Promise<void> {
  await db.delete(schema.ouderGesprekken).where(eq(schema.ouderGesprekken.sporterId, id));
  await stripSporterFromTrainingSessions(id);
  await db.delete(schema.sporters).where(eq(schema.sporters.id, id));
}

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

export async function getBlessuresForSporter(
  sporterId: string,
): Promise<SporterBlessures> {
  const rows = await db
    .select()
    .from(schema.sporterBlessures)
    .where(eq(schema.sporterBlessures.sporterId, sporterId))
    .limit(1);
  if (!rows[0]) return { current: [], previous: [] };
  return {
    current: normalizeBlessureList((rows[0].current as string[]) ?? []),
    previous: normalizeBlessureList((rows[0].previous as string[]) ?? []),
  };
}

async function saveBlessures(sporterId: string, b: SporterBlessures): Promise<void> {
  await db
    .insert(schema.sporterBlessures)
    .values({
      sporterId,
      current: b.current,
      previous: b.previous,
    })
    .onConflictDoUpdate({
      target: schema.sporterBlessures.sporterId,
      set: { current: b.current, previous: b.previous },
    });
}

export async function addCurrentBlessure(
  sporterId: string,
  blessureNaam: string,
): Promise<SporterBlessures> {
  const normalized = normalizeBlessureNaam(blessureNaam);
  if (!normalized) {
    return getBlessuresForSporter(sporterId);
  }
  const existing = await getBlessuresForSporter(sporterId);
  const lower = normalized.toLocaleLowerCase();
  const nextCurrent = normalizeBlessureList([...existing.current, normalized]);
  const nextPrevious = existing.previous.filter(
    (item) => item.toLocaleLowerCase() !== lower,
  );
  const next: SporterBlessures = { current: nextCurrent, previous: nextPrevious };
  await saveBlessures(sporterId, next);
  return next;
}

export async function removeCurrentBlessure(
  sporterId: string,
  blessureNaam: string,
): Promise<SporterBlessures> {
  const key = normalizeBlessureNaam(blessureNaam).toLocaleLowerCase();
  const existing = await getBlessuresForSporter(sporterId);
  const next: SporterBlessures = {
    current: existing.current.filter((item) => item.toLocaleLowerCase() !== key),
    previous: existing.previous,
  };
  await saveBlessures(sporterId, next);
  return next;
}

export async function moveCurrentBlessureToPrevious(
  sporterId: string,
  blessureNaam: string,
): Promise<SporterBlessures> {
  const normalized = normalizeBlessureNaam(blessureNaam);
  const key = normalized.toLocaleLowerCase();
  if (!normalized) {
    return getBlessuresForSporter(sporterId);
  }
  const existing = await getBlessuresForSporter(sporterId);
  const currentWithoutItem = existing.current.filter(
    (item) => item.toLocaleLowerCase() !== key,
  );
  const alreadyInPrevious = existing.previous.some(
    (item) => item.toLocaleLowerCase() === key,
  );
  const next: SporterBlessures = {
    current: currentWithoutItem,
    previous: alreadyInPrevious ? existing.previous : [normalized, ...existing.previous],
  };
  await saveBlessures(sporterId, next);
  return next;
}

export async function removePreviousBlessure(
  sporterId: string,
  blessureNaam: string,
): Promise<SporterBlessures> {
  const key = normalizeBlessureNaam(blessureNaam).toLocaleLowerCase();
  const existing = await getBlessuresForSporter(sporterId);
  const next: SporterBlessures = {
    current: existing.current,
    previous: existing.previous.filter((item) => item.toLocaleLowerCase() !== key),
  };
  await saveBlessures(sporterId, next);
  return next;
}

export async function getTrainingSessions(): Promise<TrainingSession[]> {
  const rows = await db.select().from(schema.trainingSessions);
  return rows.map((r) => ({
    id: r.id,
    datum: r.datum,
    attendeeSporterIds: r.attendeeSporterIds as string[],
  }));
}

export async function getTrainingSessionForDatum(
  datumInput: string,
): Promise<TrainingSession | undefined> {
  if (!isValidEuropeanDateString(datumInput)) return undefined;
  const norm = normalizeTrainingSessionDatum(datumInput);
  const rows = await db
    .select()
    .from(schema.trainingSessions)
    .where(eq(schema.trainingSessions.datum, norm))
    .limit(1);
  if (!rows[0]) return undefined;
  return {
    id: rows[0].id,
    datum: rows[0].datum,
    attendeeSporterIds: rows[0].attendeeSporterIds as string[],
  };
}

export async function addTrainingSession(
  datumInput: string,
  attendeeSporterIds: string[],
): Promise<TrainingSession> {
  const trimmed = datumInput.trim();
  if (!isValidEuropeanDateString(trimmed)) {
    throw new Error(INVALID_TRAINING_SESSION_DATUM);
  }
  const datum = normalizeTrainingSessionDatum(trimmed);
  const dup = await getTrainingSessionForDatum(datum);
  if (dup) {
    throw new Error(DUPLICATE_TRAINING_SESSION_ERROR);
  }
  const uniqueIds = [...new Set(attendeeSporterIds.filter(Boolean))];
  const id = randomUUID();
  const session: TrainingSession = { id, datum, attendeeSporterIds: uniqueIds };
  await db.insert(schema.trainingSessions).values({
    id,
    datum,
    attendeeSporterIds: uniqueIds,
  });
  return session;
}

export async function getTrainingSessionById(
  sessionId: string,
): Promise<TrainingSession | undefined> {
  const rows = await db
    .select()
    .from(schema.trainingSessions)
    .where(eq(schema.trainingSessions.id, sessionId))
    .limit(1);
  if (!rows[0]) return undefined;
  return {
    id: rows[0].id,
    datum: rows[0].datum,
    attendeeSporterIds: rows[0].attendeeSporterIds as string[],
  };
}

export async function deleteTrainingSessionById(sessionId: string): Promise<boolean> {
  const result = await db
    .delete(schema.trainingSessions)
    .where(eq(schema.trainingSessions.id, sessionId));
  // drizzle returns rowCount in node-postgres driver
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowCount = (result as any)?.rowCount as number | undefined;
  return (rowCount ?? 0) > 0;
}

export async function setSporterAttendanceForSession(
  sessionId: string,
  sporterId: string,
  attended: boolean,
): Promise<TrainingSession> {
  const session = await getTrainingSessionById(sessionId);
  if (!session) {
    throw new Error(TRAINING_SESSION_NOT_FOUND);
  }
  const current = session.attendeeSporterIds;
  const next = attended
    ? current.includes(sporterId)
      ? current
      : [...current, sporterId]
    : current.filter((id) => id !== sporterId);
  await db
    .update(schema.trainingSessions)
    .set({ attendeeSporterIds: next })
    .where(eq(schema.trainingSessions.id, sessionId));
  return { ...session, attendeeSporterIds: next };
}

const RECENT_TRAINING_SESSIONS_SHOWN = 16;

function computeSporterAttendanceFromSessions(
  sporterId: string,
  sortedSessions: TrainingSession[],
): {
  totalSessions: number;
  attendedSessions: number;
  percentage: number | null;
  recentMarks: { attended: boolean }[];
} {
  const totalSessions = sortedSessions.length;
  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      attendedSessions: 0,
      percentage: null,
      recentMarks: [],
    };
  }
  const attendedSessions = sortedSessions.filter((s) =>
    s.attendeeSporterIds.includes(sporterId),
  ).length;
  const percentage = Math.round((attendedSessions / totalSessions) * 100);
  const recentSlice = sortedSessions.slice(-RECENT_TRAINING_SESSIONS_SHOWN);
  const recentMarks = recentSlice.map((s) => ({
    attended: s.attendeeSporterIds.includes(sporterId),
  }));
  return { totalSessions, attendedSessions, percentage, recentMarks };
}

export async function getSporterAttendanceSummary(sporterId: string): Promise<{
  totalSessions: number;
  attendedSessions: number;
  percentage: number | null;
  recentMarks: { attended: boolean }[];
}> {
  const sorted = [...(await getTrainingSessions())].sort(
    (a, b) =>
      trainingSessionDatumToTime(a.datum) - trainingSessionDatumToTime(b.datum),
  );
  return computeSporterAttendanceFromSessions(sporterId, sorted);
}

export async function getSporterAttendanceArchives(
  sporterId: string,
): Promise<SporterAttendanceArchive[]> {
  const rows = await db
    .select()
    .from(schema.sporterAttendanceArchives)
    .where(eq(schema.sporterAttendanceArchives.sporterId, sporterId));
  return rows
    .map((r) => ({
      id: r.id,
      sporterId: r.sporterId,
      seasonBatchId: r.seasonBatchId,
      seasonLabel: r.seasonLabel,
      archivedAt: r.archivedAt,
      attendedSessions: r.attendedSessions,
      totalSessions: r.totalSessions,
      percentage: r.percentage,
    }))
    .sort(
      (a, b) =>
        trainingSessionDatumToTime(b.archivedAt) -
        trainingSessionDatumToTime(a.archivedAt),
    );
}

export async function getAttendanceArchiveBatches(): Promise<
  Array<{
    seasonBatchId: string;
    seasonLabel: string;
    archivedAt: string;
    totalSessions: number;
  }>
> {
  const rows = await db.select().from(schema.sporterAttendanceArchives);

  // totalSessions is the same for all sporters in a batch; we collapse by seasonBatchId.
  const byBatch = new Map<
    string,
    {
      seasonBatchId: string;
      seasonLabel: string;
      archivedAt: string;
      totalSessions: number;
    }
  >();

  for (const r of rows) {
    if (byBatch.has(r.seasonBatchId)) continue;
    byBatch.set(r.seasonBatchId, {
      seasonBatchId: r.seasonBatchId,
      seasonLabel: r.seasonLabel,
      archivedAt: r.archivedAt,
      totalSessions: r.totalSessions as number,
    });
  }

  return Array.from(byBatch.values()).sort(
    (a, b) =>
      trainingSessionDatumToTime(b.archivedAt) -
      trainingSessionDatumToTime(a.archivedAt),
  );
}

export async function deleteAttendanceArchiveBatch(
  seasonBatchId: string,
): Promise<void> {
  await db
    .delete(schema.sporterAttendanceArchives)
    .where(eq(schema.sporterAttendanceArchives.seasonBatchId, seasonBatchId));
}

export async function archiveAttendanceSeason(seasonLabelInput?: string): Promise<{
  seasonBatchId: string;
  seasonLabel: string;
  archivedAt: string;
  sporterCount: number;
  trainingSessionCount: number;
}> {
  const sessions = await getTrainingSessions();
  if (sessions.length === 0) {
    throw new Error(NO_TRAINING_SESSIONS_TO_ARCHIVE);
  }
  const sorted = [...sessions].sort(
    (a, b) =>
      trainingSessionDatumToTime(a.datum) - trainingSessionDatumToTime(b.datum),
  );
  const sporters = await listSporters();
  const seasonBatchId = randomUUID();
  const trimmedLabel = seasonLabelInput?.trim();
  const seasonLabel = trimmedLabel || defaultTurnSeasonLabel();
  const archivedAt = formatTodayEuropean();

  await db.transaction(async (tx) => {
    for (const sporter of sporters) {
      const stats = computeSporterAttendanceFromSessions(sporter.id, sorted);
      await tx.insert(schema.sporterAttendanceArchives).values({
        id: randomUUID(),
        sporterId: sporter.id,
        seasonBatchId,
        seasonLabel,
        archivedAt,
        attendedSessions: stats.attendedSessions,
        totalSessions: stats.totalSessions,
        percentage: stats.percentage ?? 0,
      });
    }
    await tx.delete(schema.trainingSessions);
  });

  return {
    seasonBatchId,
    seasonLabel,
    archivedAt,
    sporterCount: sporters.length,
    trainingSessionCount: sorted.length,
  };
}

export async function getOuderGesprekkenForSporter(
  sporterId: string,
): Promise<OuderGesprek[]> {
  const rows = await db
    .select()
    .from(schema.ouderGesprekken)
    .where(eq(schema.ouderGesprekken.sporterId, sporterId));
  const list = rows.map((r) => ({
    id: r.id,
    sporterId: r.sporterId,
    datum: r.datum,
    type: r.type as OuderGesprekType,
    notities: r.notities,
  }));
  return list.sort(
    (a, b) =>
      trainingSessionDatumToTime(b.datum) - trainingSessionDatumToTime(a.datum),
  );
}

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
    now.getDate(),
  ).getTime();
  const pastPops = list.filter(
    (g) =>
      g.type === "pop" && isOuderGesprekDatumBeforeToday(g.datum, todayStart),
  );
  if (pastPops.length === 0) {
    return "Nog geen POP-gesprek geregistreerd";
  }
  const last = pastPops.reduce((a, b) =>
    trainingSessionDatumToTime(b.datum) > trainingSessionDatumToTime(a.datum)
      ? b
      : a,
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
  notities: string,
): Promise<OuderGesprek> {
  const trimmed = datumInput.trim();
  if (!isValidEuropeanDateString(trimmed)) {
    throw new Error(INVALID_OUDER_GESPREK_DATUM);
  }
  const datum = normalizeOuderGesprekDatum(trimmed);
  const id = randomUUID();
  const gesprek: OuderGesprek = {
    id,
    sporterId,
    datum,
    type,
    notities: notities.trim(),
  };
  await db.insert(schema.ouderGesprekken).values({
    id,
    sporterId,
    datum,
    type,
    notities: gesprek.notities,
  });
  return gesprek;
}

export async function updateOuderGesprek(
  id: string,
  updates: { datum?: string; type?: OuderGesprekType; notities?: string },
): Promise<OuderGesprek | undefined> {
  const rows = await db
    .select()
    .from(schema.ouderGesprekken)
    .where(eq(schema.ouderGesprekken.id, id))
    .limit(1);
  if (!rows[0]) return undefined;
  const cur = rows[0];
  let datum = cur.datum;
  if (updates.datum !== undefined) {
    const t = updates.datum.trim();
    if (!isValidEuropeanDateString(t)) {
      throw new Error(INVALID_OUDER_GESPREK_DATUM);
    }
    datum = normalizeOuderGesprekDatum(t);
  }
  const next: OuderGesprek = {
    id: cur.id,
    sporterId: cur.sporterId,
    datum,
    type: (updates.type ?? cur.type) as OuderGesprekType,
    notities:
      updates.notities !== undefined ? updates.notities.trim() : cur.notities,
  };
  await db
    .update(schema.ouderGesprekken)
    .set({
      datum: next.datum,
      type: next.type,
      notities: next.notities,
    })
    .where(eq(schema.ouderGesprekken.id, id));
  return next;
}

export async function deleteOuderGesprek(id: string): Promise<void> {
  await db.delete(schema.ouderGesprekken).where(eq(schema.ouderGesprekken.id, id));
}

function rowToWedstrijd(
  row: typeof schema.wedstrijden.$inferSelect,
): Wedstrijd {
  return {
    id: row.id,
    sporterId: row.sporterId,
    sharedMatchId: row.sharedMatchId ?? undefined,
    naam: row.naam,
    datum: row.datum,
    locatie: row.locatie,
    scores: (row.scores ?? {}) as Record<string, ToestelScore>,
    expectedDWaarde: row.expectedDWaarde as
      | Record<string, number | null>
      | undefined,
    targetNiveaus: row.targetNiveaus as string[] | undefined,
  };
}

function wedstrijdToInsert(w: Wedstrijd): typeof schema.wedstrijden.$inferInsert {
  return {
    id: w.id,
    sporterId: w.sporterId,
    sharedMatchId: w.sharedMatchId ?? null,
    naam: w.naam,
    datum: w.datum,
    locatie: w.locatie,
    scores: w.scores,
    expectedDWaarde: w.expectedDWaarde ?? null,
    targetNiveaus: w.targetNiveaus ?? null,
  };
}

async function ensureWedstrijdenNormalized(): Promise<void> {
  const rows = await db.select().from(schema.wedstrijden);
  const raw = rows.map(rowToWedstrijd);
  const sporters = await listSporters();
  const migrated = await getMeta(META_WEDSTRIJDEN_MIGRATED);
  const wedstrijdenMigrated = migrated === "1";
  const { persistedJson, shouldRewriteStorage } = normalizeStoredWedstrijden(
    raw,
    sporters,
    wedstrijdenMigrated,
    randomUUID,
  );

  if (shouldRewriteStorage) {
    const parsed = JSON.parse(persistedJson) as Wedstrijd[];
    await db.transaction(async (tx) => {
      await tx.delete(schema.wedstrijden);
      for (const w of parsed) {
        await tx.insert(schema.wedstrijden).values(wedstrijdToInsert(w));
      }
      await tx
        .insert(schema.appMeta)
        .values({ key: META_WEDSTRIJDEN_MIGRATED, value: "1" })
        .onConflictDoUpdate({
          target: schema.appMeta.key,
          set: { value: "1" },
        });
    });
  }
}

async function getNormalizedWedstrijden(): Promise<Wedstrijd[]> {
  await ensureWedstrijdenNormalized();
  const rows = await db.select().from(schema.wedstrijden);
  return rows.map(rowToWedstrijd);
}

export async function getLastWedstrijdFromOtherSporters(
  sporterId: string,
): Promise<Wedstrijd | undefined> {
  const all = await getNormalizedWedstrijden();
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

async function getCustomAgendaEvents(): Promise<CustomAgendaEvent[]> {
  const rows = await db.select().from(schema.customAgendaEvents);
  const out: CustomAgendaEvent[] = [];
  for (const e of rows) {
    const categorie = normalizeAgendaKalenderCategorieFromDb(e.categorie);
    if (e.categorie !== categorie) {
      await db
        .update(schema.customAgendaEvents)
        .set({ categorie })
        .where(eq(schema.customAgendaEvents.id, e.id));
    }
    const lesplanVis: LesplanVisibility | "" =
      categorie === "lesplan"
        ? e.lesplanVisibility === "private"
          ? "private"
          : "public"
        : "";
    out.push({
      id: e.id,
      titel: e.titel,
      datum: e.datum,
      locatie: e.locatie,
      categorie,
      notitie: e.notitie,
      lesplanVisibility: lesplanVis,
      ownerUserId: categorie === "lesplan" ? e.ownerUserId ?? null : null,
    });
  }
  return out;
}

export async function getUpcomingAgendaItems(options: {
  onlyFavorieten?: boolean;
  /** When set (after auth), filters private lesplans to this user. */
  viewerUserId?: string;
} = {}): Promise<AgendaItem[]> {
  const all = await getNormalizedWedstrijden();
  const sporters = await listSporters();
  const sporterById = new Map(sporters.map((s) => [s.id, s]));
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
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
    if (
      favorietIds !== null &&
      !group.some((g) => favorietIds.has(g.sporterId))
    )
      continue;
    const niveaus = [
      ...new Set(
        group
          .map((g) => sporterById.get(g.sporterId)?.niveau)
          .filter(Boolean) as string[],
      ),
    ];
    const label =
      niveaus.length > 0
        ? `Niveaus: ${niveaus.join(", ")}`
        : sporterById.get(representative.sporterId)?.naam ?? "Onbekend";
    items.push({
      source: "wedstrijd",
      ...representative,
      sporterNaam: label,
    });
  }

  const customAll = await getCustomAgendaEvents();
  const viewer = options.viewerUserId?.trim();
  for (const c of customAll) {
    if (!shouldIncludeKalenderEventForViewer(c, viewer)) continue;
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
      lesplanVisibility: c.lesplanVisibility,
      ownerUserId: c.ownerUserId,
    });
  }

  const gesprekkenAll = await db.select().from(schema.ouderGesprekken);
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
      gesprekType: g.type as OuderGesprekType,
      sporterId: g.sporterId,
      sporterNaam: naam,
    });
  }

  for (const s of sporters) {
    if (favorietIds !== null && !favorietIds.has(s.id)) continue;
    const geboortedatum = s.geboortedatum?.trim() ?? "";
    if (!geboortedatum) continue;

    const window = getBirthdayAgendaWindowDays(geboortedatum, 7, now);
    if (!window) continue;

    const birth = europeanDatumStringToLocalDate(normalizeEuropeanDate(geboortedatum));
    const datum = formatLocalDateEuropean(window.birthday);
    items.push({
      source: "verjaardag",
      id: `verjaardag-${s.id}-${datum}`,
      titel: s.naam,
      datum,
      sporterId: s.id,
      sporterNaam: s.naam,
      leeftijd: calculateAgeOnDate(birth, window.birthday),
      dagenTotVerjaardag: window.daysUntil,
    });
  }

  items.sort(
    (a, b) =>
      wedstrijdDatumToTimestamp(a.datum)! -
      wedstrijdDatumToTimestamp(b.datum)!,
  );
  return items;
}

export async function addCustomAgendaEvent(
  titel: string,
  datum: string,
  locatie: string,
  categorie: AgendaKalenderCategorie,
  notitie: string,
  options?: {
    lesplanVisibility?: LesplanVisibility;
    ownerUserId?: string | null;
  },
): Promise<CustomAgendaEvent> {
  const cat = normalizeAgendaKalenderCategorieFromDb(String(categorie));
  const trimmedNotitie = notitie.trim();
  const normalizedDatum = normalizeEuropeanDate(datum);
  if (wedstrijdDatumToTimestamp(normalizedDatum) === null) {
    throw new Error(INVALID_AGENDA_DATUM);
  }
  if (cat === "lesplan") {
    if (!trimmedNotitie) {
      throw new Error(MISSING_AGENDA_LESPLAN_PLAN);
    }
  } else if (!titel.trim()) {
    throw new Error(MISSING_AGENDA_TITEL);
  }
  const trimmedTitel =
    cat === "lesplan" ? titel.trim() || "Lesplan" : titel.trim();
  const id = randomUUID();
  const lesplanVis: LesplanVisibility =
    cat === "lesplan" ? (options?.lesplanVisibility ?? "public") : "public";
  const ownerId = cat === "lesplan" ? (options?.ownerUserId ?? null) : null;
  const ev: CustomAgendaEvent = {
    id,
    titel: trimmedTitel,
    datum: normalizedDatum,
    locatie: locatie.trim(),
    categorie: cat,
    notitie: trimmedNotitie,
    lesplanVisibility: cat === "lesplan" ? lesplanVis : "",
    ownerUserId: cat === "lesplan" ? ownerId : null,
  };
  await db.insert(schema.customAgendaEvents).values({
    id,
    titel: ev.titel,
    datum: ev.datum,
    locatie: ev.locatie,
    categorie: ev.categorie,
    notitie: ev.notitie,
    lesplanVisibility: cat === "lesplan" ? lesplanVis : "",
    ownerUserId: cat === "lesplan" ? ownerId : null,
  });
  return ev;
}

export async function updateLesplanById(
  id: string,
  input: {
    datum: string;
    notitie: string;
    lesplanVisibility: LesplanVisibility;
  },
  actorUserId: string,
): Promise<CustomAgendaEvent | null> {
  const rows = await db
    .select()
    .from(schema.customAgendaEvents)
    .where(eq(schema.customAgendaEvents.id, id))
    .limit(1);
  if (!rows[0]) return null;
  const row = rows[0];
  const categorie = normalizeAgendaKalenderCategorieFromDb(row.categorie);
  const looksLesplan =
    categorie === "lesplan" ||
    row.lesplanVisibility === "private" ||
    row.lesplanVisibility === "public";
  if (!looksLesplan) return null;

  assertLesplanActorAllowed(row.ownerUserId, actorUserId);

  const trimmedNotitie = input.notitie.trim();
  const normalizedDatum = normalizeEuropeanDate(input.datum);
  if (wedstrijdDatumToTimestamp(normalizedDatum) === null) {
    throw new Error(INVALID_AGENDA_DATUM);
  }
  if (!trimmedNotitie) {
    throw new Error(MISSING_AGENDA_LESPLAN_PLAN);
  }

  const lesplanVis: LesplanVisibility =
    input.lesplanVisibility === "private" ? "private" : "public";
  const actor = actorUserId.trim();
  let ownerId = row.ownerUserId?.trim() || null;
  if (!ownerId) {
    ownerId = actor;
  }

  await db
    .update(schema.customAgendaEvents)
    .set({
      datum: normalizedDatum,
      notitie: trimmedNotitie,
      lesplanVisibility: lesplanVis,
      ownerUserId: ownerId,
    })
    .where(eq(schema.customAgendaEvents.id, id));

  return {
    id: row.id,
    titel: row.titel,
    datum: normalizedDatum,
    locatie: row.locatie,
    categorie: "lesplan",
    notitie: trimmedNotitie,
    lesplanVisibility: lesplanVis,
    ownerUserId: ownerId,
  };
}

export async function deleteLesplanById(
  id: string,
  actorUserId: string,
): Promise<boolean> {
  const rows = await db
    .select()
    .from(schema.customAgendaEvents)
    .where(eq(schema.customAgendaEvents.id, id))
    .limit(1);
  if (!rows[0]) return false;
  const row = rows[0];
  const categorie = normalizeAgendaKalenderCategorieFromDb(row.categorie);
  const looksLesplan =
    categorie === "lesplan" ||
    row.lesplanVisibility === "private" ||
    row.lesplanVisibility === "public";
  if (!looksLesplan) return false;

  assertLesplanActorAllowed(row.ownerUserId, actorUserId);

  await db
    .delete(schema.customAgendaEvents)
    .where(eq(schema.customAgendaEvents.id, id));
  return true;
}

export async function addWedstrijd(
  sporterId: string,
  naam: string,
  datum: string,
  locatie: string,
  expectedDWaarde?: Record<string, number | null>,
  options?: { targetNiveaus?: string[] },
): Promise<Wedstrijd> {
  await ensureWedstrijdenNormalized();
  const all = await db.select().from(schema.wedstrijden);
  let list = all.map(rowToWedstrijd);
  const normalizedDatum = normalizeEuropeanDate(datum);
  const targetNiveaus = normalizeTargetNiveaus(options?.targetNiveaus);
  const existingIndex = list.findIndex(
    (w) =>
      w.sporterId === sporterId &&
      w.naam === naam &&
      normalizeEuropeanDate(w.datum) === normalizedDatum &&
      w.locatie === locatie &&
      normalizeTargetNiveaus(w.targetNiveaus).join("|") ===
        targetNiveaus.join("|"),
  );
  if (existingIndex !== -1) {
    throw new Error(DUPLICATE_WEDSTRIJD_ERROR);
  }
  const newWedstrijd: Wedstrijd = {
    id: randomUUID(),
    sporterId,
    naam,
    datum: normalizedDatum,
    locatie,
    scores: {},
    expectedDWaarde: expectedDWaarde ?? {},
    targetNiveaus,
  };
  list.push(newWedstrijd);
  await replaceAllWedstrijden(list);
  return newWedstrijd;
}

async function replaceAllWedstrijden(list: Wedstrijd[]): Promise<void> {
  const deduped = dedupeWedstrijdenById(list);
  await db.transaction(async (tx) => {
    await tx.delete(schema.wedstrijden);
    for (const w of deduped) {
      await tx.insert(schema.wedstrijden).values(wedstrijdToInsert(w));
    }
  });
}

export async function addWedstrijdForSporters(input: {
  sporterIds: string[];
  naam: string;
  datum: string;
  locatie: string;
  expectedDWaardeBySporterId?: Record<string, Record<string, number | null>>;
}): Promise<Wedstrijd[]> {
  await ensureWedstrijdenNormalized();
  const all = (await db.select().from(schema.wedstrijden)).map(rowToWedstrijd);
  const sporterIds = [...new Set(input.sporterIds.filter(Boolean))];
  if (sporterIds.length === 0) return [];
  const normalizedDatum = normalizeEuropeanDate(input.datum);
  const sharedMatchId = randomUUID();
  const created: Wedstrijd[] = [];
  for (let i = 0; i < sporterIds.length; i++) {
    const sporterId = sporterIds[i];
    const expectedSnapshot = input.expectedDWaardeBySporterId?.[sporterId] ?? {};
    const duplicate = all.find(
      (w) =>
        w.sporterId === sporterId &&
        w.naam === input.naam &&
        normalizeEuropeanDate(w.datum) === normalizedDatum &&
        w.locatie === input.locatie,
    );
    if (duplicate) {
      throw new Error(DUPLICATE_WEDSTRIJD_ERROR);
    }
    const wedstrijd: Wedstrijd = {
      id: randomUUID(),
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
  await replaceAllWedstrijden(all);
  return created;
}

export async function saveWedstrijdScores(
  id: string,
  scores: Record<string, ToestelScore>,
): Promise<void> {
  await ensureWedstrijdenNormalized();
  const all = (await db.select().from(schema.wedstrijden)).map(rowToWedstrijd);
  const index = all.findIndex((w) => w.id === id);
  if (index === -1) return;
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
  await replaceAllWedstrijden(all);
}

export async function saveToestelNotes(
  wedstrijdId: string,
  toestel: string,
  dScoreNote: string,
  eScoreNote: string,
  penaltyNote: string,
): Promise<void> {
  await ensureWedstrijdenNormalized();
  const all = (await db.select().from(schema.wedstrijden)).map(rowToWedstrijd);
  const index = all.findIndex((w) => w.id === wedstrijdId);
  if (index === -1) return;
  const existing =
    all[index].scores[toestel] ?? { dScore: 0, eScore: 0, penalty: 0 };
  all[index].scores[toestel] = {
    ...existing,
    dScoreNote,
    eScoreNote,
    penaltyNote,
  };
  await replaceAllWedstrijden(all);
}

export async function saveExpectedDWaarde(
  wedstrijdId: string,
  toestel: string,
  value: number | null,
): Promise<void> {
  await ensureWedstrijdenNormalized();
  const all = (await db.select().from(schema.wedstrijden)).map(rowToWedstrijd);
  const index = all.findIndex((w) => w.id === wedstrijdId);
  if (index === -1) return;
  if (!all[index].expectedDWaarde) all[index].expectedDWaarde = {};
  all[index].expectedDWaarde![toestel] = value;
  await replaceAllWedstrijden(all);
}

export async function saveWedstrijdNaam(
  wedstrijdId: string,
  naam: string,
): Promise<void> {
  await ensureWedstrijdenNormalized();
  const all = (await db.select().from(schema.wedstrijden)).map(rowToWedstrijd);
  const index = all.findIndex((w) => w.id === wedstrijdId);
  if (index === -1) return;
  const sharedId = all[index].sharedMatchId;
  if (sharedId) {
    for (const w of all) {
      if (w.sharedMatchId === sharedId) w.naam = naam;
    }
  } else {
    all[index].naam = naam;
  }
  await replaceAllWedstrijden(all);
}

export async function saveWedstrijdInfo(
  wedstrijdId: string,
  naam: string,
  datum: string,
  locatie: string,
): Promise<void> {
  await ensureWedstrijdenNormalized();
  const all = (await db.select().from(schema.wedstrijden)).map(rowToWedstrijd);
  const index = all.findIndex((w) => w.id === wedstrijdId);
  if (index === -1) return;
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
  await replaceAllWedstrijden(all);
}

export async function deleteWedstrijd(id: string): Promise<void> {
  await ensureWedstrijdenNormalized();
  const all = (await db.select().from(schema.wedstrijden)).map(rowToWedstrijd);
  await replaceAllWedstrijden(all.filter((w) => w.id !== id));
}

export async function importLegacyPayload(body: {
  sporters?: Sporter[];
  /** Alias for legacy AsyncStorage key shape */
  onderdelen?: Record<string, TurnOnderdeel[]>;
  onderdelenCatalog?: Record<string, TurnOnderdeel[]>;
  blessures?: Record<string, SporterBlessures>;
  trainingSessions?: TrainingSession[];
  ouderGesprekken?: OuderGesprek[];
  wedstrijden?: Wedstrijd[];
  wedstrijdenMigrated?: boolean;
  customAgendaEvents?: CustomAgendaEvent[];
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(schema.customAgendaEvents);
    await tx.delete(schema.wedstrijden);
    await tx.delete(schema.ouderGesprekken);
    await tx.delete(schema.trainingSessions);
    await tx.delete(schema.sporterBlessures);
    await tx.delete(schema.sporters);
    await tx.delete(schema.onderdelenCatalog);

    const sporters = body.sporters ?? [];
    for (const s of sporters) {
      const m = migrateSporterRow(s);
      await tx.insert(schema.sporters).values({
        id: m.id,
        naam: m.naam,
        geboortedatum: m.geboortedatum ?? "",
        niveau: m.niveau,
        favoriet: m.favoriet,
        onderdelen: m.onderdelen,
        oefening: m.oefening,
      });
    }

    const catalog =
      body.onderdelenCatalog ?? body.onderdelen ?? {};
    await tx.insert(schema.onderdelenCatalog).values({
      id: CATALOG_ID,
      data: catalog,
    });

    const blessures = body.blessures ?? {};
    for (const [sporterId, b] of Object.entries(blessures)) {
      await tx.insert(schema.sporterBlessures).values({
        sporterId,
        current: b.current,
        previous: b.previous,
      });
    }

    const sessions = body.trainingSessions ?? [];
    for (const ses of sessions) {
      await tx.insert(schema.trainingSessions).values({
        id: ses.id,
        datum: ses.datum,
        attendeeSporterIds: ses.attendeeSporterIds,
      });
    }

    const gesprekken = body.ouderGesprekken ?? [];
    for (const g of gesprekken) {
      await tx.insert(schema.ouderGesprekken).values({
        id: g.id,
        sporterId: g.sporterId,
        datum: g.datum,
        type: g.type,
        notities: g.notities,
      });
    }

    const wedstr = body.wedstrijden ?? [];
    for (const w of wedstr) {
      await tx.insert(schema.wedstrijden).values(wedstrijdToInsert(w));
    }

    const custom = body.customAgendaEvents ?? [];
    for (const c of custom) {
      const categorie = normalizeAgendaKalenderCategorieFromDb(String(c.categorie));
      const lpVis =
        categorie === "lesplan"
          ? c.lesplanVisibility === "private"
            ? "private"
            : "public"
          : "";
      await tx.insert(schema.customAgendaEvents).values({
        id: c.id,
        titel: c.titel,
        datum: c.datum,
        locatie: c.locatie,
        categorie,
        notitie: c.notitie,
        lesplanVisibility: lpVis,
        ownerUserId:
          categorie === "lesplan" ? (c.ownerUserId ?? null) : null,
      });
    }

    await tx.delete(schema.appMeta).where(eq(schema.appMeta.key, META_WEDSTRIJDEN_MIGRATED));
    if (body.wedstrijdenMigrated) {
      await tx.insert(schema.appMeta).values({
        key: META_WEDSTRIJDEN_MIGRATED,
        value: "1",
      });
    }
  });
}
