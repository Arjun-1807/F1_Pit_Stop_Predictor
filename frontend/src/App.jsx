import { useState, useEffect } from 'react';
import { fetchCircuits, fetchModelInfo, predictPitStop } from './api';
import './App.css';

function App() {
  // Application config loaded from API
  const [circuits, setCircuits] = useState({});
  const [modelInfo, setModelInfo] = useState({ threshold: 0.86, features: [] });
  
  // Dashboard application states
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);

  // Live driver/telemetry input parameters state
  const [formData, setFormData] = useState({
    circuit_key: '',
    LapNumber: 15,
    Position: 5,
    Stint: 1,
    TyreLife: 12.0,
    fresh_tyre: 0,
    compound_enc: 1, // Default: Medium (1)
    Sector1Time: 31.2,
    Sector2Time: 36.5,
    Sector3Time: 25.8,
    sc_active: 0,
    vsc_active: 0,
    red_flag: 0,
    Season: 2024
  });

  // Fetch initial telemetry metadata from backend
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const [circuitsData, modelMetadata] = await Promise.all([
          fetchCircuits(),
          fetchModelInfo()
        ]);
        setCircuits(circuitsData);
        setModelInfo(modelMetadata);
        
        // Select the first circuit by default
        const firstCircuitKey = Object.keys(circuitsData)[0] || '';
        setFormData(prev => ({ ...prev, circuit_key: firstCircuitKey }));
      } catch (err) {
        setError(err.message || 'Failed to initialize connection to API backend.');
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Update text/number inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'circuit_key' ? value : Number(value)
    }));
  };

  // Toggle track condition flags (SC, VSC, Red Flag)
  const toggleFlag = (flagName) => {
    setFormData(prev => ({
      ...prev,
      [flagName]: prev[flagName] === 1 ? 0 : 1
    }));
  };

  // Run the F1 Pit Stop Prediction simulation
  const handleRunSimulation = async (e) => {
    e.preventDefault();
    if (!formData.circuit_key) return;

    setPredicting(true);
    setError(null);

    const selectedCircuit = circuits[formData.circuit_key];
    const computedLapTime = formData.Sector1Time + formData.Sector2Time + formData.Sector3Time;
    const computedLapsRemaining = Math.max(0, selectedCircuit.race_laps - formData.LapNumber);
    const computedRacePct = Math.min(100, (formData.LapNumber / selectedCircuit.race_laps) * 100);

    // Build prediction payload merging dynamic fields with calculated columns
    const payload = {
      circuit_key: formData.circuit_key,
      LapTime: computedLapTime,
      LapNumber: formData.LapNumber,
      Stint: formData.Stint,
      Sector1Time: formData.Sector1Time,
      Sector2Time: formData.Sector2Time,
      Sector3Time: formData.Sector3Time,
      TyreLife: formData.TyreLife,
      Position: formData.Position,
      Season: formData.Season,
      sc_active: formData.sc_active,
      vsc_active: formData.vsc_active,
      red_flag: formData.red_flag,
      laps_remaining: computedLapsRemaining,
      race_pct: computedRacePct,
      stint_lap: Math.round(formData.TyreLife), // Align stint lap with tyre age
      lap_time_roll3: computedLapTime, // Default rolling to current
      lap_time_delta_best: 0.5,
      lap_time_delta_prev: 0.2,
      compound_enc: formData.compound_enc,
      fresh_tyre: formData.fresh_tyre
    };

    try {
      const result = await predictPitStop(payload);
      setPrediction(result);
    } catch (err) {
      setError(err.message || 'Simulation execution failed.');
    } finally {
      setPredicting(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '5rem' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>📡 CONNECTING TELEMETRY SYSTEM...</div>
      </div>
    );
  }

  // Derived current lap time
  const currentLapTime = (formData.Sector1Time + formData.Sector2Time + formData.Sector3Time).toFixed(3);
  const selectedCircuitInfo = circuits[formData.circuit_key] || {};

  // Semi-circle SVG progress calculation (Radius=50, Circumference ≈ 157.08)
  const strokeRadius = 50;
  const strokeCircumference = Math.PI * strokeRadius; 
  const displayProbability = prediction ? prediction.probability : 0;
  const strokeDashoffset = strokeCircumference - (displayProbability * strokeCircumference);

  // Set color accent based on prediction result
  const isPitWarning = prediction && prediction.should_pit;
  const gaugeColor = isPitWarning ? 'var(--f1-red)' : displayProbability > 0.5 ? 'var(--f1-yellow)' : 'var(--f1-green)';

  return (
    <div className="container">
      {/* Top Branding Banner */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <h1 className="title-glow">🏎️ F1 PIT STOP PREDICTOR</h1>
        </div>
        <div className="system-status">
          <span style={{ width: '8px', height: '8px', background: 'var(--f1-green)', borderRadius: '50%', display: 'inline-block', marginRight: '4px' }}></span>
          Telemetry Online
        </div>
      </header>

      {error && (
        <div style={{ background: 'rgba(225,6,0,0.1)', border: '1px solid var(--f1-red)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: '#ff8885' }}>
          ⚠️ <strong>System Error:</strong> {error}
        </div>
      )}

      {/* Main Grid: Inputs vs Telemetry Outputs */}
      <div className="dashboard-grid">
        
        {/* Left column: Live driver inputs */}
        <form onSubmit={handleRunSimulation} className="f1-card">
          <div className="form-section">
            <div className="section-title">Race Setup & Circuit</div>
            
            <div className="f1-input-group">
              <label className="f1-input-label">Select Circuit</label>
              <select name="circuit_key" value={formData.circuit_key} onChange={handleInputChange} className="f1-select">
                {Object.keys(circuits).map(key => (
                  <option key={key} value={key}>
                    {circuits[key].grand_prix} ({circuits[key].circuit_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="f1-input-group">
              <label className="f1-input-label">Season/Year</label>
              <input type="number" name="Season" value={formData.Season} onChange={handleInputChange} min="2022" max="2026" className="f1-input" />
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">Driver & Stint Telemetry</div>

            <div className="f1-input-group">
              <label className="f1-input-label">Current Lap Number</label>
              <input type="number" name="LapNumber" value={formData.LapNumber} onChange={handleInputChange} min="1" max={selectedCircuitInfo.race_laps || 100} className="f1-input" />
            </div>

            <div className="f1-input-group">
              <label className="f1-input-label">Driver Position</label>
              <input type="number" name="Position" value={formData.Position} onChange={handleInputChange} min="1" max="20" className="f1-input" />
            </div>

            <div className="f1-input-group">
              <label className="f1-input-label">Tyre Compound</label>
              <select name="compound_enc" value={formData.compound_enc} onChange={handleInputChange} className="f1-select">
                <option value="0">🔴 SOFT</option>
                <option value="1">🟡 MEDIUM</option>
                <option value="2">⚪ HARD</option>
                <option value="3">🟢 INTERMEDIATE</option>
                <option value="4">🔵 WET</option>
              </select>
            </div>

            <div className="f1-input-group">
              <label className="f1-input-label">Tyre Life (Laps completed)</label>
              <input type="number" name="TyreLife" value={formData.TyreLife} onChange={handleInputChange} min="0" step="1" className="f1-input" />
            </div>

            <div className="f1-input-group">
              <label className="f1-input-label">Tyre Age Status</label>
              <select name="fresh_tyre" value={formData.fresh_tyre} onChange={handleInputChange} className="f1-select">
                <option value="1">Fresh Set (New)</option>
                <option value="0">Used Set</option>
              </select>
            </div>

            <div className="f1-input-group">
              <label className="f1-input-label">Stint Number</label>
              <input type="number" name="Stint" value={formData.Stint} onChange={handleInputChange} min="1" className="f1-input" />
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">Lap Sector Times</div>

            <div className="f1-input-group">
              <label className="f1-input-label">Sector 1 (Seconds)</label>
              <input type="number" name="Sector1Time" value={formData.Sector1Time} onChange={handleInputChange} step="0.001" min="1" className="f1-input" />
            </div>

            <div className="f1-input-group">
              <label className="f1-input-label">Sector 2 (Seconds)</label>
              <input type="number" name="Sector2Time" value={formData.Sector2Time} onChange={handleInputChange} step="0.001" min="1" className="f1-input" />
            </div>

            <div className="f1-input-group">
              <label className="f1-input-label">Sector 3 (Seconds)</label>
              <input type="number" name="Sector3Time" value={formData.Sector3Time} onChange={handleInputChange} step="0.001" min="1" className="f1-input" />
            </div>

            <div className="f1-input-group">
              <label className="f1-input-label">Calculated Lap Time</label>
              <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-darker)', borderRadius: '8px', border: '1px dashed var(--border-color)', fontWeight: 700, color: 'var(--f1-yellow)' }}>
                ⏱️ {currentLapTime}s
              </div>
            </div>
          </div>

          {/* Track Condition Flags */}
          <div className="section-title" style={{ marginBottom: '0.5rem' }}>Track Safety flags</div>
          <div className="flag-toggles-grid">
            <div 
              type="button" 
              onClick={() => toggleFlag('sc_active')} 
              className={`flag-toggle-card flag-sc ${formData.sc_active === 1 ? 'active' : ''}`}
            >
              ⚠️ Safety Car
            </div>
            <div 
              type="button" 
              onClick={() => toggleFlag('vsc_active')} 
              className={`flag-toggle-card flag-vsc ${formData.vsc_active === 1 ? 'active' : ''}`}
            >
              🟨 VSC
            </div>
            <div 
              type="button" 
              onClick={() => toggleFlag('red_flag')} 
              className={`flag-toggle-card flag-rf ${formData.red_flag === 1 ? 'active' : ''}`}
            >
              🟥 Red Flag
            </div>
          </div>

          <button type="submit" disabled={predicting} className="f1-btn" style={{ width: '100%' }}>
            {predicting ? '🖥️ RUNNING ANALYSIS...' : '🏁 RUN PIT STOP SIMULATION'}
          </button>
        </form>

        {/* Right column: Prediction outputs & Gauge visualizer */}
        <div className="f1-card gauge-panel">
          <h2 style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
            🔮 Predictor Analysis
          </h2>

          <div className="gauge-svg-container">
            <svg width="200" height="120" viewBox="0 0 120 70">
              {/* Semicircle Track Background */}
              <path 
                className="gauge-bg-path" 
                d="M 10 60 A 50 50 0 0 1 110 60" 
              />
              {/* Dynamic Semicircle Value Path */}
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

              <div className="threshold-info">
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

      </div>
    </div>
  );
}

export default App;
