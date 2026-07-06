import { useState, useEffect } from 'react';
import { fetchCircuits, fetchModelInfo, predictPitStop } from './api';
import './App.css';

// Helper formulas matching notebooks/02_feature_engineering_eda.ipynb exactly

/**
 * Calculates the rolling median of the last 3 laps (including the active lap).
 * median(prev_prev_lap_time, prev_lap_time, current_lap_time)
 */
const calculateRoll3 = (history, activeLapTime) => {
  const times = [...history.map(lap => lap.LapTime), activeLapTime];
  const last3 = times.slice(-3);
  const sorted = [...last3].sort((a, b) => a - b);
  
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  if (sorted.length === 2) return (sorted[0] + sorted[1]) / 2;
  return sorted[1]; // Return middle element for size 3
};

/**
 * Calculates previous lap difference: current_lap_time - prev_lap_time
 */
const calculateDeltaPrev = (history, activeLapTime) => {
  if (history.length === 0) return 0.0;
  const prevTime = history[history.length - 1].LapTime;
  return activeLapTime - prevTime;
};

/**
 * Calculates stint best lap difference: current_lap_time - min(all stint lap times)
 */
const calculateDeltaBest = (history, activeLapTime) => {
  const times = [...history.map(lap => lap.LapTime), activeLapTime];
  const minTime = Math.min(...times);
  return activeLapTime - minTime;
};

