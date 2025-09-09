import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Supabase clients
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
);

// Middleware
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  credentials: true,
}));

app.use('*', logger(console.log));

// Error handling middleware
app.use('*', async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Unhandled error:', error);
    return c.json({ 
      error: 'Internal server error', 
      details: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Helper function to verify user authorization
async function verifyAuth(c: any): Promise<{ user: any; error?: string }> {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return { user: null, error: 'No authorization header provided' };
    }

    const accessToken = authHeader.split(' ')[1];
    if (!accessToken || accessToken === Deno.env.get('SUPABASE_ANON_KEY')) {
      return { user: null, error: 'No valid authorization token provided' };
    }

    console.log('Verifying token:', accessToken.substring(0, 20) + '...');

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !user) {
      console.log('Token verification failed:', error?.message || 'No user found');
      return { user: null, error: 'Invalid authorization token' };
    }

    console.log('Token verified for user:', user.email);
    return { user };
  } catch (error) {
    console.error('Error in verifyAuth:', error);
    return { user: null, error: 'Authentication error: ' + error.message };
  }
}

// Force create demo users - more robust version
async function forceCreateDemoUsers() {
  console.log('=== FORCE CREATING DEMO USERS ===');
  
  const demoUsers = [
    {
      email: 'admin@tienda.com',
      password: 'admin123',
      name: 'Administrador Principal',
      role: 'admin'
    },
    {
      email: 'empleado@tienda.com',
      password: 'emp123', 
      name: 'Empleado de Tienda',
      role: 'employee'
    }
  ];

  const results = [];

  for (const userData of demoUsers) {
    try {
      console.log(`Creating user: ${userData.email}`);
      
      // First, try to delete existing user if it exists
      try {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === userData.email);
        
        if (existingUser) {
          console.log(`Deleting existing user: ${userData.email}`);
          await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
          await kv.del(`user:${existingUser.id}`);
        }
      } catch (deleteError) {
        console.warn(`Could not delete existing user ${userData.email}:`, deleteError.message);
      }

      // Create new user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: { name: userData.name, role: userData.role },
        email_confirm: true
      });

      if (authError) {
        console.error(`Auth error for ${userData.email}:`, authError);
        results.push({
          email: userData.email,
          success: false,
          error: authError.message
        });
        continue;
      }

      if (!authData?.user?.id) {
        console.error(`No user ID returned for ${userData.email}`);
        results.push({
          email: userData.email,
          success: false,
          error: 'No user ID returned'
        });
        continue;
      }

      // Store in KV
      const userRecord = {
        id: authData.user.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: null,
      };

      await kv.set(`user:${authData.user.id}`, userRecord);
      
      console.log(`Successfully created user: ${userData.email} with ID: ${authData.user.id}`);
      results.push({
        email: userData.email,
        success: true,
        id: authData.user.id
      });

    } catch (error) {
      console.error(`Failed to create user ${userData.email}:`, error);
      results.push({
        email: userData.email,
        success: false,
        error: error.message
      });
    }
  }

  console.log('=== DEMO USERS CREATION COMPLETE ===');
  console.log('Results:', results);
  
  return results;
}

