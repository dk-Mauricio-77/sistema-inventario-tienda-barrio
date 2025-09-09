import {
  projectId,
  publicAnonKey,
} from "../utils/supabase/info";
import {
  Product,
  Category,
  ProductFormData,
} from "../types/inventory";
import { AuthService } from "./authService";

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-81f57c18`;

const getHeaders = (requireAuth = true) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (requireAuth) {
    const session = AuthService.getCurrentSession();
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
  // ...existing code...
    } else {
  // ...existing code...
      headers["Authorization"] = `Bearer ${publicAnonKey}`;
    }
  } else {
    headers["Authorization"] = `Bearer ${publicAnonKey}`;
  // ...existing code...
  }

  return headers;
};

const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeout = 6000, // Further reduced timeout to 6 seconds
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    timeout,
  );

  try {
  // ...existing code...

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

  // ...existing code...
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
  // ...existing code...

    if (error.name === "AbortError") {
      throw new Error(
        "El servidor está tardando en responder. Verifica tu conexión a internet.",
      );
    }
    if (error.message.includes("Failed to fetch")) {
      throw new Error(
        "No se puede conectar al servidor. Verifica tu conexión a internet.",
      );
    }
    throw error;
  }
};

const handleResponse = async (response: Response) => {
  let data;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch (parseError) {
  // ...existing code...
    throw new Error(
      `Error del servidor: respuesta inválida (${response.status})`,
    );
  }

  if (!response.ok) {
  // ...existing code...

    // Handle authentication errors specifically
    if (response.status === 401) {
  // ...existing code...
      
      // Try to refresh session first before logging out
      try {
        const refreshedSession = await AuthService.refreshSession();
        if (refreshedSession) {
          // ...existing code...
          throw new Error(
            "Sesión renovada. Por favor intenta la operación nuevamente.",
          );
        }
      } catch (refreshError) {
  // ...existing code...
      }
      
      // Only logout if refresh failed
      AuthService.logout();
      throw new Error(
        "Sesión expirada. Por favor inicia sesión nuevamente.",
      );
    }

    if (response.status === 403) {
      throw new Error(
        "No tienes permisos para realizar esta acción.",
      );
    }

    if (response.status >= 500) {
      throw new Error(
        "Error del servidor. Intenta nuevamente en unos momentos.",
      );
    }

    throw new Error(
      data.error ||
        `Error ${response.status}: ${response.statusText}`,
    );
  }

  return data;
};

export class InventoryService {
  // Health check with shorter timeout
  static async checkHealth(): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        `${BASE_URL}/health`,
        {
          headers: getHeaders(false),
          method: "GET",
        },
        3000, // 3 second timeout for health check
      );

      if (response.ok) {
        const data = await response.json();
  // ...existing code...
        return true;
      }
      return false;
    } catch (error) {
  // ...existing code...
      return false;
    }
  }

  // Products (no auth required for GET)
  static async getProducts(): Promise<Product[]> {
    try {
  // ...existing code...

      const response = await fetchWithTimeout(
        `${BASE_URL}/products`,
        {
          headers: getHeaders(false), // No auth required for basic read
          method: "GET",
        },
        4000, // 4 second timeout
      );
      const data = await handleResponse(response);

  // ...existing code...
      return data.products || [];
    } catch (error) {
  // ...existing code...
      throw error;
    }
  }

  static async getProduct(id: string): Promise<Product> {
    try {
      const response = await fetchWithTimeout(
        `${BASE_URL}/products/${id}`,
        {
          headers: getHeaders(true), // Auth required for specific product
          method: "GET",
        },
        6000,
      );
      const data = await handleResponse(response);
      return data.product;
    } catch (error) {
  // ...existing code...
      throw error;
    }
  }

  static async createProduct(
    productData: ProductFormData,
  ): Promise<Product> {
    try {
  // ...existing code...
      const response = await fetchWithTimeout(
        `${BASE_URL}/products`,
        {
          method: "POST",
          headers: getHeaders(true), // Auth required
          body: JSON.stringify(productData),
        },
        8000,
      );

      const data = await handleResponse(response);
  // ...existing code...
      return data.product;
    } catch (error) {
  // ...existing code...
      throw error;
    }
  }

  static async updateProduct(
    id: string,
    updates: Partial<ProductFormData>,
  ): Promise<Product> {
    try {
  // ...existing code...
      const response = await fetchWithTimeout(
        `${BASE_URL}/products/${id}`,
        {
          method: "PUT",
          headers: getHeaders(true), // Auth required
          body: JSON.stringify(updates),
        },
        8000,
      );

      const data = await handleResponse(response);
  // ...existing code...
      return data.product;
    } catch (error) {
  // ...existing code...
      throw error;
    }
  }

  static async deleteProduct(id: string): Promise<void> {
    try {
  // ...existing code...
      const response = await fetchWithTimeout(
        `${BASE_URL}/products/${id}`,
        {
          method: "DELETE",
          headers: getHeaders(true), // Auth required
        },
        8000,
      );

      await handleResponse(response);
  // ...existing code...
    } catch (error) {
  // ...existing code...
      throw error;
    }
  }

  static async updateStock(
    id: string,
    quantity: number,
  ): Promise<Product> {
    try {
  // ...existing code...
      const response = await fetchWithTimeout(
        `${BASE_URL}/products/${id}/stock`,
        {
          method: "PATCH",
          headers: getHeaders(true), // Auth required
          body: JSON.stringify({ quantity }),
        },
        8000,
      );

      const data = await handleResponse(response);
  // ...existing code...
      return data.product;
    } catch (error) {
  // ...existing code...
      throw error;
    }
  }

  // Categories (no auth required)
  static async getCategories(): Promise<Category[]> {
    try {
      const response = await fetchWithTimeout(
        `${BASE_URL}/categories`,
        {
          headers: getHeaders(false), // No auth required
          method: "GET",
        },
        6000,
      );
      const data = await handleResponse(response);

  // ...existing code...
      return data.categories || [];
    } catch (error) {
  // ...existing code...
      throw error;
    }
  }

  // Initialize sample data (no auth required initially)
  static async initSampleData(): Promise<void> {
    try {
      const response = await fetchWithTimeout(
        `${BASE_URL}/init-sample-data`,
        {
          method: "POST",
          headers: getHeaders(false), // No auth required for initial setup
        },
        8000,
      );

      const data = await handleResponse(response);
  // ...existing code...
    } catch (error) {
  // ...existing code...
      throw error;
    }
  }

  // Create demo users (no auth required)
  static async createDemoUsers(): Promise<any> {
    try {
  // ...existing code...
      const response = await fetchWithTimeout(
        `${BASE_URL}/create-demo-users`,
        {
          method: "POST",
          headers: getHeaders(false), // No auth required
        },
        10000, // 10 second timeout for user creation
      );

      const data = await handleResponse(response);
  // ...existing code...
      return data;
    } catch (error) {
  // ...existing code...
      throw error;
    }
  }

  // Force create demo users (more aggressive approach)
  static async forceCreateDemoUsers(): Promise<any> {
    try {
  // ...existing code...
      const response = await fetchWithTimeout(
        `${BASE_URL}/force-create-demo-users`,
        {
          method: "POST",
          headers: getHeaders(false), // No auth required
        },
        15000, // 15 second timeout for force creation
      );

      const data = await handleResponse(response);
  // ...existing code...
      return data;
    } catch (error) {
  // ...existing code...
      throw error;
    }
  }

  // Debug function to check user status (no auth required)
  static async debugUsers(): Promise<any> {
    try {
      const response = await fetchWithTimeout(
        `${BASE_URL}/debug/users`,
        {
          headers: getHeaders(false), // No auth required
          method: "GET",
        },
        8000,
      );

      const data = await handleResponse(response);
      return data;
    } catch (error) {
  // ...existing code...
      throw error;
    }
  }
}