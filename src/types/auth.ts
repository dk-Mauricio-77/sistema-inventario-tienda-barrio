export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export type UserRole = 'admin' | 'employee';

export interface AuthSession {
  user: User;
  accessToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface Permission {
  action: string;
  resource: string;
}

// Definir permisos por rol
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    { action: 'create', resource: 'product' },
    { action: 'read', resource: 'product' },
    { action: 'update', resource: 'product' },
    { action: 'delete', resource: 'product' },
    { action: 'read', resource: 'dashboard' },
    { action: 'create', resource: 'user' },
    { action: 'read', resource: 'user' },
    { action: 'update', resource: 'user' },
    { action: 'delete', resource: 'user' },
  ],
  employee: [
    { action: 'create', resource: 'product' },
    { action: 'read', resource: 'product' },
    { action: 'update', resource: 'product' },
    { action: 'read', resource: 'dashboard' },
  ],
};