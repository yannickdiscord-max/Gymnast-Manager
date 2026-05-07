/** Shared Turnteam types and constants (no storage / I/O). */

export interface Sporter {
  id: string;
  naam: string;
  niveau: string;
  favoriet: boolean;
  onderdelen: Record<string, string[]>;
  oefening: Record<string, string[]>;
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
  Instap: 2,
  "Pupil 1": 3,
  "Pupil 2": 4,
  "Jeugd 1": 5,
  "Jeugd 2": 6,
  Junior: 7,
  Senior: 8,
  Selectie: 10,
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

export type AgendaItem =
  | AgendaItemWedstrijd
  | AgendaItemKalender
  | AgendaItemOuderGesprek;

export const DUPLICATE_TRAINING_SESSION_ERROR = "DUPLICATE_TRAINING_SESSION_ERROR";
export const INVALID_TRAINING_SESSION_DATUM = "INVALID_TRAINING_SESSION_DATUM";

export const DUPLICATE_WEDSTRIJD_ERROR = "DUPLICATE_WEDSTRIJD_ERROR";

export const MISSING_AGENDA_TITEL = "MISSING_AGENDA_TITEL";
export const MISSING_AGENDA_LESPLAN_PLAN = "MISSING_AGENDA_LESPLAN_PLAN";
export const INVALID_AGENDA_DATUM = "INVALID_AGENDA_DATUM";

/** Editing or deleting a lesplan is not allowed for this trainer. */
export const LESPLAN_ACTION_FORBIDDEN = "LESPLAN_ACTION_FORBIDDEN";

export const INVALID_OUDER_GESPREK_DATUM = "INVALID_OUDER_GESPREK_DATUM";

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
  allOnderdelen: TurnOnderdeel[],
): number {
  const oefeningItems = selectedNamen
    .map((naam) => allOnderdelen.find((o) => o.naam === naam))
    .filter((o): o is TurnOnderdeel => o !== undefined);

  const niveauScore = oefeningItems.reduce(
    (sum, o) => sum + (DWAARDE_PER_NIVEAU[o.niveau] ?? 0),
    0,
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
