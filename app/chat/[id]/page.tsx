"use client";
import React, { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import type { Agent, ChatMessage } from "@/lib/types";

function timeStr(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function shouldShowAvatar(messages: ChatMessage[], index: number): boolean {
  if (index === 0) return true;
  return messages[index - 1].role !== messages[index].role;
}

/* ── Markdown formatting ────────────────────────────────── */

function inlineFormat(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));

    if (match[0].startsWith("**")) {
      parts.push(<strong key={match.index} style={{ fontWeight: 700 }}>{match[2]}</strong>);
    } else if (match[0].startsWith("`")) {
      parts.push(
        <code key={match.index} style={{
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 5,
          padding: "1px 5px",
          fontSize: "0.88em",
          fontFamily: "SF Mono, Menlo, monospace",
        }}>{match[3]}</code>
      );
    } else if (match[0].startsWith("*")) {
      parts.push(<em key={match.index} style={{ fontStyle: "italic", opacity: 0.85 }}>{match[4]}</em>);
    }

    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function formatMessage(content: string): React.ReactNode {
  if (!content) return null;

  const lines = content.split("\n");
  const result: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
      } else {
        inCodeBlock = false;
        result.push(
          <pre key={i} style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12,
            fontFamily: "SF Mono, Menlo, monospace",
            overflowX: "auto",
            margin: "6px 0",
            color: "#e2e8f0",
            lineHeight: 1.6,
          }}>
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === "") {
      result.push(<div key={`space-${i}`} style={{ height: 6 }} />);
      continue;
    }

    // Bullet list item
    if (line.match(/^[-*] /)) {
      result.push(
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 2 }}>
          <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }}>•</span>
          <span>{inlineFormat(line.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)?.[1];
      result.push(
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 2 }}>
          <span style={{ color: "var(--accent)", flexShrink: 0, fontWeight: 600, minWidth: 16 }}>{num}.</span>
          <span>{inlineFormat(line.replace(/^\d+\. /, ""))}</span>
        </div>
      );
      continue;
    }

    // Heading
    if (line.startsWith("### ")) {
      result.push(<div key={i} style={{ fontWeight: 600, fontSize: 14, marginTop: 8, marginBottom: 2 }}>{inlineFormat(line.slice(4))}</div>);
      continue;
    }
    if (line.startsWith("## ")) {
      result.push(<div key={i} style={{ fontWeight: 700, fontSize: 15, marginTop: 10, marginBottom: 3 }}>{inlineFormat(line.slice(3))}</div>);
      continue;
    }

    // Regular paragraph line
    result.push(<div key={i} style={{ marginBottom: 1 }}>{inlineFormat(line)}</div>);
  }

  return <>{result}</>;
}

