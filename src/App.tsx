import { useState, useEffect, lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Package, BarChart3, Users, AlertCircle, Settings, Wifi, WifiOff, TrendingUp } from "lucide-react";
import { LoginForm } from "./components/LoginForm";
import { Header } from "./components/Header";
import { AuthProvider } from "./components/AuthProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppLoader } from "./components/AppLoader";
import { Toaster } from "./components/Toaster";
import { useAuth } from "./hooks/useAuth";
import { useInventory } from "./hooks/useInventory";
import { useOfflineMode } from "./hooks/useOfflineMode";
import { useStockMovements } from "./hooks/useStockMovements";
import { Product, StockMovement } from "./types/inventory";
import { ReportService } from "./services/reportService";
import { NotificationService } from "./services/notificationService";

// Lazy load heavy components with preloading
const Dashboard = lazy(() => import("./components/Dashboard").then(module => ({ default: module.Dashboard })));
const ProductList = lazy(() => import("./components/ProductList").then(module => ({ default: module.ProductList })));
const ProductForm = lazy(() => import("./components/ProductForm").then(module => ({ default: module.ProductForm })));
const StockMovementForm = lazy(() => import("./components/StockMovementForm").then(module => ({ default: module.StockMovementForm })));
const StockMovementHistory = lazy(() => import("./components/StockMovementHistory").then(module => ({ default: module.StockMovementHistory })));
const UserManagement = lazy(() => import("./components/UserManagement").then(module => ({ default: module.UserManagement })));
const DiagnosticsPanel = lazy(() => import("./components/DiagnosticsPanel").then(module => ({ default: module.DiagnosticsPanel })));

// Preload critical components after initial render
const preloadCriticalComponents = () => {
  // Preload Dashboard and ProductList as they're most commonly used
  import("./components/Dashboard");
  import("./components/ProductList");
};

// Loading component for Suspense
const ComponentLoader = () => (
  <div className="flex items-center justify-center h-32">
    <div className="flex items-center gap-2">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      <span className="text-sm text-muted-foreground">Cargando...</span>
    </div>
  </div>
);

