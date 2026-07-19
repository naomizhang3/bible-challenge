// Canonical 66-book Protestant Bible with chapter counts (fixed reference data).
// Server-free so Client Components can import it.

export type Testament = "OT" | "NT";
export type BibleBook = { name: string; chapters: number; testament: Testament };

export const BIBLE_BOOKS: BibleBook[] = [
  // Old Testament
  { name: "Genesis", chapters: 50, testament: "OT" },
  { name: "Exodus", chapters: 40, testament: "OT" },
  { name: "Leviticus", chapters: 27, testament: "OT" },
  { name: "Numbers", chapters: 36, testament: "OT" },
  { name: "Deuteronomy", chapters: 34, testament: "OT" },
  { name: "Joshua", chapters: 24, testament: "OT" },
  { name: "Judges", chapters: 21, testament: "OT" },
  { name: "Ruth", chapters: 4, testament: "OT" },
  { name: "1 Samuel", chapters: 31, testament: "OT" },
  { name: "2 Samuel", chapters: 24, testament: "OT" },
  { name: "1 Kings", chapters: 22, testament: "OT" },
  { name: "2 Kings", chapters: 25, testament: "OT" },
  { name: "1 Chronicles", chapters: 29, testament: "OT" },
  { name: "2 Chronicles", chapters: 36, testament: "OT" },
  { name: "Ezra", chapters: 10, testament: "OT" },
  { name: "Nehemiah", chapters: 13, testament: "OT" },
  { name: "Esther", chapters: 10, testament: "OT" },
  { name: "Job", chapters: 42, testament: "OT" },
  { name: "Psalms", chapters: 150, testament: "OT" },
  { name: "Proverbs", chapters: 31, testament: "OT" },
  { name: "Ecclesiastes", chapters: 12, testament: "OT" },
  { name: "Song of Solomon", chapters: 8, testament: "OT" },
  { name: "Isaiah", chapters: 66, testament: "OT" },
  { name: "Jeremiah", chapters: 52, testament: "OT" },
  { name: "Lamentations", chapters: 5, testament: "OT" },
  { name: "Ezekiel", chapters: 48, testament: "OT" },
  { name: "Daniel", chapters: 12, testament: "OT" },
  { name: "Hosea", chapters: 14, testament: "OT" },
  { name: "Joel", chapters: 3, testament: "OT" },
  { name: "Amos", chapters: 9, testament: "OT" },
  { name: "Obadiah", chapters: 1, testament: "OT" },
  { name: "Jonah", chapters: 4, testament: "OT" },
  { name: "Micah", chapters: 7, testament: "OT" },
  { name: "Nahum", chapters: 3, testament: "OT" },
  { name: "Habakkuk", chapters: 3, testament: "OT" },
  { name: "Zephaniah", chapters: 3, testament: "OT" },
  { name: "Haggai", chapters: 2, testament: "OT" },
  { name: "Zechariah", chapters: 14, testament: "OT" },
  { name: "Malachi", chapters: 4, testament: "OT" },
  // New Testament
  { name: "Matthew", chapters: 28, testament: "NT" },
  { name: "Mark", chapters: 16, testament: "NT" },
  { name: "Luke", chapters: 24, testament: "NT" },
  { name: "John", chapters: 21, testament: "NT" },
  { name: "Acts", chapters: 28, testament: "NT" },
  { name: "Romans", chapters: 16, testament: "NT" },
  { name: "1 Corinthians", chapters: 16, testament: "NT" },
  { name: "2 Corinthians", chapters: 13, testament: "NT" },
  { name: "Galatians", chapters: 6, testament: "NT" },
  { name: "Ephesians", chapters: 6, testament: "NT" },
  { name: "Philippians", chapters: 4, testament: "NT" },
  { name: "Colossians", chapters: 4, testament: "NT" },
  { name: "1 Thessalonians", chapters: 5, testament: "NT" },
  { name: "2 Thessalonians", chapters: 3, testament: "NT" },
  { name: "1 Timothy", chapters: 6, testament: "NT" },
  { name: "2 Timothy", chapters: 4, testament: "NT" },
  { name: "Titus", chapters: 3, testament: "NT" },
  { name: "Philemon", chapters: 1, testament: "NT" },
  { name: "Hebrews", chapters: 13, testament: "NT" },
  { name: "James", chapters: 5, testament: "NT" },
  { name: "1 Peter", chapters: 5, testament: "NT" },
  { name: "2 Peter", chapters: 3, testament: "NT" },
  { name: "1 John", chapters: 5, testament: "NT" },
  { name: "2 John", chapters: 1, testament: "NT" },
  { name: "3 John", chapters: 1, testament: "NT" },
  { name: "Jude", chapters: 1, testament: "NT" },
  { name: "Revelation", chapters: 22, testament: "NT" },
];

