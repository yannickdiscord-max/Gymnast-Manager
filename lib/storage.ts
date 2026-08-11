export type {
  AgendaItem,
  AgendaItemKalender,
  AgendaItemOuderGesprek,
  AgendaItemWedstrijd,
  AgendaKalenderCategorie,
  AgendaWedstrijdItem,
  CustomAgendaEvent,
  Idee,
  IdeeCategorie,
  LesplanVisibility,
  Elementgroep,
  OuderGesprek,
  Sporter,
  SporterBlessures,
  Toestel,
  ToestelScore,
  TrainingSession,
  TurnOnderdeel,
  TurnOnderdeelNiveau,
  Wedstrijd,
} from "../shared/turnteam-domain";

import type {
  AgendaKalenderCategorie,
  AgendaItem,
  CustomAgendaEvent,
  Idee,
  IdeeCategorie,
  LesplanVisibility,
  OuderGesprek,
  OuderGesprekType,
  Sporter,
  SporterBlessures,
  Toestel,
  ToestelScore,
  TrainingSession,
  TurnOnderdeel,
  Wedstrijd,
} from "../shared/turnteam-domain";

export {
  AGENDA_CATEGORIE_LABELS,
  DUPLICATE_TRAINING_SESSION_ERROR,
  DUPLICATE_WEDSTRIJD_ERROR,
  DWAARDE_PER_NIVEAU,
  ELEMENTGROEP_ROMAN,
  ELEMENTGROEPEN,
  IDEE_CATEGORIE_LABELS,
  IDEE_CATEGORIEEN,
  IDEE_NOT_FOUND,
  INVALID_AGENDA_DATUM,
  INVALID_AGENDA_EINDDATUM,
  INVALID_AGENDA_PERIODE,
  INVALID_IDEE_CATEGORIE,
  INVALID_OUDER_GESPREK_DATUM,
  INVALID_GEBOORTEDATUM,
  INVALID_SPRONG_DWAARDE,
  INVALID_YOUTUBE_URL,
  INVALID_TRAINING_SESSION_DATUM,
  TRAINING_SESSION_NOT_FOUND,
  LESPLAN_ACTION_FORBIDDEN,
  MISSING_AGENDA_LESPLAN_PLAN,
  MISSING_AGENDA_TITEL,
  MISSING_IDEE_NAAM,
  MISSING_IDEE_UITLEG,
  NIVEAU_MINIMUM,
  NIVEAUS,
  ONDERDELEN_PER_TOESTEL,
  SPRONG_MAX_OEFENING_ONDERDELEN,
  TURN_ONDERDEEL_NIVEAUS,
  TOESTELLEN,
  calculateDWaarde,
  calculateAfsprongBonus,
  calculateOefeningDWaarde,
  isOnderdeelMarkedAfsprong,
  hasOnderdeelYoutubeUrl,
  isValidYoutubeUrl,
  normalizeYoutubeUrl,
  calculateSprongOefeningDWaarde,
  getMinimumForNiveau,
  isSprongToestel,
  parseSprongDWaardeInput,
  sortOnderdelen,
} from "../shared/turnteam-domain";

export {
  calculateNiveauFromGeboortedatum,
  calculateTurnSeasonAgeFromGeboortedatum,
  formatAgendaDatumWeergave,
} from "../shared/turnteam-dates";

export type { OuderGesprekType } from "../shared/turnteam-domain";

import { apiFetch, apiFetchOptional } from "./api";

export async function getOnderdelen(toestel: Toestel): Promise<TurnOnderdeel[]> {
  return apiFetch(`/api/onderdelen/${encodeURIComponent(toestel)}`);
}

export async function addOnderdeel(
  toestel: Toestel,
  onderdeel: TurnOnderdeel,
): Promise<void> {
  await apiFetch(`/api/onderdelen/${encodeURIComponent(toestel)}`, {
    method: "POST",
    body: JSON.stringify(onderdeel),
  });
}

export async function deleteOnderdeel(
  toestel: Toestel,
  naam: string,
): Promise<void> {
  await apiFetch(
    `/api/onderdelen/${encodeURIComponent(toestel)}?naam=${encodeURIComponent(naam)}`,
    { method: "DELETE" },
  );
}

