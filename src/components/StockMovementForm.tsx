import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { ArrowLeft, Plus, Minus, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { Product, StockMovementFormData, StockMovement } from '../types/inventory';
import { StockMovementService } from '../services/stockMovementService';

interface StockMovementFormProps {
  products: Product[];
  onBack: () => void;
  onMovementRegistered: (movement: StockMovement) => void;
  selectedProduct?: Product;
}

export function StockMovementForm({ products, onBack, onMovementRegistered, selectedProduct }: StockMovementFormProps) {
  const [formData, setFormData] = useState<StockMovementFormData>({
    productId: selectedProduct?.id || '',
    type: 'entrada',
    quantity: 1,
    reason: '',
  });
  
  const [selectedProductData, setSelectedProductData] = useState<Product | null>(selectedProduct || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);



  useEffect(() => {
    if (formData.productId && products.length > 0) {
      const product = products.find(p => p.id === formData.productId);
      setSelectedProductData(product || null);
    } else {
      setSelectedProductData(null);
    }
  }, [formData.productId, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const result = await StockMovementService.registerMovement(formData);
      
      setSuccess(result.message);
      onMovementRegistered(result.movement);
      
      // Reset form for next movement
      setFormData({
        productId: selectedProduct?.id || '',
        type: 'entrada',
        quantity: 1,
        reason: '',
      });
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error registrando movimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setFormData({ ...formData, quantity: Math.max(0, value) });
  };

  const adjustQuantity = (delta: number) => {
    const newQuantity = Math.max(0, formData.quantity + delta);
    setFormData({ ...formData, quantity: newQuantity });
  };

  const canProcessSalida = selectedProductData && formData.type === 'salida' 
    ? (selectedProductData.stock || 0) >= formData.quantity 
    : true;

  const getPreviewStock = () => {
    if (!selectedProductData) return 0;
    const currentStock = selectedProductData.stock || 0;
    const quantity = formData.quantity || 0;
    
    if (formData.type === 'entrada') {
      return currentStock + quantity;
    } else {
      return Math.max(0, currentStock - quantity);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Registrar Movimiento de Stock</h1>
          <p className="text-muted-foreground">
            Registra entradas y salidas de productos del inventario
          </p>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Datos del Movimiento</CardTitle>
            </CardHeader>
            <CardContent>
              {!products || products.length === 0 ? (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    No hay productos disponibles. Agrega productos al inventario para registrar movimientos.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="productId">Producto</Label>
                    <Select
                      value={formData.productId}
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, productId: value }));
                      }}
                    >
                      <SelectTrigger id="productId">
                        <SelectValue placeholder="Selecciona un producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products && products.length > 0 ? (
                          products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} (Stock: {product.stock || 0})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-products" disabled>
                            No hay productos disponibles
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Movimiento</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={formData.type === 'entrada' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setFormData({ ...formData, type: 'entrada' })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Entrada
                      </Button>
                      <Button
                        type="button"
                        variant={formData.type === 'salida' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setFormData({ ...formData, type: 'salida' })}
                      >
                        <Minus className="h-4 w-4 mr-2" />
                        Salida
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Cantidad</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => adjustQuantity(-1)}
                        disabled={formData.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        id="quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={handleQuantityChange}
                        min="1"
                        className="text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => adjustQuantity(1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    {formData.type === 'salida' && selectedProductData && formData.quantity > (selectedProductData.stock || 0) && (
                      <p className="text-sm text-red-600">
                        ⚠️ Cantidad superior al stock disponible ({selectedProductData.stock || 0})
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Motivo (opcional)</Label>
                    <Textarea
                      id="reason"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder={
                        formData.type === 'entrada' 
                          ? 'Ej: Compra de mercancía, devolución de cliente...'
                          : 'Ej: Venta, producto dañado, inventario...'
                      }
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      isSubmitting || 
                      !formData.productId || 
                      formData.quantity <= 0 || 
                      !canProcessSalida
                    }
                  >
                    {isSubmitting ? (
                      'Registrando...'
                    ) : (
                      <>
                        {formData.type === 'entrada' ? (
                          <Plus className="h-4 w-4 mr-2" />
                        ) : (
                          <Minus className="h-4 w-4 mr-2" />
                        )}
                        Registrar {formData.type === 'entrada' ? 'Entrada' : 'Salida'}
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Vista previa */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Vista Previa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedProductData ? (
                <>
                  <div>
                    <h4 className="font-medium">{selectedProductData.name}</h4>
                    <p className="text-sm text-muted-foreground">{selectedProductData.category}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Stock actual:</span>
                      <Badge variant="outline">{selectedProductData.stock || 0}</Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Movimiento:</span>
                      <Badge variant={formData.type === 'entrada' ? 'default' : 'destructive'}>
                        {formData.type === 'entrada' ? '+' : '-'}{formData.quantity || 0}
                      </Badge>
                    </div>

                    <hr />

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Stock resultante:</span>
                      <Badge 
                        variant={getPreviewStock() <= (selectedProductData.minStock || 0) ? 'destructive' : 'default'}
                        className="text-base"
                      >
                        {getPreviewStock()}
                      </Badge>
                    </div>

                    {getPreviewStock() <= (selectedProductData.minStock || 0) && (
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800 text-sm">
                          El stock resultante está por debajo del mínimo ({selectedProductData.minStock || 0})
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Selecciona un producto para ver la vista previa
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}