import axios from "axios"

declare global {
  interface Window {
    // injected by Electron's preload script at launch
    wallfluxer?: { apiPort: number | null }
  }
}

// Order of precedence:
//   1. port Electron picked at launch (the running app)
//   2. VITE_API_URL from .env          (plain browser dev, if you use it)
//   3. hardcoded fallback
const launchPort = window.wallfluxer?.apiPort

export const API_BASE_URL: string = launchPort
  ? `http://127.0.0.1:${launchPort}`
  : import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8123"

const wallfluxer = axios.create({
  baseURL: API_BASE_URL,
})

// Build a full URL for anything the backend serves, so components
// never hardcode the host or port.
export const apiUrl = (path: string): string =>
  `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`

export default wallfluxer