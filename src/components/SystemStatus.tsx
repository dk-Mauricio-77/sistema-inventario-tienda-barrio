import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Server, 
  Database,
  Users,
  Package
} from 'lucide-react';
import { InventoryService } from '../services/inventoryService';

interface SystemStatusProps {
  onRetry?: () => void;
}

interface StatusInfo {
  server: 'online' | 'offline' | 'checking' | 'error';
  database: 'connected' | 'disconnected' | 'checking' | 'error';
  users: 'ready' | 'missing' | 'checking' | 'error';
  products: 'ready' | 'empty' | 'checking' | 'error';
}

export function SystemStatus({ onRetry }: SystemStatusProps) {
  const [status, setStatus] = useState<StatusInfo>({
    server: 'checking',
    database: 'checking',
    users: 'checking',
    products: 'checking'
  });
  const [details, setDetails] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setIsRefreshing(true);
    console.log('SystemStatus: Starting system health check...');

    try {
      // Check server health
      setStatus(prev => ({ ...prev, server: 'checking' }));
      const serverHealth = await InventoryService.checkHealth();
      setStatus(prev => ({ 
        ...prev, 
        server: serverHealth ? 'online' : 'offline' 
      }));

      if (serverHealth) {
        // Check users
        setStatus(prev => ({ ...prev, users: 'checking' }));
        try {
          const userDebug = await InventoryService.debugUsers();
          setStatus(prev => ({ 
            ...prev, 
            users: userDebug.kvUsers > 0 ? 'ready' : 'missing' 
          }));
          setDetails(prev => ({ ...prev, users: userDebug }));
        } catch (error) {
          console.error('SystemStatus: Users check failed:', error);
          setStatus(prev => ({ ...prev, users: 'error' }));
        }

        // Check products
        setStatus(prev => ({ ...prev, products: 'checking' }));
        try {
          const products = await InventoryService.getProducts();
          setStatus(prev => ({ 
            ...prev, 
            products: products.length > 0 ? 'ready' : 'empty' 
          }));
          setDetails(prev => ({ ...prev, productsCount: products.length }));
        } catch (error) {
          console.error('SystemStatus: Products check failed:', error);
          setStatus(prev => ({ ...prev, products: 'error' }));
        }

        setStatus(prev => ({ ...prev, database: 'connected' }));
      } else {
        setStatus(prev => ({ 
          ...prev, 
          database: 'disconnected',
          users: 'error',
          products: 'error'
        }));
      }
    } catch (error) {
      console.error('SystemStatus: Health check failed:', error);
      setStatus({
        server: 'error',
        database: 'error',
        users: 'error',
        products: 'error'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const createDemoUsers = async () => {
    try {
      console.log('SystemStatus: Creating demo users...');
      await InventoryService.createDemoUsers();
      await checkSystemStatus(); // Refresh status after creating users
    } catch (error) {
      console.error('SystemStatus: Error creating demo users:', error);
    }
  };

  const initSampleData = async () => {
    try {
      console.log('SystemStatus: Initializing sample data...');
      await InventoryService.initSampleData();
      await checkSystemStatus(); // Refresh status after initializing data
    } catch (error) {
      console.error('SystemStatus: Error initializing sample data:', error);
    }
  };

  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'online':
      case 'connected':
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
      case 'disconnected':
      case 'missing':
      case 'empty':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (component: string, statusValue: string) => {
    switch (component) {
      case 'server':
        switch (statusValue) {
          case 'checking': return 'Verificando servidor...';
          case 'online': return 'Servidor disponible';
          case 'offline': return 'Servidor fuera de línea';
          case 'error': return 'Error de conexión';
          default: return 'Estado desconocido';
        }
      case 'database':
        switch (statusValue) {
          case 'checking': return 'Verificando base de datos...';
          case 'connected': return 'Base de datos conectada';
          case 'disconnected': return 'Base de datos desconectada';
          case 'error': return 'Error en base de datos';
          default: return 'Estado desconocido';
        }
      case 'users':
        switch (statusValue) {
          case 'checking': return 'Verificando usuarios...';
          case 'ready': return `Usuarios disponibles (${details?.users?.kvUsers || 0})`;
          case 'missing': return 'Usuarios de demo faltantes';
          case 'error': return 'Error verificando usuarios';
          default: return 'Estado desconocido';
        }
      case 'products':
        switch (statusValue) {
          case 'checking': return 'Verificando productos...';
          case 'ready': return `Productos disponibles (${details?.productsCount || 0})`;
          case 'empty': return 'No hay productos, inicializa datos de muestra';
          case 'error': return 'Error verificando productos';
          default: return 'Estado desconocido';
        }
      default:
        return statusValue;
    }
  };

  const getBadgeVariant = (statusValue: string) => {
    switch (statusValue) {
      case 'online':
      case 'connected':
      case 'ready':
        return 'default';
      case 'checking':
        return 'secondary';
      case 'offline':
      case 'disconnected':
      case 'missing':
      case 'empty':
        return 'outline';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const isSystemReady = () => {
    return status.server === 'online' && 
           status.database === 'connected' && 
           status.users === 'ready' && 
           status.products === 'ready';
  };

  const hasIssues = () => {
    return Object.values(status).some(s => s === 'error' || s === 'offline' || s === 'disconnected');
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Server className="h-5 w-5" />
            Estado del Sistema
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={checkSystemStatus}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Status Overview */}
        {isSystemReady() && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Sistema listo para usar. Todos los componentes están funcionando correctamente.
            </AlertDescription>
          </Alert>
        )}

        {hasIssues() && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Se detectaron problemas en el sistema. Revisa los componentes marcados en rojo.
            </AlertDescription>
          </Alert>
        )}

        {/* Component Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Server Status */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium">Servidor</p>
                <p className="text-xs text-gray-600">
                  {getStatusText('server', status.server)}
                </p>
              </div>
            </div>
            <Badge variant={getBadgeVariant(status.server)}>
              {getStatusIcon(status.server)}
            </Badge>
          </div>

          {/* Database Status */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium">Base de Datos</p>
                <p className="text-xs text-gray-600">
                  {getStatusText('database', status.database)}
                </p>
              </div>
            </div>
            <Badge variant={getBadgeVariant(status.database)}>
              {getStatusIcon(status.database)}
            </Badge>
          </div>

          {/* Users Status */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium">Usuarios</p>
                <p className="text-xs text-gray-600">
                  {getStatusText('users', status.users)}
                </p>
              </div>
            </div>
            <Badge variant={getBadgeVariant(status.users)}>
              {getStatusIcon(status.users)}
            </Badge>
          </div>

          {/* Products Status */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium">Productos</p>
                <p className="text-xs text-gray-600">
                  {getStatusText('products', status.products)}
                </p>
              </div>
            </div>
            <Badge variant={getBadgeVariant(status.products)}>
              {getStatusIcon(status.products)}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {status.users === 'missing' && (
            <Button
              variant="outline"
              size="sm"
              onClick={createDemoUsers}
              className="flex items-center gap-2"
            >
              <Users className="h-3 w-3" />
              Crear Usuarios Demo
            </Button>
          )}

          {status.products === 'empty' && (
            <Button
              variant="outline"
              size="sm"
              onClick={initSampleData}
              className="flex items-center gap-2"
            >
              <Package className="h-3 w-3" />
              Inicializar Productos
            </Button>
          )}

          {onRetry && hasIssues() && (
            <Button
              variant="default"
              size="sm"
              onClick={onRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Intentar de Nuevo
            </Button>
          )}
        </div>

        {/* Debug Information */}
        {details && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">
              Información de debug
            </summary>
            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
              {JSON.stringify(details, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}