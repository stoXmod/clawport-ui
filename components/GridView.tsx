"use client"

import type { Agent, CronJob } from "@/lib/types"
import { AgentAvatar } from "@/components/AgentAvatar"

interface GridViewProps {
  agents: Agent[]
  crons: CronJob[]
  selectedId: string | null
  onSelect: (agent: Agent) => void
}

function worstStatus(statuses: CronJob["status"][]): CronJob["status"] {
  if (statuses.includes("error")) return "error"
  if (statuses.includes("ok")) return "ok"
  return "idle"
}

interface Team {
  manager: Agent
  members: Agent[]
}

function buildTeams(agents: Agent[]): { jarvis: Agent | null; teams: Team[]; soloOps: Agent[] } {
  const jarvis = agents.find((a) => a.reportsTo === null) ?? null
  if (!jarvis) return { jarvis: null, teams: [], soloOps: [] }

  const byId = new Map(agents.map((a) => [a.id, a]))
  const teamManagers: Agent[] = []
  const soloOps: Agent[] = []

  for (const rid of jarvis.directReports) {
    const r = byId.get(rid)
    if (!r) continue
    if (r.directReports.length > 0) {
      teamManagers.push(r)
    } else {
      soloOps.push(r)
    }
  }

  const teams: Team[] = teamManagers.map((mgr) => {
    const members: Agent[] = []
    const queue = [...mgr.directReports]
    while (queue.length > 0) {
      const id = queue.shift()!
      const a = byId.get(id)
      if (a) {
        members.push(a)
        queue.push(...a.directReports)
      }
    }
    return { manager: mgr, members }
  })

  return { jarvis, teams, soloOps }
}

function AgentCard({
  agent,
  crons,
  selected,
  onSelect,
}: {
  agent: Agent
  crons: CronJob[]
  selected: boolean
  onSelect: () => void
}) {
  const agentCrons = crons.filter((c) => c.agentId === agent.id)
  const cronStatus = worstStatus(agentCrons.map((c) => c.status))
  const cronColor =
    cronStatus === "ok"
      ? "var(--system-green)"
      : cronStatus === "error"
        ? "var(--system-red)"
        : "var(--text-tertiary)"

  return (
    <button
      className="hover-lift focus-ring"
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-4)",
        borderRadius: "var(--radius-md)",
        background: "var(--material-regular)",
        border: selected
          ? `1.5px solid ${agent.color}`
          : "1px solid var(--separator)",
        borderTop: `2px solid ${agent.color}`,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        transition: "all 150ms var(--ease-spring)",
        boxShadow: selected
          ? `0 0 0 1px ${agent.color}40, 0 4px 16px ${agent.color}18`
          : "var(--shadow-subtle)",
      }}
    >
      <AgentAvatar
        agent={agent}
        size={40}
        borderRadius={11}
        style={{
          border: `1px solid ${agent.color}30`,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "var(--text-body)",
            fontWeight: "var(--weight-semibold)",
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: "var(--leading-tight)",
          }}
        >
          {agent.name}
        </div>
        <div
          style={{
            fontSize: "var(--text-caption1)",
            color: agent.color,
            opacity: 0.8,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginTop: 1,
          }}
        >
          {agent.title}
        </div>
        {agent.description && (
          <div
            style={{
              fontSize: "var(--text-caption2)",
              color: "var(--text-tertiary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginTop: 2,
            }}
          >
            {agent.description}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
          flexShrink: 0,
        }}
      >
        {agentCrons.length > 0 && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: "var(--text-caption2)",
              color: cronColor,
              fontWeight: "var(--weight-medium)",
            }}
          >
            <span
              className={cronStatus === "error" ? "animate-error-pulse" : ""}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: cronColor,
                display: "inline-block",
              }}
            />
            {agentCrons.length} cron{agentCrons.length !== 1 ? "s" : ""}
          </span>
        )}
        {agent.tools.length > 0 && (
          <span
            style={{
              fontSize: "var(--text-caption2)",
              fontWeight: "var(--weight-medium)",
              color: "var(--text-quaternary)",
              background: "var(--fill-quaternary)",
              padding: "1px 7px",
              borderRadius: 10,
            }}
          >
            {agent.tools.length} tools
          </span>
        )}
      </div>
    </button>
  )
}

function TeamSection({
  label,
  icon,
  count,
  errorCount,
  children,
}: {
  label: string
  icon: React.ReactNode
  count: number
  errorCount: number
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--separator)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-1)",
        }}
      >
        {icon}
        <span
          style={{
            fontSize: "var(--text-caption1)",
            fontWeight: "var(--weight-semibold)",
            letterSpacing: "var(--tracking-wide)",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "var(--text-caption2)",
            color: "var(--text-quaternary)",
            marginLeft: "auto",
          }}
        >
          {count} agent{count !== 1 ? "s" : ""}
          {errorCount > 0 && (
            <span style={{ color: "var(--system-red)", marginLeft: 6 }}>
              {errorCount} err
            </span>
          )}
        </span>
      </div>
      {children}
    </div>
  )
}