function App() {
  // Application config loaded from API
  const [circuits, setCircuits] = useState({});
  const [modelInfo, setModelInfo] = useState({ threshold: 0.86, features: [] });
  
  // Dashboard application states
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);

  // Stint history tracking state
  const [stintHistory, setStintHistory] = useState([]);

  // Live driver/telemetry input parameters state
  const [formData, setFormData] = useState({
    circuit_key: '',
    LapNumber: 1,
    Position: 10,
    Stint: 1,
    TyreLife: 1.0,
    fresh_tyre: 1, // Start stint on fresh tyres
    compound_enc: 1, // Default: Medium (1)
    Sector1Time: 32.5,
    Sector2Time: 38.0,
    Sector3Time: 26.5,
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
    if (e) e.preventDefault();
    if (!formData.circuit_key) return;

    setPredicting(true);
    setError(null);

    const selectedCircuit = circuits[formData.circuit_key];
    const computedLapTime = formData.Sector1Time + formData.Sector2Time + formData.Sector3Time;
    const computedLapsRemaining = Math.max(0, selectedCircuit.race_laps - formData.LapNumber);
    const computedRacePct = Math.min(100, (formData.LapNumber / selectedCircuit.race_laps) * 100);

    // Compute rolling 3-lap median and deltas using stintHistory + active lap
    const computedRoll3 = calculateRoll3(stintHistory, computedLapTime);
    const computedDeltaPrev = calculateDeltaPrev(stintHistory, computedLapTime);
    const computedDeltaBest = calculateDeltaBest(stintHistory, computedLapTime);

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
      stint_lap: Math.round(formData.TyreLife),
      lap_time_roll3: computedRoll3,
      lap_time_delta_prev: computedDeltaPrev,
      lap_time_delta_best: computedDeltaBest,
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

  // Record active lap to stint state history list and auto-increment parameters
  const handleRecordLap = () => {
    const computedLapTime = formData.Sector1Time + formData.Sector2Time + formData.Sector3Time;
    
    const newLap = {
      LapNumber: formData.LapNumber,
      LapTime: computedLapTime,
      Sector1Time: formData.Sector1Time,
      Sector2Time: formData.Sector2Time,
      Sector3Time: formData.Sector3Time,
      Position: formData.Position,
      TyreLife: formData.TyreLife,
      compound_enc: formData.compound_enc,
      fresh_tyre: formData.fresh_tyre
    };

    setStintHistory(prev => [...prev, newLap]);
    setPrediction(null); // Reset prediction card for the next segment

    // Auto-advance telemetry values
    setFormData(prev => ({
      ...prev,
      LapNumber: prev.LapNumber + 1,
      TyreLife: prev.TyreLife + 1,
      fresh_tyre: 0 // Tyre is no longer fresh on next lap
    }));
  };

  // Reset entire stint history (box box) and start new stint
  const handleResetStint = () => {
    setStintHistory([]);
    setPrediction(null);
    setFormData(prev => ({
      ...prev,
      LapNumber: prev.LapNumber + 1, // Proceed to next lap
      TyreLife: 1.0, // Reset tyre life to 1
      Stint: prev.Stint + 1, // Advance stint number
      fresh_tyre: 1 // Starting stint on fresh tyres
    }));
  };

  // Loads pre-defined stint history simulating heavy tyre wear at Bahrain to trigger a pit recommendation
  const handleLoadDemoStint = () => {
    const demoHistory = [];
    const baseS1 = 31.0;
    const baseS2 = 36.2;
    const baseS3 = 25.5;

    // Simulate 20 laps of Soft tyre wear
    for (let i = 1; i <= 20; i++) {
      const degradation = i * 0.15; // Lap times slowly get worse
      const lapTime = (baseS1 + degradation/3) + (baseS2 + degradation/3) + (baseS3 + degradation/3);
      demoHistory.push({
        LapNumber: i,
        LapTime: lapTime,
        Sector1Time: baseS1 + degradation/3,
        Sector2Time: baseS2 + degradation/3,
        Sector3Time: baseS3 + degradation/3,
        Position: Math.max(1, 10 - Math.floor(i / 3)), // Moving forward
        TyreLife: i,
        compound_enc: 0, // Soft Compound
        fresh_tyre: i === 1 ? 1 : 0
      });
    }

    setStintHistory(demoHistory);
    setPrediction(null);

    // Set form state to Lap 21: extremely worn softs, and slow sector times
    setFormData({
      circuit_key: 'BAH',
      LapNumber: 21,
      Position: 3,
      Stint: 1,
      TyreLife: 21.0,
      fresh_tyre: 0,
      compound_enc: 0, // Soft Compound
      Sector1Time: 34.8, // 3.8s slower than base S1
      Sector2Time: 39.5, // 3.3s slower than base S2
      Sector3Time: 28.2, // 2.7s slower than base S3
      sc_active: 0,
      vsc_active: 0,
      red_flag: 0,
      Season: 2024
    });
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '5rem' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>📡 CONNECTING TELEMETRY SYSTEM...</div>
      </div>
    );
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            type="button" 
            onClick={handleLoadDemoStint} 
            className="f1-btn" 
            style={{ 
              padding: '0.4rem 0.85rem', 
              fontSize: '0.8rem', 
              background: 'none', 
              border: '1px solid var(--f1-yellow)', 
              color: 'var(--f1-yellow)',
              boxShadow: 'none'
            }}
          >
            📥 LOAD DEMO SEGMENT
          </button>
          <div className="system-status">
            <span style={{ width: '8px', height: '8px', background: 'var(--f1-green)', borderRadius: '50%', display: 'inline-block', marginRight: '4px' }}></span>
            Telemetry Online
          </div>
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
            <div className="section-title">Driver & Stint Telemetry (Stint {formData.Stint})</div>

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
            <button 
              type="button" 
              onClick={() => toggleFlag('sc_active')} 
              className={`flag-toggle-card flag-sc ${formData.sc_active === 1 ? 'active' : ''}`}
            >
              ⚠️ Safety Car
            </button>
            <button 
              type="button" 
              onClick={() => toggleFlag('vsc_active')} 
              className={`flag-toggle-card flag-vsc ${formData.vsc_active === 1 ? 'active' : ''}`}
            >
              🟨 VSC
            </button>
            <button 
              type="button" 
              onClick={() => toggleFlag('red_flag')} 
              className={`flag-toggle-card flag-rf ${formData.red_flag === 1 ? 'active' : ''}`}
            >
              🟥 Red Flag
            </button>
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

        {/* Bottom Section: Stint history table */}
        {stintHistory.length > 0 && (
          <div className="f1-card" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📊 Stint Telemetry Log (Stint {formData.Stint})
              </h2>
              <button 
                type="button" 
                onClick={handleResetStint} 
                className="f1-btn" 
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', background: '#3b3f54', boxShadow: 'none' }}
              >
                🔄 Box for New Stint
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Lap</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Lap Time</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Sector 1</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Sector 2</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Sector 3</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Tyre Age</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Compound</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Position</th>
                  </tr>
                </thead>
                <tbody>
                  {stintHistory.map((lap, idx) => {
                    const compoundLabel = 
                      lap.compound_enc === 0 ? '🔴 SOFT' : 
                      lap.compound_enc === 1 ? '🟡 MEDIUM' : 
                      lap.compound_enc === 2 ? '⚪ HARD' : 
                      lap.compound_enc === 3 ? '🟢 INTER' : '🔵 WET';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-white)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>{lap.LapNumber}</td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--f1-yellow)', fontWeight: 600 }}>{lap.LapTime.toFixed(3)}s</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{lap.Sector1Time.toFixed(3)}s</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{lap.Sector2Time.toFixed(3)}s</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{lap.Sector3Time.toFixed(3)}s</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{lap.TyreLife} laps</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{compoundLabel}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>P{lap.Position}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
