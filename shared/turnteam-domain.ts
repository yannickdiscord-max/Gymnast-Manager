/** Shared Turnteam types and constants (no storage / I/O). */

export interface Sporter {
  id: string;
  naam: string;
  /** Geboortedatum in DD-MM-JJJJ. */
  geboortedatum: string;
  niveau: string;
  favoriet: boolean;
  onderdelen: Record<string, string[]>;
  oefening: Record<string, string[]>;
}

export interface TurnOnderdeel {
  naam: string;
  niveau: TurnOnderdeelNiveau;
  elementgroep: 1 | 2 | 3 | 4;
  /** Vaste D-waarde per onderdeel (alleen Sprong). */
  dWaarde?: number;
  /** Onderdeel kan als afsprong dienen (niet bij Sprong). */
  isAfsprong?: boolean;
  /** Optionele YouTube-uitlegvideo. */
  youtubeUrl?: string;
}

export const TURN_ONDERDEEL_NIVEAUS = ["tA", "A", "B", "C", "D", "E"] as const;
export type TurnOnderdeelNiveau = (typeof TURN_ONDERDEEL_NIVEAUS)[number];

export const ELEMENTGROEPEN = [1, 2, 3, 4] as const;
export type Elementgroep = 1 | 2 | 3 | 4;
export const ELEMENTGROEP_ROMAN: Record<1 | 2 | 3 | 4, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
};

export const TOESTELLEN = [
  "Vloer",
  "Voltige",
  "Ringen",
  "Sprong",
  "Brug",
  "Rekstok",
] as const;

export type Toestel = (typeof TOESTELLEN)[number];

export const SPRONG_TOESTEL: Toestel = "Sprong";
export const SPRONG_MAX_OEFENING_ONDERDELEN = 2;

export function isSprongToestel(toestel: string): toestel is typeof SPRONG_TOESTEL {
  return toestel === SPRONG_TOESTEL;
}

/** Deterministic D-waarde tussen 2.0 en 2.6 (nieuwe installaties). */
export function sprongDefaultDWaardeForNaam(naam: string): number {
  let hash = 0;
  for (let i = 0; i < naam.length; i++) {
    hash = (hash * 31 + naam.charCodeAt(i)) | 0;
  }
  const offset = (Math.abs(hash) % 61) / 100;
  return Math.round((2.0 + offset) * 10) / 10;
}

/** Eenmalige random D-waarde tussen 2.0 en 2.6 voor bestaande onderdelen zonder waarde. */
export function randomSprongDWaarde(): number {
  return Math.round((2.0 + Math.random() * 0.6) * 10) / 10;
}

export function sprongDWaardeMissing(onderdeel: TurnOnderdeel): boolean {
  return onderdeel.dWaarde == null || Number.isNaN(onderdeel.dWaarde);
}

function sprongOnderdeel(
  naam: string,
): TurnOnderdeel {
  return {
    naam,
    niveau: "tA",
    elementgroep: 1,
    dWaarde: sprongDefaultDWaardeForNaam(naam),
  };
}

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
    sprongOnderdeel("Hurksprong"),
    sprongOnderdeel("Streeksprong"),
    sprongOnderdeel("Gratssprong"),
    sprongOnderdeel("Handspring"),
    sprongOnderdeel("Overslag"),
    sprongOnderdeel("Yamashita"),
    sprongOnderdeel("Tsukahara"),
    sprongOnderdeel("Salto voorwaarts"),
    sprongOnderdeel("Schroefsprong"),
    sprongOnderdeel("Rondat afsprong"),
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
  Instap: 2,
  Pupil: 3,
  Jeugd: 5,
  "Junior 1": 6,
  "Junior 2": 7,
  Senior: 8,
  Selectie: 10,
  // Legacy niveaus (bestaande sporters)
  "Pupil 1": 3,
  "Pupil 2": 4,
  "Jeugd 1": 5,
  "Jeugd 2": 6,
  Junior: 7,
};

export function getMinimumForNiveau(niveau: string, toestel: Toestel): number {
  const totalOnderdelen = ONDERDELEN_PER_TOESTEL[toestel].length;
  const niveauMin = NIVEAU_MINIMUM[niveau] || 2;
  return Math.min(niveauMin, totalOnderdelen);
}

const NIVEAU_ORDER: Record<string, number> = {
  tA: 0,
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
};

