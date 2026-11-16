import { getDatabase } from "../../database";

export type HijriMonthStatus = "confirmed" | "expected";

export interface HijriMonthRecord {
  id: string;
  hijri_year: number;
  hijri_month: number;
  start_date: string;
  status: HijriMonthStatus;
  source: string;
  source_updated_at: string;
  synced_at: string;
}

interface CalendarFeedMonth {
  hijriYear: number;
  hijriMonth: number;
  startDate: string;
  status: HijriMonthStatus;
}

interface CalendarFeed {
  version: number;
  country: string;
  timezone: string;
  source: string;
  updatedAt: string;
  months: CalendarFeedMonth[];
}

// Replace this with your actual GitHub repository URL.
const CALENDAR_FEED_URL =
  "https://raw.githubusercontent.com/afraj18/ramazan-companion/master/public/hijri-calendar/lk.json";

const HIJRI_MONTH_NAMES = [
  "Muharram",
  "Safar",
  "Rabi al-Awwal",
  "Rabi al-Thani",
  "Jumada al-Awwal",
  "Jumada al-Thani",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhul Qadah",
  "Dhul Hijjah",
];

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function validateFeed(feed: CalendarFeed): void {
  if (
    feed.version !== 1 ||
    feed.country !== "LK" ||
    feed.timezone !== "Asia/Colombo" ||
    !Array.isArray(feed.months) ||
    !feed.source ||
    !feed.updatedAt
  ) {
    throw new Error("Invalid Hijri calendar feed.");
  }

  const seenMonths = new Set<string>();
  const seenDates = new Set<string>();

  for (const month of feed.months) {
    if (
      !Number.isInteger(month.hijriYear) ||
      month.hijriYear < 1 ||
      !Number.isInteger(month.hijriMonth) ||
      month.hijriMonth < 1 ||
      month.hijriMonth > 12 ||
      !isValidDate(month.startDate) ||
      !["confirmed", "expected"].includes(month.status)
    ) {
      throw new Error("Invalid Hijri month record in calendar feed.");
    }

    const monthKey = `${month.hijriYear}-${month.hijriMonth}`;

    if (seenMonths.has(monthKey) || seenDates.has(month.startDate)) {
      throw new Error("Duplicate Hijri calendar record.");
    }

    seenMonths.add(monthKey);
    seenDates.add(month.startDate);
  }
}

export function getSriLankaDate(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to determine Sri Lankan local date.");
  }

  return `${year}-${month}-${day}`;
}

export async function syncHijriCalendar(): Promise<number> {
  const response = await fetch(CALENDAR_FEED_URL);

  if (!response.ok) {
    throw new Error(`Calendar download failed with status ${response.status}.`);
  }

  const feed = (await response.json()) as CalendarFeed;

  validateFeed(feed);

  const db = await getDatabase();
  const syncedAt = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const month of feed.months) {
      const id = `${month.hijriYear}-${month.hijriMonth}`;

      await db.runAsync(
        `INSERT INTO hijri_months (
          id,
          hijri_year,
          hijri_month,
          start_date,
          status,
          source,
          source_updated_at,
          synced_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          start_date = excluded.start_date,
          status = excluded.status,
          source = excluded.source,
          source_updated_at = excluded.source_updated_at,
          synced_at = excluded.synced_at`,
        id,
        month.hijriYear,
        month.hijriMonth,
        month.startDate,
        month.status,
        feed.source,
        feed.updatedAt,
        syncedAt,
      );
    }
  });

  return feed.months.length;
}

export async function getHijriMonths(): Promise<HijriMonthRecord[]> {
  const db = await getDatabase();

  return db.getAllAsync<HijriMonthRecord>(
    `SELECT *
     FROM hijri_months
     ORDER BY hijri_year ASC, hijri_month ASC`,
  );
}

export interface CurrentHijriDate {
  hijriYear: number;
  hijriMonth: number;
  hijriDay: number;
  monthName: string;
  gregorianDate: string;
  startDate: string;
  status: HijriMonthStatus;
  daysInMonth: number | null;
}

function differenceInDays(start: string, end: string): number {
  const startTime = new Date(`${start}T00:00:00.000Z`).getTime();
  const endTime = new Date(`${end}T00:00:00.000Z`).getTime();

  return Math.round((endTime - startTime) / 86_400_000);
}

export async function getHijriDate(
  gregorianDate = getSriLankaDate(),
): Promise<CurrentHijriDate | null> {
  if (!isValidDate(gregorianDate)) {
    throw new Error("Invalid Gregorian date.");
  }

  const db = await getDatabase();

  const current = await db.getFirstAsync<HijriMonthRecord>(
    `SELECT *
     FROM hijri_months
     WHERE start_date <= ?
       AND status = 'confirmed'
     ORDER BY start_date DESC
     LIMIT 1`,
    gregorianDate,
  );

  if (!current) {
    return null;
  }

  const next = await db.getFirstAsync<{
    start_date: string;
  }>(
    `SELECT start_date
     FROM hijri_months
     WHERE start_date > ?
       AND status = 'confirmed'
     ORDER BY start_date ASC
     LIMIT 1`,
    current.start_date,
  );

  const hijriDay = differenceInDays(current.start_date, gregorianDate) + 1;

  const daysInMonth = next
    ? differenceInDays(current.start_date, next.start_date)
    : null;

  return {
    hijriYear: current.hijri_year,
    hijriMonth: current.hijri_month,
    hijriDay,
    monthName: HIJRI_MONTH_NAMES[current.hijri_month - 1],
    gregorianDate,
    startDate: current.start_date,
    status: current.status,
    daysInMonth,
  };
}
