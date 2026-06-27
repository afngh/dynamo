import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import TypingLoader from "./components/TypingLoader";
import AuthLanding from "./components/AuthLanding";
import Message from "./components/Message";
import SettingsPanel from "./components/SettingsPanel";
import Header from "./components/Header";

const SUGGESTED_PROMPTS = [
  {
    title: "Internet & Web Technologies",
    desc: "Explain how global networks, IP routing, and DNS servers work together",
    prompt: "What is the internet and how does it work?"
  },
  {
    title: "Quantum Computing",
    desc: "Understand qubits, superposition, and how quantum computers process data",
    prompt: "What is a quantum computer and how does it differ from a classical computer?"
  },
  {
    title: "Python Programming",
    desc: "Explore Python syntax, versatility, and why it powers modern AI and data science",
    prompt: "What is Python programming language and why is it popular?"
  }
];

function useSystemTheme() {
  const [theme, setTheme] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return theme;
}

export default function ChatApp() {
  const theme = useSystemTheme();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [maxTokens, setMaxTokens] = useState(500);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.85);
  const [topK, setTopK] = useState(40);
  const [repetitionPenalty, setRepetitionPenalty] = useState(1.15);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
  }, [theme]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        if (error.message.includes("provider is not enabled")) {
          setAuthError("Google Authentication is not enabled in your Supabase project yet. Please enable it in your Supabase Dashboard under Authentication -> Providers -> Google.");
        } else {
          setAuthError(error.message);
        }
      }
    } catch (err) {
      setAuthError(err.message || "An unexpected authentication error occurred.");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const send = async (overridePrompt) => {
    const text = (overridePrompt || input).trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const botMsg = { role: "assistant", content: "", streaming: true };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const endpoint = import.meta.env.VITE_ENDPOINT_URL || "http://127.0.0.1:8000/dynamo/";
      const emailParam = user?.email ? `&user_email=${encodeURIComponent(user.email)}` : "";
      const params = `?prompt=${encodeURIComponent(text)}${emailParam}&max_tokens=${maxTokens}&temperature=${temperature}&top_p=${topP}&top_k=${topK}&repetition_penalty=${repetitionPenalty}`;
      const url = `${endpoint.replace(/\/+$/, "")}/${params}`;

      const res = await fetch(url, {
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();


      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() || "";

        for (const line of parts) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.token !== undefined) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.token,
                  };
                }
                return updated;
              });
            }
          } catch (e) {
            console.error("JSON parse error", e);
          }
        }
      }

      if (buffer.trim().startsWith("data: ")) {
        const data = buffer.trim().slice(6).trim();
        if (data !== "[DONE]") {
          try {
            const parsed = JSON.parse(data);
            if (parsed.token !== undefined) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.token,
                  };
                }
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: "Unable to connect to Dynamo backend. Please ensure the server is running.",
              streaming: false,
            };
          }
          return updated;
        });
      }
    } finally {
      abortControllerRef.current = null;
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            streaming: false,
          };
        }
        return updated;
      });
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (authLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100">
        <TypingLoader />
      </div>
    );
  }

  if (!user) {
    return <AuthLanding handleGoogleLogin={handleGoogleLogin} authError={authError} />;
  }

  return (
    <div className="d-flex flex-column vh-100 position-relative">
      <Header
        user={user}
        handleSignOut={handleSignOut}
        clearChat={clearChat}
        disabledClear={messages.length === 0}
      />

      <main id="chat-scroll" className="flex-grow-1 overflow-y-auto px-3 px-md-4 py-4 container-md">
        {messages.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center my-auto py-5">
            <h1 className="fw-semibold mb-2" style={{ fontSize: 26, letterSpacing: "-0.02em" }}>
              How can Dynamo help you today?
            </h1>
            <p className="text-secondary mb-5" style={{ maxWidth: 460, fontSize: 14, lineHeight: 1.6 }}>
              A decoder-only transformer trained from scratch with PyTorch.
            </p>

            <div className="w-100" style={{ maxWidth: 640 }}>
              <div className="row g-3">
                {SUGGESTED_PROMPTS.map((item, idx) => (
                  <div key={idx} className="col-12 col-md-4">
                    <div
                      className="prompt-card h-100 text-start d-flex flex-column justify-content-between"
                      onClick={() => send(item.prompt)}
                    >
                      <div>
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <div className="fw-semibold" style={{ fontSize: 14 }}>
                            {item.title}
                          </div>
                          <svg className="prompt-card-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </div>
                        <div className="text-secondary" style={{ fontSize: 12, lineHeight: 1.45 }}>
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2">
            {messages.map((msg, i) => (
              <Message key={i} msg={msg} user={user} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <footer className="px-3 px-md-4 pb-4 pt-2 container-md position-relative">
        {showSettings && (
          <SettingsPanel
            maxTokens={maxTokens}
            setMaxTokens={setMaxTokens}
            temperature={temperature}
            setTemperature={setTemperature}
            topP={topP}
            setTopP={setTopP}
            topK={topK}
            setTopK={setTopK}
            repetitionPenalty={repetitionPenalty}
            setRepetitionPenalty={setRepetitionPenalty}
            onClose={() => setShowSettings(false)}
          />
        )}

        <div className="chat-input-wrapper p-2 d-flex align-items-end gap-2">
          <button
            className={`btn d-flex align-items-center justify-content-center flex-shrink-0 mb-1 ms-1 ${showSettings ? "btn-secondary" : "btn-link text-secondary"}`}
            onClick={() => setShowSettings(!showSettings)}
            title="Model Settings"
            style={{ width: 38, height: 38, borderRadius: 10, padding: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            className="form-control border-0 bg-transparent shadow-none px-2 py-2"
            rows={1}
            placeholder="Send a message..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
            }}
            onKeyDown={handleKey}
            disabled={loading}
            style={{
              resize: "none",
              overflow: "hidden",
              fontSize: 15,
              lineHeight: 1.6,
              color: "var(--text-primary)"
            }}
          />
          {loading ? (
            <button
              className="btn d-flex align-items-center justify-content-center flex-shrink-0 mb-1 me-1"
              onClick={stopGeneration}
              title="Stop generating"
              style={{
                width: 38,
                height: 38,
                backgroundColor: "var(--accent-color)",
                color: "#ffffff",
                border: "none",
                borderRadius: 10
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              className="btn btn-claude d-flex align-items-center justify-content-center flex-shrink-0 mb-1 me-1"
              onClick={() => send()}
              disabled={!input.trim()}
              title="Send message"
              style={{
                width: 38,
                height: 38,
                opacity: !input.trim() ? 0.4 : 1
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="text-center text-secondary mt-2" style={{ fontSize: 11, opacity: 0.75 }}>
          Dynamo may produce inaccurate information about people, places, or facts.
        </div>
      </footer>
    </div>
  );
}