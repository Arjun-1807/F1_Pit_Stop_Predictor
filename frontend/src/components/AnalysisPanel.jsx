export default function AnalysisPanel({
  prediction,
  modelInfo,
  selectedCircuitInfo,
  handleRecordLap
}) {
  const strokeRadius = 50;
  const strokeCircumference = Math.PI * strokeRadius; 
  const displayProbability = prediction ? prediction.probability : 0;
  const strokeDashoffset = strokeCircumference - (displayProbability * strokeCircumference);

  const isPitWarning = prediction && prediction.should_pit;
  const gaugeColor = isPitWarning ? 'var(--f1-red)' : displayProbability > 0.5 ? 'var(--f1-yellow)' : 'var(--f1-green)';

  return (
    <div className="f1-card gauge-panel">
      <h2 style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
        🔮 Predictor Analysis
      </h2>

      <div className="gauge-svg-container">
        <svg width="200" height="120" viewBox="0 0 120 70">
          <path 
            className="gauge-bg-path" 
            d="M 10 60 A 50 50 0 0 1 110 60" 
          />
          <path 
            className="gauge-value-path" 
            d="M 10 60 A 50 50 0 0 1 110 60" 
            stroke={gaugeColor}
            strokeDasharray={strokeCircumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="gauge-text" style={{ color: gaugeColor }}>
          {Math.round(displayProbability * 100)}%
        </div>
      </div>

      {prediction ? (
        <>
          {isPitWarning ? (
            <div className="recommendation-box box-box">
              🚨 BOX BOX BOX 🚨
              <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 500, opacity: 0.9 }}>
                Pit probability exceeds model threshold of {Math.round(modelInfo.threshold * 100)}%
              </div>
            </div>
          ) : (
            <div className="recommendation-box stay-out">
              🟢 STAY OUT
              <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 500, opacity: 0.9 }}>
                Stint optimal. Keep running lap segments.
              </div>
            </div>
          )}

          <button 
            type="button" 
            onClick={handleRecordLap} 
            className="f1-btn" 
            style={{ width: '100%', marginTop: '1.5rem', background: '#10b981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
          >
            💾 RECORD LAP & ADVANCE
          </button>

          <div className="threshold-info" style={{ marginTop: '1rem' }}>
            Model Threshold: <strong>{modelInfo.threshold}</strong> | Circuit: <strong>{selectedCircuitInfo.grand_prix}</strong>
          </div>
        </>
      ) : (
        <div className="recommendation-box no-data">
          ⏱️ Waiting for Telemetry Simulation...
        </div>
      )}

      {/* Circuit Info Presets Display */}
      {selectedCircuitInfo.circuit_name && (
        <div style={{ width: '100%', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', textAlign: 'left' }}>
          <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Circuit Telemetry Presets
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <div>🏁 Laps: <strong>{selectedCircuitInfo.race_laps} laps</strong></div>
            <div>📏 Length: <strong>{selectedCircuitInfo.track_length_km} km</strong></div>
            <div>🏎️ Corners: <strong>{selectedCircuitInfo.num_corners}</strong></div>
            <div>⏱️ Pit Lane Loss: <strong>{selectedCircuitInfo.pit_loss_delta_s}s</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}
