import { useState } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Search, Edit, Trash, Plus, Minus, AlertTriangle, XCircle } from "lucide-react";
import { Product, Category } from "../types/inventory";
import { ConfirmDialog } from "./ConfirmDialog";
import { NotificationService } from "../services/notificationService";

interface ProductListProps {
  products: Product[];
  categories: Category[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onUpdateStock: (id: string, quantity: number) => void;
  onStockMovement?: (product: Product) => void;
}

export function ProductList({ products, categories, onEdit, onDelete, onUpdateStock, onStockMovement }: ProductListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [updatingStock, setUpdatingStock] = useState<string | null>(null);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStockBadgeVariant = (stock: number, minStock: number) => {
    if (stock === 0) return "destructive";
    if (stock <= minStock) return "secondary";
    return "default";
  };

  const getStockBadgeText = (stock: number, minStock: number) => {
    if (stock === 0) return "Sin stock";
    if (stock <= minStock) return "Stock bajo";
    return "Stock normal";
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (productToDelete) {
      onDelete(productToDelete.id);
      NotificationService.productDeleted(productToDelete.name);
      setProductToDelete(null);
    }
  };

  const handleStockUpdate = async (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setUpdatingStock(productId);
    try {
      await onUpdateStock(productId, quantity);
      const newStock = product.stock + quantity;
      NotificationService.stockUpdated(product.name, newStock);
      
      // Check for stock alerts
      if (newStock === 0) {
        NotificationService.outOfStockAlert(product.name);
      } else if (newStock <= product.minStock && (product.stock + quantity) > product.minStock) {
        NotificationService.lowStockAlert(product.name, newStock, product.minStock);
      }
    } catch (error) {
      NotificationService.error("Error al actualizar stock", "Intenta nuevamente");
    } finally {
      setUpdatingStock(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron productos
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.description && (
                            <p className="text-sm text-muted-foreground">{product.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell>Bs. {product.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStockUpdate(product.id, -1)}
                            disabled={product.stock === 0 || updatingStock === product.id}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="min-w-8 text-center">
                            {updatingStock === product.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mx-auto" />
                            ) : (
                              product.stock
                            )}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStockUpdate(product.id, 1)}
                            disabled={updatingStock === product.id}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStockBadgeVariant(product.stock, product.minStock)}>
                          <div className="flex items-center gap-1">
                            {product.stock === 0 ? (
                              <XCircle className="h-3 w-3" />
                            ) : product.stock <= product.minStock ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : null}
                            {getStockBadgeText(product.stock, product.minStock)}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(product)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(product)}
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar producto"
        description={
          productToDelete 
            ? `¿Estás seguro de que deseas eliminar "${productToDelete.name}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}