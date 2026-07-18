import Link from "next/link";
import { notFound } from "next/navigation";
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

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, name")
    .eq("id", id)
    .single();
  if (!challenge) notFound();

  const { data: participant } = await supabase
    .from("challenge_participants")
    .select("id")
    .eq("challenge_id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!participant) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-8">
        <Back id={id} name={challenge.name} />
        <p className="text-black/60 dark:text-white/60">
          Join this challenge to see your calendar.
        </p>
      </main>
    );
  }

  const { data: readings } = await supabase
    .from("readings")
    .select("id, date, display_text")
    .eq("challenge_id", id)
    .order("date", { ascending: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user!.id)
    .single();

  const { data: progress } = await supabase
    .from("reading_progress")
    .select("reading_id, read_with_someone, is_backfill")
    .eq("participant_id", participant.id);

  const doneByReading = new Map(
    (progress ?? []).map((p) => [
      p.reading_id,
      { ws: p.read_with_someone, backfill: p.is_backfill },
    ])
  );
  const readingByDate = new Map(
    (readings ?? []).map((r) => [r.date, r])
  );

  if (!readings || readings.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-8">
        <Back id={id} name={challenge.name} />
        <p className="text-black/60 dark:text-white/60">
          No readings scheduled yet.
        </p>
      </main>
    );
  }

  // Build a Sun–Sat grid spanning the whole reading plan.
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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <div>
        <Back id={id} name={challenge.name} />
        <h1 className="mt-2 text-2xl font-semibold">Calendar</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          {done}/{readings.length} readings · {withSomeone} with someone
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {DOW.map((d) => (
          <div key={d} className="pb-1 text-black/40 dark:text-white/40">
            {d}
          </div>
        ))}
        {cells.map((d) => {
          const key = iso(d);
          const reading = readingByDate.get(key);
          const isToday = key === today;
          const past = key < today;

          let cls =
            "aspect-square rounded-md flex flex-col items-center justify-center border text-[11px] ";
          let mark = "";
          if (!reading) {
            cls += "border-transparent text-black/25 dark:text-white/25";
          } else if (doneByReading.has(reading.id)) {
            const p = doneByReading.get(reading.id)!;
            if (p.backfill) {
              cls +=
                "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400";
              mark = "↺";
            } else {
              cls += p.ws
                ? "border-green-600 bg-green-600/20 text-green-800 dark:text-green-300"
                : "border-green-600/60 bg-green-600/10 text-green-700 dark:text-green-400";
              mark = p.ws ? "★" : "✓";
            }
          } else if (past) {
            cls +=
              "border-red-500/30 text-black/50 dark:text-white/50"; // missed
            mark = "·";
          } else {
            cls += "border-black/10 dark:border-white/15"; // upcoming
          }
          if (isToday) cls += " ring-2 ring-foreground";

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

      <div className="flex flex-wrap gap-4 text-xs text-black/60 dark:text-white/60">
        <Legend swatch="border-green-600 bg-green-600/20" label="★ with someone" />
        <Legend swatch="border-green-600/60 bg-green-600/10" label="✓ completed" />
        <Legend swatch="border-amber-500/60 bg-amber-500/10" label="↺ backfilled" />
        <Legend swatch="border-red-500/30" label="· missed" />
        <Legend swatch="border-black/10 dark:border-white/15" label="upcoming" />
      </div>
    </main>
  );
}

function Back({ id, name }: { id: string; name: string }) {
  return (
    <Link
      href={`/challenges/${id}`}
      className="text-sm text-black/60 underline dark:text-white/60"
    >
      ← {name}
    </Link>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded border ${swatch}`} />
      {label}
    </span>
  );
}