// Simple skeleton for faster initial render
const SimpleSkeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className}`} />
);

function AppContent() {
  const { user, isAuthenticated, isLoading: authLoading, login, register, logout, hasPermission, isAdmin } = useAuth();
  const [appInitialized, setAppInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Offline mode hook for manual control
  const { enableOfflineMode } = useOfflineMode();
  
  // Only initialize inventory after auth is ready
  const shouldLoadInventory = isAuthenticated && appInitialized;
  
  const {
    products,
    categories,
    loading: inventoryLoading,
    error: inventoryError,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    refreshData,
    stats,
    lowStockProducts,
    isOffline,
  } = useInventory(shouldLoadInventory); // Pass shouldLoadInventory flag

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProductForm, setShowProductForm] = useState(false);
  const [showStockMovementForm, setShowStockMovementForm] = useState(false);
  const [showMovementHistory, setShowMovementHistory] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [selectedProductForMovement, setSelectedProductForMovement] = useState<Product | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Stock movements hook - only initialize when needed
  const { registerMovement } = useStockMovements();

  // Initialize app immediately after auth is ready
  useEffect(() => {
    if (!authLoading) {
      setAppInitialized(true);
      // Preload critical components after app initialization
      if (isAuthenticated) {
        setTimeout(preloadCriticalComponents, 1000);
      }
    }
  }, [authLoading, isAuthenticated]);

  // Handle app-level initialization timeout with shorter timeout
  useEffect(() => {
    if (isAuthenticated && !appInitialized) {
      const timeout = setTimeout(() => {
        setInitError('La aplicación está tardando en cargar. Intenta modo offline.');
        setAppInitialized(true); // Force initialization
      }, 8000); // Reduced to 8 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, appInitialized]);

  const handleOfflineMode = () => {
    enableOfflineMode();
    setInitError(null);
    setAppInitialized(true);
  };

  const handleRetry = () => {
    setInitError(null);
    if (isAuthenticated) {
      refreshData();
    }
  };

  const handleAddProduct = () => {
    if (!hasPermission('create', 'product')) {
      NotificationService.permissionDenied('crear productos');
      return;
    }
    setEditingProduct(undefined);
    setShowProductForm(true);
    setShowDiagnostics(false);
  };

  const handleEditProduct = (product: Product) => {
    if (!hasPermission('update', 'product')) {
      NotificationService.permissionDenied('editar productos');
      return;
    }
    setEditingProduct(product);
    setShowProductForm(true);
    setShowDiagnostics(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!hasPermission('delete', 'product')) {
      NotificationService.permissionDenied('eliminar productos');
      return;
    }
    try {
      await deleteProduct(id);
      // La notificación de éxito se maneja en ProductList
    } catch (error) {
      console.error('Error deleting product:', error);
      NotificationService.error('Error al eliminar producto', 'Intenta nuevamente');
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
        NotificationService.productUpdated(data.name);
      } else {
        await addProduct(data);
        NotificationService.productCreated(data.name);
      }
      setShowProductForm(false);
      setEditingProduct(undefined);
    } catch (error) {
      console.error('Error submitting form:', error);
      const action = editingProduct ? 'actualizar' : 'crear';
      NotificationService.error(`Error al ${action} producto`, 'Intenta nuevamente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormCancel = () => {
    setShowProductForm(false);
    setEditingProduct(undefined);
    setShowDiagnostics(false);
  };

  const handleStockMovement = (product?: Product) => {
    setSelectedProductForMovement(product);
    setShowStockMovementForm(true);
    setShowProductForm(false);
    setShowMovementHistory(false);
    setShowDiagnostics(false);
  };

  const handleMovementHistory = () => {
    setShowMovementHistory(true);
    setShowStockMovementForm(false);
    setShowProductForm(false);
    setShowDiagnostics(false);
  };

  const handleMovementRegistered = async (movement: StockMovement) => {
    // Refresh inventory data after a movement is registered
    await refreshData();
  };

  const handleBackFromMovements = () => {
    setShowStockMovementForm(false);
    setShowMovementHistory(false);
    setSelectedProductForMovement(undefined);
  };

  const handleRefresh = () => {
    refreshData();
  };

  const handleDiagnosticsRetry = () => {
    setShowDiagnostics(false);
    refreshData();
  };

  const handleGenerateReport = async () => {
    if (!isAdmin()) {
      NotificationService.permissionDenied('generar reportes');
      return;
    }

    if (!products || products.length === 0) {
      NotificationService.warning('Sin datos', 'No hay productos para incluir en el reporte');
      return;
    }

    if (!stats) {
      NotificationService.warning('Sin estadísticas', 'No se han cargado las estadísticas del inventario');
      return;
    }

    const loadingToast = NotificationService.loading('Generando reporte de inventario...');
    
    try {
      console.log('Generating report with:', { 
        productsCount: products.length, 
        stats, 
        categoriesCount: categories.length 
      });
      
      await ReportService.generateInventoryReport({
        products,
        stats,
        categories,
        storeName: 'Mi Tienda de Barrio'
      });
      
      NotificationService.dismiss(loadingToast);
      NotificationService.reportGenerated('de inventario');
    } catch (error) {
      console.error('Error generating report:', error);
      NotificationService.dismiss(loadingToast);
      NotificationService.reportError('de inventario');
    }
  };

  const handleGenerateLowStockReport = async () => {
    if (!isAdmin()) {
      NotificationService.permissionDenied('generar reportes');
      return;
    }

    if (!products || products.length === 0) {
      NotificationService.warning('Sin datos', 'No hay productos para incluir en el reporte');
      return;
    }

    const loadingToast = NotificationService.loading('Generando reporte de stock bajo...');

    try {
      console.log('Generating low stock report with:', { 
        productsCount: products.length,
        lowStockCount: products.filter(p => (p.stock || 0) <= (p.minStock || 0)).length
      });
      
      await ReportService.generateLowStockReport(products, 'Mi Tienda de Barrio');
      
      NotificationService.dismiss(loadingToast);
      NotificationService.reportGenerated('de stock bajo');
    } catch (error) {
      console.error('Error generating low stock report:', error);
      NotificationService.dismiss(loadingToast);
      NotificationService.reportError('de stock bajo');
    }
  };

  // Show minimal loading during auth initialization to prevent timeout
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Iniciando aplicación...</span>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <LoginForm
          onLogin={login}
          onRegister={register}
          isLoading={false}
        />
      </ErrorBoundary>
    );
  }

  // Show app loader during initialization
  if (!appInitialized) {
    return (
      <AppLoader
        isLoading={true}
        error={initError}
        onRetry={handleRetry}
        onOfflineMode={handleOfflineMode}
      >
        <div />
      </AppLoader>
    );
  }

  // Show inventory loader only if we're trying to load data
  if (shouldLoadInventory && inventoryLoading && !isOffline) {
    return (
      <AppLoader
        isLoading={true}
        error={inventoryError}
        onRetry={handleRetry}
        onOfflineMode={handleOfflineMode}
      >
        <div />
      </AppLoader>
    );
  }

  // Show diagnostics panel
  if (showDiagnostics) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-background p-4">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<ComponentLoader />}>
              <DiagnosticsPanel onRetry={handleDiagnosticsRetry} />
            </Suspense>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Show product form
  if (showProductForm) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-background p-4">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<ComponentLoader />}>
              <ProductForm
                categories={categories}
                product={editingProduct}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                isSubmitting={isSubmitting}
              />
            </Suspense>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Show stock movement form
  if (showStockMovementForm) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-background p-4">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<ComponentLoader />}>
              <StockMovementForm
                products={products}
                onBack={handleBackFromMovements}
                onMovementRegistered={handleMovementRegistered}
                selectedProduct={selectedProductForMovement}
              />
            </Suspense>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Show movement history
  if (showMovementHistory) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-background p-4">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<ComponentLoader />}>
              <StockMovementHistory
                onBack={handleBackFromMovements}
                products={products}
              />
            </Suspense>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  const showPersistentError = inventoryError && (
    inventoryError.includes('conexión') || 
    inventoryError.includes('servidor') || 
    inventoryError.includes('disponible') ||
    inventoryError.includes('Failed to fetch') ||
    inventoryError.includes('Timeout')
  ) && !isOffline;

  // Main application interface
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-4">
          <ErrorBoundary fallback={
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Error en el header. Recarga la página.
              </AlertDescription>
            </Alert>
          }>
            <Header
              user={user!}
              onLogout={logout}
              onRefresh={handleRefresh}
              onAddProduct={handleAddProduct}
              onStockMovement={handleStockMovement}
              onMovementHistory={handleMovementHistory}
              onGenerateReport={handleGenerateReport}
              onGenerateLowStockReport={handleGenerateLowStockReport}
              isLoading={inventoryLoading}
            />
          </ErrorBoundary>

          {/* Offline Mode Indicator */}
          {isOffline && (
            <Alert className="mb-4 border-orange-200 bg-orange-50">
              <WifiOff className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    MODO OFFLINE
                  </Badge>
                  Trabajando con datos locales. Los cambios se guardarán localmente.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefresh}
                  className="text-orange-600 border-orange-300 hover:bg-orange-100"
                >
                  <Wifi className="h-3 w-3 mr-1" />
                  Reconectar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert with Diagnostics option */}
          {inventoryError && !isOffline && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 flex items-center justify-between">
                <span>{inventoryError}</span>
                {showPersistentError && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDiagnostics(true)}
                    className="ml-4 text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Diagnóstico
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Navigation Tabs */}
          <ErrorBoundary fallback={
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Error en la navegación. Usa los botones del header.
              </AlertDescription>
            </Alert>
          }>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`grid w-full ${isAdmin() ? 'grid-cols-3' : 'grid-cols-2'} max-w-md`}>
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Productos
                </TabsTrigger>
                {isAdmin() && (
                  <TabsTrigger value="users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Usuarios
                    {isOffline && <Badge variant="secondary" className="text-xs ml-1">Offline</Badge>}
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="dashboard" className="mt-6">
                <ErrorBoundary fallback={
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Error cargando el dashboard. Intenta refrescar la página.
                    </AlertDescription>
                  </Alert>
                }>
                  {inventoryLoading && !isOffline ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                          <SimpleSkeleton key={i} className="h-24" />
                        ))}
                      </div>
                      <SimpleSkeleton className="h-64" />
                    </div>
                  ) : (
                    <Suspense fallback={<ComponentLoader />}>
                      <Dashboard 
                        stats={stats} 
                        lowStockProducts={lowStockProducts} 
                        onGenerateReport={handleGenerateReport}
                        onGenerateLowStockReport={handleGenerateLowStockReport}
                        isAdmin={isAdmin()}
                      />
                    </Suspense>
                  )}
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="products" className="mt-6">
                <ErrorBoundary fallback={
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Error cargando los productos. Intenta refrescar la página.
                    </AlertDescription>
                  </Alert>
                }>
                  {inventoryLoading && !isOffline ? (
                    <SimpleSkeleton className="h-64" />
                  ) : (
                    <Suspense fallback={<ComponentLoader />}>
                      <ProductList
                        products={products}
                        categories={categories}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
                        onUpdateStock={updateStock}
                        onStockMovement={handleStockMovement}
                      />
                    </Suspense>
                  )}
                </ErrorBoundary>
              </TabsContent>

              {isAdmin() && (
                <TabsContent value="users" className="mt-6">
                  <ErrorBoundary fallback={
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        Error cargando la gestión de usuarios. Intenta refrescar la página.
                      </AlertDescription>
                    </Alert>
                  }>
                    {isOffline ? (
                      <Alert className="border-orange-200 bg-orange-50">
                        <Users className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
                          La gestión de usuarios no está disponible en modo offline. 
                          Conecta al servidor para acceder a esta funcionalidad.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Suspense fallback={<ComponentLoader />}>
                        <UserManagement />
                      </Suspense>
                    )}
                  </ErrorBoundary>
                </TabsContent>
              )}
            </Tabs>
          </ErrorBoundary>
        </div>
      </div>
      <Toaster />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}