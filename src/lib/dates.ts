// Server-free date helpers for per-user timezone handling.

// Current calendar date (YYYY-MM-DD) in the given IANA timezone.
export function todayInTz(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(
      new Date()
    );
  }
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// Sunday–Saturday bounds for the week containing the given YYYY-MM-DD.
export function weekBoundsFromISO(dateISO: string): {
  start: string;
  end: string;
} {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // Sunday = 0 (tz-independent for a fixed date)
  return {
    start: fmt(new Date(y, m - 1, d - dow)),
    end: fmt(new Date(y, m - 1, d - dow + 6)),
  };
}
