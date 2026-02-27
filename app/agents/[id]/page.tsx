"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Agent, CronJob } from "@/lib/types";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

const statusColors = { ok: "text-green-400 bg-green-400/10", error: "text-red-400 bg-red-400/10", idle: "text-[#86869b] bg-[#86869b]/10" };
const statusBorderColors = { ok: "border-l-green-500", error: "border-l-red-500", idle: "border-l-[#86869b]" };

const TOOL_ICONS: Record<string, string> = {
  web_search: "🔍",
  read: "📁",
  write: "✏️",
  exec: "💻",
  web_fetch: "🌐",
  message: "🔔",
  tts: "💬",
};

function SoulViewer({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="bg-[#0d0d14] rounded-lg max-h-96 overflow-y-auto flex">
      {/* Line numbers gutter */}
      <div className="flex-shrink-0 border-r border-[#262632] px-3 py-4 select-none">
        {lines.map((_, i) => (
          <div key={i} className="font-mono text-[10px] text-[#86869b]/40 leading-relaxed text-right min-w-[2ch]">
            {i + 1}
          </div>
        ))}
      </div>
      {/* Content */}
      <pre className="font-mono text-xs text-[#c8c8d4] whitespace-pre-wrap leading-relaxed p-4 flex-1">
        {content}
      </pre>
    </div>
  );
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/agents").then((r) => r.json()), fetch("/api/crons").then((r) => r.json())])
      .then(([agents, c]) => {
        setAllAgents(agents);
        setAgent(agents.find((a: Agent) => a.id === id) || null);
        setCrons(c.filter((cr: CronJob) => cr.agentId === id));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-full text-[#f5c518] text-sm animate-pulse">Loading agent...</div>;
  if (!agent) return <div className="flex items-center justify-center h-full text-[#86869b] text-sm">Agent not found. <Link href="/" className="text-[#f5c518] ml-1">← Back</Link></div>;

  const parent = agent.reportsTo ? allAgents.find((a) => a.id === agent.reportsTo) : null;
  const children = agent.directReports.map((cid) => allAgents.find((a) => a.id === cid)).filter(Boolean) as Agent[];

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0f]">
      {/* Header with top gradient glow */}
      <div
        className="sticky top-0 z-10 border-b border-[#262632] bg-[#0d0d14] px-6 py-4 flex items-center justify-between"
        style={{
          borderTop: `3px solid ${agent.color}`,
          boxShadow: `0 4px 24px ${agent.color}15`,
        }}
      >
        <div className="flex items-center gap-4">
          <Link href="/" className="text-[#86869b] hover:text-white text-sm transition-colors">← Map</Link>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{agent.emoji}</span>
            <div>
              <span className="font-bold text-white text-lg">{agent.name}</span>
              <div className="text-[#86869b] text-xs">{agent.title}</div>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push(`/chat/${agent.id}`)}
          className="font-semibold text-sm px-5 py-2 rounded-lg transition-colors text-black"
          style={{
            background: `linear-gradient(135deg, ${agent.color}, #f5c518)`,
          }}
        >
          💬 Talk to {agent.name}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5 p-6">
        {/* Left column */}
        <div className="col-span-1 space-y-4">
          {/* Identity */}
          <div className="relative bg-[#13131a] border border-[#262632] rounded-xl p-4 overflow-hidden">
            {/* Watermark emoji */}
            <span
              className="absolute -bottom-2 -right-1 text-[48px] opacity-[0.06] select-none pointer-events-none"
              aria-hidden="true"
            >
              {agent.emoji}
            </span>
            <div className="text-[10px] font-semibold text-[#86869b] uppercase tracking-widest mb-2">About</div>
            <p className="text-sm text-[#c8c8d4] leading-relaxed relative">{agent.description}</p>
          </div>

          {/* Tools — 2-column grid */}
          <div className="bg-[#13131a] border border-[#262632] rounded-xl p-4">
            <div className="text-[10px] font-semibold text-[#86869b] uppercase tracking-widest mb-2.5">Tools</div>
            <div className="grid grid-cols-2 gap-1.5">
              {agent.tools.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 text-xs font-mono tracking-tight bg-[#1a1a24] border border-[#262632] text-[#c8c8d4] px-2 py-1 rounded-lg"
                >
                  {TOOL_ICONS[t] && <span className="text-[10px]">{TOOL_ICONS[t]}</span>}
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Voice */}
          <div className="bg-[#13131a] border border-[#262632] rounded-xl p-4">
            <div className="text-[10px] font-semibold text-[#86869b] uppercase tracking-widest mb-2">Voice</div>
            {agent.voiceId ? (
              <div>
                <span className="inline-block bg-purple-500/10 text-purple-400 text-xs px-2 py-0.5 rounded-full border border-purple-500/20 mb-1">ElevenLabs</span>
                <div className="font-mono text-[10px] text-[#86869b] mt-1 break-all">{agent.voiceId}</div>
              </div>
            ) : (
              <span className="text-xs text-[#86869b]">No voice configured</span>
            )}
          </div>

          {/* Hierarchy */}
          <div className="bg-[#13131a] border border-[#262632] rounded-xl p-4">
            <div className="text-[10px] font-semibold text-[#86869b] uppercase tracking-widest mb-2">Hierarchy</div>
            {parent && (
              <div className="mb-3">
                <div className="text-[10px] text-[#86869b] mb-1">Reports to</div>
                <Link href={`/agents/${parent.id}`} className="flex items-center gap-2 text-sm hover:text-[#f5c518] transition-colors">
                  <span>{parent.emoji}</span>
                  <span>{parent.name}</span>
                </Link>
              </div>
            )}
            {children.length > 0 && (
              <div>
                <div className="text-[10px] text-[#86869b] mb-1">Direct reports ({children.length})</div>
                <div className="space-y-1">
                  {children.map((c) => (
                    <Link key={c.id} href={`/agents/${c.id}`} className="flex items-center gap-2 text-sm hover:text-[#f5c518] transition-colors">
                      <span>{c.emoji}</span>
                      <span>{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-2 space-y-4">
          {/* SOUL.md */}
          {agent.soul && (
            <div className="bg-[#13131a] border border-[#262632] rounded-xl p-4">
              <div className="text-[10px] font-semibold text-[#86869b] uppercase tracking-widest mb-3">SOUL.md</div>
              <SoulViewer content={agent.soul} />
            </div>
          )}

          {/* Crons */}
          <div className="bg-[#13131a] border border-[#262632] rounded-xl p-4">
            <div className="text-[10px] font-semibold text-[#86869b] uppercase tracking-widest mb-3">
              Associated Crons {crons.length > 0 && `(${crons.length})`}
            </div>
            {crons.length === 0 ? (
              <div className="text-xs text-[#86869b]">No crons associated with this agent</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#86869b] border-b border-[#262632]">
                    <th className="text-left pb-2 font-normal">Name</th>
                    <th className="text-left pb-2 font-normal">Schedule</th>
                    <th className="text-left pb-2 font-normal">Status</th>
                    <th className="text-left pb-2 font-normal">Next Run</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262632]">
                  {crons.map((c) => (
                    <tr key={c.id} className={`border-l-[3px] ${statusBorderColors[c.status]}`}>
                      <td className="py-2 pl-3 font-mono text-[#c8c8d4] pr-3">{c.name}</td>
                      <td className="py-2 font-mono text-[#86869b] pr-3">{c.schedule}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${statusColors[c.status]}`}>{c.status}</span>
                      </td>
                      <td className="py-2 text-[#86869b]">{timeAgo(c.nextRun)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