export function sortOnderdelen(onderdelen: TurnOnderdeel[]): TurnOnderdeel[] {
  return [...onderdelen].sort((a, b) => {
    const diff =
      (NIVEAU_ORDER[a.niveau] ?? 99) - (NIVEAU_ORDER[b.niveau] ?? 99);
    if (diff !== 0) return diff;
    return a.naam.localeCompare(b.naam);
  });
}

export function sortOnderdelenForToestel(
  toestel: Toestel,
  onderdelen: TurnOnderdeel[],
): TurnOnderdeel[] {
  if (isSprongToestel(toestel)) {
    return [...onderdelen].sort((a, b) => {
      const diff = (b.dWaarde ?? 0) - (a.dWaarde ?? 0);
      if (diff !== 0) return diff;
      return a.naam.localeCompare(b.naam);
    });
  }
  return sortOnderdelen(onderdelen);
}

export interface SporterBlessures {
  current: string[];
  previous: string[];
}

/** Eén training per kalenderdag (datum DD-MM-JJJJ); wie er aanwezig was. */
export interface TrainingSession {
  id: string;
  datum: string;
  attendeeSporterIds: string[];
}

/** Gearchiveerde aanwezigheidssamenvatting na afsluiten van een turnseizoen. */
export interface SporterAttendanceArchive {
  id: string;
  sporterId: string;
  seasonBatchId: string;
  seasonLabel: string;
  archivedAt: string;
  attendedSessions: number;
  totalSessions: number;
  percentage: number;
}

export type OuderGesprekType = "pop" | "normaal";

export interface OuderGesprek {
  id: string;
  sporterId: string;
  datum: string;
  type: OuderGesprekType;
  notities: string;
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

export type AgendaKalenderCategorie = "vrij" | "overig" | "lesplan";

export type LesplanVisibility = "private" | "public";

export interface CustomAgendaEvent {
  id: string;
  titel: string;
  datum: string;
  locatie: string;
  categorie: AgendaKalenderCategorie;
  notitie: string;
  /** Only for `lesplan`; omitted or empty when not applicable. */
  lesplanVisibility?: LesplanVisibility | "";
  /**
   * For `lesplan`: creating trainer id. Private lesplans also use this for visibility
   * (only that trainer sees them when `lesplanVisibility` is private).
   */
  ownerUserId?: string | null;
}

export const AGENDA_CATEGORIE_LABELS: Record<AgendaKalenderCategorie, string> =
  {
    vrij: "Vrije dag / vakantie",
    overig: "Anders",
    lesplan: "Lesplan",
  };

export type AgendaWedstrijdItem = Wedstrijd & { sporterNaam: string };

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
  lesplanVisibility?: LesplanVisibility | "";
  ownerUserId?: string | null;
};

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

export type AgendaItemVerjaardag = {
  source: "verjaardag";
  id: string;
  titel: string;
  datum: string;
  sporterId: string;
  sporterNaam: string;
  leeftijd: number;
  dagenTotVerjaardag: number;
};

export type AgendaItem =
  | AgendaItemWedstrijd
  | AgendaItemKalender
  | AgendaItemOuderGesprek
  | AgendaItemVerjaardag;

export const DUPLICATE_TRAINING_SESSION_ERROR = "DUPLICATE_TRAINING_SESSION_ERROR";
export const INVALID_TRAINING_SESSION_DATUM = "INVALID_TRAINING_SESSION_DATUM";
export const TRAINING_SESSION_NOT_FOUND = "TRAINING_SESSION_NOT_FOUND";
export const NO_TRAINING_SESSIONS_TO_ARCHIVE = "NO_TRAINING_SESSIONS_TO_ARCHIVE";

export const DUPLICATE_WEDSTRIJD_ERROR = "DUPLICATE_WEDSTRIJD_ERROR";

export const MISSING_AGENDA_TITEL = "MISSING_AGENDA_TITEL";
export const MISSING_AGENDA_LESPLAN_PLAN = "MISSING_AGENDA_LESPLAN_PLAN";
export const INVALID_AGENDA_DATUM = "INVALID_AGENDA_DATUM";

/** Editing or deleting a lesplan is not allowed for this trainer. */
export const LESPLAN_ACTION_FORBIDDEN = "LESPLAN_ACTION_FORBIDDEN";

