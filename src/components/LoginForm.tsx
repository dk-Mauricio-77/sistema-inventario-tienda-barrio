import { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Eye, EyeOff, Loader2, ShoppingCart, AlertCircle, CheckCircle, Wrench } from "lucide-react";
import { LoginCredentials, RegisterData, UserRole } from "../types/auth";
import { InventoryService } from "../services/inventoryService";

interface LoginFormProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  onRegister: (userData: RegisterData) => Promise<void>;
  isLoading: boolean;
}

export function LoginForm({ onLogin, onRegister, isLoading }: LoginFormProps) {
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [initializingData, setInitializingData] = useState(false);
  const [forceCreating, setForceCreating] = useState(false);

  // ...existing code...
  const [loginData, setLoginData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });

  // ...existing code...
  const [registerData, setRegisterData] = useState<RegisterData>({
    email: '',
    password: '',
    name: '',
    role: 'employee',
  });

  // ...existing code...
  useEffect(() => {
    initializeSampleData();
  }, []);

  const initializeSampleData = async () => {
    try {
      setInitializingData(true);
      setError(null);
      
  // ...existing code...
      await InventoryService.initSampleData();
  // ...existing code...
      
    } catch (error) {
      console.error('Error initializing sample data:', error);
  // ...existing code...
    } finally {
      setInitializingData(false);
    }
  };

  const forceCreateDemoUsers = async () => {
    try {
      setForceCreating(true);
      setError(null);
      setSuccess(null);
      
  // ...existing code...
      const result = await InventoryService.forceCreateDemoUsers();
      
  // ...existing code...
      
      if (result.successful && result.successful > 0) {
        setSuccess(`Se crearon forzadamente ${result.successful} usuarios de demostración.`);
        
  // ...existing code...
        setTimeout(() => {
          setSuccess('Usuarios creados. Intenta iniciar sesión nuevamente.');
        }, 2000);
      } else {
        setError('No se pudieron crear los usuarios de demostración.');
      }
      
    } catch (error) {
      console.error('Error force creating demo users:', error);
      setError('Error al crear usuarios forzadamente: ' + error.message);
    } finally {
      setForceCreating(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!loginData.email || !loginData.password) {
  setError('Por favor completa todos los campos'); // ...existing code...
      return;
    }

    try {
      await onLogin(loginData);
    } catch (err) {
      console.error('Login error details:', err);
      let errorMessage = 'Error al iniciar sesión';
      let showForceCreateButton = false;
      
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials') || 
            err.message.includes('Invalid credentials') ||
            err.message.includes('Credenciales inválidas')) {
          
          // ...existing code...
          if (loginData.email === 'admin@tienda.com' || loginData.email === 'empleado@tienda.com') {
            errorMessage = 'Credenciales incorrectas. Los usuarios de demostración pueden no estar configurados.';
            showForceCreateButton = true;
          } else {
            errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
          }
        } else if (err.message.includes('User data not found')) {
          errorMessage = 'Usuario no encontrado en el sistema.';
          showForceCreateButton = true;
        } else if (err.message.includes('Timeout') || err.message.includes('tiempo')) {
          errorMessage = 'El servidor está tardando en responder. Intenta nuevamente.';
        } else if (err.message.includes('conexión') || err.message.includes('Failed to fetch')) {
          errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      
  // ...existing code...
      if (showForceCreateButton && (loginData.email === 'admin@tienda.com' || loginData.email === 'empleado@tienda.com')) {
  // ...existing code...
        setTimeout(() => {
          forceCreateDemoUsers();
        }, 2000);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!registerData.email || !registerData.password || !registerData.name) {
  setError('Por favor completa todos los campos'); // ...existing code...
      return;
    }

    if (registerData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await onRegister(registerData);
      setSuccess('Usuario registrado exitosamente');
    } catch (err) {
      console.error('Register error details:', err);
      setError(err instanceof Error ? err.message : 'Error al registrar usuario');
    }
  };

  const isDemo = loginData.email === 'admin@tienda.com' || loginData.email === 'empleado@tienda.com';
  const shouldShowCreateButton = error && 
    (error.includes('Credenciales incorrectas') || error.includes('no encontrado')) && 
    isDemo;

  const isProcessing = isLoading || forceCreating;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <ShoppingCart className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Inventario</h1>
          <p className="text-gray-600 mt-2">para tienda de barrio</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-center">Acceso al Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
              </TabsList>

              {error && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mt-4 border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              {/* Force create button for demo users */}
              {shouldShowCreateButton && !forceCreating && (
                <div className="mt-4">
                  <Button
                    onClick={forceCreateDemoUsers}
                    disabled={isProcessing}
                    className="w-full"
                    variant="outline"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Reparar Usuarios de Demostración
                  </Button>
                </div>
              )}

              {/* Processing indicators */}
              {forceCreating && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Creando usuarios de demostración forzadamente...</span>
                  </div>
                </div>
              )}

              <TabsContent value="login" className="space-y-4 mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Correo Electrónico</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        disabled={isProcessing}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isProcessing}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isProcessing}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Iniciando sesión...
                      </>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nombre Completo</Label>
                    <Input
                      id="register-name"
                      type="text"
                      value={registerData.name}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Correo Electrónico</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        value={registerData.password}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        disabled={isProcessing}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isProcessing}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-role">Rol</Label>
                    <Select
                      value={registerData.role}
                      onValueChange={(value: UserRole) => setRegisterData(prev => ({ ...prev, role: value }))}
                      disabled={isProcessing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Empleado</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isProcessing}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Registrando...
                      </>
                    ) : (
                      'Crear Cuenta'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-4">
          {/* Status de inicialización */}
          {initializingData && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Inicializando datos de muestra...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}