export async function updateOnderdeelAfsprong(
  toestel: Toestel,
  naam: string,
  isAfsprong: boolean,
): Promise<TurnOnderdeel> {
  return apiFetch(`/api/onderdelen/${encodeURIComponent(toestel)}`, {
    method: "PATCH",
    body: JSON.stringify({ naam, isAfsprong }),
  });
}

export async function updateOnderdeelYoutubeUrl(
  toestel: Toestel,
  naam: string,
  youtubeUrl: string,
): Promise<TurnOnderdeel> {
  return apiFetch(`/api/onderdelen/${encodeURIComponent(toestel)}/youtube`, {
    method: "PATCH",
    body: JSON.stringify({ naam, youtubeUrl }),
  });
}

export async function getSporters(): Promise<Sporter[]> {
  return apiFetch("/api/sporters");
}

export async function addSporter(
  naam: string,
  niveau: string,
  geboortedatum: string,
): Promise<Sporter> {
  return apiFetch("/api/sporters", {
    method: "POST",
    body: JSON.stringify({ naam, niveau, geboortedatum }),
  });
}

export async function toggleFavoriet(id: string): Promise<Sporter[]> {
  return apiFetch(`/api/sporters/${encodeURIComponent(id)}/toggle-favoriet`, {
    method: "POST",
  });
}

export async function getSporter(id: string): Promise<Sporter | undefined> {
  return apiFetchOptional(`/api/sporters/${encodeURIComponent(id)}`);
}

export async function updateSporterOnderdelen(
  id: string,
  toestel: Toestel,
  onderdelen: string[],
): Promise<void> {
  await apiFetch(
    `/api/sporters/${encodeURIComponent(id)}/onderdelen/${encodeURIComponent(toestel)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ onderdelen }),
    },
  );
}

export async function updateSporterOefening(
  id: string,
  toestel: Toestel,
  oefening: string[],
): Promise<void> {
  await apiFetch(
    `/api/sporters/${encodeURIComponent(id)}/oefening/${encodeURIComponent(toestel)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ oefening }),
    },
  );
}

export async function updateSporterNiveau(
  id: string,
  niveau: string,
): Promise<Sporter | undefined> {
  return apiFetch(`/api/sporters/${encodeURIComponent(id)}/niveau`, {
    method: "PATCH",
    body: JSON.stringify({ niveau }),
  });
}

export async function deleteSporter(id: string): Promise<void> {
  await apiFetch(`/api/sporters/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getBlessuresForSporter(
  sporterId: string,
): Promise<SporterBlessures> {
  return apiFetch(`/api/blessures/${encodeURIComponent(sporterId)}`);
}

export async function addCurrentBlessure(
  sporterId: string,
  blessureNaam: string,
): Promise<SporterBlessures> {
  return apiFetch(`/api/blessures/${encodeURIComponent(sporterId)}/current`, {
    method: "POST",
    body: JSON.stringify({ blessureNaam }),
  });
}

export async function removeCurrentBlessure(
  sporterId: string,
  blessureNaam: string,
): Promise<SporterBlessures> {
  return apiFetch(
    `/api/blessures/${encodeURIComponent(sporterId)}/current?naam=${encodeURIComponent(blessureNaam)}`,
    { method: "DELETE" },
  );
}

export async function moveCurrentBlessureToPrevious(
  sporterId: string,
  blessureNaam: string,
): Promise<SporterBlessures> {
  return apiFetch(
    `/api/blessures/${encodeURIComponent(sporterId)}/move-to-previous`,
    {
      method: "POST",
      body: JSON.stringify({ blessureNaam }),
    },
  );
}

export async function removePreviousBlessure(
  sporterId: string,
  blessureNaam: string,
): Promise<SporterBlessures> {
  return apiFetch(
    `/api/blessures/${encodeURIComponent(sporterId)}/previous?naam=${encodeURIComponent(blessureNaam)}`,
    { method: "DELETE" },
  );
}

export async function getTrainingSessions(): Promise<TrainingSession[]> {
  return apiFetch("/api/training-sessions");
}

export async function getTrainingSessionForDatum(
  datumInput: string,
): Promise<TrainingSession | undefined> {
  return apiFetchOptional(
    `/api/training-sessions/by-datum?datum=${encodeURIComponent(datumInput)}`,
  );
}

export async function addTrainingSession(
  datumInput: string,
  attendeeSporterIds: string[],
): Promise<TrainingSession> {
  return apiFetch("/api/training-sessions", {
    method: "POST",
    body: JSON.stringify({ datum: datumInput, attendeeSporterIds }),
  });
}

export async function updateTrainingSessionAttendees(
  sessionId: string,
  attendeeSporterIds: string[],
): Promise<TrainingSession> {
  return apiFetch(`/api/training-sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ attendeeSporterIds }),
  });
}

