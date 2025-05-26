// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const JAT_CATEGORIZATIONS_TARGET = 'http://localhost:8081'; // Default Go backend
const JAT_SNOW_TARGET = 'http://localhost:8082';             // Snow service backend
const PYTHON_LANGGRAPH_BACKEND_TARGET = 'http://localhost:8090';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Rule for /api/v1/lg-vis/ws path - WebSocket (existing, unchanged)
      '/api/v1/lg-vis/ws': { 
        target: PYTHON_LANGGRAPH_BACKEND_TARGET,
        ws: true,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''), // Remove /api prefix
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[PROXY PYTHON V1-LG-VIS-WS] Error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[PROXY PYTHON V1-LG-VIS-WS] Sending WS Request to Python:', req.method, proxyReq.path, 'Original path:', req.url);
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            console.log('[PROXY PYTHON V1-LG-VIS-WS] Proxying WS request to Python:', req.url, '→', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[PROXY PYTHON V1-LG-VIS-WS] Received Response from Python:', proxyRes.statusCode, req.url);
          });
        }
      },

      // Rule for /api/v1/lg-vis/... path (Python HTTP) (existing, unchanged)
      '/api/v1/lg-vis': { 
        target: PYTHON_LANGGRAPH_BACKEND_TARGET,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''), // Remove /api prefix
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[PROXY PYTHON V1-LG-VIS-HTTP] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[PROXY PYTHON V1-LG-VIS-HTTP] Sending Request to Python:', req.method, proxyReq.path, 'Original path:', req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[PROXY PYTHON V1-LG-VIS-HTTP] Received Response from Python:', proxyRes.statusCode, req.url);
          });
        },
      },
      // Proxy for JAT Snow Service (Go) - MORE SPECIFIC
      // This rule must come BEFORE the general /api/v1 rule for jat-categorizations
      '/api/v1/snow': {
        target: JAT_SNOW_TARGET,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''), // /api/v1/snow/* -> /v1/snow/*
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[PROXY JAT-SNOW V1-HTTP] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[PROXY JAT-SNOW V1-HTTP] Sending Request to JAT-SNOW:', req.method, proxyReq.path, 'Original path:', req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[PROXY JAT-SNOW V1-HTTP] Received Response from JAT-SNOW:', proxyRes.statusCode, req.url);
          });
        },
      },
      // Proxy for general JAT Categorizations API (Go) - General fallback for /api/v1/*
      '/api/v1': {
        target: JAT_CATEGORIZATIONS_TARGET, // Changed from GO_BACKEND_TARGET to be specific
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''), // /api/v1/* -> /v1/*
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[PROXY JAT-CATEGORIZATIONS V1-HTTP] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[PROXY JAT-CATEGORIZATIONS V1-HTTP] Sending Request to JAT-CATEGORIZATIONS:', req.method, proxyReq.path, 'Original path:', req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[PROXY JAT-CATEGORIZATIONS V1-HTTP] Received Response from JAT-CATEGORIZATIONS:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
    port: 5173,
    host: true,
  },
});