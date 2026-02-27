"use client";
import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import type { Agent, ChatMessage } from "@/lib/types";

function timeStr(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
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
    const userMsg: ChatMessage = { role: "user", content: input.trim(), timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMsg: ChatMessage = { role: "assistant", content: "", timestamp: Date.now() };
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
                    content: msgs[msgs.length - 1].content + chunk.content,
                  };
                  return msgs;
                });
              }
            } catch {}
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

  if (loading) return <div className="flex items-center justify-center h-full text-[#f5c518] text-sm animate-pulse">Connecting...</div>;
  if (!agent) return <div className="flex items-center justify-center h-full text-[#86869b] text-sm">Agent not found. <Link href="/" className="text-[#f5c518] ml-1">← Back</Link></div>;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f]">
      {/* Agent color stripe */}
      <div className="h-0.5 w-full flex-shrink-0" style={{ backgroundColor: agent.color }} />
      {/* Header */}
      <div className="border-b border-[#262632] bg-[#0d0d14] px-5 py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/agents/${agent.id}`} className="text-[#86869b] hover:text-white text-sm mr-1 transition-colors">←</Link>
          <div className="w-0.5 h-6 rounded-full" style={{ backgroundColor: agent.color }} />
          <span className="text-lg">{agent.emoji}</span>
          <div>
            <span className="font-bold text-white text-lg">{agent.name}</span>
            <span className="text-[#86869b] text-xs ml-2">{agent.title}</span>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-green-400 font-medium">live</span>
          </div>
          {agent.voiceId && (
            <div className="flex items-center gap-1.5 ml-2 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span className="text-[10px] text-purple-400 font-medium">Voice enabled</span>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setMessages([{ role: "assistant", content: `I'm ${agent.name}. ${agent.description} What do you need?`, timestamp: Date.now() }]);
          }}
          className="text-xs text-[#86869b] hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-[#1a1a24]"
        >
          🗑 Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`group flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[75%]">
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mb-1.5 ml-1">
                  <span className="text-sm">{agent.emoji}</span>
                  <span className="text-xs font-semibold text-[#86869b]">{agent.name}</span>
                </div>
              )}
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-[#f5c518] to-[#e8b800] text-black font-medium rounded-tr-sm"
                    : "bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] text-[#f5f5f7] rounded-tl-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                }`}
              >
                {msg.content || (isStreaming && i === messages.length - 1 ? (
                  <span className="text-[#f5c518] font-mono animate-blink">_</span>
                ) : "")}
              </div>
              {/* Timestamp — show on hover */}
              <div className={`text-[10px] text-[#86869b] mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${msg.role === "user" ? "text-right" : "text-left ml-1"}`}>
                {timeStr(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#262632] bg-[#0d0d14] p-4 flex-shrink-0">
        <div className="flex gap-3 items-end rounded-xl border border-[#262632] bg-[#13131a] transition-all duration-200 focus-within:ring-1 focus-within:ring-[#f5c518]/30 focus-within:border-[#f5c518]/30">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent.name}...`}
            rows={2}
            disabled={isStreaming}
            className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-[#86869b] resize-none focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            style={{ backgroundColor: isStreaming || !input.trim() ? "transparent" : "#f5c518" }}
            className="px-4 py-3 rounded-r-xl font-semibold text-sm transition-colors disabled:text-[#86869b] text-black h-[52px] flex-shrink-0 flex items-center gap-1.5"
          >
            {isStreaming ? (
              <span className="inline-block w-4 h-4 border-2 border-[#86869b] border-t-transparent rounded-full animate-spin" />
            ) : (
              "Send"
            )}
          </button>
        </div>
        <div className="text-[10px] text-[#86869b]/50 mt-1.5 text-center">
          ↵ Send · ⇧↵ New line
        </div>
      </div>
    </div>
  );
}