export async function deleteTrainingSession(sessionId: string): Promise<void> {
  await apiFetch(`/api/training-sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}

export async function getSporterAttendanceSummary(sporterId: string): Promise<{
  totalSessions: number;
  attendedSessions: number;
  percentage: number | null;
  recentMarks: { attended: boolean }[];
}> {
  return apiFetch(
    `/api/training-sessions/attendance/${encodeURIComponent(sporterId)}`,
  );
}

export async function setSporterAttendanceForSession(
  sessionId: string,
  sporterId: string,
  attended: boolean,
): Promise<TrainingSession> {
  return apiFetch(
    `/api/training-sessions/${encodeURIComponent(sessionId)}/attendance/${encodeURIComponent(sporterId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ attended }),
    },
  );
}

export async function getOuderGesprekkenForSporter(
  sporterId: string,
): Promise<OuderGesprek[]> {
  return apiFetch(
    `/api/ouder-gesprekken/sporter/${encodeURIComponent(sporterId)}`,
  );
}

export async function getLastPopGesprekLabel(sporterId: string): Promise<string> {
  const r = await apiFetch<{ label: string }>(
    `/api/ouder-gesprekken/last-pop-label/${encodeURIComponent(sporterId)}`,
  );
  return r.label;
}

export async function addOuderGesprek(
  sporterId: string,
  datumInput: string,
  type: OuderGesprekType,
  notities: string,
): Promise<OuderGesprek> {
  return apiFetch("/api/ouder-gesprekken", {
    method: "POST",
    body: JSON.stringify({ sporterId, datum: datumInput, type, notities }),
  });
}

