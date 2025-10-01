
'use client';

import PageHeader from '@/components/page-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Upload, RotateCcw, TimerOff, Trash2, Library, Repeat, ShoppingCart, ChevronRight, User as UserIcon, Lock, Palette, Bell } from 'lucide-react';
import { useFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { useState, useEffect } from 'react';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/theme-provider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAppContext } from '@/app/_providers/AppContext';
import Link from 'next/link';
import { doc } from 'firebase/firestore';

export default function SettingsPage() {
  const { user } = useUser();
  const { auth, firestore } = useFirebase();
  const { theme, setTheme } = useTheme();
  const { handleResetAllStreaks, handleResetTimeLogs, handleResetMoods, handleResetCategories } = useAppContext();
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'default-user-avatar');
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!user || !auth || !auth.currentUser) return;
    try {
      await updateProfile(auth.currentUser!, { displayName });
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDocumentNonBlocking(userDocRef, { displayName });
      toast({ title: 'Perfil actualizado' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al actualizar perfil', description: error.message });
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email || !auth || !auth.currentUser) return;
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Las contraseñas no coinciden' });
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser!, credential);
      await updatePassword(auth.currentUser!, newPassword);
      toast({ title: 'Contraseña cambiada exitosamente' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al cambiar contraseña', description: error.message });
    }
  };
  
  const settingsCards = [
    { 
        href: '/settings/habits', 
        icon: Repeat, 
        title: 'Biblioteca de Hábitos', 
        description: 'Activa o desactiva hábitos para tu día a día.' 
    },
    { 
        href: '/settings/expenses', 
        icon: ShoppingCart, 
        title: 'Categorías de Compras', 
        description: 'Gestiona qué categorías aparecen como listas de compra.' 
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="CONFIGURACIÓN"
        description="Gestiona tu perfil, cuenta y preferencias de la aplicación."
        imageId="settings-header"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna Izquierda - Perfil y Cuenta */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <UserIcon className="size-6 text-primary"/>
                <div>
                    <CardTitle>Perfil de Usuario</CardTitle>
                    <CardDescription>Actualiza tu información personal.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Avatar className="h-20 w-20">
                   {user?.photoURL ? (
                    <AvatarImage src={user.photoURL} alt={displayName} />
                  ) : userAvatar ? (
                    <AvatarImage
                      src={userAvatar.imageUrl}
                      alt={userAvatar.description}
                      data-ai-hint={userAvatar.imageHint}
                    />
                  ) : null }
                  <AvatarFallback>{displayName.charAt(0) || user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Cambiar Foto
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Nombre</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={user?.email || ''}
                  disabled
                />
              </div>
              <Button onClick={handleProfileUpdate}>Guardar Cambios</Button>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <Lock className="size-6 text-primary"/>
              <div>
                <CardTitle>Seguridad</CardTitle>
                <CardDescription>Gestiona tu contraseña.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Contraseña Actual</Label>
                <Input id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirmar Nueva Contraseña
                </Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}/>
              </div>
              <Button onClick={handleChangePassword}>Cambiar Contraseña</Button>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha - Paneles de Configuración */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <Palette className="size-6 text-primary"/>
              <div>
                <CardTitle>Preferencias</CardTitle>
                <CardDescription>Personaliza la apariencia y notificaciones.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4 gap-4">
                <div>
                  <h4 className="font-medium">Tema de la Aplicación</h4>
                  <p className="text-sm text-muted-foreground">
                    Elige cómo quieres que se vea la aplicación.
                  </p>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-full sm:w-[180px]" id="theme-select">
                    <SelectValue placeholder="Seleccionar tema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Oscuro</SelectItem>
                    <SelectItem value="system">Automático</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4 gap-4">
                 <div>
                  <h4 className="font-medium">Notificaciones Push</h4>
                  <p className="text-sm text-muted-foreground">
                    Recibe recordatorios de tus hábitos y tareas.
                  </p>
                </div>
                <Switch id="notifications" defaultChecked />
              </div>
            </CardContent>
          </Card>
          
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {settingsCards.map((card) => (
                <Link href={card.href} key={card.href} className="block hover:bg-muted/50 rounded-lg border">
                    <Card className="h-full shadow-none border-none bg-transparent">
                        <CardHeader className="flex flex-row items-center justify-between">
                             <div className="flex items-center gap-4">
                                <card.icon className="size-6 text-primary"/>
                                <div>
                                    <CardTitle className="text-base">{card.title}</CardTitle>
                                    <CardDescription className="text-xs">{card.description}</CardDescription>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground"/>
                        </CardHeader>
                    </Card>
                </Link>
            ))}
           </div>
          
           <Card className="border-destructive/50">
            <CardHeader className="flex flex-row items-center gap-4 text-destructive">
                <Trash2 className="size-6"/>
                <div>
                    <CardTitle>Zona Peligrosa</CardTitle>
                    <CardDescription className="text-destructive/80">
                        Acciones permanentes que reinician partes de tus datos.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left h-auto py-2">
                    <div className="flex items-center gap-3">
                        <RotateCcw className="size-5 text-destructive"/>
                        <div>
                            <p className="font-semibold">Rachas de Hábitos</p>
                            <p className="text-xs text-muted-foreground">Reinicia todas las rachas a cero.</p>
                        </div>
                    </div>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Restablecer todas las rachas?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Se reiniciarán las rachas
                      y récords de **todos** tus hábitos a cero.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetAllStreaks}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Sí, reiniciar todo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
               <AlertDialog>
                <AlertDialogTrigger asChild>
                   <Button variant="outline" className="w-full justify-start text-left h-auto py-2">
                    <div className="flex items-center gap-3">
                        <TimerOff className="size-5 text-destructive"/>
                        <div>
                            <p className="font-semibold">Tiempo de Enfoque</p>
                            <p className="text-xs text-muted-foreground">Elimina todos los registros de tiempo.</p>
                        </div>
                    </div>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Restablecer tiempo de enfoque?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Se eliminarán permanentemente
                      todos los registros de tiempo de tus sesiones de enfoque.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetTimeLogs}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Sí, eliminar registros
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left h-auto py-2">
                    <div className="flex items-center gap-3">
                        <Trash2 className="size-5 text-destructive"/>
                        <div>
                            <p className="font-semibold">Historial de Ánimo</p>
                            <p className="text-xs text-muted-foreground">Borra todos los registros de ánimo.</p>
                        </div>
                    </div>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Restablecer historial de ánimo?</AlertDialogTitle>
                    <AlertDialogDescription>
                       Esta acción no se puede deshacer. Se eliminarán permanentemente
                       todos tus registros de estado de ánimo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetMoods}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Sí, eliminar historial
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left h-auto py-2">
                    <div className="flex items-center gap-3">
                        <Library className="size-5 text-destructive"/>
                        <div>
                            <p className="font-semibold">Restaurar Categorías</p>
                            <p className="text-xs text-muted-foreground">Vuelve a las categorías financieras iniciales.</p>
                        </div>
                    </div>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Restaurar categorías financieras?</AlertDialogTitle>
                    <AlertDialogDescription>
                       Esta acción no se puede deshacer. Se eliminarán **todas** tus listas de compra y presupuestos actuales, y se restaurarán las categorías predefinidas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetCategories}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Sí, restaurar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
