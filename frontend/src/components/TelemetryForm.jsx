export default function TelemetryForm({
  formData,
  circuits,
  selectedCircuitInfo,
  predicting,
  handleInputChange,
  toggleFlag,
  handleRunSimulation
}) {
  const currentLapTime = (formData.Sector1Time + formData.Sector2Time + formData.Sector3Time).toFixed(3);

  return (
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
  );
}
