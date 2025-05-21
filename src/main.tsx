import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import 'reactflow/dist/style.css'; // Import React Flow styles
import 'antd/dist/reset.css'; // Import Ant Design styles (updated path)
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
import { WebApiClient } from './api/client'; // Import client

const apiClientInstance = new WebApiClient(); // Create single client instance

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider apiClientInstance={apiClientInstance}> {/* Wrap App */}
      <App />
    </AuthProvider>
  </React.StrictMode>
);