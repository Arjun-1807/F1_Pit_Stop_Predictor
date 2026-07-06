import { useState, useEffect } from 'react';
import { fetchCircuits, fetchModelInfo, predictPitStop } from './api';
import Header from './components/Header';
import TelemetryForm from './components/TelemetryForm';
import AnalysisPanel from './components/AnalysisPanel';
import StintLogTable from './components/StintLogTable';
import './App.css';

// Helper formulas matching notebooks/02_feature_engineering_eda.ipynb exactly

const calculateRoll3 = (history, activeLapTime) => {
  const times = [...history.map(lap => lap.LapTime), activeLapTime];
  const last3 = times.slice(-3);
  const sorted = [...last3].sort((a, b) => a - b);
  
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  if (sorted.length === 2) return (sorted[0] + sorted[1]) / 2;
  return sorted[1];
};

const calculateDeltaPrev = (history, activeLapTime) => {
  if (history.length === 0) return 0.0;
  const prevTime = history[history.length - 1].LapTime;
  return activeLapTime - prevTime;
};

const calculateDeltaBest = (history, activeLapTime) => {
  const times = [...history.map(lap => lap.LapTime), activeLapTime];
  const minTime = Math.min(...times);
  return activeLapTime - minTime;
};

function App() {
  const [circuits, setCircuits] = useState({});
  const [modelInfo, setModelInfo] = useState({ threshold: 0.86, features: [] });
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [stintHistory, setStintHistory] = useState([]);

  const [formData, setFormData] = useState({
    circuit_key: '',
    LapNumber: 1,
    Position: 10,
    Stint: 1,
    TyreLife: 1.0,
    fresh_tyre: 1,
    compound_enc: 1,
    Sector1Time: 32.5,
    Sector2Time: 38.0,
    Sector3Time: 26.5,
    sc_active: 0,
    vsc_active: 0,
    red_flag: 0,
    Season: 2024
  });

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'circuit_key') {
      setStintHistory([]);
      setPrediction(null);
      setFormData(prev => ({
        ...prev,
        circuit_key: value,
        LapNumber: 1,
        Position: 10,
        Stint: 1,
        TyreLife: 1.0,
        fresh_tyre: 1,
        Sector1Time: 32.5,
        Sector2Time: 38.0,
        Sector3Time: 26.5,
        sc_active: 0,
        vsc_active: 0,
        red_flag: 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: Number(value)
      }));
    }
  };

  const toggleFlag = (flagName) => {
    setFormData(prev => ({
      ...prev,
      [flagName]: prev[flagName] === 1 ? 0 : 1
    }));
  };

  const handleRunSimulation = async (e) => {
    if (e) e.preventDefault();
    if (!formData.circuit_key) return;

    setPredicting(true);
    setError(null);

    const selectedCircuit = circuits[formData.circuit_key];
    const computedLapTime = formData.Sector1Time + formData.Sector2Time + formData.Sector3Time;
    const computedLapsRemaining = Math.max(0, selectedCircuit.race_laps - formData.LapNumber);
    const computedRacePct = Math.min(100, (formData.LapNumber / selectedCircuit.race_laps) * 100);

    const computedRoll3 = calculateRoll3(stintHistory, computedLapTime);
    const computedDeltaPrev = calculateDeltaPrev(stintHistory, computedLapTime);
    const computedDeltaBest = calculateDeltaBest(stintHistory, computedLapTime);

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
    setPrediction(null);

    setFormData(prev => ({
      ...prev,
      LapNumber: prev.LapNumber + 1,
      TyreLife: prev.TyreLife + 1,
      fresh_tyre: 0
    }));
  };

  const handleResetStint = () => {
    setStintHistory([]);
    setPrediction(null);
    setFormData(prev => ({
      ...prev,
      LapNumber: prev.LapNumber + 1,
      TyreLife: 1.0,
      Stint: prev.Stint + 1,
      fresh_tyre: 1,
      Sector1Time: 32.5,
      Sector2Time: 38.0,
      Sector3Time: 26.5
    }));
  };

  const handleLoadDemoStint = () => {
    const demoHistory = [];
    const baseS1 = 31.0;
    const baseS2 = 36.2;
    const baseS3 = 25.5;

    for (let i = 1; i <= 20; i++) {
      const degradation = i * 0.15;
      const lapTime = (baseS1 + degradation/3) + (baseS2 + degradation/3) + (baseS3 + degradation/3);
      demoHistory.push({
        LapNumber: i,
        LapTime: lapTime,
        Sector1Time: baseS1 + degradation/3,
        Sector2Time: baseS2 + degradation/3,
        Sector3Time: baseS3 + degradation/3,
        Position: Math.max(1, 10 - Math.floor(i / 3)),
        TyreLife: i,
        compound_enc: 0,
        fresh_tyre: i === 1 ? 1 : 0
      });
    }

    setStintHistory(demoHistory);
    setPrediction(null);

    setFormData({
      circuit_key: 'BAH',
      LapNumber: 21,
      Position: 3,
      Stint: 1,
      TyreLife: 21.0,
      fresh_tyre: 0,
      compound_enc: 0,
      Sector1Time: 34.8,
      Sector2Time: 39.5,
      Sector3Time: 28.2,
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

  const selectedCircuitInfo = circuits[formData.circuit_key] || {};

  return (
    <div className="container">
      <Header onLoadDemoStint={handleLoadDemoStint} />

      {error && (
        <div style={{ background: 'rgba(225,6,0,0.1)', border: '1px solid var(--f1-red)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: '#ff8885' }}>
          ⚠️ <strong>System Error:</strong> {error}
        </div>
      )}

      <div className="dashboard-grid">
        <TelemetryForm 
          formData={formData}
          circuits={circuits}
          selectedCircuitInfo={selectedCircuitInfo}
          predicting={predicting}
          handleInputChange={handleInputChange}
          toggleFlag={toggleFlag}
          handleRunSimulation={handleRunSimulation}
        />

        <AnalysisPanel 
          prediction={prediction}
          modelInfo={modelInfo}
          selectedCircuitInfo={selectedCircuitInfo}
          handleRecordLap={handleRecordLap}
        />

        {stintHistory.length > 0 && (
          <StintLogTable 
            stintHistory={stintHistory}
            stintNumber={formData.Stint}
            handleResetStint={handleResetStint}
          />
        )}
      </div>
    </div>
  );
}

export default App;
