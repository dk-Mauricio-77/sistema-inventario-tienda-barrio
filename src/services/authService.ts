import {
  projectId,
  publicAnonKey,
} from "../utils/supabase/info";
import {
  LoginCredentials,
  RegisterData,
  AuthSession,
  User,
} from "../types/auth";

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-81f57c18`;

const getHeaders = (requireAuth = true) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (requireAuth) {
    const session = getCurrentSession();
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
      console.log('AuthService: Using session token for request');
    } else {
      console.warn('AuthService: No valid session, using anonymous key');
      headers['Authorization'] = `Bearer ${publicAnonKey}`;
    }
  } else {
    headers['Authorization'] = `Bearer ${publicAnonKey}`;
  }
  
  return headers;
};

const getCurrentSession = (): AuthSession | null => {
  try {
    const sessionData = localStorage.getItem('inventory_session');
    if (!sessionData) return null;
    
    const session: AuthSession = JSON.parse(sessionData);
    
    // Validate session structure
    if (!session.accessToken || !session.user) {
      console.warn('AuthService: Invalid session structure');
      localStorage.removeItem('inventory_session');
      return null;
    }
    
    // Check if session is expired (with 30-minute grace period)
    const gracePeriod = 30 * 60 * 1000; // 30 minutes
    if (session.expiresAt && Date.now() > (session.expiresAt + gracePeriod)) {
      console.log('AuthService: Session expired, clearing');
      localStorage.removeItem('inventory_session');
      return null;
    }
    
    // If session is close to expiring (within 1 hour), try to refresh it
    const oneHour = 60 * 60 * 1000;
    if (session.expiresAt && Date.now() > (session.expiresAt - oneHour)) {
      console.log('AuthService: Session approaching expiration, will refresh on next API call');
    }
    
    return session;
  } catch (error) {
    console.error('AuthService: Error reading session:', error);
    localStorage.removeItem('inventory_session');
    return null;
  }
};

const handleResponse = async (response: Response) => {
  let data;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch (parseError) {
    console.error('AuthService: JSON parse error:', parseError);
    throw new Error(`Error del servidor: respuesta inválida (${response.status})`);
  }

  if (!response.ok) {
    console.error('AuthService: API Error:', {
      status: response.status,
      statusText: response.statusText,
      data,
    });

    let errorMessage = 'Error de autenticación';
    
    if (response.status === 401) {
      if (data.error?.includes('Invalid login credentials') || 
          data.error?.includes('Invalid credentials')) {
        errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña.';
      } else {
        errorMessage = 'Credenciales inválidas o sesión expirada';
      }
    } else if (response.status === 403) {
      errorMessage = 'No tienes permisos para realizar esta acción';
    } else if (response.status === 404) {
      errorMessage = 'Usuario no encontrado en el sistema';
    } else if (response.status >= 500) {
      errorMessage = 'Error del servidor. Intenta nuevamente en unos momentos.';
    } else if (data.error) {
      errorMessage = data.error;
    }

    throw new Error(errorMessage);
  }

  return data;
};

export class AuthService {
  private static readonly SESSION_KEY = 'inventory_session';

  static async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      console.log('AuthService: Attempting login for:', credentials.email);
      
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: getHeaders(false),
        body: JSON.stringify(credentials),
      });

      const data = await handleResponse(response);
      
      const session: AuthSession = {
        user: data.user,
        accessToken: data.accessToken,
        expiresAt: Date.now() + (8 * 60 * 60 * 1000), // 8 hours from now
      };

      // Store session in localStorage
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      console.log('AuthService: Login successful, session stored');
      
      return session;
    } catch (error) {
      console.error('AuthService: Error during login:', error);
      // Clear any existing session on login failure
      this.clearSession();
      throw error;
    }
  }

  static async register(userData: RegisterData): Promise<AuthSession> {
    try {
      console.log('AuthService: Attempting registration for:', userData.email);
      
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: getHeaders(false),
        body: JSON.stringify(userData),
      });

      const data = await handleResponse(response);
      
      const session: AuthSession = {
        user: data.user,
        accessToken: data.accessToken,
        expiresAt: Date.now() + (8 * 60 * 60 * 1000), // 8 hours from now
      };

      // Store session in localStorage
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      console.log('AuthService: Registration successful, session stored');
      
      return session;
    } catch (error) {
      console.error('AuthService: Error during registration:', error);
      throw error;
    }
  }

  static async verifyToken(accessToken: string): Promise<User> {
    try {
      console.log('AuthService: Verifying token...');
      
      const response = await fetch(`${BASE_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
      });

      const data = await handleResponse(response);
      console.log('AuthService: Token verification successful');
      return data.user;
    } catch (error) {
      console.error('AuthService: Token verification failed:', error);
      // Only clear session if it's definitely an auth error, not a network error
      if (error.message.includes('Sesión expirada') || error.message.includes('Credenciales inválidas')) {
        this.clearSession();
      }
      throw error;
    }
  }

  // User management methods (admin only)
  static async getUsers(): Promise<User[]> {
    try {
      console.log('AuthService: Fetching users...');
      
      const response = await fetch(`${BASE_URL}/users`, {
        method: 'GET',
        headers: getHeaders(true),
      });

      const data = await handleResponse(response);
      console.log('AuthService: Users fetched successfully');
      return data.users;
    } catch (error) {
      console.error('AuthService: Error fetching users:', error);
      throw error;
    }
  }

  static async createUser(userData: RegisterData): Promise<User> {
    try {
      console.log('AuthService: Creating user:', userData.email);
      
      const response = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(userData),
      });

      const data = await handleResponse(response);
      console.log('AuthService: User created successfully');
      return data.user;
    } catch (error) {
      console.error('AuthService: Error creating user:', error);
      throw error;
    }
  }

  static async updateUser(userId: string, updates: Partial<RegisterData>): Promise<User> {
    try {
      console.log('AuthService: Updating user:', userId);
      
      const response = await fetch(`${BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify(updates),
      });

      const data = await handleResponse(response);
      console.log('AuthService: User updated successfully');
      return data.user;
    } catch (error) {
      console.error('AuthService: Error updating user:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      console.log('AuthService: Deleting user:', userId);
      
      const response = await fetch(`${BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders(true),
      });

      await handleResponse(response);
      console.log('AuthService: User deleted successfully');
    } catch (error) {
      console.error('AuthService: Error deleting user:', error);
      throw error;
    }
  }

  static getCurrentSession(): AuthSession | null {
    return getCurrentSession();
  }

  static logout(): void {
    console.log('AuthService: Logging out, clearing session');
    this.clearSession();
  }

  private static clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY);
    console.log('AuthService: Session cleared from localStorage');
  }

  // Helper method to check if current session is valid
  static isAuthenticated(): boolean {
    const session = this.getCurrentSession();
    return session !== null && !!session.accessToken;
  }

  // Helper method to get current user
  static getCurrentUser(): User | null {
    const session = this.getCurrentSession();
    return session?.user || null;
  }

  // Method to refresh session by verifying current token
  static async refreshSession(): Promise<AuthSession | null> {
    try {
      const currentSession = this.getCurrentSession();
      if (!currentSession) {
        return null;
      }

      const user = await this.verifyToken(currentSession.accessToken);
      
      // Update session with fresh expiry
      const refreshedSession: AuthSession = {
        ...currentSession,
        user,
        expiresAt: Date.now() + (8 * 60 * 60 * 1000), // 8 hours from now
      };

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(refreshedSession));
      console.log('AuthService: Session refreshed successfully');
      
      return refreshedSession;
    } catch (error) {
      console.error('AuthService: Session refresh failed:', error);
      this.clearSession();
      return null;
    }
  }

  // Method to extend session without verification (for active users)
  static extendSession(): boolean {
    try {
      const currentSession = this.getCurrentSession();
      if (!currentSession) {
        return false;
      }

      // Only extend if session is still valid
      if (Date.now() < currentSession.expiresAt!) {
        const extendedSession: AuthSession = {
          ...currentSession,
          expiresAt: Date.now() + (8 * 60 * 60 * 1000), // 8 hours from now
        };

        localStorage.setItem(this.SESSION_KEY, JSON.stringify(extendedSession));
        console.log('AuthService: Session extended successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('AuthService: Session extension failed:', error);
      return false;
    }
  }

  // Check if session needs refresh (within 2 hours of expiry)
  static sessionNeedsRefresh(): boolean {
    const session = this.getCurrentSession();
    if (!session || !session.expiresAt) return false;
    
    const twoHours = 2 * 60 * 60 * 1000;
    return Date.now() > (session.expiresAt - twoHours);
  }
}