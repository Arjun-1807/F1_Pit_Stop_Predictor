// API base URL configured via Vite environment variables with localhost fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Fetch list of all verified F1 circuits and their static metadata.
 */
export async function fetchCircuits() {
  const response = await fetch(`${API_BASE_URL}/api/circuits`);
  if (!response.ok) {
    throw new Error(`Failed to load circuits: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch model information, including the classification threshold and feature list.
 */
export async function fetchModelInfo() {
  const response = await fetch(`${API_BASE_URL}/api/model-info`);
  if (!response.ok) {
    throw new Error(`Failed to load model metadata: ${response.statusText}`);
  }
  return response.json();
}

/**
 * POST dynamic driver/lap parameters to get a pit stop prediction.
 * @param {Object} predictionData - The dynamic features plus circuit_key
 */
export async function predictPitStop(predictionData) {
  const response = await fetch(`${API_BASE_URL}/api/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(predictionData),
  });

  if (!response.ok) {
    const errorDetails = await response.json().catch(() => ({}));
    throw new Error(errorDetails.detail || `Prediction failed: ${response.statusText}`);
  }
  
  return response.json();
}