// Health check (no auth required)
app.get('/make-server-81f57c18/health', async (c) => {
  try {
    // Test KV store connectivity
    const testKey = 'health_check';
    const testValue = { timestamp: new Date().toISOString() };
    await kv.set(testKey, testValue);
    const retrieved = await kv.get(testKey);
    await kv.del(testKey);

    // Check demo users
    const kvUsers = await kv.getByPrefix('user:');
    const demoUsersExist = kvUsers.some(u => u.email === 'admin@tienda.com') && 
                           kvUsers.some(u => u.email === 'empleado@tienda.com');

    return c.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: !!Deno.env.get('SUPABASE_URL'),
        serviceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        anonKey: !!Deno.env.get('SUPABASE_ANON_KEY')
      },
      kvStore: {
        working: !!retrieved,
        testPassed: retrieved && retrieved.timestamp === testValue.timestamp
      },
      demoUsers: {
        exist: demoUsersExist,
        count: kvUsers.length,
        emails: kvUsers.map(u => u.email)
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return c.json({ 
      status: 'error', 
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Force create demo users endpoint
app.post('/make-server-81f57c18/force-create-demo-users', async (c) => {
  try {
    console.log('Force create demo users endpoint called');
    const results = await forceCreateDemoUsers();
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    return c.json({
      message: `Force creation complete. Success: ${successful.length}, Failed: ${failed.length}`,
      results,
      successful: successful.length,
      failed: failed.length
    });
  } catch (error) {
    console.error('Error in force-create-demo-users:', error);
    return c.json({ 
      error: 'Failed to force create demo users: ' + error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Regular create demo users endpoint (less aggressive)
app.post('/make-server-81f57c18/create-demo-users', async (c) => {
  try {
    console.log('Creating/ensuring demo users...');
    
    // Check existing users first
    const kvUsers = await kv.getByPrefix('user:');
    const adminExists = kvUsers.some(u => u.email === 'admin@tienda.com');
    const empExists = kvUsers.some(u => u.email === 'empleado@tienda.com');
    
    if (adminExists && empExists) {
      return c.json({
        message: 'Demo users already exist',
        created: 0,
        existing: 2,
        users: kvUsers.filter(u => u.email.includes('@tienda.com')).map(u => ({
          email: u.email,
          role: u.role
        }))
      });
    }
    
    // Force create if any are missing
    console.log('Some demo users missing, force creating...');
    const results = await forceCreateDemoUsers();
    
    const successful = results.filter(r => r.success);
    
    return c.json({
      message: `Demo users created. Success: ${successful.length}`,
      created: successful.length,
      existing: kvUsers.length,
      results
    });
  } catch (error) {
    console.error('Error creating demo users:', error);
    return c.json({ 
      error: 'Failed to create demo users: ' + error.message 
    }, 500);
  }
});

// Get categories (no auth required for basic functionality)
app.get('/make-server-81f57c18/categories', async (c) => {
  try {
    console.log('Fetching categories...');
    const categories = await kv.getByPrefix('category:');
    
    // If no categories exist, return default ones
    if (categories.length === 0) {
      console.log('No categories found, creating defaults...');
      const defaultCategories = [
        { id: '1', name: 'Bebidas', color: '#3B82F6' },
        { id: '2', name: 'Snacks', color: '#EF4444' },
        { id: '3', name: 'Dulces', color: '#F59E0B' },
        { id: '4', name: 'Higiene', color: '#10B981' },
        { id: '5', name: 'Limpieza', color: '#8B5CF6' },
      ];
      
      // Save default categories
      for (const category of defaultCategories) {
        await kv.set(`category:${category.id}`, category);
      }
      
      console.log('Default categories created');
      return c.json({ categories: defaultCategories });
    }
    
    console.log(`Found ${categories.length} categories`);
    return c.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({ error: 'Failed to fetch categories: ' + error.message }, 500);
  }
});

// Get products (no auth required for basic functionality)
app.get('/make-server-81f57c18/products', async (c) => {
  try {
    console.log('Fetching products...');
    const products = await kv.getByPrefix('product:');
    console.log(`Found ${products.length} products`);
    return c.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return c.json({ error: 'Failed to fetch products: ' + error.message }, 500);
  }
});

// Initialize with sample data if needed (no auth required initially)
app.post('/make-server-81f57c18/init-sample-data', async (c) => {
  try {
    console.log('Starting sample data initialization...');
    
    // Create sample products (with Bolivian prices)
    const sampleProducts = [
      {
        id: '1',
        name: 'Coca Cola 600ml',
        category: 'Bebidas',
        price: 5.00,
        stock: 24,
        minStock: 5,
        description: 'Bebida gaseosa sabor cola',
        createdAt: new Date('2024-01-15').toISOString(),
        updatedAt: new Date('2024-01-15').toISOString(),
      },
      {
        id: '2',
        name: 'Papas Fritas Pequeñas',
        category: 'Snacks',
        price: 3.50,
        stock: 15,
        minStock: 10,
        description: 'Papas fritas sabor natural',
        createdAt: new Date('2024-01-16').toISOString(),
        updatedAt: new Date('2024-01-16').toISOString(),
      },
      {
        id: '3',
        name: 'Chocolate Sublime',
        category: 'Dulces',
        price: 4.50,
        stock: 8,
        minStock: 5,
        description: 'Chocolate con maní boliviano',
        createdAt: new Date('2024-01-17').toISOString(),
        updatedAt: new Date('2024-01-17').toISOString(),
      },
      {
        id: '4',
        name: 'Jabón Bolivar',
        category: 'Higiene',
        price: 2.50,
        stock: 3,
        minStock: 5,
        description: 'Jabón de tocador boliviano',
        createdAt: new Date('2024-01-18').toISOString(),
        updatedAt: new Date('2024-01-18').toISOString(),
      },
      {
        id: '5',
        name: 'Detergente Ace',
        category: 'Limpieza',
        price: 15.00,
        stock: 12,
        minStock: 3,
        description: 'Detergente en polvo 1kg',
        createdAt: new Date('2024-01-19').toISOString(),
        updatedAt: new Date('2024-01-19').toISOString(),
      },
    ];
    
    // Check if products already exist
    const existingProducts = await kv.getByPrefix('product:');
    let productsCreated = 0;
    
    if (existingProducts.length === 0) {
      // Save sample products
      for (const product of sampleProducts) {
        await kv.set(`product:${product.id}`, product);
        productsCreated++;
      }
      console.log(`Created ${productsCreated} sample products`);
    } else {
      console.log(`Found ${existingProducts.length} existing products, skipping initialization`);
    }
    
    return c.json({ 
      message: 'Sample products initialized successfully', 
      products: productsCreated || existingProducts.length,
      existing: existingProducts.length > 0
    });
  } catch (error) {
    console.error('Error initializing sample data:', error);
    return c.json({ error: 'Failed to initialize sample data: ' + error.message }, 500);
  }
});

// Debug endpoint to check demo users
app.get('/make-server-81f57c18/debug/users', async (c) => {
  try {
    console.log('Debugging users...');
    
    // Get users from KV store
    const kvUsers = await kv.getByPrefix('user:');
    console.log('KV Store users:', kvUsers.length);
    
    // Check Supabase Auth users
    let authUsersInfo = [];
    
    try {
      const { data: adminUsersResponse, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) {
        console.error('Error listing auth users:', error);
        authUsersInfo.push({ error: error.message });
      } else {
        console.log('Total users in Supabase Auth:', adminUsersResponse.users.length);
        
        const adminUser = adminUsersResponse.users.find(u => u.email === 'admin@tienda.com');
        const empUser = adminUsersResponse.users.find(u => u.email === 'empleado@tienda.com');
        
        authUsersInfo.push({
          email: 'admin@tienda.com',
          exists: !!adminUser,
          id: adminUser?.id || null,
          confirmed: adminUser?.email_confirmed_at || null
        });
        
        authUsersInfo.push({
          email: 'empleado@tienda.com',
          exists: !!empUser,
          id: empUser?.id || null,
          confirmed: empUser?.email_confirmed_at || null
        });
      }
    } catch (error) {
      console.error('Error listing auth users:', error);
      authUsersInfo.push({ error: error.message });
    }
    
    return c.json({
      kvUsers: kvUsers.length,
      kvUserEmails: kvUsers.map(u => ({ email: u.email, role: u.role, id: u.id })),
      authUsers: authUsersInfo,
      timestamp: new Date().toISOString(),
      recommendation: kvUsers.length === 0 ? 'Use /force-create-demo-users endpoint' : 'Users exist'
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Auth Routes
app.post('/make-server-81f57c18/auth/register', async (c) => {
  try {
    const { email, password, name, role = 'employee' } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Missing required fields: email, password, name' }, 400);
    }

    console.log(`Registering user: ${email} with role: ${role}`);

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      email_confirm: true // Automatically confirm since email server isn't configured
    });

    if (authError) {
      console.error('Auth error:', authError);
      return c.json({ error: 'Error creating user: ' + authError.message }, 400);
    }

    // Store user data in KV store
    const userData = {
      id: authData.user.id,
      email,
      name,
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
    };

    await kv.set(`user:${authData.user.id}`, userData);
    console.log(`User stored in KV: ${email}`);

    // Sign in the user to get access token
    const { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Sign in error after registration:', signInError);
      return c.json({ error: 'User created but sign in failed: ' + signInError.message }, 400);
    }

    return c.json({
      user: userData,
      accessToken: sessionData.session?.access_token,
    }, 201);
  } catch (error) {
    console.error('Error registering user:', error);
    return c.json({ error: 'Failed to register user: ' + error.message }, 500);
  }
});

app.post('/make-server-81f57c18/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Missing email or password' }, 400);
    }

    console.log(`Login attempt for: ${email}`);

    // Check if demo users exist and create them if needed
    if (email === 'admin@tienda.com' || email === 'empleado@tienda.com') {
      console.log('Demo user login detected');
      
      // Check if users exist
      const kvUsers = await kv.getByPrefix('user:');
      const userExists = kvUsers.some(u => u.email === email);
      
      if (!userExists) {
        console.log('Demo user not found, creating demo users...');
        await forceCreateDemoUsers();
        
        // Small delay to ensure creation is complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Sign in with Supabase
    const { data: sessionData, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase auth error:', error);
      return c.json({ 
        error: 'Credenciales inválidas. Los usuarios de demostración pueden no estar configurados correctamente.',
        details: error.message 
      }, 401);
    }

    console.log(`Supabase auth successful for: ${email}, user ID: ${sessionData.user.id}`);

    // Get user data from KV store
    const userData = await kv.get(`user:${sessionData.user.id}`);
    if (!userData) {
      console.error(`User data not found in KV for ID: ${sessionData.user.id}`);
      return c.json({ error: 'User data not found in system' }, 404);
    }

    console.log(`User data found: ${userData.email}, role: ${userData.role}`);

    // Update last login
    const updatedUserData = {
      ...userData,
      lastLogin: new Date().toISOString(),
    };
    await kv.set(`user:${sessionData.user.id}`, updatedUserData);

    return c.json({
      user: updatedUserData,
      accessToken: sessionData.session?.access_token,
    });
  } catch (error) {
    console.error('Error during login:', error);
    return c.json({ error: 'Failed to login: ' + error.message }, 500);
  }
});

app.get('/make-server-81f57c18/auth/verify', async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    // Get user data from KV store
    const userData = await kv.get(`user:${user.id}`);
    if (!userData) {
      return c.json({ error: 'User data not found' }, 404);
    }

    return c.json({ user: userData });
  } catch (error) {
    console.error('Error verifying token:', error);
    return c.json({ error: 'Failed to verify token: ' + error.message }, 500);
  }
});

// PROTECTED ROUTES - Require authentication

// Get single product (protected)
app.get('/make-server-81f57c18/products/:id', async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const id = c.req.param('id');
    const product = await kv.get(`product:${id}`);
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    return c.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return c.json({ error: 'Failed to fetch product: ' + error.message }, 500);
  }
});

// Create new product (protected)
app.post('/make-server-81f57c18/products', async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const productData = await c.req.json();
    
    // Validate required fields
    if (!productData.name || !productData.category || productData.price == null) {
      return c.json({ error: 'Missing required fields: name, category, price' }, 400);
    }
    
    const id = Date.now().toString();
    const product = {
      id,
      ...productData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`product:${id}`, product);
    
    return c.json({ product }, 201);
  } catch (error) {
    console.error('Error creating product:', error);
    return c.json({ error: 'Failed to create product: ' + error.message }, 500);
  }
});

// Update product (protected)
app.put('/make-server-81f57c18/products/:id', async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const existingProduct = await kv.get(`product:${id}`);
    if (!existingProduct) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    const updatedProduct = {
      ...existingProduct,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`product:${id}`, updatedProduct);
    
    return c.json({ product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    return c.json({ error: 'Failed to update product: ' + error.message }, 500);
  }
});

// Delete product (protected)
app.delete('/make-server-81f57c18/products/:id', async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const id = c.req.param('id');
    
    const existingProduct = await kv.get(`product:${id}`);
    if (!existingProduct) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    await kv.del(`product:${id}`);
    
    return c.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return c.json({ error: 'Failed to delete product: ' + error.message }, 500);
  }
});

// Update product stock (protected)
app.patch('/make-server-81f57c18/products/:id/stock', async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const id = c.req.param('id');
    const { quantity } = await c.req.json();
    
    if (typeof quantity !== 'number') {
      return c.json({ error: 'Invalid quantity value' }, 400);
    }
    
    const existingProduct = await kv.get(`product:${id}`);
    if (!existingProduct) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    const newStock = Math.max(0, existingProduct.stock + quantity);
    const updatedProduct = {
      ...existingProduct,
      stock: newStock,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`product:${id}`, updatedProduct);
    
    return c.json({ product: updatedProduct });
  } catch (error) {
    console.error('Error updating product stock:', error);
    return c.json({ error: 'Failed to update product stock: ' + error.message }, 500);
  }
});

