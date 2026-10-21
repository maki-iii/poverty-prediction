// Central place for reading environment variables.
// Vite exposes env vars via import.meta.env (must be prefixed with VITE_).

const envConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/",
};

export default envConfig;