export function GridView({ agents, crons, selectedId, onSelect }: GridViewProps) {
  const { jarvis, teams, soloOps } = buildTeams(agents)

  const totalCrons = crons.length
  const healthyCrons = crons.filter((c) => c.status === "ok").length
  const errorCrons = crons.filter((c) => c.status === "error").length
  const healthPct = totalCrons === 0 ? 100 : Math.round((healthyCrons / totalCrons) * 100)

  return (
    <div
      className="h-full"
      style={{
        overflowY: "auto",
        padding: "var(--space-6)",
        paddingTop: 52,
      }}
    >
      {/* Jarvis hero banner */}
      {jarvis && (
        <button
          className="hover-lift focus-ring"
          onClick={() => onSelect(jarvis)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-5)",
            width: "100%",
            padding: "var(--space-5) var(--space-6)",
            borderRadius: "var(--radius-xl)",
            background: `linear-gradient(135deg, var(--material-regular) 0%, ${jarvis.color}08 100%)`,
            border: selectedId === jarvis.id
              ? `1.5px solid ${jarvis.color}`
              : "1px solid var(--separator)",
            cursor: "pointer",
            textAlign: "left",
            marginBottom: "var(--space-6)",
            transition: "all 150ms var(--ease-spring)",
            boxShadow: selectedId === jarvis.id
              ? `0 0 0 1px ${jarvis.color}40, 0 8px 32px ${jarvis.color}12`
              : "var(--shadow-card)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <AgentAvatar
            agent={jarvis}
            size={64}
            borderRadius={18}
            style={{
              border: `1.5px solid ${jarvis.color}50`,
              boxShadow: `0 4px 20px ${jarvis.color}20`,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "var(--text-title2)",
                fontWeight: "var(--weight-bold)",
                color: "var(--text-primary)",
                letterSpacing: "var(--tracking-tight)",
                lineHeight: "var(--leading-tight)",
              }}
            >
              {jarvis.name}
            </div>
            <div
              style={{
                fontSize: "var(--text-subheadline)",
                color: jarvis.color,
                opacity: 0.85,
                marginTop: 2,
              }}
            >
              {jarvis.title}
            </div>
            {jarvis.description && (
              <div
                style={{
                  fontSize: "var(--text-caption1)",
                  color: "var(--text-tertiary)",
                  marginTop: "var(--space-1)",
                }}
              >
                {jarvis.description}
              </div>
            )}
          </div>

          {/* Stats cluster */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-4)",
              flexShrink: 0,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "var(--text-title3)",
                  fontWeight: "var(--weight-bold)",
                  color: "var(--text-primary)",
                  lineHeight: 1,
                }}
              >
                {agents.length}
              </div>
              <div
                style={{
                  fontSize: "var(--text-caption2)",
                  color: "var(--text-tertiary)",
                  marginTop: 2,
                }}
              >
                agents
              </div>
            </div>
            <div
              style={{
                width: 1,
                alignSelf: "stretch",
                background: "var(--separator)",
              }}
            />
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "var(--text-title3)",
                  fontWeight: "var(--weight-bold)",
                  color: "var(--text-primary)",
                  lineHeight: 1,
                }}
              >
                {totalCrons}
              </div>
              <div
                style={{
                  fontSize: "var(--text-caption2)",
                  color: "var(--text-tertiary)",
                  marginTop: 2,
                }}
              >
                crons
              </div>
            </div>
            <div
              style={{
                width: 1,
                alignSelf: "stretch",
                background: "var(--separator)",
              }}
            />
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "var(--text-title3)",
                  fontWeight: "var(--weight-bold)",
                  color: errorCrons > 0 ? "var(--system-red)" : "var(--system-green)",
                  lineHeight: 1,
                }}
              >
                {healthPct}%
              </div>
              <div
                style={{
                  fontSize: "var(--text-caption2)",
                  color: "var(--text-tertiary)",
                  marginTop: 2,
                }}
              >
                health
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Team columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "var(--space-5)",
          alignItems: "start",
        }}
      >
        {teams.map((team) => {
          const teamCrons = crons.filter(
            (c) => c.agentId === team.manager.id || team.members.some((m) => m.id === c.agentId),
          )
          const teamErrors = teamCrons.filter((c) => c.status === "error").length

          return (
            <TeamSection
              key={team.manager.id}
              label={`Team ${team.manager.name}`}
              icon={<AgentAvatar agent={team.manager} size={22} borderRadius={6} />}
              count={1 + team.members.length}
              errorCount={teamErrors}
            >
              <AgentCard
                agent={team.manager}
                crons={crons}
                selected={selectedId === team.manager.id}
                onSelect={() => onSelect(team.manager)}
              />
              {team.members.map((m) => (
                <AgentCard
                  key={m.id}
                  agent={m}
                  crons={crons}
                  selected={selectedId === m.id}
                  onSelect={() => onSelect(m)}
                />
              ))}
            </TeamSection>
          )
        })}

        {/* Solo Ops column */}
        {soloOps.length > 0 && (
          <TeamSection
            label="Solo Ops"
            icon={
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: "var(--fill-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                &#x26A1;
              </span>
            }
            count={soloOps.length}
            errorCount={
              crons.filter(
                (c) => soloOps.some((a) => a.id === c.agentId) && c.status === "error",
              ).length
            }
          >
            {soloOps.map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                crons={crons}
                selected={selectedId === a.id}
                onSelect={() => onSelect(a)}
              />
            ))}
          </TeamSection>
        )}
      </div>
    </div>
  )
}
