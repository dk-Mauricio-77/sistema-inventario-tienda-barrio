import { useState, useEffect, createContext, useContext } from 'react';
import { User, AuthSession, LoginCredentials, RegisterData, UserRole, ROLE_PERMISSIONS } from '../types/auth';
import { AuthService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  hasPermission: (action: string, resource: string) => boolean;
  isAdmin: () => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthProvider() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  // ...existing code...
  useEffect(() => {
    if (!user) return;

    const handleUserActivity = () => {
  // ...existing code...
      if (AuthService.getCurrentSession()) {
        AuthService.extendSession();
      }
    };

  // ...existing code...
    const events = ['mousedown', 'keydown', 'scroll', 'click'];
    let timeoutId: NodeJS.Timeout;

    const throttledActivity = () => {
      clearTimeout(timeoutId);
  timeoutId = setTimeout(handleUserActivity, 5 * 60 * 1000); // ...existing code...
    };

    events.forEach(event => {
      document.addEventListener(event, throttledActivity, { passive: true });
    });

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, throttledActivity);
      });
    };
  }, [user]);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      const session = AuthService.getCurrentSession();
      
      if (session) {
  // ...existing code...
        
  // ...existing code...
        if (AuthService.sessionNeedsRefresh()) {
          // ...existing code...
          try {
            const refreshedSession = await AuthService.refreshSession();
            if (refreshedSession) {
              // ...existing code...
              setUser(refreshedSession.user);
            } else {
              // ...existing code...
              setUser(null);
            }
          } catch (refreshError) {
            console.warn('useAuth: Session refresh failed:', refreshError.message);
            // ...existing code...
            if (refreshError.message.includes('servidor') || refreshError.message.includes('conexión')) {
              // ...existing code...
              setUser(session.user);
            } else {
              AuthService.logout();
              setUser(null);
            }
          }
        } else {
          // ...existing code...
          // ...existing code...
          AuthService.extendSession();
          setUser(session.user);
        }
      } else {
  // ...existing code...
        setUser(null);
      }
    } catch (error) {
      console.error('useAuth: Error initializing auth:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
  // ...existing code...
      const session = await AuthService.login(credentials);
  // ...existing code...
      setUser(session.user);
    } catch (error) {
      console.error('useAuth: Login failed:', error);
      setUser(null);
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
  // ...existing code...
      const session = await AuthService.register(userData);
  // ...existing code...
      setUser(session.user);
    } catch (error) {
      console.error('useAuth: Registration failed:', error);
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
  // ...existing code...
    AuthService.logout();
    setUser(null);
  // ...existing code...
    window.location.reload();
  };

  const hasPermission = (action: string, resource: string): boolean => {
    if (!user) {
  // ...existing code...
      return false;
    }
    
    const permissions = ROLE_PERMISSIONS[user.role];
    const hasPermission = permissions.some(permission => 
      permission.action === action && permission.resource === resource
    );
    
  // ...existing code...
    return hasPermission;
  };

  const isAdmin = (): boolean => {
    const adminStatus = user?.role === 'admin';
  // ...existing code...
    return adminStatus;
  };

  const refreshUser = async () => {
    try {
  // ...existing code...
      const session = AuthService.getCurrentSession();
      if (session) {
        const userData = await AuthService.verifyToken(session.accessToken);
  // ...existing code...
        setUser(userData);
      } else {
  // ...existing code...
        logout();
      }
    } catch (error) {
      console.error('useAuth: Error refreshing user:', error);
      logout();
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    hasPermission,
    isAdmin,
    refreshUser,
  };
}

export { AuthContext };