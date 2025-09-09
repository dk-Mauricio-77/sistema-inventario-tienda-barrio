// Stock Movement Routes - To be added to main server index.tsx

// Get stock movements for a product (protected)
app.get('/make-server-81f57c18/products/:id/movements', async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const productId = c.req.param('id');
    const movements = await kv.getByPrefix(`movement:${productId}:`);
    
    // Sort by date descending
    const sortedMovements = movements.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return c.json({ movements: sortedMovements });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return c.json({ error: 'Failed to fetch stock movements: ' + error.message }, 500);
  }
});

// Get all stock movements (protected)
app.get('/make-server-81f57c18/movements', async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const movements = await kv.getByPrefix('movement:');
    
    // Sort by date descending
    const sortedMovements = movements.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return c.json({ movements: sortedMovements });
  } catch (error) {
    console.error('Error fetching all stock movements:', error);
    return c.json({ error: 'Failed to fetch stock movements: ' + error.message }, 500);
  }
});

// Register stock movement (entrada/salida) (protected)
app.post('/make-server-81f57c18/movements', async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const { productId, type, quantity, reason } = await c.req.json();
    
    // Validate required fields
    if (!productId || !type || typeof quantity !== 'number' || quantity <= 0) {
      return c.json({ 
        error: 'Missing or invalid required fields: productId, type, quantity (must be positive number)' 
      }, 400);
    }

    if (!['entrada', 'salida'].includes(type)) {
      return c.json({ error: 'Invalid movement type. Must be "entrada" or "salida"' }, 400);
    }

    // Get product data
    const product = await kv.get(`product:${productId}`);
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    // Get user data
    const userData = await kv.get(`user:${user.id}`);
    if (!userData) {
      return c.json({ error: 'User data not found' }, 404);
    }

    // Calculate new stock
    const previousStock = product.stock;
    let newStock;
    
    if (type === 'entrada') {
      newStock = previousStock + quantity;
    } else { // salida
      newStock = Math.max(0, previousStock - quantity);
      
      // Check if we have enough stock
      if (previousStock < quantity) {
        return c.json({ 
          error: `Stock insuficiente. Stock actual: ${previousStock}, cantidad solicitada: ${quantity}`,
          availableStock: previousStock
        }, 400);
      }
    }

    // Create movement record
    const movementId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const movement = {
      id: movementId,
      productId,
      productName: product.name,
      type,
      quantity,
      reason: reason || '',
      userId: user.id,
      userName: userData.name,
      previousStock,
      newStock,
      createdAt: new Date().toISOString(),
    };

    // Update product stock
    const updatedProduct = {
      ...product,
      stock: newStock,
      updatedAt: new Date().toISOString(),
    };

    // Save both movement and updated product
    await Promise.all([
      kv.set(`movement:${productId}:${movementId}`, movement),
      kv.set(`product:${productId}`, updatedProduct)
    ]);

    console.log(`Stock movement registered: ${type} of ${quantity} units for product ${product.name} by ${userData.name}`);

    return c.json({ 
      movement,
      updatedProduct,
      message: `${type === 'entrada' ? 'Entrada' : 'Salida'} registrada exitosamente`
    }, 201);
  } catch (error) {
    console.error('Error registering stock movement:', error);
    return c.json({ error: 'Failed to register stock movement: ' + error.message }, 500);
  }
});

// Get movement statistics (protected)
app.get('/make-server-81f57c18/movements/stats', async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const movements = await kv.getByPrefix('movement:');
    
    // Calculate statistics
    const totalMovements = movements.length;
    const entradas = movements.filter(m => m.type === 'entrada');
    const salidas = movements.filter(m => m.type === 'salida');
    
    const totalEntradas = entradas.reduce((sum, m) => sum + m.quantity, 0);
    const totalSalidas = salidas.reduce((sum, m) => sum + m.quantity, 0);
    
    // Get recent movements (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentMovements = movements.filter(m => 
      new Date(m.createdAt) > sevenDaysAgo
    );
    
    // Group by product for product-wise stats
    const productStats = movements.reduce((acc, movement) => {
      if (!acc[movement.productId]) {
        acc[movement.productId] = {
          productId: movement.productId,
          productName: movement.productName,
          totalEntradas: 0,
          totalSalidas: 0,
          movementCount: 0
        };
      }
      
      acc[movement.productId].movementCount++;
      if (movement.type === 'entrada') {
        acc[movement.productId].totalEntradas += movement.quantity;
      } else {
        acc[movement.productId].totalSalidas += movement.quantity;
      }
      
      return acc;
    }, {});

    return c.json({
      summary: {
        totalMovements,
        totalEntradas: entradas.length,
        totalSalidas: salidas.length,
        totalQuantityEntradas: totalEntradas,
        totalQuantitySalidas: totalSalidas,
        netMovement: totalEntradas - totalSalidas,
        recentMovements: recentMovements.length
      },
      productStats: Object.values(productStats),
      recentActivity: recentMovements
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10) // Last 10 movements
    });
  } catch (error) {
    console.error('Error fetching movement statistics:', error);
    return c.json({ error: 'Failed to fetch movement statistics: ' + error.message }, 500);
  }
});