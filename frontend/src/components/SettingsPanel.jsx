export default function SettingsPanel({
  maxTokens,
  setMaxTokens,
  temperature,
  setTemperature,
  topP,
  setTopP,
  topK,
  setTopK,
  repetitionPenalty,
  setRepetitionPenalty,
  onClose
}) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel animate-float-in" onClick={(e) => e.stopPropagation()}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="fw-semibold" style={{ fontSize: 14 }}>Generation Settings</span>
          <button
            className="btn-close btn-sm"
            onClick={onClose}
            style={{ fontSize: 10 }}
          />
        </div>

        <div className="mb-3">
          <div className="d-flex justify-content-between text-secondary mb-1" style={{ fontSize: 12 }}>
            <span>Max Tokens</span>
            <span className="fw-medium text-body">{maxTokens}</span>
          </div>
          <input
            type="range"
            className="form-range"
            min="50"
            max="2000"
            step="50"
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
          />
        </div>

        <div className="mb-3">
          <div className="d-flex justify-content-between text-secondary mb-1" style={{ fontSize: 12 }}>
            <span>Temperature</span>
            <span className="fw-medium text-body">{temperature}</span>
          </div>
          <input
            type="range"
            className="form-range"
            min="0.1"
            max="2.0"
            step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
          />
        </div>

        <div className="mb-3">
          <div className="d-flex justify-content-between text-secondary mb-1" style={{ fontSize: 12 }}>
            <span>Top P</span>
            <span className="fw-medium text-body">{topP}</span>
          </div>
          <input
            type="range"
            className="form-range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={topP}
            onChange={(e) => setTopP(Number(e.target.value))}
          />
        </div>

        <div className="mb-3">
          <div className="d-flex justify-content-between text-secondary mb-1" style={{ fontSize: 12 }}>
            <span>Top K</span>
            <span className="fw-medium text-body">{topK}</span>
          </div>
          <input
            type="range"
            className="form-range"
            min="0"
            max="100"
            step="1"
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
          />
        </div>

        <div>
          <div className="d-flex justify-content-between text-secondary mb-1" style={{ fontSize: 12 }}>
            <span>Repetition Penalty</span>
            <span className="fw-medium text-body">{repetitionPenalty}</span>
          </div>
          <input
            type="range"
            className="form-range"
            min="1.0"
            max="2.0"
            step="0.05"
            value={repetitionPenalty}
            onChange={(e) => setRepetitionPenalty(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
