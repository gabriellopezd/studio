
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
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
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  SidebarMenuSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator as DropdownSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Logo } from '@/components/icons';
import { useUser, useAuth } from '@/firebase';
import { AppProvider } from '@/app/_providers/AppProvider';

const navItems = {
  planning: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/today', label: 'Mi Día', icon: Sun },
  ],
  tracking: [
    { href: '/habits', label: 'Hábitos', icon: Repeat },
    { href: '/routines', label: 'Rutinas', icon: ClipboardList },
    { href: '/tasks', label: 'Tareas', icon: SquareCheckBig },
  ],
  growth: [
    { href: '/goals', label: 'Metas', icon: Target },
    { href: '/mood-tracker', label: 'Ánimo', icon: Smile },
  ],
  finance: [
    { href: '/finances', label: 'Mis Finanzas', icon: CircleDollarSign },
    { href: '/expenses', label: 'Listas de Compra', icon: ShoppingCart },
  ],
};


function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const userAvatar = PlaceHolderImages.find(
    (img) => img.id === 'default-user-avatar'
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
                <SidebarGroup>
                    <SidebarMenuSeparator>Planificación</SidebarMenuSeparator>
                    {navItems.planning.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <Link href={item.href} className="w-full">
                          <SidebarMenuButton tooltip={item.label} isActive={pathname === item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                    ))}
                </SidebarGroup>
                 <SidebarGroup>
                    <SidebarMenuSeparator>Seguimiento</SidebarMenuSeparator>
                    {navItems.tracking.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <Link href={item.href} className="w-full">
                          <SidebarMenuButton tooltip={item.label} isActive={pathname.startsWith(item.href)}>
                            <item.icon />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                    ))}
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarMenuSeparator>Crecimiento</SidebarMenuSeparator>
                    {navItems.growth.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <Link href={item.href} className="w-full">
                           <SidebarMenuButton tooltip={item.label} isActive={pathname.startsWith(item.href)}>
                            <item.icon />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                    ))}
                </SidebarGroup>
                 <SidebarGroup>
                    <SidebarMenuSeparator>Finanzas</SidebarMenuSeparator>
                    {navItems.finance.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <Link href={item.href} className="w-full">
                           <SidebarMenuButton tooltip={item.label} isActive={pathname.startsWith(item.href)}>
                            <item.icon />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                    ))}
                </SidebarGroup>
            </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <Link href="/settings">
            <SidebarMenuButton tooltip="Configuración" isActive={pathname.startsWith('/settings')}>
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
                <DropdownSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">Configuración</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Soporte</DropdownMenuItem>
                <DropdownSeparator />
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
