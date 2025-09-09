import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { FileText, Download, AlertTriangle, Package } from "lucide-react";
import { Product, InventoryStats } from "../types/inventory";
import { ReportService } from "../services/reportService";

interface ReportGeneratorProps {
  products: Product[];
  stats: InventoryStats;
  categories: string[];
  onClose?: () => void;
}

export function ReportGenerator({ products, stats, categories, onClose }: ReportGeneratorProps) {
  const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.minStock || 0));
  
  const handleGenerateInventoryReport = async () => {
    try {
      await ReportService.generateInventoryReport({
        products,
        stats,
        categories,
        storeName: 'Mi Tienda de Barrio'
      });
    } catch (error) {
      console.error('Error generating inventory report:', error);
      alert('Error al generar el reporte de inventario');
    }
  };

  const handleGenerateLowStockReport = async () => {
    try {
      await ReportService.generateLowStockReport(products, 'Mi Tienda de Barrio');
    } catch (error) {
      console.error('Error generating low stock report:', error);
      alert('Error al generar el reporte de stock bajo');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Generar Reportes</h2>
          <p className="text-muted-foreground">
            Genera reportes en PDF del estado actual del inventario
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Volver
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reporte Completo de Inventario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              Reporte Completo de Inventario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Incluye todos los productos con detalles de stock, precios y categorías.
            </p>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total de productos:</span>
                <Badge variant="outline">{stats.totalProducts}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Categorías:</span>
                <Badge variant="outline">{categories.length}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Valor total:</span>
                <Badge variant="outline">Bs. {stats.totalValue.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</Badge>
              </div>
            </div>

            <Button 
              onClick={handleGenerateInventoryReport} 
              className="w-full flex items-center gap-2"
              disabled={products.length === 0}
            >
              <Download className="h-4 w-4" />
              Generar Reporte Completo
            </Button>
          </CardContent>
        </Card>

        {/* Reporte de Stock Bajo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Reporte de Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Lista productos que requieren reabastecimiento urgente.
            </p>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Productos con stock bajo:</span>
                <Badge variant={lowStockProducts.length > 0 ? "destructive" : "outline"}>
                  {lowStockProducts.length}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Sin stock:</span>
                <Badge variant={stats.outOfStock > 0 ? "destructive" : "outline"}>
                  {stats.outOfStock}
                </Badge>
              </div>
              {lowStockProducts.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Valor estimado para comprar:</span>
                  <Badge variant="outline">
                    Bs. {lowStockProducts.reduce((total, product) => {
                      const needed = Math.max(0, (product.minStock || 0) - (product.stock || 0));
                      return total + ((product.price || 0) * needed);
                    }, 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </Badge>
                </div>
              )}
            </div>

            <Button 
              onClick={handleGenerateLowStockReport} 
              className="w-full flex items-center gap-2"
              variant={lowStockProducts.length > 0 ? "destructive" : "outline"}
              disabled={lowStockProducts.length === 0}
            >
              <Download className="h-4 w-4" />
              {lowStockProducts.length > 0 
                ? 'Generar Reporte de Stock Bajo' 
                : 'No hay productos con stock bajo'
              }
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Resumen Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Vista Previa del Contenido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Reporte Completo incluye:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Resumen de estadísticas del inventario</li>
                <li>• Lista detallada de todos los productos</li>
                <li>• Stock actual y mínimo de cada producto</li>
                <li>• Precios y valor total por producto</li>
                <li>• Categorización completa</li>
                <li>• Estado de stock (OK/BAJO)</li>
                <li>• Fecha y hora de generación</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Reporte de Stock Bajo incluye:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Productos que requieren reabastecimiento</li>
                <li>• Cantidad faltante por producto</li>
                <li>• Valor estimado de compras necesarias</li>
                <li>• Alertas visuales de urgencia</li>
                <li>• Resumen de compras requeridas</li>
                <li>• Formato optimizado para proveedores</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}