/* ── Component ──────────────────────────────────────────── */

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((agents: Agent[]) => {
        const found = agents.find((a) => a.id === id);
        setAgent(found || null);
        if (found) {
          setMessages([
            {
              role: "assistant",
              content: `I'm ${found.name}. ${found.description} What do you need?`,
              timestamp: Date.now(),
            },
          ]);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || isStreaming) return;
    const userMsg: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch(`/api/chat/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const chunk = JSON.parse(line.slice(6));
              if (chunk.content) {
                setMessages((prev) => {
                  const msgs = [...prev];
                  msgs[msgs.length - 1] = {
                    ...msgs[msgs.length - 1],
                    content:
                      msgs[msgs.length - 1].content + chunk.content,
                  };
                  return msgs;
                });
              }
            } catch {
              /* skip malformed chunks */
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          ...msgs[msgs.length - 1],
          content: "Error getting response. Check API connection.",
        };
        return msgs;
      });
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    if (!agent) return;
    setMessages([
      {
        role: "assistant",
        content: `I'm ${agent.name}. ${agent.description} What do you need?`,
        timestamp: Date.now(),
      },
    ]);
  }

  /* --- Loading state --- */
  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ background: "var(--bg)" }}
      >
        <span
          className="text-[15px] animate-pulse"
          style={{ color: "var(--text-secondary)" }}
        >
          Connecting...
        </span>
      </div>
    );
  }

  /* --- Not found state --- */
  if (!agent) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3"
        style={{ background: "var(--bg)" }}
      >
        <span
          className="text-[15px]"
          style={{ color: "var(--text-secondary)" }}
        >
          Agent not found
        </span>
        <Link
          href="/"
          className="text-[15px] hover:underline"
          style={{ color: "var(--system-blue)" }}
        >
          &#8249; Back to Agents
        </Link>
      </div>
    );
  }

  const hasInput = input.trim().length > 0;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* --- Color stripe --- */}
      <div
        className="h-[3px] w-full flex-shrink-0"
        style={{ backgroundColor: agent.color }}
      />

      {/* --- Header (Messenger-style) --- */}
      <div style={{
        background: "var(--material-regular)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        borderBottom: "1px solid var(--separator)",
        flexShrink: 0,
      }}>
        {/* Top bar: back + clear */}
        <div className="flex items-center justify-between px-4" style={{ height: 44 }}>
          <Link
            href="/"
            className="text-[15px] hover:opacity-80 transition-opacity flex-shrink-0"
            style={{ color: "var(--system-blue)" }}
          >
            &#8249; Agents
          </Link>
          <button
            onClick={clearChat}
            className="hover:opacity-70 transition-opacity"
            style={{ color: "var(--text-tertiary)" }}
            title="Clear conversation"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 5h14" />
              <path d="M8 5V3.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V5" />
              <path d="M5 5l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12" />
              <path d="M8.5 9v5" />
              <path d="M11.5 9v5" />
            </svg>
          </button>
        </div>

        {/* Agent identity — Messenger-style centered block */}
        <div className="flex flex-col items-center pb-4 px-4 gap-2">
          {/* Large avatar */}
          <div style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${agent.color}cc, ${agent.color}66)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            boxShadow: `0 0 0 3px ${agent.color}33, 0 4px 16px rgba(0,0,0,0.4)`,
            border: `2px solid ${agent.color}66`,
          }}>
            {agent.emoji}
          </div>
          {/* Name + title + active */}
          <div className="text-center">
            <div style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
              {agent.name}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}>
              {agent.title}
            </div>
            {/* Active indicator */}
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--system-green)" }} />
              <span style={{ fontSize: 11, color: "var(--system-green)" }}>Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- Messages --- */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ background: "#000", padding: "20px 16px 80px 16px" }}
      >
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          const showAvatar = shouldShowAvatar(messages, i);
          const isLastAssistant =
            !isUser && i === messages.length - 1 && isStreaming;

          return (
            <div key={i} className="animate-fade-in">
              {/* Spacing: 16px between sender groups, 3px within same sender */}
              <div style={{ height: i > 0 ? (messages[i - 1].role !== msg.role ? 16 : 3) : 0 }} />

              <div
                className={`group flex items-end gap-2 ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                {/* Assistant avatar column */}
                {!isUser && (
                  <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 36 }}>
                    {showAvatar ? (
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${agent.color}cc, ${agent.color}66)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        flexShrink: 0,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                        border: `1.5px solid ${agent.color}55`,
                      }}>
                        {agent.emoji}
                      </div>
                    ) : (
                      <div style={{ width: 36 }} />
                    )}
                  </div>
                )}

                {/* Bubble column */}
                <div className="flex flex-col" style={{ maxWidth: "72%" }}>
                  {/* Agent name label on first message of group */}
                  {showAvatar && !isUser && (
                    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", marginBottom: 3, marginLeft: 14 }}>
                      {agent.name}
                    </div>
                  )}
                  {/* "You" label on first user message of group */}
                  {showAvatar && isUser && (
                    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", marginBottom: 3, marginRight: 14, textAlign: "right" }}>
                      You
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={`px-[14px] py-[10px] text-[15px] ${isUser ? "msg-user" : "msg-assistant"}`}
                    style={
                      isUser
                        ? {
                            background: "var(--accent)",
                            color: "#000",
                            fontWeight: 500,
                            borderRadius: "20px 20px 4px 20px",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                          }
                        : {
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.10)",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                            borderRadius: "20px 20px 20px 4px",
                            color: "#fff",
                          }
                    }
                  >
                    {formatMessage(msg.content)}
                    {isLastAssistant && !msg.content && (
                      <span
                        className="animate-blink"
                        style={{ color: "var(--accent)" }}
                      >
                        &#9612;
                      </span>
                    )}
                    {isLastAssistant && msg.content && (
                      <span
                        className="animate-blink ml-0.5"
                        style={{ color: "var(--accent)" }}
                      >
                        &#9612;
                      </span>
                    )}
                  </div>

                  {/* Timestamp on hover */}
                  <span
                    className={`text-[11px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                      isUser ? "text-right mr-1" : "text-left ml-1"
                    }`}
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {timeStr(msg.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* --- Input area --- */}
      <div
        className="px-4 pt-3 pb-2 flex-shrink-0"
        style={{
          background: "var(--material-regular)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          borderTop: "1px solid var(--separator)",
        }}
      >
        <div className="flex items-end gap-2">
          {/* Input field */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${agent.name}...`}
              rows={1}
              disabled={isStreaming}
              className="w-full px-4 py-2.5 text-[15px] resize-none focus:outline-none disabled:opacity-50"
              style={{
                minHeight: 40,
                maxHeight: 120,
                borderRadius: 22,
                background: "var(--fill-tertiary)",
                border: "none",
                color: "var(--text-primary)",
                transition: "box-shadow 200ms var(--ease-smooth)",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height =
                  Math.min(target.scrollHeight, 120) + "px";
              }}
              onFocus={(e) => {
                e.target.style.boxShadow =
                  "0 0 0 4px rgba(10,132,255,0.25)";
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Send button -- appears when input non-empty */}
          <div
            className="flex-shrink-0 mb-0.5"
            style={{
              opacity: hasInput ? 1 : 0,
              transform: hasInput ? "scale(1)" : "scale(0.6)",
              pointerEvents: hasInput ? "auto" : "none",
              transition: "all 0.35s var(--ease-spring)",
            }}
          >
            <button
              onClick={sendMessage}
              disabled={isStreaming || !hasInput}
              className="flex items-center justify-center font-bold text-[18px] active:scale-90 disabled:opacity-50"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--accent)",
                color: "#000",
                border: "none",
                cursor: "pointer",
                transition: "transform 150ms var(--ease-spring)",
              }}
              title="Send message"
            >
              &#8593;
            </button>
          </div>
        </div>

        {/* Helper text */}
        <p
          className="text-[11px] text-center mt-2 mb-0.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          &#8629; Send &middot; &#8679;&#8629; New line
        </p>
      </div>
    </div>
  );
}
