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
  // ...existing code...
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
    
  // ...existing code...
    if (!session.accessToken || !session.user) {
      console.warn('AuthService: Invalid session structure');
      localStorage.removeItem('inventory_session');
      return null;
    }
    
  // ...existing code...
  const gracePeriod = 30 * 60 * 1000; // ...existing code...
    if (session.expiresAt && Date.now() > (session.expiresAt + gracePeriod)) {
  // ...existing code...
      localStorage.removeItem('inventory_session');
      return null;
    }
    
  // ...existing code...
    const oneHour = 60 * 60 * 1000;
    if (session.expiresAt && Date.now() > (session.expiresAt - oneHour)) {
  // ...existing code...
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
  // ...existing code...
      
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: getHeaders(false),
        body: JSON.stringify(credentials),
      });

      const data = await handleResponse(response);
      
      const session: AuthSession = {
        user: data.user,
        accessToken: data.accessToken,
  expiresAt: Date.now() + (8 * 60 * 60 * 1000), // ...existing code...
      };

  // ...existing code...
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  // ...existing code...
      
      return session;
    } catch (error) {
      console.error('AuthService: Error during login:', error);
  // ...existing code...
      this.clearSession();
      throw error;
    }
  }

  static async register(userData: RegisterData): Promise<AuthSession> {
    try {
  // ...existing code...
      
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: getHeaders(false),
        body: JSON.stringify(userData),
      });

      const data = await handleResponse(response);
      
      const session: AuthSession = {
        user: data.user,
        accessToken: data.accessToken,
  expiresAt: Date.now() + (8 * 60 * 60 * 1000), // ...existing code...
      };

  // ...existing code...
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  // ...existing code...
      
      return session;
    } catch (error) {
      console.error('AuthService: Error during registration:', error);
      throw error;
    }
  }

  static async verifyToken(accessToken: string): Promise<User> {
    try {
  // ...existing code...
      
      const response = await fetch(`${BASE_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
      });

      const data = await handleResponse(response);
  // ...existing code...
      return data.user;
    } catch (error) {
      console.error('AuthService: Token verification failed:', error);
  // ...existing code...
      if (error.message.includes('Sesión expirada') || error.message.includes('Credenciales inválidas')) {
        this.clearSession();
      }
      throw error;
    }
  }

  // ...existing code...
  static async getUsers(): Promise<User[]> {
    try {
  // ...existing code...
      
      const response = await fetch(`${BASE_URL}/users`, {
        method: 'GET',
        headers: getHeaders(true),
      });

      const data = await handleResponse(response);
  // ...existing code...
      return data.users;
    } catch (error) {
      console.error('AuthService: Error fetching users:', error);
      throw error;
    }
  }

  static async createUser(userData: RegisterData): Promise<User> {
    try {
  // ...existing code...
      
      const response = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(userData),
      });

      const data = await handleResponse(response);
  // ...existing code...
      return data.user;
    } catch (error) {
      console.error('AuthService: Error creating user:', error);
      throw error;
    }
  }

  static async updateUser(userId: string, updates: Partial<RegisterData>): Promise<User> {
    try {
  // ...existing code...
      
      const response = await fetch(`${BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify(updates),
      });

      const data = await handleResponse(response);
  // ...existing code...
      return data.user;
    } catch (error) {
      console.error('AuthService: Error updating user:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
  // ...existing code...
      
      const response = await fetch(`${BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders(true),
      });

      await handleResponse(response);
  // ...existing code...
    } catch (error) {
      console.error('AuthService: Error deleting user:', error);
      throw error;
    }
  }

  static getCurrentSession(): AuthSession | null {
    return getCurrentSession();
  }

  static logout(): void {
  // ...existing code...
    this.clearSession();
  }

  private static clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY);
  // ...existing code...
  }

  // ...existing code...
  static isAuthenticated(): boolean {
    const session = this.getCurrentSession();
    return session !== null && !!session.accessToken;
  }

  // ...existing code...
  static getCurrentUser(): User | null {
    const session = this.getCurrentSession();
    return session?.user || null;
  }

  // ...existing code...
  static async refreshSession(): Promise<AuthSession | null> {
    try {
      const currentSession = this.getCurrentSession();
      if (!currentSession) {
        return null;
      }

      const user = await this.verifyToken(currentSession.accessToken);
      
  // ...existing code...
      const refreshedSession: AuthSession = {
        ...currentSession,
        user,
  expiresAt: Date.now() + (8 * 60 * 60 * 1000), // ...existing code...
      };

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(refreshedSession));
  // ...existing code...
      
      return refreshedSession;
    } catch (error) {
      console.error('AuthService: Session refresh failed:', error);
      this.clearSession();
      return null;
    }
  }

  // ...existing code...
  static extendSession(): boolean {
    try {
      const currentSession = this.getCurrentSession();
      if (!currentSession) {
        return false;
      }

  // ...existing code...
      if (Date.now() < currentSession.expiresAt!) {
        const extendedSession: AuthSession = {
          ...currentSession,
          expiresAt: Date.now() + (8 * 60 * 60 * 1000), // ...existing code...
        };

        localStorage.setItem(this.SESSION_KEY, JSON.stringify(extendedSession));
  // ...existing code...
        return true;
      }

      return false;
    } catch (error) {
      console.error('AuthService: Session extension failed:', error);
      return false;
    }
  }

  // ...existing code...
  static sessionNeedsRefresh(): boolean {
    const session = this.getCurrentSession();
    if (!session || !session.expiresAt) return false;
    
    const twoHours = 2 * 60 * 60 * 1000;
    return Date.now() > (session.expiresAt - twoHours);
  }
}