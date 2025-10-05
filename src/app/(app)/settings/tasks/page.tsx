
'use client';

import { useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  updateDocumentNonBlocking,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import Link from 'next/link';
import { ArrowLeft, PlusCircle, Trash2, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useFirebase } from '@/firebase';
import { useTasks } from '@/app/_providers/TasksProvider';
import { useUI } from '@/app/_providers/UIProvider';

export default function TaskSettingsPage() {
  const { firestore, user } = useFirebase();
  const { 
    taskCategories, 
    taskCategoriesLoading, 
    handleDeleteTaskCategory,
    handleSaveTaskCategory,
  } = useTasks();

  const {
    modalState,
    handleOpenModal,
    handleCloseModal,
    formState,
    setFormState,
  } = useUI();

  const handleToggleCategory = async (
    categoryId: string,
    currentStatus: boolean
  ) => {
    if (!user || !firestore) return;
    const categoryRef = doc(
      firestore,
      'users',
      user.uid,
      'taskCategories',
      categoryId
    );
    await updateDocumentNonBlocking(categoryRef, { isActive: !currentStatus });
  };

  const sortedCategories = useMemo(() => {
    if (!taskCategories) return [];
    return [...taskCategories].sort((a, b) => a.name.localeCompare(b.name));
  }, [taskCategories]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorías de Tareas"
        description="Gestiona las categorías para organizar tus tareas."
        imageId="settings-sub-header"
      >
        <div className="flex items-center gap-2">
            <Button onClick={() => handleOpenModal('taskCategory')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Categoría
            </Button>
            <Button variant="outline" asChild>
            <Link href="/settings">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
            </Link>
            </Button>
        </div>
      </PageHeader>

      {taskCategoriesLoading && <p>Cargando categorías...</p>}
      
      {!taskCategoriesLoading && sortedCategories.length === 0 && (
         <Card className="mt-4 flex flex-col items-center justify-center p-10 text-center">
            <CardHeader>
                <CardTitle className="mt-4">No hay categorías</CardTitle>
                <CardDescription>
                    Crea tu primera categoría para empezar a organizar tus tareas.
                </CardDescription>
            </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedCategories.map((cat: any) => (
          <Card key={cat.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{cat.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!cat.isActive}
                  onCheckedChange={() =>
                    handleToggleCategory(cat.id, !!cat.isActive)
                  }
                  aria-label={`Activar categoría ${cat.name}`}
                />
                 {cat.name !== 'Otro' && (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenModal('taskCategory', cat)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleOpenModal('deleteTaskCategory', cat)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará la categoría "{formState.name}" y todas las tareas existentes se moverán a la categoría "Otro".
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                            onClick={handleDeleteTaskCategory}
                            className="bg-destructive hover:bg-destructive/90"
                            >
                            Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
      
       <Dialog open={modalState.type === 'taskCategory'} onOpenChange={(open) => !open && handleCloseModal('taskCategory')}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>{formState.id ? 'Editar Categoría' : 'Crear Nueva Categoría'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="categoryName">Nombre de la categoría</Label>
                        <Input
                        id="categoryName"
                        value={formState.name || ''}
                        onChange={(e) => setFormState(p => ({...p, name: e.target.value}))}
                        placeholder="Ej: Universidad, Trabajo Secundario..."
                        />
                    </div>
                </div>
                <DialogFooter>
                 <DialogClose asChild><Button variant="outline" onClick={() => handleCloseModal('taskCategory')}>Cancelar</Button></DialogClose>
                    <Button
                    type="button"
                    onClick={handleSaveTaskCategory}
                    disabled={!formState.name || !formState.name.trim()}
                    >
                    {formState.id ? 'Guardar Cambios' : 'Crear Categoría'}
                    </Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>

    </div>
  );
}
