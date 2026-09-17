"use client";

import Link from "next/link";
import { FormEvent, use, useEffect, useRef, useState } from "react";
import { KidShell } from "@/components/kid-shell";
import { fetchJson } from "@/components/api-client";

type Message = {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type SessionResponse = {
  id: number;
  childId: number;
  messages?: Message[];
};

type ChatResponse = {
  content: string;
  provider: string;
};

export default function KidChatPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [error, setError] = useState("");
  const [safetyTriggered, setSafetyTriggered] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start or resume session
  useEffect(() => {
    let isMounted = true;
    async function initSession() {
      setLoadingSession(true);
      setError("");
      try {
        // Check for existing session in sessionStorage for this child
        const storageKey = `agentkid_session_${childId}`;
        const savedSessionId = sessionStorage.getItem(storageKey);

        if (savedSessionId) {
          try {
            const existing = await fetchJson<SessionResponse>(`/api/sessions/${savedSessionId}`);
            if (isMounted && existing && existing.id) {
              setSessionId(existing.id);
              if (existing.messages && existing.messages.length > 0) {
                setMessages(existing.messages);
              }
              setLoadingSession(false);
              return;
            }
          } catch {
            // If fetching existing session fails, start a new one
          }
        }

        // Create new session
        const session = await fetchJson<SessionResponse>("/api/sessions", {
          method: "POST",
          body: JSON.stringify({ childId: Number(childId) }),
        });

        if (isMounted) {
          setSessionId(session.id);
          sessionStorage.setItem(storageKey, String(session.id));
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: "Hello! I am your calm companion. What is on your mind today?",
            },
          ]);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to connect to chat session.";
          setError(msg);
        }
      } finally {
        if (isMounted) setLoadingSession(false);
      }
    }

    initSession();
    return () => {
      isMounted = false;
    };
  }, [childId]);

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || !sessionId || sending) return;

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setSending(true);
    setError("");

    try {
      const response = await fetchJson<ChatResponse>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ sessionId, content: text }),
      });

      const assistantMsg: Message = {
        id: `reply-${Date.now()}`,
        role: "assistant",
        content: response.content,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Check if safety fallback triggered
      if (response.provider === "safety-fallback") {
        setSafetyTriggered(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not send message. Please try again.";
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <KidShell
      childId={childId}
      title="Friendly Chat"
      subtitle="Type your message below. We can talk about how you feel or what you are learning."
    >
      <div aria-live="polite">
        {error && (
          <div className="feedback-banner feedback-error" role="alert">
            {error}
          </div>
        )}
      </div>

      {/* Safety response banner and return path */}
      {safetyTriggered && (
        <div
          className="card card-lilac"
          style={{
            border: "3px solid var(--ink)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            textAlign: "center",
            padding: "20px",
          }}
          role="alert"
        >
          <span style={{ fontSize: "2rem" }}>🌱</span>
          <h2 style={{ fontSize: "1.4rem" }}>You are safe and cared for.</h2>
          <p style={{ fontSize: "1.1rem" }}>
            If you ever feel overwhelmed or unsafe, please reach out to your parent or a trusted adult right away.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "8px" }}>
            <Link
              href={`/kid/${childId}`}
              className="btn btn-kid btn-lime"
              style={{ minHeight: "56px", fontSize: "1.1rem" }}
            >
              Take a Break & Return Home
            </Link>
          </div>
        </div>
      )}

      {loadingSession ? (
        <div className="empty-box">
          <p style={{ fontSize: "1.2rem" }}>Starting your calm chat session…</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Transcript window */}
          <div
            className="chat-window"
            role="log"
            aria-label="Chat conversation history"
            tabIndex={0}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`chat-bubble ${m.role}`}
                aria-label={`${m.role === "user" ? "You said" : "Buddy replied"}: ${m.content}`}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="chat-bubble assistant" style={{ fontStyle: "italic", opacity: 0.8 }}>
                Thinking calmly…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input row: strictly text, NO mic/camera */}
          <form onSubmit={handleSendMessage} className="chat-input-row">
            <input
              type="text"
              className="input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message here…"
              disabled={sending}
              aria-label="Type message for your buddy"
              maxLength={1000}
            />
            <button
              type="submit"
              className="btn btn-kid btn-mint"
              disabled={sending || !inputValue.trim()}
              aria-label="Send message"
            >
              {sending ? "…" : "Send ↵"}
            </button>
          </form>

          {/* Two primary return options */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
            <Link
              href={`/kid/${childId}`}
              className="btn btn-kid"
              style={{ minHeight: "56px", fontSize: "1.05rem" }}
            >
              ← Done Chatting
            </Link>
            <Link
              href={`/kid/${childId}/emotion`}
              className="btn btn-kid btn-lilac"
              style={{ minHeight: "56px", fontSize: "1.05rem" }}
            >
              How do you feel? 💛
            </Link>
          </div>
        </div>
      )}
    </KidShell>
  );
}
