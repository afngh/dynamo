import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "dynamo_chat_history";

const SUGGESTED_PROMPTS = [
  {
    title: "Transformer Architecture",
    desc: "Explain self-attention and positional encodings",
    prompt: "Can you explain how causal self-attention works in a decoder-only transformer?",
    icon: "⚡"
  },
  {
    title: "Creative Storytelling",
    desc: "Generate an intriguing futuristic tale",
    prompt: "Once upon a time in a sprawling cybernetic metropolis...",
    icon: "✨"
  },
  {
    title: "PyTorch Deep Learning",
    desc: "Discuss neural network training",
    prompt: "How does RMSNorm differ from LayerNorm during training stability?",
    icon: "🧠"
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

function Message({ msg }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`d-flex mb-4 animate-float-in ${isUser ? "justify-content-end" : "justify-content-start"}`}>
      {!isUser && (
        <div
          className="rounded-circle avatar-glow d-flex align-items-center justify-content-center me-3 flex-shrink-0"
          style={{ width: 36, height: 36, color: "#fff", fontWeight: 700, fontSize: 15 }}
        >
          D
        </div>
      )}
      <div
        className="position-relative group-action"
        style={{ maxWidth: "78%" }}
      >
        <div
          className={`px-4 py-3 ${isUser ? "rounded-4" : "glass-card"}`}
          style={{
            background: isUser ? "var(--user-msg-bg)" : "var(--bot-msg-bg)",
            color: isUser ? "var(--user-msg-color)" : "var(--bot-msg-color)",
            border: isUser ? "none" : "1px solid var(--bot-msg-border)",
            borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
            fontSize: 15,
            lineHeight: 1.65,
            wordBreak: "break-word",
            boxShadow: isUser ? "0 4px 15px rgba(108, 99, 255, 0.3)" : "var(--glass-shadow)"
          }}
        >
          <div style={{ whitespace: "pre-wrap" }}>{msg.content}</div>
          {msg.streaming && <span className="streaming-cursor" />}
        </div>

        {!msg.streaming && msg.content && (
          <div
            className={`position-absolute top-0 ${isUser ? "start-0 translate-middle-x" : "end-0 translate-middle-x"} me-2 mt-1 opacity-75`}
            style={{ zIndex: 2 }}
          >
            <button
              className="btn btn-sm btn-link p-1 text-secondary text-decoration-none"
              onClick={handleCopy}
              title="Copy text"
              style={{ fontSize: 12 }}
            >
              {copied ? "✓ Copied" : "📋"}
            </button>
          </div>
        )}
      </div>
      {isUser && (
        <div
          className="rounded-circle d-flex align-items-center justify-content-center ms-3 flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            background: "rgba(148, 163, 184, 0.2)",
            color: "var(--text-primary)",
            fontWeight: 600,
            fontSize: 14
          }}
        >
          U
        </div>
      )}
    </div>
  );
}

export default function ChatApp() {
  const theme = useSystemTheme();
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
  }, [theme]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

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

    try {
      const res = await fetch(`http://127.0.0.1:8000/dynamo/?prompt=${encodeURIComponent(text)}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.replace("data: ", "").trim();
          if (data === "[DONE]") break outer;

          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + parsed.token,
                };
                return updated;
              });
            }
          } catch (e) {
            console.error("JSON parse error", e);
          }
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          streaming: false,
        };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Unable to connect to Dynamo API. Please ensure the Django backend server is running on http://127.0.0.1:8000.",
          streaming: false,
        };
        return updated;
      });
    } finally {
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
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="d-flex flex-column vh-100 position-relative overflow-hidden">
      {/* Glass Header */}
      <header className="glass-header px-4 py-3 d-flex align-items-center justify-content-between position-relative z-3">
        <div className="d-flex align-items-center gap-3">
          <div className="rounded-circle avatar-glow d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, fontFamily: "var(--font-heading)" }}>D</span>
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="font-heading fw-bold" style={{ fontSize: 17, letterSpacing: "-0.01em" }}>
                dynamo
              </span>
              <span className="badge-dynamo">33M Decoder</span>
              <span className="d-inline-flex align-items-center gap-1 text-success" style={{ fontSize: 12, fontWeight: 500 }}>
                <span className="rounded-circle bg-success d-inline-block" style={{ width: 6, height: 6, animation: "pulse-glow 2s infinite" }} />
                Online
              </span>
            </div>
            <div className="text-secondary" style={{ fontSize: 12, marginTop: 1 }}>
              Custom PyTorch Transformer Served via Django
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5"
            onClick={clearChat}
            disabled={messages.length === 0}
            style={{ fontSize: 13, transition: "all 0.2s" }}
          >
            <span>🗑️</span> Clear Chat
          </button>
        </div>
      </header>

      {/* Main Content Scroll Area */}
      <main id="chat-scroll" className="flex-grow-1 overflow-y-auto px-3 px-md-5 py-4 container-lg">
        {messages.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center my-auto py-5 animate-float-in">
            <div
              className="rounded-circle avatar-glow d-flex align-items-center justify-content-center mb-4"
              style={{ width: 72, height: 72 }}
            >
              <span style={{ fontSize: 36 }}>👾</span>
            </div>
            <h2 className="font-heading fw-bold mb-2" style={{ fontSize: 28 }}>
              Experience Dynamo AI
            </h2>
            <p className="text-secondary mb-5" style={{ maxWidth: 480, fontSize: 15, lineHeight: 1.6 }}>
              A 33M parameter decoder-only transformer built from scratch in PyTorch with SwiGLU activations and causal self-attention.
            </p>

            <div className="w-100" style={{ maxWidth: 720 }}>
              <div className="text-start text-secondary mb-3 px-1 fw-medium" style={{ fontSize: 13, letterSpacing: "0.03em", textTransform: "uppercase" }}>
                Suggested Prompts
              </div>
              <div className="row g-3">
                {SUGGESTED_PROMPTS.map((item, idx) => (
                  <div key={idx} className="col-12 col-md-4">
                    <div
                      className="glass-card p-3 h-100 text-start cursor-pointer d-flex flex-column justify-content-between"
                      style={{ cursor: "pointer" }}
                      onClick={() => send(item.prompt)}
                    >
                      <div>
                        <div className="fs-4 mb-2">{item.icon}</div>
                        <div className="fw-semibold mb-1" style={{ fontSize: 14 }}>
                          {item.title}
                        </div>
                        <div className="text-secondary" style={{ fontSize: 12, lineHeight: 1.4 }}>
                          {item.desc}
                        </div>
                      </div>
                      <div className="mt-3 text-end" style={{ color: "var(--badge-color)", fontSize: 12, fontWeight: 600 }}>
                        Try →
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
              <Message key={i} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      {/* Input Section */}
      <footer className="px-3 px-md-5 pb-4 pt-2 position-relative z-3 container-lg">
        <div className="glass-input-container p-2 d-flex align-items-end gap-2">
          <textarea
            ref={textareaRef}
            className="form-control border-0 bg-transparent shadow-none px-3 py-2"
            rows={1}
            placeholder="Ask Dynamo anything..."
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
          <button
            className="btn btn-dynamo-primary d-flex align-items-center justify-content-center flex-shrink-0 mb-1 me-1"
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              opacity: !input.trim() || loading ? 0.4 : 1
            }}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        <div className="text-center text-secondary mt-2" style={{ fontSize: 12, opacity: 0.8 }}>
          Dynamo 33M • Nucleus Sampling (top_p=0.85, top_k=40) • Press Enter to send, Shift+Enter for new line
        </div>
      </footer>
    </div>
  );
}