export const BOOK_BY_NAME = new Map(BIBLE_BOOKS.map((b) => [b.name, b]));

export const BOOK_PRESETS: { label: string; books: string[] }[] = [
  { label: "Whole Bible", books: BIBLE_BOOKS.map((b) => b.name) },
  {
    label: "Old Testament",
    books: BIBLE_BOOKS.filter((b) => b.testament === "OT").map((b) => b.name),
  },
  {
    label: "New Testament",
    books: BIBLE_BOOKS.filter((b) => b.testament === "NT").map((b) => b.name),
  },
  { label: "Gospels", books: ["Matthew", "Mark", "Luke", "John"] },
];

export type PlanReading = {
  day_number: number;
  date: string;
  display_text: string;
};

function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// A single chapter of Psalms reads "Psalm 3", not "Psalms 3".
function label(book: string): string {
  return book === "Psalms" ? "Psalm" : book;
}

function formatRange(group: { book: string; chapter: number }[]): string {
  const first = group[0];
  const last = group[group.length - 1];
  if (first.book === last.book) {
    return first.chapter === last.chapter
      ? `${label(first.book)} ${first.chapter}`
      : `${label(first.book)} ${first.chapter}-${last.chapter}`;
  }
  return `${label(first.book)} ${first.chapter} – ${label(last.book)} ${last.chapter}`;
}

// Total chapters selected (for previews) without building the whole plan.
export function totalChapters(bookNames: string[]): number {
  return bookNames.reduce(
    (sum, n) => sum + (BOOK_BY_NAME.get(n)?.chapters ?? 0),
    0
  );
}

// Build a dated reading plan: books expand to chapters (canonical order),
// grouped `chaptersPerDay` per day, one day per calendar date from startDate.
export function generatePlan(
  bookNames: string[],
  chaptersPerDay: number,
  startDateISO: string
): PlanReading[] {
  const chosen = BIBLE_BOOKS.filter((b) => bookNames.includes(b.name));
  const seq: { book: string; chapter: number }[] = [];
  for (const b of chosen)
    for (let c = 1; c <= b.chapters; c++) seq.push({ book: b.name, chapter: c });

  const per = Math.max(1, Math.floor(chaptersPerDay));
  const [y, m, d] = startDateISO.split("-").map(Number);
  const readings: PlanReading[] = [];

  let day = 1;
  for (let i = 0; i < seq.length; i += per) {
    const group = seq.slice(i, i + per);
    readings.push({
      day_number: day,
      date: isoLocal(new Date(y, m - 1, d + (day - 1))),
      display_text: formatRange(group),
    });
    day++;
  }
  return readings;
}

// A chosen portion of a book (chapters `from`..`to`, inclusive).
export type Segment = { book: string; from: number; to: number };

export function totalChaptersInSegments(segments: Segment[]): number {
  return segments.reduce(
    (sum, s) => sum + Math.max(0, s.to - s.from + 1),
    0
  );
}

// Build a dated plan from explicit book+chapter-range segments (in order),
// grouped `chaptersPerDay` per day from `startDate`.
export function generatePlanFromSegments(
  segments: Segment[],
  chaptersPerDay: number,
  startDateISO: string
): PlanReading[] {
  const seq: { book: string; chapter: number }[] = [];
  for (const s of segments) {
    const lo = Math.min(s.from, s.to);
    const hi = Math.max(s.from, s.to);
    for (let c = lo; c <= hi; c++) seq.push({ book: s.book, chapter: c });
  }

  const per = Math.max(1, Math.floor(chaptersPerDay));
  const [y, m, d] = startDateISO.split("-").map(Number);
  const readings: PlanReading[] = [];

  let day = 1;
  for (let i = 0; i < seq.length; i += per) {
    const group = seq.slice(i, i + per);
    readings.push({
      day_number: day,
      date: isoLocal(new Date(y, m - 1, d + (day - 1))),
      display_text: formatRange(group),
    });
    day++;
  }
  return readings;
}
