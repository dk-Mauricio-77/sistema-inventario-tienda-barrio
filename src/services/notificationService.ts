import { toast } from "sonner@2.0.3";

export class NotificationService {
  static success(message: string, description?: string) {
    toast.success(message, {
      description,
      duration: 2500,
    });
  }

  static error(message: string, description?: string) {
    toast.error(message, {
      description,
      duration: 4000,
    });
  }

  static warning(message: string, description?: string) {
    toast.warning(message, {
      description,
      duration: 3000,
    });
  }

  static info(message: string, description?: string) {
    toast.info(message, {
      description,
      duration: 2500,
    });
  }

  static loading(message: string, description?: string) {
    return toast.loading(message, {
      description,
    });
  }

  static dismiss(id?: string | number) {
    toast.dismiss(id);
  }

  // Specific notifications for CRUD operations - More concise
  static productCreated(productName: string) {
    this.success(
      "Producto creado",
      `"${productName}" agregado`
    );
  }

  static productUpdated(productName: string) {
    this.success(
      "Producto actualizado",
      `"${productName}" guardado`
    );
  }

  static productDeleted(productName: string) {
    this.success(
      "Producto eliminado",
      `"${productName}" eliminado`
    );
  }

  static stockUpdated(productName: string, newStock: number) {
    this.success(
      "Stock actualizado",
      `"${productName}": ${newStock} unidades`
    );
  }

  static lowStockAlert(productName: string, currentStock: number, minStock: number) {
    this.warning(
      "Stock bajo",
      `"${productName}": ${currentStock} unidades (mín: ${minStock})`
    );
  }

  static outOfStockAlert(productName: string) {
    this.error(
      "Sin stock",
      `"${productName}" agotado`
    );
  }

  static permissionDenied(action: string) {
    this.error(
      "Sin permisos",
      `No puedes ${action}`
    );
  }

  static connectionError() {
    this.error(
      "Sin conexión",
      "Verifica tu internet"
    );
  }

  static dataLoadError() {
    this.error(
      "Error de carga",
      "Intenta nuevamente"
    );
  }

  static reportGenerated(type: string) {
    this.success(
      "Reporte listo",
      `${type} descargado`
    );
  }

  static reportError(type: string) {
    this.error(
      "Error de reporte",
      `No se pudo generar ${type}`
    );
  }

  static userLoggedIn(username: string) {
    this.success(
      "¡Bienvenido!",
      username
    );
  }

  static userLoggedOut() {
    this.info(
      "Sesión cerrada",
      "Hasta pronto"
    );
  }

  static movementRegistered(type: string, productName: string, quantity: number) {
    const action = type === 'in' ? 'Entrada' : 'Salida';
    this.success(
      `${action} registrada`,
      `${Math.abs(quantity)}u "${productName}"`
    );
  }
}