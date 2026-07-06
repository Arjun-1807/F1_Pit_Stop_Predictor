export default function StintLogTable({
  stintHistory,
  stintNumber,
  handleResetStint
}) {
  return (
    <div className="f1-card" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📊 Stint Telemetry Log (Stint {stintNumber})
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
  );
}
