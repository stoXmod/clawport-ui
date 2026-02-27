"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Agent, CronJob } from "@/lib/types";

const ManorMap = dynamic(() => import("@/components/ManorMap").then((m) => ({ default: m.ManorMap })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-[#f5c518] text-sm animate-pulse">Scanning the manor...</div>
    </div>
  ),
});

const TOOL_ICONS: Record<string, string> = {
  web_search: "🔍",
  read: "📁",
  write: "✏️",
  exec: "💻",
  web_fetch: "🌐",
  message: "🔔",
  tts: "💬",
};

function StatusDot({ status }: { status: CronJob["status"] }) {
  const colors = { ok: "bg-green-500", error: "bg-red-500 animate-error-pulse", idle: "bg-[#86869b]" };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
}

export default function ManorPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/agents").then((r) => r.json()), fetch("/api/crons").then((r) => r.json())])
      .then(([a, c]) => {
        setAgents(a);
        setCrons(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const agentCrons = selected ? crons.filter((c) => c.agentId === selected.id) : [];

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">
        Error loading manor: {error}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Map */}
      <div className="flex-1 h-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#f5c518] text-sm animate-pulse">Scanning the manor...</div>
          </div>
        ) : (
          <ManorMap agents={agents} crons={crons} onNodeClick={setSelected} />
        )}
      </div>

      {/* Agent detail panel / Empty state */}
      {selected ? (
        <div className="w-80 flex-shrink-0 border-l border-[#262632] bg-[#0d0d14] flex flex-col overflow-y-auto">
          {/* Gradient header overlay */}
          <div
            className="relative overflow-hidden"
            style={{
              background: `linear-gradient(180deg, ${selected.color}15 0%, transparent 100%)`,
            }}
          >
            {/* Back hint */}
            <div className="px-4 pt-3 pb-0">
              <button
                onClick={() => setSelected(null)}
                className="text-[10px] text-[#86869b] hover:text-[#f5c518] transition-colors"
              >
                ← All Agents
              </button>
            </div>

            {/* Header */}
            <div className="p-4 pt-2 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selected.emoji}</span>
                    <span className="font-bold text-[#f5c518]">{selected.name}</span>
                  </div>
                  <div className="text-[#86869b] text-xs mt-0.5">{selected.title}</div>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-[#86869b] hover:text-white text-lg leading-none transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-[#1a1a24]"
              >
                ×
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="px-4 pb-4 border-b border-[#262632]">
            <p className="text-sm text-[#c8c8d4] leading-relaxed">{selected.description}</p>
          </div>

          {/* Tools */}
          <div className="p-4 border-b border-[#262632]">
            <div className="text-[10px] font-semibold text-[#86869b] uppercase tracking-widest mb-2.5">Tools</div>
            <div className="flex flex-wrap gap-1.5">
              {selected.tools.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-xs font-mono tracking-tight bg-[#1a1a24] border border-[#262632] text-[#c8c8d4] px-2 py-0.5 rounded-full"
                >
                  {TOOL_ICONS[t] && <span className="text-[10px]">{TOOL_ICONS[t]}</span>}
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Crons */}
          {agentCrons.length > 0 && (
            <div className="p-4 border-b border-[#262632]">
              <div className="text-[10px] font-semibold text-[#86869b] uppercase tracking-widest mb-2.5">
                Crons ({agentCrons.length})
              </div>
              <div className="space-y-2">
                {agentCrons.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-xs">
                    <StatusDot status={c.status} />
                    <div className="min-w-0 flex-1">
                      <span className="text-[#c8c8d4] truncate block">{c.name}</span>
                      <span className="font-mono text-[10px] text-[#86869b]">{c.schedule}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-4 mt-auto space-y-2">
            <button
              onClick={() => router.push(`/chat/${selected.id}`)}
              className="w-full bg-[#f5c518] text-black font-semibold text-sm py-2.5 rounded-lg hover:bg-[#e8b800] transition-colors shadow-[0_2px_12px_rgba(245,197,24,0.15)]"
            >
              💬 Open Chat
            </button>
            <button
              onClick={() => router.push(`/agents/${selected.id}`)}
              className="w-full bg-[#1a1a24] border border-[#262632] text-[#f5f5f7] text-sm py-2.5 rounded-lg hover:bg-[#222230] hover:border-[#333342] transition-colors"
            >
              📄 View Details
            </button>
          </div>
        </div>
      ) : (
        <div className="w-80 flex-shrink-0 border-l border-[#262632] bg-[#0d0d14] flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-3xl mb-3 animate-float-hint inline-block">↖</div>
            <div className="text-sm text-[#86869b]">Click any agent to inspect</div>
          </div>
        </div>
      )}
    </div>
  );
}
