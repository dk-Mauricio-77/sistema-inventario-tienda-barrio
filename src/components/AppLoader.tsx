import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loader2, WifiOff, AlertCircle } from 'lucide-react';

interface AppLoaderProps {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onOfflineMode: () => void;
  children: React.ReactNode;
}

export function AppLoader({ isLoading, error, onRetry, onOfflineMode, children }: AppLoaderProps) {
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
  }, 8000); // ...existing code...

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);

  // ...existing code...
  if (loadingTimeout || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center">
            <div className="h-12 w-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              {loadingTimeout ? (
                <WifiOff className="h-6 w-6 text-gray-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-500" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {loadingTimeout ? 'Problemas de conectividad' : 'Error de conexión'}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {loadingTimeout 
                ? 'El servidor está tardando en responder. Puedes continuar en modo offline.'
                : error || 'No se puede conectar al servidor.'
              }
            </p>
          </div>

          <Alert className="border-orange-200 bg-orange-50">
            <WifiOff className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    MODO OFFLINE DISPONIBLE
                  </Badge>
                </div>
                <p className="text-sm">
                  Puedes trabajar con datos de muestra sin conexión al servidor.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={onOfflineMode}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <WifiOff className="h-3 w-3 mr-1" />
                    Continuar Offline
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRetry}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <Loader2 className="h-3 w-3 mr-1" />
                    Reintentar
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // ...existing code...
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando sistema de inventario...</p>
          <p className="text-xs text-muted-foreground">
            Si esto tarda mucho, el modo offline estará disponible pronto
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}