export const INVALID_OUDER_GESPREK_DATUM = "INVALID_OUDER_GESPREK_DATUM";
export const INVALID_GEBOORTEDATUM = "INVALID_GEBOORTEDATUM";
export const INVALID_SPRONG_DWAARDE = "INVALID_SPRONG_DWAARDE";
export const INVALID_YOUTUBE_URL = "INVALID_YOUTUBE_URL";

export const DWAARDE_PER_NIVEAU: Record<TurnOnderdeelNiveau, number> = {
  tA: 0.1,
  A: 0.1,
  B: 0.2,
  C: 0.3,
  D: 0.4,
  E: 0.5,
};

export const ELEMENTGROEP_BONUS = 0.5;
export const AFSPRONG_BONUS = 0.5;

export function isOnderdeelMarkedAfsprong(
  onderdeel: TurnOnderdeel | undefined,
): boolean {
  return onderdeel?.isAfsprong === true;
}

function resolveOefeningItems(
  selectedNamen: string[],
  allOnderdelen: TurnOnderdeel[],
): TurnOnderdeel[] {
  return selectedNamen
    .map((naam) => allOnderdelen.find((o) => o.naam === naam))
    .filter((o): o is TurnOnderdeel => o !== undefined);
}

/** +0.5 als laatste onderdeel een afsprong is én een eerder onderdeel dezelfde elementgroep heeft. */
export function calculateAfsprongBonus(
  selectedNamen: string[],
  allOnderdelen: TurnOnderdeel[],
): number {
  if (selectedNamen.length === 0) return 0;
  const lastNaam = selectedNamen[selectedNamen.length - 1];
  const lastItem = allOnderdelen.find((o) => o.naam === lastNaam);
  if (!lastItem || !isOnderdeelMarkedAfsprong(lastItem)) return 0;

  const lastEg = lastItem.elementgroep ?? 1;
  const hasEarlierSameEg = selectedNamen.slice(0, -1).some((naam) => {
    const item = allOnderdelen.find((o) => o.naam === naam);
    return item != null && (item.elementgroep ?? 1) === lastEg;
  });
  return hasEarlierSameEg ? AFSPRONG_BONUS : 0;
}

export function calculateDWaarde(
  selectedNamen: string[],
  allOnderdelen: TurnOnderdeel[],
): number {
  const oefeningItems = resolveOefeningItems(selectedNamen, allOnderdelen);

  const niveauScore = oefeningItems.reduce(
    (sum, o) => sum + (DWAARDE_PER_NIVEAU[o.niveau] ?? 0),
    0,
  );

  const presentGroepen = new Set(oefeningItems.map((o) => o.elementgroep ?? 1));
  const elementgroepBonus = presentGroepen.size * ELEMENTGROEP_BONUS;
  const afsprongBonus = calculateAfsprongBonus(selectedNamen, allOnderdelen);

  return niveauScore + elementgroepBonus + afsprongBonus;
}

export function calculateSprongOefeningDWaarde(
  selectedNamen: string[],
  allOnderdelen: TurnOnderdeel[],
): number {
  const values = selectedNamen
    .map((naam) => allOnderdelen.find((o) => o.naam === naam)?.dWaarde)
    .filter((v): v is number => v != null && !Number.isNaN(v));
  return values.length ? Math.max(...values) : 0;
}

export function calculateOefeningDWaarde(
  toestel: Toestel | string,
  selectedNamen: string[],
  allOnderdelen: TurnOnderdeel[],
): number {
  if (isSprongToestel(toestel)) {
    return calculateSprongOefeningDWaarde(selectedNamen, allOnderdelen);
  }
  return calculateDWaarde(selectedNamen, allOnderdelen);
}

export function parseSprongDWaardeInput(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 10) / 10;
}

export function hasOnderdeelYoutubeUrl(onderdeel: TurnOnderdeel | undefined): boolean {
  return (onderdeel?.youtubeUrl?.trim().length ?? 0) > 0;
}

export function isValidYoutubeUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "youtu.be") return url.pathname.replace(/^\//, "").length > 0;
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") return !!url.searchParams.get("v")?.trim();
      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.replace("/shorts/", "").length > 0;
      }
      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.replace("/embed/", "").length > 0;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function normalizeYoutubeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (!isValidYoutubeUrl(withScheme)) {
    throw new Error(INVALID_YOUTUBE_URL);
  }
  return withScheme;
}

export const NIVEAUS = [
  "Instap",
  "Pupil",
  "Jeugd",
  "Junior 1",
  "Junior 2",
  "Senior",
];
