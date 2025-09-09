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

  // Auto-extend session on user activity
  useEffect(() => {
    if (!user) return;

    const handleUserActivity = () => {
      // Extend session if user is active and session exists
      if (AuthService.getCurrentSession()) {
        AuthService.extendSession();
      }
    };

    // Listen for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'click'];
    let timeoutId: NodeJS.Timeout;

    const throttledActivity = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleUserActivity, 5 * 60 * 1000); // Every 5 minutes max
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
        console.log('useAuth: Found session in localStorage for:', session.user.email);
        
        // Check if session needs refresh
        if (AuthService.sessionNeedsRefresh()) {
          console.log('useAuth: Session needs refresh, attempting refresh...');
          try {
            const refreshedSession = await AuthService.refreshSession();
            if (refreshedSession) {
              console.log('useAuth: Session refreshed successfully');
              setUser(refreshedSession.user);
            } else {
              console.log('useAuth: Session refresh failed, clearing session');
              setUser(null);
            }
          } catch (refreshError) {
            console.warn('useAuth: Session refresh failed:', refreshError.message);
            // Try to use existing session if refresh fails due to network issues
            if (refreshError.message.includes('servidor') || refreshError.message.includes('conexión')) {
              console.log('useAuth: Using existing session despite refresh failure');
              setUser(session.user);
            } else {
              AuthService.logout();
              setUser(null);
            }
          }
        } else {
          // Session is still valid, extend it
          console.log('useAuth: Session is valid, extending expiration');
          AuthService.extendSession();
          setUser(session.user);
        }
      } else {
        console.log('useAuth: No session found in localStorage');
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
      console.log('useAuth: Attempting login for:', credentials.email);
      const session = await AuthService.login(credentials);
      console.log('useAuth: Login successful, setting user:', session.user.email);
      setUser(session.user);
    } catch (error) {
      console.error('useAuth: Login failed:', error);
      setUser(null);
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      console.log('useAuth: Attempting registration for:', userData.email);
      const session = await AuthService.register(userData);
      console.log('useAuth: Registration successful, setting user:', session.user.email);
      setUser(session.user);
    } catch (error) {
      console.error('useAuth: Registration failed:', error);
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
    console.log('useAuth: Logging out user');
    AuthService.logout();
    setUser(null);
    // Force a reload to clear any cached data
    window.location.reload();
  };

  const hasPermission = (action: string, resource: string): boolean => {
    if (!user) {
      console.log('useAuth: Permission check failed - no user');
      return false;
    }
    
    const permissions = ROLE_PERMISSIONS[user.role];
    const hasPermission = permissions.some(permission => 
      permission.action === action && permission.resource === resource
    );
    
    console.log(`useAuth: Permission check - ${user.role} can ${action} ${resource}: ${hasPermission}`);
    return hasPermission;
  };

  const isAdmin = (): boolean => {
    const adminStatus = user?.role === 'admin';
    console.log('useAuth: Admin check:', adminStatus);
    return adminStatus;
  };

  const refreshUser = async () => {
    try {
      console.log('useAuth: Refreshing user data');
      const session = AuthService.getCurrentSession();
      if (session) {
        const userData = await AuthService.verifyToken(session.accessToken);
        console.log('useAuth: User data refreshed');
        setUser(userData);
      } else {
        console.log('useAuth: No session to refresh');
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