
'use client';

import { useMemo, useState } from 'react';
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
import { ArrowLeft, Trash2, Pencil } from 'lucide-react';
import { useFinances } from '@/app/_providers/FinancesProvider';
import { useUI } from '@/app/_providers/UIProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: new Date(0, i).toLocaleString('es-ES', { month: 'long' }) }));

export default function FinanceSettingsPage() {
  const { 
    shoppingLists, 
    shoppingListsLoading, 
    expenseCategories,
    handleToggleShoppingList,
    handleUpdateList,
    handleDeleteList,
  } = useFinances();

  const { modalState, handleOpenModal, handleCloseModal, formState, setFormState } = useUI();
  
  const onListDelete = () => {
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
            activeMonths: list?.activeMonths,
        };
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [expenseCategories, shoppingLists]);
  
  const handleSaveChanges = () => {
    handleUpdateList();
    handleCloseModal('editList');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorías de Gastos Variables"
        description="Gestiona tus categorías de gastos y define en qué meses estarán activas para una mejor planificación."
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
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenModal('editList', cat)}>
                    <Pencil className="h-4 w-4" />
                </Button>
                {cat.isDeletable && (
                   <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleOpenModal('deleteList', cat)}>
                      <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
      
      <AlertDialog open={modalState.type === 'deleteList'} onOpenChange={() => handleCloseModal('deleteList')}>
        <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta acción no se puede deshacer. Se desactivará la categoría "{formState.name}" y no será visible en la página de planificación.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
            onClick={onListDelete}
            className="bg-destructive hover:bg-destructive/90"
            >
            Desactivar
            </AlertDialogAction>
        </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <Dialog open={modalState.type === 'editList'} onOpenChange={() => handleCloseModal('editList')}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Editar Categoría: {formState.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="category-name">Nombre</Label>
                    <Input id="category-name" value={formState.name || ''} onChange={(e) => setFormState((p:any) => ({ ...p, name: e.target.value }))} />
                </div>
                 <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Meses Activos</Label>
                        <Switch
                            checked={formState.isActive}
                            onCheckedChange={(checked) => handleToggleShoppingList(formState.name, !checked)}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-2 rounded-md border p-4">
                        {months.map(month => (
                            <div key={month.value} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`month-${month.value}`}
                                    checked={(formState.activeMonths || []).includes(month.value)}
                                    onCheckedChange={(checked) => {
                                        const currentMonths = formState.activeMonths || [];
                                        const newMonths = checked
                                            ? [...currentMonths, month.value]
                                            : currentMonths.filter((m: number) => m !== month.value);
                                        setFormState((prev: any) => ({ ...prev, activeMonths: newMonths.sort((a:number,b:number) => a-b) }));
                                    }}
                                />
                                <label htmlFor={`month-${month.value}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {month.label}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleSaveChanges}>Guardar Cambios</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
