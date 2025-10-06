
'use client';

import { useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useFinances } from '@/app/_providers/FinancesProvider';
import { useUI } from '@/app/_providers/UIProvider';

export default function FinanceSettingsPage() {
  const { 
    shoppingLists, 
    shoppingListsLoading, 
    expenseCategories,
    handleToggleShoppingList,
    handleDeleteList,
  } = useFinances();

  const { modalState, handleOpenModal, handleCloseModal } = useUI();
  
  const onDelete = () => {
    if (!modalState.data?.id) return;
    handleDeleteList(modalState.data.id);
  };

  const categoryStates = useMemo(() => {
    const listsMap = new Map(shoppingLists?.map(l => [l.name, l]));
    return expenseCategories.map(name => {
        const list = listsMap.get(name);
        return {
            id: list?.id || name, // Use name as a fallback key
            name: name,
            isActive: list ? list.isActive : false, // Default to inactive if no list exists
            isDeletable: !!list, // Can only delete if it exists as a shoppingList doc
        };
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [expenseCategories, shoppingLists]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorías de Gastos Variables"
        description="Activa o desactiva las categorías que usas para tus listas de compra."
        imageId="settings-sub-header"
      >
        <Button variant="outline" asChild>
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Configuración
          </Link>
        </Button>
      </PageHeader>

      {shoppingListsLoading && <p>Cargando categorías...</p>}

      {!shoppingListsLoading && categoryStates.length === 0 && (
         <Card className="mt-4 flex flex-col items-center justify-center p-10 text-center">
            <CardHeader>
                <CardTitle className="mt-4">No hay categorías de gastos</CardTitle>
                <CardDescription>
                    Crea tu primera categoría desde la página de Planificación Financiera.
                </CardDescription>
            </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categoryStates.map((cat: any) => (
          <Card key={cat.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{cat.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!cat.isActive}
                  onCheckedChange={() =>
                    handleToggleShoppingList(cat.name, !!cat.isActive)
                  }
                  aria-label={`Activar categoría ${cat.name}`}
                />
                {cat.isDeletable && (
                  <AlertDialog open={modalState.type === 'deleteList' && modalState.data?.id === cat.id} onOpenChange={(open) => !open && handleCloseModal('deleteList')}>
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleOpenModal('deleteList', cat)}>
                          <Trash2 className="h-4 w-4" />
                      </Button>
                      <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará la categoría "{cat.name}" permanentemente. Las transacciones asociadas no se borrarán.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                          onClick={onDelete}
                          className="bg-destructive hover:bg-destructive/90"
                          >
                          Eliminar
                          </AlertDialogAction>
                      </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
