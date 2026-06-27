import { useState } from "react";
import ReactMarkdown from "react-markdown";
import TypingLoader from "./TypingLoader";

export default function Message({ msg, user }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState("markdown");

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const initial = user?.email ? user.email.charAt(0).toUpperCase() : "U";

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
        <div className={isUser ? "msg-bubble-user" : "msg-bubble-bot"}>
          {msg.content ? (
            <div>
              {isUser || viewMode === "raw" ? (
                <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
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
          <div className={`d-flex align-items-center gap-3 mt-1 fs-12 ${isUser ? "justify-content-end" : "justify-content-start"}`}>
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

      {isUser && (
        <div className="ms-3 flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="User"
              className="rounded-circle"
              style={{ width: 32, height: 32, objectFit: "cover" }}
            />
          ) : (
            <div
              className="rounded-circle d-flex align-items-center justify-content-center fw-semibold"
              style={{
                width: 32,
                height: 32,
                backgroundColor: "var(--user-msg-bg)",
                color: "var(--user-msg-color)",
                fontSize: 13
              }}
            >
              {initial}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

