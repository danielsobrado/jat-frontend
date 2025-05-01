import React from 'react';
import { ApiClient } from '../api/types'; 
import '../components/LoginForm';
import LoginForm from '../components/LoginForm';

interface LoginPageProps {
    apiClient: ApiClient;
    onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ apiClient, onLoginSuccess }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary-100">
      <div className="w-full max-w-md px-8 py-10 bg-white shadow-xl rounded-lg">
        <h1 className="text-3xl font-bold text-center text-secondary-900 mb-8">
          Classifier Login
        </h1>
        <LoginForm apiClient={apiClient} onLoginSuccess={onLoginSuccess} />
      </div>
    </div>
  );
};

export default LoginPage;