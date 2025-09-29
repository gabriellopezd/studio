'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bell,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  Repeat,
  Settings,
  Smile,
  Target,
  SquareCheckBig,
  LogOut,
  Sun,
  Timer,
  X,
  ShoppingCart,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Logo } from '@/components/icons';
import { useUser, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { AppProvider, useAppContext } from '@/app/_providers/AppContext';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/today', label: 'Mi Día', icon: Sun },
  { href: '/habits', label: 'Hábitos', icon: Repeat },
  { href: '/routines', label: 'Rutinas', icon: ClipboardList },
  { href: '/tasks', label: 'Tareas', icon: SquareCheckBig },
  { href: '/goals', label: 'Metas', icon: Target },
  { href: '/mood-tracker', label: 'Ánimo', icon: Smile },
  { href: '/finances', label: 'Mis Finanzas', icon: CircleDollarSign },
  { href: '/expenses', label: 'Listas de Compra', icon: ShoppingCart },
];


function TimerDisplay() {
    const { activeSession, elapsedTime, stopSession } = useAppContext();

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    if (!activeSession) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="flex items-center gap-4 rounded-lg bg-primary p-4 text-primary-foreground shadow-lg">
                <Timer className="h-6 w-6 animate-pulse" />
                <div className="flex-1">
                    <p className="text-sm font-medium">{activeSession.name}</p>
                    <p className="font-mono text-lg font-bold">{formatTime(elapsedTime)}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/80" onClick={stopSession}>
                    <X className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const userAvatar = PlaceHolderImages.find(
    (img) => img.id === 'user-avatar-1'
  );

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSignOut = () => {
    if (auth) {
      auth.signOut();
      router.push('/login');
    }
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }
  
    return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="size-8 text-primary" />
            <span className="text-lg font-semibold text-sidebar-foreground">
              Inngenia
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} className="w-full">
                  <SidebarMenuButton tooltip={item.label}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <Link href="/settings">
            <SidebarMenuButton tooltip="Configuración">
              <Settings />
              <span>Configuración</span>
            </SidebarMenuButton>
          </Link>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <SidebarTrigger className="sm:hidden" />
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Toggle notifications</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar>
                    {user.photoURL ? (
                      <AvatarImage src={user.photoURL} alt={user.displayName || 'User Avatar'} />
                    ) : userAvatar ? (
                      <AvatarImage
                        src={userAvatar.imageUrl}
                        alt={userAvatar.description}
                        data-ai-hint={userAvatar.imageHint}
                      />
                    ) : null }
                    <AvatarFallback>
                      {user.displayName
                        ? user.displayName.charAt(0)
                        : user.email
                        ? user.email.charAt(0).toUpperCase()
                        : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.displayName || user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">Configuración</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Soporte</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
        </main>
        <TimerDisplay />
      </SidebarInset>
    </SidebarProvider>
    )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppProvider>
            <AppLayoutContent>{children}</AppLayoutContent>
        </AppProvider>
    )
}
