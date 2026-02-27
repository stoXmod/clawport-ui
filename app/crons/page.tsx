"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Agent, CronJob } from "@/lib/types";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (diff < 0) {
    const absDiff = Math.abs(diff);
    const m = Math.floor(absDiff / 60000);
    const h = Math.floor(absDiff / 3600000);
    const dy = Math.floor(absDiff / 86400000);
    if (m < 60) return `in ${m}m`;
    if (h < 24) return `in ${h}h`;
    return `in ${dy}d`;
  }
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

function getScheduleColor(schedule: string): string {
  const s = schedule.toLowerCase();
  if (s.includes("day") && !s.includes("days")) return "text-blue-400";
  if (s.includes("week")) return "text-purple-400";
  if (/every\s+\d+\s*day/i.test(s) || /\d+d/i.test(s)) return "text-orange-400";
  return "text-[#86869b]";
}

type Filter = "all" | "ok" | "error" | "idle";

export default function CronsPage() {
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  function refresh() {
    Promise.all([fetch("/api/crons").then((r) => r.json()), fetch("/api/agents").then((r) => r.json())]).then(
      ([c, a]) => {
        setCrons(c);
        setAgents(a);
        setLastRefresh(new Date());
        setLoading(false);
      }
    );
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, []);

  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const statusOrder: Record<string, number> = { error: 0, idle: 1, ok: 2 };
  const filtered = crons
    .filter((c) => filter === "all" || c.status === filter)
    .sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));
  const counts = { ok: crons.filter((c) => c.status === "ok").length, error: crons.filter((c) => c.status === "error").length, idle: crons.filter((c) => c.status === "idle").length };

  const statusConfig = {
    ok: { color: "bg-green-500", label: "ok" },
    error: { color: "bg-red-500 animate-error-pulse", label: "error" },
    idle: { color: "bg-[#86869b]", label: "idle" },
  };

  const statusBorderColors = { ok: "border-l-green-500", error: "border-l-red-500", idle: "border-l-[#86869b]" };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#262632] bg-[#0d0d14] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-white">⏰ Cron Monitor</h1>
          <span className="bg-[#1a1a24] border border-[#262632] text-[#86869b] text-xs font-mono px-2 py-0.5 rounded-full">{crons.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#86869b]">Updated {timeAgo(lastRefresh.toISOString())}</span>
          <button onClick={refresh} className="text-xs text-[#86869b] hover:text-white px-3 py-1.5 rounded-lg hover:bg-[#1a1a24] transition-colors">↻ Refresh</button>
        </div>
      </div>

      {/* Summary — clickable counts */}
      <div className="px-6 py-3 border-b border-[#262632] flex items-center gap-6 flex-shrink-0">
        <button
          onClick={() => setFilter(counts.ok > 0 ? "ok" : "all")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-white">{counts.ok}</span>
          <span className="text-xs text-[#86869b]">ok</span>
        </button>
        <button
          onClick={() => setFilter(counts.error > 0 ? "error" : "all")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-error-pulse" />
          <span className="text-sm font-medium text-white">{counts.error}</span>
          <span className="text-xs text-[#86869b]">errors</span>
        </button>
        <button
          onClick={() => setFilter(counts.idle > 0 ? "idle" : "all")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="w-2 h-2 rounded-full bg-[#86869b]" />
          <span className="text-sm font-medium text-white">{counts.idle}</span>
          <span className="text-xs text-[#86869b]">idle</span>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="px-6 py-2 border-b border-[#262632] flex gap-1 flex-shrink-0">
        {(["all", "ok", "error", "idle"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              filter === f ? "bg-[#f5c518] text-black" : "text-[#86869b] hover:text-white hover:bg-[#1a1a24]"
            }`}
          >
            {f} {f !== "all" && counts[f as keyof typeof counts] > 0 && `(${counts[f as keyof typeof counts]})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-[#f5c518] text-sm animate-pulse">Loading crons...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0d0d14] border-b border-[#262632]">
              <tr className="text-[#86869b] text-xs">
                <th className="text-left px-6 py-3 font-normal w-8"></th>
                <th className="text-left px-3 py-3 font-normal">Name</th>
                <th className="text-left px-3 py-3 font-normal">Agent</th>
                <th className="text-left px-3 py-3 font-normal">Schedule</th>
                <th className="text-left px-3 py-3 font-normal">Last Run</th>
                <th className="text-left px-3 py-3 font-normal">Next Run</th>
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262632]">
              {filtered.map((cron) => {
                const agent = cron.agentId ? agentMap.get(cron.agentId) : null;
                const sc = statusConfig[cron.status];
                const isExpanded = expanded === cron.id;
                return (
                  <tbody key={cron.id}>
                    <tr
                      onClick={() => setExpanded(isExpanded ? null : cron.id)}
                      className={`group hover:bg-[#13131a] cursor-pointer transition-colors border-l-[3px] ${statusBorderColors[cron.status]}`}
                    >
                      <td className="px-6 py-3">
                        <span className={`inline-block w-2 h-2 rounded-full ${sc.color}`} />
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-[#c8c8d4]">{cron.name}</td>
                      <td className="px-3 py-3">
                        {agent ? (
                          <Link
                            href={`/agents/${agent.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs hover:text-[#f5c518] transition-colors w-fit"
                          >
                            <span>{agent.emoji}</span>
                            <span className="font-medium">{agent.name}</span>
                          </Link>
                        ) : (
                          <span className="text-xs text-[#86869b]">—</span>
                        )}
                      </td>
                      <td className={`px-3 py-3 font-mono text-xs ${getScheduleColor(cron.schedule)}`}>{cron.schedule}</td>
                      <td className="px-3 py-3 text-xs text-[#86869b]">{timeAgo(cron.lastRun)}</td>
                      <td className="px-3 py-3 text-xs text-[#86869b]">{timeAgo(cron.nextRun)}</td>
                      <td className="pr-4 py-3 text-[#86869b] opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                        ›
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className={cron.status === "error" ? "bg-[#1a0a0a]" : "bg-[#0d0d14]"}>
                        <td colSpan={7} className="px-6 py-3">
                          {cron.lastError && (
                            <div className="mb-2">
                              <span className="text-xs font-semibold text-red-400">Error: </span>
                              <span className="text-xs text-red-300 font-mono">{cron.lastError}</span>
                            </div>
                          )}
                          <div className="text-xs text-[#86869b] font-mono">ID: {cron.id}</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
