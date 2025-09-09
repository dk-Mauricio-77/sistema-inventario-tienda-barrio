import { useState, useEffect } from 'react';
import { Product, Category } from '../types/inventory';

// Sample data for offline mode
const SAMPLE_CATEGORIES: Category[] = [
  { id: '1', name: 'Bebidas', color: '#3B82F6' },
  { id: '2', name: 'Snacks', color: '#EF4444' },
  { id: '3', name: 'Dulces', color: '#F59E0B' },
  { id: '4', name: 'Higiene', color: '#10B981' },
  { id: '5', name: 'Limpieza', color: '#8B5CF6' },
];

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Coca Cola 600ml',
    category: 'Bebidas',
    price: 5.00,
    stock: 24,
    minStock: 5,
    description: 'Bebida gaseosa sabor cola',
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'Papas Fritas Pequeñas',
    category: 'Snacks',
    price: 3.50,
    stock: 15,
    minStock: 10,
    description: 'Papas fritas sabor natural',
    createdAt: '2024-01-16T00:00:00.000Z',
    updatedAt: '2024-01-16T00:00:00.000Z',
  },
  {
    id: '3',
    name: 'Chocolate Sublime',
    category: 'Dulces',
    price: 4.50,
    stock: 8,
    minStock: 5,
    description: 'Chocolate con maní boliviano',
    createdAt: '2024-01-17T00:00:00.000Z',
    updatedAt: '2024-01-17T00:00:00.000Z',
  },
  {
    id: '4',
    name: 'Jabón Bolivar',
    category: 'Higiene',
    price: 2.50,
    stock: 3,
    minStock: 5,
    description: 'Jabón de tocador boliviano',
    createdAt: '2024-01-18T00:00:00.000Z',
    updatedAt: '2024-01-18T00:00:00.000Z',
  },
  {
    id: '5',
    name: 'Detergente Ace',
    category: 'Limpieza',
    price: 15.00,
    stock: 12,
    minStock: 3,
    description: 'Detergente en polvo 1kg',
    createdAt: '2024-01-19T00:00:00.000Z',
    updatedAt: '2024-01-19T00:00:00.000Z',
  },
];

const STORAGE_KEYS = {
  PRODUCTS: 'inventory_offline_products',
  CATEGORIES: 'inventory_offline_categories',
  OFFLINE_MODE: 'inventory_offline_mode',
};

export function useOfflineMode() {
  const [isOffline, setIsOffline] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Initialize offline data
  useEffect(() => {
    const offlineMode = localStorage.getItem(STORAGE_KEYS.OFFLINE_MODE) === 'true';
    
    if (offlineMode) {
      setIsOffline(true);
      loadOfflineData();
    }
  }, []);

  const loadOfflineData = () => {
    try {
      const storedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const storedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      
      setProducts(storedProducts ? JSON.parse(storedProducts) : SAMPLE_PRODUCTS);
      setCategories(storedCategories ? JSON.parse(storedCategories) : SAMPLE_CATEGORIES);
    } catch (error) {
      console.error('Error loading offline data:', error);
      setProducts(SAMPLE_PRODUCTS);
      setCategories(SAMPLE_CATEGORIES);
    }
  };

  const enableOfflineMode = () => {
    console.log('Enabling offline mode with sample data');
    localStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, 'true');
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(SAMPLE_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(SAMPLE_CATEGORIES));
    
    setIsOffline(true);
    setProducts(SAMPLE_PRODUCTS);
    setCategories(SAMPLE_CATEGORIES);
  };

  const disableOfflineMode = () => {
    console.log('Disabling offline mode');
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_MODE);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    
    setIsOffline(false);
    setProducts([]);
    setCategories([]);
  };

  const updateOfflineProduct = (id: string, updates: Partial<Product>) => {
    if (!isOffline) return;
    
    const updatedProducts = products.map(product => 
      product.id === id 
        ? { ...product, ...updates, updatedAt: new Date().toISOString() }
        : product
    );
    
    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
  };

  const addOfflineProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!isOffline) return;
    
    const newProduct: Product = {
      ...productData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    
    return newProduct;
  };

  const deleteOfflineProduct = (id: string) => {
    if (!isOffline) return;
    
    const updatedProducts = products.filter(product => product.id !== id);
    setProducts(updatedProducts);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
  };

  const updateOfflineStock = (id: string, quantity: number) => {
    if (!isOffline) return;
    
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const newStock = Math.max(0, product.stock + quantity);
    updateOfflineProduct(id, { stock: newStock });
    
    return { ...product, stock: newStock };
  };

  return {
    isOffline,
    products,
    categories,
    enableOfflineMode,
    disableOfflineMode,
    updateOfflineProduct,
    addOfflineProduct,
    deleteOfflineProduct,
    updateOfflineStock,
  };
}