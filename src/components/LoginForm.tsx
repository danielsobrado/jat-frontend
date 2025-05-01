import React, { useState, FormEvent } from 'react';
import { ApiClient, LoginResponse, User } from '../api/types'; // Updated import to include LoginResponse and User types

interface LoginFormProps {
    apiClient: ApiClient;
    onLoginSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ apiClient, onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response: LoginResponse = await apiClient.login(username, password); // Assuming login method exists
            console.log('Login successful:', response.user);

            // Store the token (e.g., in localStorage)
            if (response.token) {
                localStorage.setItem('authToken', response.token); // Store the token
                localStorage.setItem('userInfo', JSON.stringify(response.user)); // Store user info
                onLoginSuccess(); // Callback to notify App.tsx
            } else {
                setError('Login failed: No token received.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                </div>
            )}
            <div>
                <label htmlFor="username" className="label">
                    Username
                </label>
                <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="input" // Use global style
                    disabled={loading}
                    autoComplete="username"
                />
            </div>
            <div>
                <label htmlFor="password" className="label">
                    Password
                </label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input" // Use global style
                    disabled={loading}
                    autoComplete="current-password"
                />
            </div>
            <div>
                <button
                    type="submit"
                    className="w-full btn btn-primary" // Use global styles
                    disabled={loading}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </div>
        </form>
    );
};

export default LoginForm;