import { useState, useEffect, useCallback } from 'react';
import { Product, Category, ProductFormData, InventoryStats } from '../types/inventory';
import { InventoryService } from '../services/inventoryService';
import { useOfflineMode } from './useOfflineMode';
import { useAuth } from './useAuth';

export function useInventory(shouldLoad: boolean = true) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const { isAuthenticated } = useAuth();
  
  const {
    isOffline,
    products: offlineProducts,
    categories: offlineCategories,
    enableOfflineMode,
    updateOfflineProduct,
    addOfflineProduct,
    deleteOfflineProduct,
    updateOfflineStock,
  } = useOfflineMode();

  const MAX_CONNECTION_ATTEMPTS = 2; // Reduced from 3

  // Calculate stats
  const currentProducts = isOffline ? offlineProducts : products;
  const stats: InventoryStats = {
    totalProducts: currentProducts.length,
    totalValue: currentProducts.reduce((sum, product) => sum + (product.price * product.stock), 0),
    lowStock: currentProducts.filter(product => product.stock <= product.minStock && product.stock > 0).length,
    outOfStock: currentProducts.filter(product => product.stock === 0).length,
    inStock: currentProducts.filter(product => product.stock > product.minStock).length,
    categories: (isOffline ? offlineCategories : categories).length,
  };

  const lowStockProducts = currentProducts.filter(
    product => product.stock <= product.minStock
  );

  const handleConnectionError = useCallback((error: Error) => {
    console.error('Connection error:', error);
    
    const isConnectionError = error.message.includes('conexión') || 
                             error.message.includes('Failed to fetch') ||
                             error.message.includes('Timeout') ||
                             error.message.includes('servidor') ||
                             error.message.includes('tardando');
    
    if (isConnectionError) {
      setConnectionAttempts(prev => prev + 1);
      
      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS - 1) {
        console.log('Max connection attempts reached, enabling offline mode');
        setError('Sin conexión al servidor. Activando modo offline.');
        enableOfflineMode();
        setLoading(false);
        return;
      } else {
        setError(`Error de conexión (${connectionAttempts + 1}/${MAX_CONNECTION_ATTEMPTS}). Activando modo offline...`);
        // Auto-enable offline mode after attempts
        setTimeout(() => {
          enableOfflineMode();
          setError('Modo offline activado automáticamente.');
          setLoading(false);
        }, 2000);
      }
    } else {
      setError(error.message);
      setLoading(false);
    }
  }, [connectionAttempts, enableOfflineMode]);

  const loadData = useCallback(async (showLoadingState = true) => {
    // Don't load if not authenticated, offline, or shouldLoad is false
    if (!isAuthenticated || isOffline || !shouldLoad) {
      console.log('Skipping data load - conditions not met:', { isAuthenticated, isOffline, shouldLoad });
      setLoading(false);
      setError(null);
      return;
    }

    try {
      if (showLoadingState) {
        setLoading(true);
      }
      setError(null);

      console.log('Loading inventory data...');
      
      // Load categories first (lightweight), then products
      const categoriesData = await Promise.race([
        InventoryService.getCategories(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout cargando categorías')), 5000)
        )
      ]);

      setCategories(categoriesData);
      console.log('Categories loaded:', categoriesData.length);

      // Then load products with longer timeout
      const productsData = await Promise.race([
        InventoryService.getProducts(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout cargando productos')), 10000)
        )
      ]);

      setProducts(productsData);
      setConnectionAttempts(0); // Reset on successful connection
      setHasInitialized(true);
      
      console.log('All inventory data loaded successfully:', {
        products: productsData.length,
        categories: categoriesData.length
      });
    } catch (err) {
      handleConnectionError(err as Error);
    } finally {
      if (showLoadingState || isOffline) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, isOffline, shouldLoad, handleConnectionError]);

  // Only load data when conditions are met
  useEffect(() => {
    if (isAuthenticated && !hasInitialized && !isOffline && shouldLoad) {
      console.log('Starting initial data load...');
      // Add a small delay to prevent race conditions
      const timer = setTimeout(() => {
        loadData(true);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, hasInitialized, isOffline, shouldLoad, loadData]);

  const addProduct = async (productData: ProductFormData): Promise<Product> => {
    if (isOffline) {
      const newProduct = addOfflineProduct(productData);
      if (!newProduct) throw new Error('Error creating product in offline mode');
      return newProduct;
    }

    try {
      setError(null);
      const newProduct = await InventoryService.createProduct(productData);
      setProducts(prev => [...prev, newProduct]);
      return newProduct;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<ProductFormData>): Promise<Product> => {
    if (isOffline) {
      updateOfflineProduct(id, updates);
      const updatedProduct = offlineProducts.find(p => p.id === id);
      if (!updatedProduct) throw new Error('Product not found');
      return updatedProduct;
    }

    try {
      setError(null);
      const updatedProduct = await InventoryService.updateProduct(id, updates);
      setProducts(prev => prev.map(product => 
        product.id === id ? updatedProduct : product
      ));
      return updatedProduct;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  const deleteProduct = async (id: string): Promise<void> => {
    if (isOffline) {
      deleteOfflineProduct(id);
      return;
    }

    try {
      setError(null);
      await InventoryService.deleteProduct(id);
      setProducts(prev => prev.filter(product => product.id !== id));
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  const updateStock = async (id: string, quantity: number): Promise<Product> => {
    if (isOffline) {
      const updatedProduct = updateOfflineStock(id, quantity);
      if (!updatedProduct) throw new Error('Product not found');
      return updatedProduct;
    }

    try {
      setError(null);
      const updatedProduct = await InventoryService.updateStock(id, quantity);
      setProducts(prev => prev.map(product => 
        product.id === id ? updatedProduct : product
      ));
      return updatedProduct;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  const refreshData = useCallback(() => {
    if (isAuthenticated) {
      setConnectionAttempts(0);
      setHasInitialized(false);
      loadData(true);
    }
  }, [loadData, isAuthenticated]);

  return {
    products: isOffline ? offlineProducts : products,
    categories: isOffline ? offlineCategories : categories,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    refreshData,
    stats,
    lowStockProducts,
    isOffline,
  };
}