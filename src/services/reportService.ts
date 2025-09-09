import { Product, InventoryStats } from '../types/inventory';

interface ReportData {
  products: Product[];
  stats: InventoryStats;
  categories: string[];
  storeName?: string;
}

export class ReportService {
  private static formatCurrency(amount: number): string {
    return `Bs. ${amount.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private static formatDate(date: Date): string {
    return date.toLocaleDateString('es-BO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private static generateCSVContent(data: ReportData): string {
    const { products, stats, categories, storeName = 'Mi Tienda de Barrio' } = data;
    const reportDate = this.formatDate(new Date());
    
    let csv = `${storeName} - Reporte de Inventario\n`;
    csv += `Generado el: ${reportDate}\n\n`;
    
    // Summary
    csv += `RESUMEN DEL INVENTARIO\n`;
    csv += `Total de Productos,${stats.totalProducts || 0}\n`;
    csv += `Productos en Stock,${stats.inStock || 0}\n`;
    csv += `Productos sin Stock,${stats.outOfStock || 0}\n`;
    csv += `Stock Bajo,${stats.lowStock || 0}\n`;
    csv += `Valor Total del Inventario,${this.formatCurrency(stats.totalValue || 0)}\n`;
    csv += `Categorías,${categories.length}\n\n`;
    
    // Products detail
    csv += `DETALLE DE PRODUCTOS\n`;
    csv += `Producto,Categoría,Stock,Min Stock,Precio,Valor Total,Estado\n`;
    
    products.forEach(product => {
      const stock = product.stock || 0;
      const minStock = product.minStock || 0;
      const price = product.price || 0;
      const totalValue = stock * price;
      const status = stock <= minStock ? 'BAJO' : 'OK';
      
      csv += `"${product.name || 'Sin nombre'}","${product.category || 'Sin categoría'}",${stock},${minStock},${this.formatCurrency(price)},${this.formatCurrency(totalValue)},${status}\n`;
    });
    
    return csv;
  }

  private static generateLowStockCSVContent(products: Product[], storeName?: string): string {
    const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.minStock || 0));
    const reportDate = this.formatDate(new Date());
    
    let csv = `${storeName || 'Mi Tienda de Barrio'} - Reporte de Stock Bajo\n`;
    csv += `Generado el: ${reportDate}\n\n`;
    
    if (lowStockProducts.length === 0) {
      csv += `No hay productos con stock bajo.\n`;
      return csv;
    }
    
    csv += `¡ATENCIÓN! ${lowStockProducts.length} producto(s) requieren reabastecimiento urgente\n\n`;
    csv += `Producto,Categoría,Stock Actual,Stock Mínimo,Faltante,Valor a Comprar\n`;
    
    lowStockProducts.forEach(product => {
      const stock = product.stock || 0;
      const minStock = product.minStock || 0;
      const price = product.price || 0;
      const needed = Math.max(0, minStock - stock);
      const valueToOrder = price * needed;
      
      csv += `"${product.name || 'Sin nombre'}","${product.category || 'Sin categoría'}",${stock},${minStock},${needed},${this.formatCurrency(valueToOrder)}\n`;
    });
    
    // Total to purchase
    const totalToPurchase = lowStockProducts.reduce((total, product) => {
      const needed = Math.max(0, (product.minStock || 0) - (product.stock || 0));
      return total + ((product.price || 0) * needed);
    }, 0);
    
    csv += `\nTOTAL ESTIMADO PARA COMPRAR,${this.formatCurrency(totalToPurchase)}\n`;
    
    return csv;
  }

  private static downloadFile(content: string, filename: string, type: string = 'text/csv') {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static async generateInventoryReport(data: ReportData): Promise<void> {
    // First try to generate PDF
    try {
      const jsPDF = await import('jspdf');
      const autoTable = await import('jspdf-autotable');
      
      // Create new PDF document
      const doc = new jsPDF.default();
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      
      // Set font
      doc.setFont('helvetica');
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text(data.storeName || 'Mi Tienda de Barrio', margin, 25);
      
      doc.setFontSize(16);
      doc.setTextColor(80, 80, 80);
      doc.text('Reporte de Inventario', margin, 35);
      
      // Date and time
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      const reportDate = this.formatDate(new Date());
      doc.text(`Generado el: ${reportDate}`, margin, 45);
      
      // Summary statistics
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text('Resumen del Inventario', margin, 60);
      
      const summaryData = [
        ['Total de Productos', (data.stats.totalProducts || 0).toString()],
        ['Productos en Stock', (data.stats.inStock || 0).toString()],
        ['Productos sin Stock', (data.stats.outOfStock || 0).toString()],
        ['Stock Bajo', (data.stats.lowStock || 0).toString()],
        ['Valor Total del Inventario', this.formatCurrency(data.stats.totalValue || 0)],
        ['Categorías', data.categories.length.toString()]
      ];
      
      autoTable.default(doc, {
        startY: 65,
        head: [['Métrica', 'Valor']],
        body: summaryData,
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [40, 40, 40],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 'auto' },
          1: { cellWidth: 'auto' }
        }
      });
      
      // Product list
      const finalY = (doc as any).lastAutoTable?.finalY || 120;
      
      doc.setFontSize(12);
      doc.text('Detalle de Productos', margin, finalY + 15);
      
      // Prepare product data with truncated names if needed
      const productData = data.products.map(product => [
        this.truncateText(product.name || 'Sin nombre', 25),
        this.truncateText(product.category || 'Sin categoría', 15),
        (product.stock || 0).toString(),
        (product.minStock || 0).toString(),
        this.formatCurrency(product.price || 0),
        this.formatCurrency((product.stock || 0) * (product.price || 0)),
        (product.stock || 0) <= (product.minStock || 0) ? 'BAJO' : 'OK'
      ]);
      
      // Calculate available width for the table
      const availableWidth = pageWidth - (margin * 2);
      
      autoTable.default(doc, {
        startY: finalY + 20,
        head: [['Producto', 'Categoría', 'Stock', 'Min.', 'Precio', 'Valor', 'Estado']],
        body: productData,
        margin: { left: margin, right: margin },
        tableWidth: availableWidth,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle'
        },
        theme: 'grid',
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [40, 40, 40],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: availableWidth * 0.30 }, // 30% for product name
          1: { cellWidth: availableWidth * 0.20 }, // 20% for category
          2: { cellWidth: availableWidth * 0.10, halign: 'center' }, // 10% for stock
          3: { cellWidth: availableWidth * 0.10, halign: 'center' }, // 10% for min stock
          4: { cellWidth: availableWidth * 0.12, halign: 'right' }, // 12% for price
          5: { cellWidth: availableWidth * 0.13, halign: 'right' }, // 13% for total value
          6: { cellWidth: availableWidth * 0.05, halign: 'center' } // 5% for status
        },
        didParseCell: function(hookData: any) {
          if (hookData.column.index === 6 && hookData.cell.text[0] === 'BAJO') {
            hookData.cell.styles.fillColor = [255, 240, 240];
            hookData.cell.styles.textColor = [200, 0, 0];
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
      });
      
      // Footer
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        
        // Page number
        doc.text(
          `Página ${i} de ${pageCount}`,
          pageWidth - margin - 30,
          doc.internal.pageSize.height - 10
        );
        
        // Generated by text
        doc.text(
          'Generado por Sistema de Inventario',
          margin,
          doc.internal.pageSize.height - 10
        );
      }
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `reporte-inventario-${timestamp}.pdf`;
      
      // Save the PDF
      doc.save(filename);
      
      console.log('PDF report generated successfully');
      
    } catch (error) {
      console.warn('PDF generation failed, generating CSV report:', error);
      
      // Fallback to CSV
      const csvContent = this.generateCSVContent(data);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `reporte-inventario-${timestamp}.csv`;
      
      this.downloadFile(csvContent, filename);
      
      alert('Se ha generado un reporte en formato CSV (Excel compatible) porque PDF no está disponible en este momento.');
    }
  }

  static async generateLowStockReport(products: Product[], storeName?: string): Promise<void> {
    const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.minStock || 0));
    
    if (lowStockProducts.length === 0) {
      alert('No hay productos con stock bajo para reportar.');
      return;
    }

    // First try to generate PDF
    try {
      const jsPDF = await import('jspdf');
      const autoTable = await import('jspdf-autotable');
      
      const doc = new jsPDF.default();
      const margin = 20;
      
      // Header
      doc.setFont('helvetica');
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text(storeName || 'Mi Tienda de Barrio', margin, 25);
      
      doc.setFontSize(16);
      doc.setTextColor(200, 0, 0);
      doc.text('Reporte de Stock Bajo', margin, 35);
      
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      const reportDate = this.formatDate(new Date());
      doc.text(`Generado el: ${reportDate}`, margin, 45);
      
      // Alert message
      doc.setFontSize(12);
      doc.setTextColor(200, 0, 0);
      doc.text(`¡ATENCIÓN! ${lowStockProducts.length} producto(s) requieren reabastecimiento urgente`, margin, 60);
      
      // Low stock products table with truncated names
      const productData = lowStockProducts.map(product => [
        this.truncateText(product.name || 'Sin nombre', 20),
        this.truncateText(product.category || 'Sin categoría', 15),
        (product.stock || 0).toString(),
        (product.minStock || 0).toString(),
        Math.max(0, (product.minStock || 0) - (product.stock || 0)).toString(),
        this.formatCurrency((product.price || 0) * Math.max(0, (product.minStock || 0) - (product.stock || 0)))
      ]);
      
      // Calculate available width for the low stock table
      const availableWidth = doc.internal.pageSize.width - (margin * 2);
      
      autoTable.default(doc, {
        startY: 70,
        head: [['Producto', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Faltante', 'Valor a Comprar']],
        body: productData,
        margin: { left: margin, right: margin },
        tableWidth: availableWidth,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
          valign: 'middle'
        },
        theme: 'grid',
        headStyles: {
          fillColor: [255, 240, 240],
          textColor: [200, 0, 0],
          fontStyle: 'bold'
        },
        bodyStyles: {
          fillColor: [255, 250, 250]
        },
        columnStyles: {
          0: { cellWidth: availableWidth * 0.28 }, // 28% for product name
          1: { cellWidth: availableWidth * 0.20 }, // 20% for category
          2: { cellWidth: availableWidth * 0.13, halign: 'center', textColor: [200, 0, 0], fontStyle: 'bold' }, // 13% for current stock
          3: { cellWidth: availableWidth * 0.13, halign: 'center' }, // 13% for min stock
          4: { cellWidth: availableWidth * 0.13, halign: 'center', fontStyle: 'bold' }, // 13% for needed
          5: { cellWidth: availableWidth * 0.13, halign: 'right' } // 13% for value to buy
        }
      });
      
      // Total to purchase
      const totalToPurchase = lowStockProducts.reduce((total, product) => {
        const needed = Math.max(0, (product.minStock || 0) - (product.stock || 0));
        return total + ((product.price || 0) * needed);
      }, 0);
      
      const finalY = (doc as any).lastAutoTable?.finalY || 150;
      
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text('Resumen de Compras Requeridas:', margin, finalY + 15);
      doc.setTextColor(200, 0, 0);
      doc.text(`Total estimado: ${this.formatCurrency(totalToPurchase)}`, margin, finalY + 25);
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        'Reporte generado automáticamente - Revisar y actualizar stock urgentemente',
        margin,
        doc.internal.pageSize.height - 20
      );
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `reporte-stock-bajo-${timestamp}.pdf`;
      
      doc.save(filename);
      
      console.log('Low stock PDF report generated successfully');
      
    } catch (error) {
      console.warn('PDF generation failed, generating CSV report:', error);
      
      // Fallback to CSV
      const csvContent = this.generateLowStockCSVContent(products, storeName);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `reporte-stock-bajo-${timestamp}.csv`;
      
      this.downloadFile(csvContent, filename);
      
      alert('Se ha generado un reporte en formato CSV (Excel compatible) porque PDF no está disponible en este momento.');
    }
  }
}