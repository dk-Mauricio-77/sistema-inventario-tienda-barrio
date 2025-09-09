import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { RefreshCw, Plus, User, LogOut, ShoppingCart, ArrowUpDown, History, FileText, Download } from "lucide-react";
import { User as UserType } from "../types/auth";

interface HeaderProps {
  user: UserType;
  onLogout: () => void;
  onRefresh: () => void;
  onAddProduct: () => void;
  onStockMovement: () => void;
  onMovementHistory: () => void;
  onGenerateReport?: () => void;
  onGenerateLowStockReport?: () => void;
  isLoading?: boolean;
}

export function Header({ user, onLogout, onRefresh, onAddProduct, onStockMovement, onMovementHistory, onGenerateReport, onGenerateLowStockReport, isLoading = false }: HeaderProps) {
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleDisplayName = (role: string) => {
    return role === 'admin' ? 'Administrador' : 'Empleado';
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === 'admin' ? 'default' : 'secondary';
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Sistema de Inventario</h1>
            <p className="text-muted-foreground">Gestión para tienda de barrio</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={onAddProduct} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </Button>
          <Button 
            variant="outline" 
            onClick={onStockMovement} 
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">Registrar Movimiento</span>
            <span className="sm:hidden">Movimiento</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={onMovementHistory} 
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Ver Historial</span>
            <span className="sm:hidden">Historial</span>
          </Button>
          
          {/* Reports dropdown - Only for admins */}
          {user.role === 'admin' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  disabled={isLoading}
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Reportes</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Generar Reportes</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onGenerateReport} disabled={isLoading}>
                  <Download className="mr-2 h-4 w-4" />
                  Inventario Completo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onGenerateLowStockReport} disabled={isLoading}>
                  <Download className="mr-2 h-4 w-4" />
                  Stock Bajo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                    {getRoleDisplayName(user.role)}
                  </Badge>
                </div>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}