import { createClient } from "../../../../src/lib/supabase/server";
import { todayInTz } from "../../../../src/lib/dates";

function parseISO(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(d.getDate() + n);
  return x;
}
function shortDate(s: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseISO(s));
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user!.id)
    .single();

  const { data: participant } = await supabase
    .from("challenge_participants")
    .select("id")
    .eq("challenge_id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!participant) {
    return (
      <p className="text-muted">Join this challenge to see your calendar.</p>
    );
  }

  const { data: readings } = await supabase
    .from("readings")
    .select("id, date, display_text")
    .eq("challenge_id", id)
    .order("date", { ascending: true });

  const { data: progress } = await supabase
    .from("reading_progress")
    .select("reading_id, read_with_someone, is_backfill, reflection")
    .eq("participant_id", participant.id);

  const readingById = new Map((readings ?? []).map((r) => [r.id, r]));
  const doneByReading = new Map(
    (progress ?? []).map((p) => [
      p.reading_id,
      { ws: p.read_with_someone, backfill: p.is_backfill },
    ])
  );
  const readingByDate = new Map((readings ?? []).map((r) => [r.date, r]));

  if (!readings || readings.length === 0) {
    return <p className="text-muted">No readings scheduled yet.</p>;
  }

  const first = parseISO(readings[0].date);
  const last = parseISO(readings[readings.length - 1].date);
  const gridStart = addDays(first, -first.getDay());
  const gridEnd = addDays(last, 6 - last.getDay());
  const today = todayInTz(profile?.timezone ?? "UTC");

  const cells: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) cells.push(d);

  let done = 0;
  let withSomeone = 0;
  for (const r of readings) {
    const p = doneByReading.get(r.id);
    if (p) {
      done++;
      if (p.ws) withSomeone++;
    }
  }

  const history = (progress ?? [])
    .map((p) => {
      const r = readingById.get(p.reading_id);
      return r
        ? {
            date: r.date,
            text: r.display_text,
            ws: p.read_with_someone,
            backfill: p.is_backfill,
            reflection: p.reflection,
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 20);

  return (
    <>
      <p className="text-sm text-muted">
        {done}/{readings.length} readings · {withSomeone} with someone
      </p>

      <div className="rounded-2xl border border-hair bg-surface p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {DOW.map((d) => (
            <div key={d} className="pb-1 font-medium text-muted">
              {d}
            </div>
          ))}
          {cells.map((d) => {
            const key = iso(d);
            const reading = readingByDate.get(key);
            const isToday = key === today;
            const past = key < today;

            let cls =
              "aspect-square rounded-lg flex flex-col items-center justify-center text-[11px] ";
            let mark = "";
            const p = reading ? doneByReading.get(reading.id) : undefined;
            if (!reading) {
              cls += "text-slate-300";
            } else if (p) {
              if (p.backfill) {
                cls += "bg-amber-500/15 text-amber-700 dark:text-amber-400";
                mark = "↺";
              } else {
                cls += p.ws
                  ? "bg-emerald-500/25 text-emerald-800 dark:text-emerald-300"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
                mark = p.ws ? "★" : "✓";
              }
            } else if (past) {
              cls += "text-muted";
              mark = "·";
            } else {
              cls += "bg-surface-muted text-muted";
            }
            if (isToday) cls += " ring-2 ring-brand";

            return (
              <div
                key={key}
                className={cls}
                title={reading ? `${key} — ${reading.display_text}` : key}
              >
                <span>{d.getDate()}</span>
                {mark && <span className="leading-none">{mark}</span>}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <Legend swatch="bg-emerald-500/30" label="★ with someone" />
          <Legend swatch="bg-emerald-500/20" label="✓ completed" />
          <Legend swatch="bg-amber-500/25" label="↺ backfilled" />
        </div>
      </div>

      {history.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-hair bg-surface shadow-sm">
          <h2 className="border-b border-hair px-4 py-3 font-serif text-lg font-semibold text-heading">
            Reading History
          </h2>
          <ul>
            {history.map((h, i) => (
              <li
                key={`${h.date}-${i}`}
                className={
                  "flex items-center justify-between px-4 py-3 " +
                  (i > 0 ? "border-t border-hair" : "")
                }
              >
                <div className="min-w-0 pr-3">
                  <div className="truncate font-medium text-heading">
                    {h.text}
                  </div>
                  <div className="text-xs text-muted">
                    {shortDate(h.date)} ·{" "}
                    {h.backfill
                      ? "Backfilled"
                      : h.ws
                        ? "With someone"
                        : "Alone"}
                  </div>
                  {h.reflection && (
                    <p className="mt-1 font-serif text-sm italic text-content">
                      &ldquo;{h.reflection}&rdquo;
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-semibold text-heading">
                  +{!h.backfill && h.ws ? 2 : 1}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded ${swatch}`} />
      {label}
    </span>
  );
}
