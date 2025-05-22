// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const GO_BACKEND_TARGET = 'http://localhost:8081'; 
const PYTHON_LANGGRAPH_BACKEND_TARGET = 'http://localhost:8090'; 

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Rule for /v1/lg-vis/ws path - WebSocket (most specific for lg-vis)
      '/v1/lg-vis/ws': { 
        target: PYTHON_LANGGRAPH_BACKEND_TARGET,
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[PROXY PYTHON V1-LG-VIS-WS] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[PROXY PYTHON V1-LG-VIS-WS] Sending WS Request to Python:', req.method, proxyReq.path);
          });
        }
      },

      // Rule for /v1/lg-vis/... path (Python HTTP)
      '/v1/lg-vis': {
        target: PYTHON_LANGGRAPH_BACKEND_TARGET,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[PROXY PYTHON V1-LG-VIS-HTTP] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[PROXY PYTHON V1-LG-VIS-HTTP] Sending Request to Python:', req.method, proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[PROXY PYTHON V1-LG-VIS-HTTP] Received Response from Python:', proxyRes.statusCode, req.url);
          });
        },
      },
      
      // --- Proxy for general Go RAG API ---
      // This will catch other /v1/... paths that are not for LangGraph
      '/v1': {
        target: GO_BACKEND_TARGET,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[PROXY GO V1-HTTP] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[PROXY GO V1-HTTP] Sending Request to Go:', req.method, proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[PROXY GO V1-HTTP] Received Response from Go:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
    port: 5173,
    host: true,
  },
});