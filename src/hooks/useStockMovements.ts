import { useState, useCallback } from 'react';
import { StockMovement, StockMovementFormData, Product } from '../types/inventory';
import { StockMovementService } from '../services/stockMovementService';

interface StockMovementStats {
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
}

export function useStockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stats, setStats] = useState<StockMovementStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerMovement = useCallback(async (formData: StockMovementFormData): Promise<{
    movement: StockMovement;
    updatedProduct: Product;
    message: string;
  }> => {
    try {
      setError(null);
      const result = await StockMovementService.registerMovement(formData);
      
  // ...existing code...
      setMovements(prev => [result.movement, ...prev]);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error registrando movimiento';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const fetchMovements = useCallback(async (): Promise<StockMovement[]> => {
    try {
      setLoading(true);
      setError(null);
      const data = await StockMovementService.getAllMovements();
      setMovements(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error obteniendo movimientos';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProductMovements = useCallback(async (productId: string): Promise<StockMovement[]> => {
    try {
      setError(null);
      return await StockMovementService.getProductMovements(productId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error obteniendo movimientos del producto';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const fetchStats = useCallback(async (): Promise<StockMovementStats> => {
    try {
      setError(null);
      const data = await StockMovementService.getMovementStats();
      setStats(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error obteniendo estadísticas';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [movementsData, statsData] = await Promise.all([
        StockMovementService.getAllMovements(),
        StockMovementService.getMovementStats()
      ]);
      setMovements(movementsData);
      setStats(statsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando datos';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    movements,
    stats,
    loading,
    error,
    registerMovement,
    fetchMovements,
    fetchProductMovements,
    fetchStats,
    refreshData,
  };
}