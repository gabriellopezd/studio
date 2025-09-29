'use client';

import Link from 'next/link';
import Image from 'next/image';
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
import { Logo } from '@/components/icons';
import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  signInWithEmailAndPassword,
  User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { PlaceHolderImages } from '@/lib/placeholder-images';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const loginImage = PlaceHolderImages.find((img) => img.id === 'login-background');

  const handleUserLogin = async (user: User) => {
    if (!user) return;
    const userRef = doc(firestore, 'users', user.uid);
    
    // Check if user document exists, if not create it (for users who signed up before this logic was added)
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
        const userProfileData = {
            displayName: user.displayName || user.email,
            email: user.email,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
        };
        await setDoc(userRef, userProfileData);
    } else {
        await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    }

    toast({
      title: 'Inicio de sesión exitoso',
      description: 'Redirigiendo al dashboard...',
    });
    router.push('/dashboard');
  };


  const handleLogin = async () => {
    if (!auth) return;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleUserLogin(userCredential.user);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de inicio de sesión',
        description:
          error.message || 'Ocurrió un error. Por favor intenta de nuevo.',
      });
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
             <div className="mb-4 flex justify-center">
              <Logo className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Bienvenido a Inngenia</h1>
            <p className="text-balance text-muted-foreground">
              Inicia sesión para continuar con tus metas.
            </p>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button onClick={handleLogin} type="submit" className="w-full">
              Iniciar sesión
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            ¿No tienes una cuenta?{" "}
            <Link href="/signup" className="underline">
              Regístrate
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        {loginImage && (
            <Image
                src={loginImage.imageUrl}
                alt={loginImage.description}
                data-ai-hint={loginImage.imageHint}
                width="1920"
                height="1080"
                className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
        )}
      </div>
    </div>
  );
}