export async function updateOuderGesprek(
  id: string,
  updates: { datum?: string; type?: OuderGesprekType; notities?: string },
): Promise<OuderGesprek | undefined> {
  return apiFetchOptional(`/api/ouder-gesprekken/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteOuderGesprek(id: string): Promise<void> {
  await apiFetch(`/api/ouder-gesprekken/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getIdeeen(categorie?: IdeeCategorie): Promise<Idee[]> {
  const params = new URLSearchParams();
  if (categorie) params.set("categorie", categorie);
  const qs = params.toString();
  return apiFetch(`/api/ideeen${qs ? `?${qs}` : ""}`);
}

export async function addIdee(
  naam: string,
  uitleg: string,
  categorie: IdeeCategorie,
): Promise<Idee> {
  return apiFetch("/api/ideeen", {
    method: "POST",
    body: JSON.stringify({ naam, uitleg, categorie }),
  });
}

export async function deleteIdee(id: string): Promise<void> {
  await apiFetch(`/api/ideeen/${encodeURIComponent(id.trim())}`, {
    method: "DELETE",
  });
}

export async function getLastWedstrijdFromOtherSporters(
  sporterId: string,
): Promise<Wedstrijd | undefined> {
  const w = await apiFetch<Wedstrijd | null>(
    `/api/wedstrijden/last-other/${encodeURIComponent(sporterId)}`,
  );
  return w ?? undefined;
}

export async function getWedstrijden(sporterId: string): Promise<Wedstrijd[]> {
  return apiFetch(
    `/api/wedstrijden/sporter/${encodeURIComponent(sporterId)}`,
  );
}

export async function getWedstrijd(id: string): Promise<Wedstrijd | undefined> {
  return apiFetchOptional(`/api/wedstrijden/${encodeURIComponent(id)}`);
}

export async function getUpcomingAgendaItems(options: {
  onlyFavorieten?: boolean;
  viewerUserId?: string;
} = {}): Promise<AgendaItem[]> {
  const params = new URLSearchParams();
  if (options.onlyFavorieten === true) params.set("onlyFavorieten", "1");
  const v = options.viewerUserId?.trim();
  if (v) params.set("viewerUserId", v);
  const qs = params.toString();
  return apiFetch(`/api/agenda/upcoming${qs ? `?${qs}` : ""}`);
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
    einddatum?: string;
  },
): Promise<CustomAgendaEvent> {
  return apiFetch("/api/agenda/custom-events", {
    method: "POST",
    body: JSON.stringify({
      titel,
      datum,
      locatie,
      categorie,
      notitie,
      lesplanVisibility: options?.lesplanVisibility,
      ownerUserId: options?.ownerUserId,
      einddatum: options?.einddatum,
    }),
  });
}

export async function updateLesplan(
  id: string,
  input: {
    datum: string;
    notitie: string;
    lesplanVisibility: LesplanVisibility;
    viewerUserId: string;
  },
): Promise<CustomAgendaEvent> {
  return apiFetch(`/api/agenda/lesplan/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      datum: input.datum,
      notitie: input.notitie,
      lesplanVisibility: input.lesplanVisibility,
      viewerUserId: input.viewerUserId,
    }),
  });
}

export async function deleteCustomAgendaEvent(
  id: string,
  options?: { viewerUserId?: string },
): Promise<void> {
  const params = new URLSearchParams();
  const v = options?.viewerUserId?.trim();
  if (v) params.set("viewerUserId", v);
  const qs = params.toString();
  await apiFetch(
    `/api/agenda/custom-events/${encodeURIComponent(id.trim())}${qs ? `?${qs}` : ""}`,
    { method: "DELETE" },
  );
}

export async function deleteLesplan(id: string, viewerUserId: string): Promise<void> {
  await deleteCustomAgendaEvent(id, { viewerUserId });
}

export async function addWedstrijd(
  sporterId: string,
  naam: string,
  datum: string,
  locatie: string,
  expectedDWaarde?: Record<string, number | null>,
  options?: { targetNiveaus?: string[] },
): Promise<Wedstrijd> {
  return apiFetch("/api/wedstrijden", {
    method: "POST",
    body: JSON.stringify({
      sporterId,
      naam,
      datum,
      locatie,
      expectedDWaarde,
      targetNiveaus: options?.targetNiveaus,
    }),
  });
}

export async function addWedstrijdForSporters(input: {
  sporterIds: string[];
  naam: string;
  datum: string;
  locatie: string;
  expectedDWaardeBySporterId?: Record<string, Record<string, number | null>>;
}): Promise<Wedstrijd[]> {
  return apiFetch("/api/wedstrijden/multi", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function saveWedstrijdScores(
  id: string,
  scores: Record<string, ToestelScore>,
): Promise<void> {
  await apiFetch(`/api/wedstrijden/${encodeURIComponent(id)}/scores`, {
    method: "PATCH",
    body: JSON.stringify({ scores }),
  });
}

export async function saveToestelNotes(
  wedstrijdId: string,
  toestel: string,
  dScoreNote: string,
  eScoreNote: string,
  penaltyNote: string,
): Promise<void> {
  await apiFetch(
    `/api/wedstrijden/${encodeURIComponent(wedstrijdId)}/toestel-notes/${encodeURIComponent(toestel)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ dScoreNote, eScoreNote, penaltyNote }),
    },
  );
}

export async function saveExpectedDWaarde(
  wedstrijdId: string,
  toestel: string,
  value: number | null,
): Promise<void> {
  await apiFetch(
    `/api/wedstrijden/${encodeURIComponent(wedstrijdId)}/expected-d/${encodeURIComponent(toestel)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ value }),
    },
  );
}

export async function saveWedstrijdNaam(
  wedstrijdId: string,
  naam: string,
): Promise<void> {
  await apiFetch(`/api/wedstrijden/${encodeURIComponent(wedstrijdId)}/naam`, {
    method: "PATCH",
    body: JSON.stringify({ naam }),
  });
}

export async function saveWedstrijdInfo(
  wedstrijdId: string,
  naam: string,
  datum: string,
  locatie: string,
): Promise<void> {
  await apiFetch(`/api/wedstrijden/${encodeURIComponent(wedstrijdId)}/info`, {
    method: "PATCH",
    body: JSON.stringify({ naam, datum, locatie }),
  });
}

export async function deleteWedstrijd(id: string): Promise<void> {
  await apiFetch(`/api/wedstrijden/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
