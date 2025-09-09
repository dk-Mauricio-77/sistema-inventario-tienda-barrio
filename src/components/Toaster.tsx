import { Toaster as SonnerToaster } from "sonner@2.0.3";
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors={false}
      visibleToasts={3}
      closeButton={false}
      toastOptions={{
        duration: 3000,
        style: {
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          color: 'hsl(var(--card-foreground))',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '500',
        },
        className: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
      }}
      icons={{
        success: <CheckCircle className="h-4 w-4 text-green-600" />,
        error: <AlertCircle className="h-4 w-4 text-red-600" />,
        warning: <AlertTriangle className="h-4 w-4 text-orange-600" />,
        info: <Info className="h-4 w-4 text-blue-600" />,
        loading: <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />,
      }}
    />
  );
}