"use client";

import { useState } from "react";

export type Row = {
  userId: string;
  name: string;
  points: number;
  streak: number;
  rank: number;
};
export type TeamRow = {
  teamId: string;
  name: string;
  members: number;
  avg: number;
  rank: number;
};

export default function LeaderboardTabs({
  meId,
  individualsAll,
  individualsWeek,
  teamsAll,
  teamsWeek,
}: {
  meId: string;
  individualsAll: Row[];
  individualsWeek: Row[];
  teamsAll: TeamRow[];
  teamsWeek: TeamRow[];
}) {
  const [scope, setScope] = useState<"individual" | "teams">("individual");
  const [period, setPeriod] = useState<"all" | "week">("all");

  const individuals = period === "all" ? individualsAll : individualsWeek;
  const teams = period === "all" ? teamsAll : teamsWeek;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Segmented
          value={scope}
          onChange={(v) => setScope(v as typeof scope)}
          options={[
            { value: "individual", label: "Individual" },
            { value: "teams", label: "Teams" },
          ]}
        />
        <Segmented
          value={period}
          onChange={(v) => setPeriod(v as typeof period)}
          options={[
            { value: "all", label: "All Time" },
            { value: "week", label: "This Week" },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-hair bg-surface shadow-sm">
        {scope === "individual" ? (
          individuals.length === 0 ? (
            <Empty>No participants yet.</Empty>
          ) : (
            individuals.map((r, i) => (
              <div
                key={r.userId}
                className={
                  "flex items-center gap-3 px-4 py-3 " +
                  (i > 0 ? "border-t border-hair " : "") +
                  (r.userId === meId ? "bg-amber-50" : "")
                }
              >
                <RankBadge rank={r.rank} />
                <span className="flex-1 truncate font-serif text-lg text-heading">
                  {r.name}
                  {r.userId === meId && (
                    <span className="ml-2 align-middle text-xs text-muted">
                      you
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1 text-sm text-amber-600">
                  <Flame />
                  {r.streak}
                </span>
                <span className="w-16 text-right">
                  <span className="font-bold text-heading">{r.points}</span>
                  <span className="block text-xs text-muted">pts</span>
                </span>
              </div>
            ))
          )
        ) : teams.length === 0 ? (
          <Empty>No teams yet.</Empty>
        ) : (
          teams.map((t, i) => (
            <div
              key={t.teamId}
              className={
                "flex items-center gap-3 px-4 py-3 " +
                (i > 0 ? "border-t border-hair" : "")
              }
            >
              <RankBadge rank={t.rank} />
              <span className="flex-1 truncate font-serif text-lg text-heading">
                {t.name}
                <span className="ml-2 align-middle text-xs text-muted">
                  {t.members} member{t.members === 1 ? "" : "s"}
                </span>
              </span>
              <span className="w-20 text-right">
                <span className="font-bold text-heading">{t.avg.toFixed(1)}</span>
                <span className="block text-xs text-muted">avg pts</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-full bg-surface-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={
            "rounded-full px-4 py-1.5 text-sm font-medium transition " +
            (value === o.value
              ? "bg-surface text-heading shadow-sm"
              : "text-muted")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <Trophy />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold text-muted">
      {rank}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-sm text-muted">{children}</p>;
}

function Flame() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2c.5 3-1.5 4.5-3 6.5C7 11 6 13 6 15a6 6 0 0 0 12 0c0-1.7-.7-3.4-2-5 .2 1.3-.4 2.4-1.3 2.8.6-2.2-.3-4.9-2.7-6.3.6 1.9-.2 3.3-1 4-.3-2.6.9-5.6 1-8.5z" />
    </svg>
  );
}

function Trophy() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4ZM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  );
}
