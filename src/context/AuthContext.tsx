import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ApiClient, User } from '../api/types';

// Define the context shape
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  authEnabled: boolean | null;
  apiClient: ApiClient;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkPermission: (permissionCode: string) => boolean;
  handleLoginSuccess: () => void;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  authEnabled: null,
  apiClient: {} as ApiClient, // Will be provided in the provider
  login: async () => {},
  logout: () => {},
  checkPermission: () => false,
  handleLoginSuccess: () => {},
});

// Props interface for the provider component
interface AuthProviderProps {
  children: ReactNode;
  apiClientInstance: ApiClient;
}

// Provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children, apiClientInstance }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(apiClientInstance.isLoggedIn());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authEnabled, setAuthEnabled] = useState<boolean | null>(null);

  // Function to check if a user has a specific permission
  const checkPermission = (permissionCode: string): boolean => {
    if (!authEnabled) return true; // If auth is disabled, all permissions are allowed
    if (!isAuthenticated || !user) return false; // Not logged in, no permissions
    
    // Check if the user has this specific permission
    return user.permissions?.includes(permissionCode) || false;
  };

  // Login function
  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await apiClientInstance.login(username, password);
      setIsAuthenticated(true);
      setUser(response.user);
    } catch (error) {
      console.error("Login failed:", error);
      throw error; // Re-throw to handle in the UI
    }
  };

  // Logout function
  const logout = (): void => {
    apiClientInstance.clearToken();
    setIsAuthenticated(false);
    setUser(null);
  };

  // Handler for successful login (for use with LoginPage)
  const handleLoginSuccess = async (): Promise<void> => {
    setIsAuthenticated(true);
    // Fetch current user details
    try {
      const currentUser = await apiClientInstance.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Failed to fetch user details after login:", error);
    }
  };

  // Effect to check auth configuration on initial load
  useEffect(() => {
    const fetchAuthConfig = async () => {
      setLoading(true);
      try {
        await apiClientInstance.fetchAuthConfig();
        const isAuth = apiClientInstance.isAuthEnabled();
        setAuthEnabled(isAuth);
        
        // If auth is enabled and we're logged in, fetch user data
        if (isAuth && apiClientInstance.isLoggedIn()) {
          try {
            const currentUser = await apiClientInstance.getCurrentUser();
            setUser(currentUser);
            setIsAuthenticated(true);
          } catch (error) {
            console.error("Failed to fetch user details:", error);
            apiClientInstance.clearToken(); // Clear invalid session
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch auth config:", error);
        setAuthEnabled(false); // Default to false on error
      } finally {
        setLoading(false);
      }
    };

    fetchAuthConfig();
  }, [apiClientInstance]);

  // The context value
  const contextValue: AuthContextType = {
    isAuthenticated,
    user,
    loading,
    authEnabled,
    apiClient: apiClientInstance,
    login,
    logout,
    checkPermission,
    handleLoginSuccess,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};