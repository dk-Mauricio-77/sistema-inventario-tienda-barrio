import { StockMovement, StockMovementFormData } from '../types/inventory';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { AuthService } from './authService';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-81f57c18`;

export class StockMovementService {
  private static getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    const session = AuthService.getCurrentSession();
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
      console.log('StockMovementService: Using authenticated request with token:', session.accessToken.substring(0, 20) + '...');
    } else {
      console.warn('StockMovementService: No valid session for authenticated request');
      headers['Authorization'] = `Bearer ${publicAnonKey}`;
    }
    
    return headers;
  }

  static async registerMovement(movementData: StockMovementFormData): Promise<{
    movement: StockMovement;
    updatedProduct: any;
    message: string;
  }> {
    try {
      console.log('StockMovementService: Registering movement:', movementData);
      
      const response = await fetch(`${BASE_URL}/movements`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(movementData),
      });

      console.log('StockMovementService: Response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : {};
        } catch (parseError) {
          console.error('StockMovementService: JSON parse error:', parseError);
          throw new Error(`Error del servidor: respuesta inválida (${response.status})`);
        }

        console.error('StockMovementService: API Error:', {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        });

        // Handle authentication errors specifically
        if (response.status === 401) {
          console.warn('StockMovementService: Authentication failed, trying session refresh');
          
          // Try to refresh session first before logging out
          try {
            const refreshedSession = await AuthService.refreshSession();
            if (refreshedSession) {
              console.log('StockMovementService: Session refreshed, user can retry');
              throw new Error('Sesión renovada. Por favor intenta la operación nuevamente.');
            }
          } catch (refreshError) {
            console.warn('StockMovementService: Session refresh failed');
          }
          
          // Only logout if refresh failed
          AuthService.logout();
          throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
        }

        if (response.status === 403) {
          throw new Error('No tienes permisos para realizar esta acción.');
        }

        throw new Error(errorData.error || 'Error registrando movimiento de stock');
      }

      const result = await response.json();
      console.log('StockMovementService: Movement registered successfully');
      return result;
    } catch (error) {
      console.error('StockMovementService: Error in registerMovement:', error);
      throw error;
    }
  }

  static async getAllMovements(): Promise<StockMovement[]> {
    try {
      console.log('StockMovementService: Fetching all movements...');
      
      const response = await fetch(`${BASE_URL}/movements`, {
        headers: this.getAuthHeaders(),
      });

      console.log('StockMovementService: Response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : {};
        } catch (parseError) {
          console.error('StockMovementService: JSON parse error:', parseError);
          throw new Error(`Error del servidor: respuesta inválida (${response.status})`);
        }

        if (response.status === 401) {
          // Try to refresh session first
          try {
            const refreshedSession = await AuthService.refreshSession();
            if (refreshedSession) {
              throw new Error('Sesión renovada. Por favor intenta nuevamente.');
            }
          } catch (refreshError) {
            console.warn('StockMovementService: Session refresh failed');
          }
          
          AuthService.logout();
          throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
        }

        throw new Error(errorData.error || 'Error obteniendo movimientos');
      }

      const data = await response.json();
      console.log('StockMovementService: Movements fetched successfully:', data.movements?.length || 0);
      return data.movements || [];
    } catch (error) {
      console.error('StockMovementService: Error in getAllMovements:', error);
      throw error;
    }
  }

  static async getProductMovements(productId: string): Promise<StockMovement[]> {
    try {
      console.log('StockMovementService: Fetching product movements for:', productId);
      
      const response = await fetch(`${BASE_URL}/products/${productId}/movements`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        let errorData;
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : {};
        } catch (parseError) {
          throw new Error(`Error del servidor: respuesta inválida (${response.status})`);
        }

        if (response.status === 401) {
          // Try to refresh session first
          try {
            const refreshedSession = await AuthService.refreshSession();
            if (refreshedSession) {
              throw new Error('Sesión renovada. Por favor intenta nuevamente.');
            }
          } catch (refreshError) {
            console.warn('StockMovementService: Session refresh failed');
          }
          
          AuthService.logout();
          throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
        }

        throw new Error(errorData.error || 'Error obteniendo movimientos del producto');
      }

      const data = await response.json();
      console.log('StockMovementService: Product movements fetched successfully:', data.movements?.length || 0);
      return data.movements || [];
    } catch (error) {
      console.error('StockMovementService: Error in getProductMovements:', error);
      throw error;
    }
  }

  static async getMovementStats(): Promise<{
    summary: {
      totalMovements: number;
      totalEntradas: number;
      totalSalidas: number;
      totalQuantityEntradas: number;
      totalQuantitySalidas: number;
      netMovement: number;
      recentMovements: number;
    };
    productStats: Array<{
      productId: string;
      productName: string;
      totalEntradas: number;
      totalSalidas: number;
      movementCount: number;
    }>;
    recentActivity: StockMovement[];
  }> {
    try {
      console.log('StockMovementService: Fetching movement stats...');
      
      const response = await fetch(`${BASE_URL}/movements/stats`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        let errorData;
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : {};
        } catch (parseError) {
          throw new Error(`Error del servidor: respuesta inválida (${response.status})`);
        }

        if (response.status === 401) {
          // Try to refresh session first
          try {
            const refreshedSession = await AuthService.refreshSession();
            if (refreshedSession) {
              throw new Error('Sesión renovada. Por favor intenta nuevamente.');
            }
          } catch (refreshError) {
            console.warn('StockMovementService: Session refresh failed');
          }
          
          AuthService.logout();
          throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
        }

        throw new Error(errorData.error || 'Error obteniendo estadísticas de movimientos');
      }

      const result = await response.json();
      console.log('StockMovementService: Movement stats fetched successfully');
      return result;
    } catch (error) {
      console.error('StockMovementService: Error in getMovementStats:', error);
      throw error;
    }
  }
}