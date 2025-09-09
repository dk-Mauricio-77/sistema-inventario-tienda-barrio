import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Package, Banknote, AlertTriangle, XCircle, FileText } from "lucide-react";
import { Product } from "../types/inventory";
import { NotificationService } from "../services/notificationService";

interface DashboardProps {
  stats: {
    totalProducts: number;
    totalValue: number;
    lowStock: number;
    outOfStock: number;
    inStock: number;
    categories: number;
  };
  lowStockProducts: Product[];
  onGenerateReport?: () => Promise<void>;
  onGenerateLowStockReport?: () => Promise<void>;
  isAdmin?: boolean;
}

export function Dashboard({ stats, lowStockProducts, onGenerateReport, onGenerateLowStockReport, isAdmin = false }: DashboardProps) {
  const criticalStockProducts = lowStockProducts.filter(p => p.stock === 0);
  const lowStockOnly = lowStockProducts.filter(p => p.stock > 0 && p.stock <= p.minStock);

  return (
    <div className="space-y-6">


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              productos en inventario
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Bs. {stats.totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              valor del inventario
            </p>
          </CardContent>
        </Card>

        <Card className={stats.lowStock > 0 ? "border-yellow-200 bg-yellow-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.lowStock > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.lowStock > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
              {stats.lowStock}
            </div>
            <p className="text-xs text-muted-foreground">
              necesitan reposición
            </p>
          </CardContent>
        </Card>

        <Card className={stats.outOfStock > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <XCircle className={`h-4 w-4 ${stats.outOfStock > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.outOfStock > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              {stats.outOfStock}
            </div>
            <p className="text-xs text-muted-foreground">
              agotados
            </p>
          </CardContent>
        </Card>
      </div>

      {lowStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Inventario Crítico
              </CardTitle>
              {isAdmin && onGenerateLowStockReport && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onGenerateLowStockReport}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.map((product) => {
                const isOutOfStock = product.stock === 0;
                
                return (
                  <div 
                    key={product.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isOutOfStock 
                        ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                        : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge variant={isOutOfStock ? "destructive" : "secondary"} className="mb-1">
                        {isOutOfStock ? (
                          <div className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Agotado
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {product.stock}
                          </div>
                        )}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Mín: {product.minStock}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}