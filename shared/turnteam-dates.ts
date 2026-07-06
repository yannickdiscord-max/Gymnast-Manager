/** European DD-MM-YYYY helpers shared by client and server. */

export function wedstrijdDatumToTimestamp(datum: string): number | null {
  const parts = datum.split("-");
  if (parts.length !== 3) return null;
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!day || !month || !year) return null;
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d.getTime();
}

export function isValidEuropeanDateString(val: string): boolean {
  const match = val.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return false;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** Normalize DD-MM-YYYY strings (wedstrijden, agenda). */
export function normalizeEuropeanDate(value: string): string {
  const match = value.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return value.trim();
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];
  return `${day}-${month}-${year}`;
}

export function normalizeTrainingSessionDatum(value: string): string {
  const match = value.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return value.trim();
  return `${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}-${match[3]}`;
}

export function trainingSessionDatumToTime(datum: string): number {
  const [dd, mm, yyyy] = datum.split("-").map(Number);
  return new Date(yyyy, mm - 1, dd).getTime();
}

export function formatTodayEuropean(): string {
  const d = new Date();
  return formatLocalDateEuropean(d);
}

export function formatLocalDateEuropean(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Turnseizoen juli–juni, bijv. "2025-2026". */
export function defaultTurnSeasonLabel(reference = new Date()): string {
  const y = reference.getFullYear();
  const m = reference.getMonth() + 1;
  const start = m >= 7 ? y : y - 1;
  return `${start}-${start + 1}`;
}

export function normalizeOuderGesprekDatum(value: string): string {
  const match = value.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return value.trim();
  return `${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}-${match[3]}`;
}

export function europeanDatumStringToLocalDate(datum: string): Date {
  const [dd, mm, yyyy] = datum.split("-").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

export function calendarDaysBetweenLocalDates(earlier: Date, later: Date): number {
  const u1 = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  const u2 = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
  return Math.floor((u2 - u1) / 86400000);
}

/** Turnseizoen loopt van augustus t/m juli. Referentiedatum = 31 dec van het 2e kalenderjaar. */
export function getCurrentTurnSeasonReferenceDate(reference = new Date()): Date {
  const y = reference.getFullYear();
  const m = reference.getMonth() + 1;
  const seasonStartYear = m >= 8 ? y : y - 1;
  return new Date(seasonStartYear + 1, 11, 31);
}

export function calculateAgeOnDate(birth: Date, onDate: Date): number {
  let age = onDate.getFullYear() - birth.getFullYear();
  if (
    onDate.getMonth() < birth.getMonth() ||
    (onDate.getMonth() === birth.getMonth() &&
      onDate.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}

export function niveauFromTurnSeasonAge(age: number): string {
  if (age >= 19) return "Senior";
  if (age >= 17) return "Junior 2";
  if (age >= 15) return "Junior 1";
  if (age >= 13) return "Jeugd";
  if (age >= 11) return "Pupil";
  return "Instap";
}

export function calculateTurnSeasonAgeFromGeboortedatum(
  geboortedatum: string,
  reference = new Date(),
): number | null {
  if (!isValidEuropeanDateString(geboortedatum)) return null;
  const birth = europeanDatumStringToLocalDate(normalizeEuropeanDate(geboortedatum));
  const ref = getCurrentTurnSeasonReferenceDate(reference);
  return calculateAgeOnDate(birth, ref);
}

export function calculateNiveauFromGeboortedatum(
  geboortedatum: string,
  reference = new Date(),
): string | null {
  const age = calculateTurnSeasonAgeFromGeboortedatum(geboortedatum, reference);
  if (age === null) return null;
  return niveauFromTurnSeasonAge(age);
}

function resolveBirthdayInYear(
  year: number,
  birthMonth: number,
  birthDay: number,
): Date {
  const candidate = new Date(year, birthMonth, birthDay);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== birthMonth ||
    candidate.getDate() !== birthDay
  ) {
    return new Date(year, birthMonth + 1, 0);
  }
  return candidate;
}

export function getNextBirthdayLocalDate(
  geboortedatum: string,
  reference = new Date(),
): Date | null {
  if (!isValidEuropeanDateString(geboortedatum)) return null;
  const birth = europeanDatumStringToLocalDate(normalizeEuropeanDate(geboortedatum));
  const birthDay = birth.getDate();
  const birthMonth = birth.getMonth();
  const refYear = reference.getFullYear();
  const todayStart = new Date(refYear, reference.getMonth(), reference.getDate());

  let candidate = resolveBirthdayInYear(refYear, birthMonth, birthDay);
  if (candidate.getTime() < todayStart.getTime()) {
    candidate = resolveBirthdayInYear(refYear + 1, birthMonth, birthDay);
  }
  return candidate;
}

/** Returns upcoming birthday if it falls within maxDaysBefore days (inclusive), including today. */
export function getBirthdayAgendaWindowDays(
  geboortedatum: string,
  maxDaysBefore = 7,
  reference = new Date(),
): { birthday: Date; daysUntil: number } | null {
  const birthday = getNextBirthdayLocalDate(geboortedatum, reference);
  if (!birthday) return null;

  const todayStart = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  const daysUntil = calendarDaysBetweenLocalDates(todayStart, birthday);
  if (daysUntil < 0 || daysUntil > maxDaysBefore) return null;
  return { birthday, daysUntil };
}