// ============ STOCK MOVEMENTS ROUTES ============

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

// ============ USER MANAGEMENT ROUTES ============

// User management routes (admin only)
app.get('/make-server-81f57c18/users', async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const userData = await kv.get(`user:${user.id}`);
    if (!userData || userData.role !== 'admin') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const users = await kv.getByPrefix('user:');
    return c.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users: ' + error.message }, 500);
  }
});

app.post('/make-server-81f57c18/users', async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const adminData = await kv.get(`user:${user.id}`);
    if (!adminData || adminData.role !== 'admin') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const { email, password, name, role = 'employee' } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      email_confirm: true
    });

    if (authError) {
      return c.json({ error: 'Error creating user: ' + authError.message }, 400);
    }

    // Store user data in KV store
    const userData = {
      id: authData.user.id,
      email,
      name,
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
    };

    await kv.set(`user:${authData.user.id}`, userData);

    return c.json({ user: userData }, 201);
  } catch (error) {
    console.error('Error creating user:', error);
    return c.json({ error: 'Failed to create user: ' + error.message }, 500);
  }
});

app.put('/make-server-81f57c18/users/:id', async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const adminData = await kv.get(`user:${user.id}`);
    if (!adminData || adminData.role !== 'admin') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const userId = c.req.param('id');
    const updates = await c.req.json();
    
    const existingUser = await kv.get(`user:${userId}`);
    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const updatedUser = {
      ...existingUser,
      ...updates,
      id: userId, // Ensure ID doesn't change
    };

    await kv.set(`user:${userId}`, updatedUser);

    return c.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ error: 'Failed to update user: ' + error.message }, 500);
  }
});

app.delete('/make-server-81f57c18/users/:id', async (c) => {
  try {
    const { user, error } = await verifyAuth(c);
    if (error) {
      return c.json({ error }, 401);
    }

    const adminData = await kv.get(`user:${user.id}`);
    if (!adminData || adminData.role !== 'admin') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const userId = c.req.param('id');
    
    const existingUser = await kv.get(`user:${userId}`);
    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Delete from Supabase Auth
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (authError) {
      console.warn('Error deleting user from Supabase Auth:', authError);
      // Continue with KV deletion even if auth deletion fails
    }

    // Delete from KV store
    await kv.del(`user:${userId}`);

    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ error: 'Failed to delete user: ' + error.message }, 500);
  }
});

// Start the server
Deno.serve(app.fetch);