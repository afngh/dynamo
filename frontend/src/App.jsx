import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

const SUGGESTED_PROMPTS = [
  {
    title: "Transformer Architecture",
    desc: "Explain causal self-attention in a decoder-only model",
    prompt: "Can you explain how causal self-attention works in a decoder-only transformer?"
  },
  {
    title: "PyTorch Deep Learning",
    desc: "Compare RMSNorm vs LayerNorm during pretraining",
    prompt: "How does RMSNorm differ from LayerNorm during training stability?"
  },
  {
    title: "Code Generation",
    desc: "Write a simple PyTorch matrix multiplication example",
    prompt: "Show me a basic example of tensor matrix multiplication in PyTorch."
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

function TypingLoader() {
  return (
    <div className="typing-loader">
      <span />
      <span />
      <span />
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState("markdown"); // "markdown" or "raw"

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`d-flex mb-4 ${isUser ? "justify-content-end" : "justify-content-start"}`}>
      {!isUser && (
        <div
          className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0 fw-semibold"
          style={{
            width: 32,
            height: 32,
            backgroundColor: "#da7756",
            color: "#ffffff",
            fontSize: 13,
            letterSpacing: "-0.02em"
          }}
        >
          D
        </div>
      )}
      <div style={{ maxWidth: "82%" }}>
        <div
          className="px-3.5 py-2.5 rounded-3"
          style={{
            backgroundColor: isUser ? "var(--user-msg-bg)" : "var(--bot-msg-bg)",
            color: isUser ? "var(--user-msg-color)" : "var(--bot-msg-color)",
            fontSize: 15,
            lineHeight: 1.6,
            wordBreak: "break-word"
          }}
        >
          {msg.content ? (
            <div>
              {isUser || viewMode === "raw" ? (
                <span style={{ whitespace: "pre-wrap" }}>{msg.content}</span>
              ) : (
                <div className="markdown-content d-inline">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
              {msg.streaming && <span className="streaming-cursor" />}
            </div>
          ) : msg.streaming ? (
            <TypingLoader />
          ) : null}
        </div>

        {!msg.streaming && msg.content && (
          <div className="d-flex align-items-center gap-3 mt-1 fs-12">
            {!isUser && (
              <button
                className="btn btn-sm btn-link p-0 text-secondary text-decoration-none"
                onClick={() => setViewMode(viewMode === "markdown" ? "raw" : "markdown")}
                style={{ fontSize: 12, opacity: 0.8 }}
              >
                {viewMode === "markdown" ? "Raw Text" : "Markdown Preview"}
              </button>
            )}
            <button
              className="btn btn-sm btn-link p-0 text-secondary text-decoration-none"
              onClick={handleCopy}
              style={{ fontSize: 12, opacity: 0.75 }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatApp() {
  const theme = useSystemTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
  }, [theme]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const url = `${endpoint}${endpoint.includes("?") ? "&" : "?"}prompt=${encodeURIComponent(text)}`;
      const res = await fetch(url, {
        signal: controller.signal
      });
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

  return (
    <div className="d-flex flex-column vh-100 position-relative">
      {/* Minimal Header */}
      <header className="app-header px-4 py-3 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold" style={{ fontSize: 16, letterSpacing: "-0.01em" }}>
            Dynamo AI
          </span>
          <span className="text-secondary" style={{ fontSize: 13 }}>
            33M Parameter Model
          </span>
        </div>

        <button
          className="btn btn-sm btn-outline-secondary px-3 py-1"
          onClick={clearChat}
          disabled={messages.length === 0}
          style={{ fontSize: 13, borderRadius: 8 }}
        >
          Clear
        </button>
      </header>

      {/* Main Scroll Area */}
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
                        <div className="fw-semibold mb-1" style={{ fontSize: 14 }}>
                          {item.title}
                        </div>
                        <div className="text-secondary" style={{ fontSize: 12, lineHeight: 1.4 }}>
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
              <Message key={i} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      {/* Input Footer */}
      <footer className="px-3 px-md-4 pb-4 pt-2 container-md">
        <div className="chat-input-wrapper p-2 d-flex align-items-end gap-2">
          <textarea
            ref={textareaRef}
            className="form-control border-0 bg-transparent shadow-none px-3 py-2"
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