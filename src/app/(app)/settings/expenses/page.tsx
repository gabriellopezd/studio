
'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAppContext } from '@/app/_providers/AppContext';
import { updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PRESET_EXPENSE_CATEGORIES } from '@/lib/transaction-categories';

export default function ExpenseSettingsPage() {
  const { firestore, user, shoppingLists, shoppingListsLoading } = useAppContext();

  const handleToggleList = async (listId: string, currentStatus: boolean) => {
    if (!user || !firestore) return;
    const listRef = doc(firestore, 'users', user.uid, 'shoppingLists', listId);
    await updateDocumentNonBlocking(listRef, { isActive: !currentStatus });
  };
  
  const sortedLists = useMemo(() => {
    if (!shoppingLists) return [];
    return [...shoppingLists].sort((a, b) => a.name.localeCompare(b.name));
  }, [shoppingLists]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorías de Compra"
        description="Activa o desactiva las categorías para usarlas como listas de compra."
        imageId="settings-sub-header"
      >
        <Button variant="outline" asChild>
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Configuración
          </Link>
        </Button>
      </PageHeader>
      
      {shoppingListsLoading && <p>Cargando configuración...</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedLists.map((list: any) => (
          <Card key={list.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-4">
                <div>
                  <CardTitle className="text-lg">{list.name}</CardTitle>
                </div>
              </div>
              <Switch
                checked={!!list.isActive}
                onCheckedChange={() => handleToggleList(list.id, !!list.isActive)}
                aria-label={`Activar lista ${list.name}`}
              />
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
