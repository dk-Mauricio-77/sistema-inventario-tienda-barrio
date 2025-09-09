import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { 
  ArrowLeft, 
  Settings, 
  AlertTriangle,
  Info,
  ExternalLink
} from 'lucide-react';
import { SystemStatus } from './SystemStatus';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticsPanelProps {
  onRetry: () => void;
}

export function DiagnosticsPanel({ onRetry }: DiagnosticsPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Sistema
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Panel de Diagnóstico
          </h1>
          <p className="text-muted-foreground">
            Herramientas para diagnosticar y resolver problemas del sistema
          </p>
        </div>
      </div>

      {/* System Status */}
      <SystemStatus onRetry={onRetry} />

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Proyecto Supabase</p>
              <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                {projectId}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Clave Pública</p>
              <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                {publicAnonKey.substring(0, 20)}...
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <p className="text-sm font-medium">URL del Servidor</p>
            <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
              https://{projectId}.supabase.co/functions/v1/make-server-81f57c18
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Ocultar' : 'Mostrar'} Detalles Técnicos
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a 
                href={`https://${projectId}.supabase.co/functions/v1/make-server-81f57c18/health`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-3 w-3" />
                Test Health Endpoint
              </a>
            </Button>
          </div>

          {showDetails && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Arquitectura:</strong> Frontend (React + Tailwind) → Supabase Edge Functions (Hono) → PostgreSQL + KV Store
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Autenticación:</strong> Supabase Auth con JWT tokens
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Base de Datos:</strong> Tabla KV Store para persistencia de datos
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Usuarios Demo:</strong> admin@tienda.com / empleado@tienda.com
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Troubleshooting Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Guía de Resolución de Problemas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Problema más común:</strong> Los usuarios de demostración no existen.
              <br />
              <strong>Solución:</strong> Usa el botón "Crear Usuarios Demo" en la pantalla de login.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 text-sm">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="font-medium">Si el servidor está offline:</p>
              <ul className="list-disc list-inside text-muted-foreground text-xs mt-1 space-y-1">
                <li>Verifica tu conexión a internet</li>
                <li>Comprueba que las variables de entorno de Supabase estén configuradas</li>
                <li>Revisa los logs del Edge Function en el dashboard de Supabase</li>
              </ul>
            </div>

            <div className="border-l-4 border-orange-500 pl-4">
              <p className="font-medium">Si hay errores de autenticación:</p>
              <ul className="list-disc list-inside text-muted-foreground text-xs mt-1 space-y-1">
                <li>Asegúrate de que los usuarios demo estén creados</li>
                <li>Limpia el localStorage del navegador</li>
                <li>Verifica que las credenciales sean correctas</li>
              </ul>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <p className="font-medium">Si no hay productos:</p>
              <ul className="list-disc list-inside text-muted-foreground text-xs mt-1 space-y-1">
                <li>Usa el botón "Inicializar Productos" arriba</li>
                <li>O crea productos manualmente una vez que tengas acceso</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={onRetry}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Sistema
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          className="text-orange-600 hover:text-orange-700"
        >
          Limpiar Cache y Reiniciar
        </Button>
      </div>
    </div>
  );
}