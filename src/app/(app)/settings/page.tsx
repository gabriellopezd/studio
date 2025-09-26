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
import { Upload } from 'lucide-react';
import { useFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
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

export default function SettingsPage() {
  const { firestore, auth } = useFirebase();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar-1');
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
    if (!user) return;
    try {
      await updateProfile(user, { displayName });
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDocumentNonBlocking(userDocRef, { displayName });
      toast({ title: 'Perfil actualizado' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al actualizar perfil', description: error.message });
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Las contraseñas no coinciden' });
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast({ title: 'Contraseña cambiada exitosamente' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al cambiar contraseña', description: error.message });
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="CONFIGURACIÓN"
        description="Gestiona tu perfil, cuenta y preferencias."
      />

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 flex flex-col gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Información de Usuario</CardTitle>
              <CardDescription>
                Actualiza tu información de perfil.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
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
                <Button variant="outline" size="sm">
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
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Cuenta</CardTitle>
              <CardDescription>Gestiona tu contraseña.</CardDescription>
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

          <Card>
            <CardHeader>
              <CardTitle>Preferencias</CardTitle>
              <CardDescription>
                Personaliza tu experiencia en la aplicación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="theme-select">Tema</Label>
                  <p className="text-sm text-muted-foreground">
                    Elige cómo quieres que se vea la aplicación.
                  </p>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-[180px]" id="theme-select">
                    <SelectValue placeholder="Seleccionar tema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Oscuro</SelectItem>
                    <SelectItem value="system">Automático</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="notifications">Notificaciones Push</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibe recordatorios de tus hábitos y tareas.
                  </p>
                </div>
                <Switch id="notifications" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
