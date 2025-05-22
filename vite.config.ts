import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Define your backend targets
const GO_BACKEND_TARGET = 'http://localhost:8081'; 
const PYTHON_LANGGRAPH_BACKEND_TARGET = 'http://localhost:8090'; 

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Rule for /v1/lg-vis/ws path - WebSocket (most specific for lg-vis)
      // This must come BEFORE other /v1/lg-vis and /v1 rules
      '/v1/lg-vis/ws': { 
        target: PYTHON_LANGGRAPH_BACKEND_TARGET, // Target Python server for WS
        ws: true, // Enable WebSocket proxying
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[PROXY PYTHON V1-WS] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[PROXY PYTHON V1-WS] Sending WS Request to Python:', req.method, proxyReq.path);
          });
        }
      },

      // Rule for /v1/lg-vis/... path (Python HTTP)
      // This must come BEFORE the /v1 rule
      '/v1/lg-vis': {
        target: PYTHON_LANGGRAPH_BACKEND_TARGET, // Python backend
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[PROXY PYTHON V1-LG-VIS] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[PROXY PYTHON V1-LG-VIS] Sending Request to Python:', req.method, proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[PROXY PYTHON V1-LG-VIS] Received Response from Python:', proxyRes.statusCode, req.url);
          });
        },
      },
      
      // --- Proxy for direct /lg-vis/ws path (obsolete WebSocket)
      // Kept for compatibility, ensure it's specific enough
      '/lg-vis/ws': { 
        target: PYTHON_LANGGRAPH_BACKEND_TARGET, // Target Python server for WS
        ws: true, // Enable WebSocket proxying
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[PROXY PYTHON OBSOLETE WS] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[PROXY PYTHON OBSOLETE WS] Sending WS Request to Python:', req.method, proxyReq.path);
          });
        }
      },

      // --- Proxy for direct /lg-vis/... path (obsolete HTTP)
      // Kept for compatibility
      '/lg-vis': {
        target: PYTHON_LANGGRAPH_BACKEND_TARGET, // Python backend
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[PROXY PYTHON OBSOLETE LG-VIS] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[PROXY PYTHON OBSOLETE LG-VIS] Sending Request to Python:', req.method, proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[PROXY PYTHON OBSOLETE LG-VIS] Received Response from Python:', proxyRes.statusCode, req.url);
          });
        },
      },
      
      // --- Proxy for existing Go RAG API ---
      // This will catch other /v1/... paths that are not for LangGraph
      '/v1': {
        target: GO_BACKEND_TARGET, // Go backend
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[PROXY GO V1] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[PROXY GO V1] Sending Request to Go:', req.method, proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[PROXY GO V1] Received Response from Go:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
    port: 5173, // Your frontend dev port
    host: true,
  },
});
