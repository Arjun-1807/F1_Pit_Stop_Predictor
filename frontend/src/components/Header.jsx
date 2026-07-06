export default function Header({ onLoadDemoStint }) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-title">
        <h1 className="title-glow">🏎️ F1 PIT STOP PREDICTOR</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          type="button" 
          onClick={onLoadDemoStint} 
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
  );
}
