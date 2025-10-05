

'use client';

import { useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useFinances } from '@/app/_providers/FinancesProvider';

export default function ExpenseSettingsPage() {
  const { firestore, user } = useFirebase();
  const { shoppingLists, shoppingListsLoading } = useFinances();

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

       {!shoppingListsLoading && sortedLists.length === 0 && (
         <Card className="mt-4 flex flex-col items-center justify-center p-10 text-center">
            <CardHeader>
                <CardTitle className="mt-4">No hay categorías de compra</CardTitle>
            </CardHeader>
        </Card>
      )}

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
    
