export default function Header({ user, handleSignOut, clearChat, disabledClear }) {
  return (
    <header className="app-header px-4 py-3 d-flex align-items-center justify-content-between">
      <div className="d-flex align-items-center gap-2">
        <span className="fw-semibold" style={{ fontSize: 16, letterSpacing: "-0.01em" }}>
          Dynamo AI
        </span>
        <span className="text-secondary" style={{ fontSize: 13 }}>
          33M Parameter Model
        </span>
      </div>

      <div className="d-flex align-items-center gap-3">
        <div className="d-flex align-items-center gap-2">
          <span className="text-secondary" style={{ fontSize: 13 }}>
            {user.email}
          </span>
          <button
            className="btn btn-sm btn-outline-secondary px-2.5 py-1"
            onClick={handleSignOut}
            style={{ fontSize: 12, borderRadius: 6 }}
          >
            Sign Out
          </button>
        </div>

        <button
          className="btn btn-sm btn-outline-secondary px-3 py-1"
          onClick={clearChat}
          disabled={disabledClear}
          style={{ fontSize: 13, borderRadius: 8 }}
        >
          Clear
        </button>
      </div>
    </header>
  );
}
