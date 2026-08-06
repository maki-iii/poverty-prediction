// Base configuration for calling the Python (FastAPI) ML service.
// Keeps the URL/timeout in one place instead of hardcoded in the service file.

module.exports = {
  baseURL: process.env.ML_API_BASE_URL || "http://localhost:8000",
  timeout: 60000, // 15s -- pipeline trigger endpoints (train/forecast) can take a few seconds
};