
'use client';

import { useState, useMemo, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAppContext } from '@/app/_providers/AppProvider';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import { ArrowLeft, PlusCircle, Trash2, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function TaskSettingsPage() {
  const { firestore, user, taskCategories, taskCategoriesLoading } = useAppContext();
  const { toast } = useToast();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any | null>(null);

  const [categoryName, setCategoryName] = useState('');
  const [budgetFocus, setBudgetFocus] = useState('Deseos');

  useEffect(() => {
    if (categoryToEdit) {
      setCategoryName(categoryToEdit.name);
      setBudgetFocus(categoryToEdit.budgetFocus || 'Deseos');
    } else {
      setCategoryName('');
      setBudgetFocus('Deseos');
    }
  }, [categoryToEdit]);

  const handleOpenDialog = (category?: any) => {
    setCategoryToEdit(category || null);
    setDialogOpen(true);
  };

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
  
  const handleSaveCategory = async () => {
    if (categoryToEdit) {
        await handleUpdateCategory();
    } else {
        await handleCreateCategory();
    }
    setDialogOpen(false);
  }

  const handleCreateCategory = async () => {
    if (!user || !firestore || !categoryName.trim()) return;

    const trimmedName = categoryName.trim();
    const categoryExists = taskCategories?.some(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (categoryExists) {
      toast({
        variant: 'destructive',
        title: 'Categoría Duplicada',
        description: `La categoría "${trimmedName}" ya existe.`,
      });
      return;
    }

    const categoriesColRef = collection(
      firestore,
      'users',
      user.uid,
      'taskCategories'
    );
    await addDocumentNonBlocking(categoriesColRef, {
      name: trimmedName,
      isActive: true,
      userId: user.uid,
      budgetFocus: budgetFocus,
    });
  };

  const handleUpdateCategory = async () => {
    if (!user || !firestore || !categoryToEdit || !categoryName.trim()) return;
    
    const trimmedName = categoryName.trim();
    const originalName = categoryToEdit.name;

    // Check if new name already exists (and it's not the same category)
    if (originalName.toLowerCase() !== trimmedName.toLowerCase()) {
        const categoryExists = taskCategories?.some(
            (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (categoryExists) {
            toast({ variant: 'destructive', title: 'Categoría Duplicada', description: `La categoría "${trimmedName}" ya existe.`});
            return;
        }
    }

    const batch = writeBatch(firestore);
    const categoryRef = doc(firestore, 'users', user.uid, 'taskCategories', categoryToEdit.id);
    
    batch.update(categoryRef, { name: trimmedName, budgetFocus });

    // If name changed, update all tasks with the old category name
    if (originalName !== trimmedName) {
        const tasksQuery = query(collection(firestore, 'users', user.uid, 'tasks'), where('category', '==', originalName));
        const tasksSnapshot = await getDocs(tasksQuery);
        tasksSnapshot.forEach(taskDoc => {
            const taskRef = doc(firestore, 'users', user.uid, 'tasks', taskDoc.id);
            batch.update(taskRef, { category: trimmedName });
        });
    }

    try {
        await batch.commit();
        toast({ title: "Categoría actualizada", description: `La categoría se ha guardado correctamente.` });
    } catch(error) {
        console.error("Error updating category:", error);
        toast({ variant: 'destructive', title: 'Error', description: "No se pudo actualizar la categoría." });
    }
  }


  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!user || !firestore) return;
    
    const batch = writeBatch(firestore);

    // 1. Reassign tasks from the deleted category to "Otro"
    const tasksQuery = query(
        collection(firestore, 'users', user.uid, 'tasks'),
        where('category', '==', categoryName)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    tasksSnapshot.forEach(taskDoc => {
        const taskRef = doc(firestore, 'users', user.uid, 'tasks', taskDoc.id);
        batch.update(taskRef, { category: "Otro" });
    });

    // 2. Delete the category itself
    const categoryRef = doc(firestore, 'users', user.uid, 'taskCategories', categoryId);
    batch.delete(categoryRef);

    try {
        await batch.commit();
        toast({ title: "Categoría eliminada", description: `Las tareas asociadas se movieron a "Otro".` });
    } catch(error) {
        console.error("Error deleting category:", error);
        toast({ variant: 'destructive', title: 'Error', description: "No se pudo eliminar la categoría." });
    }
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
            <Button onClick={() => handleOpenDialog()}>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenDialog(cat)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará la categoría "{cat.name}" y todas las tareas existentes se moverán a la categoría "Otro".
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
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
      
       <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>{categoryToEdit ? 'Editar Categoría' : 'Crear Nueva Categoría'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="categoryName">Nombre de la categoría</Label>
                        <Input
                        id="categoryName"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="Ej: Universidad, Trabajo Secundario..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="budgetFocus">Enfoque Presupuesto</Label>
                        <Select value={budgetFocus} onValueChange={setBudgetFocus}>
                            <SelectTrigger id="budgetFocus">
                                <SelectValue placeholder="Selecciona un enfoque" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Necesidades">Necesidades</SelectItem>
                                <SelectItem value="Deseos">Deseos</SelectItem>
                                <SelectItem value="Ahorros y Deudas">Ahorros y Deudas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                 <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button
                    type="button"
                    onClick={handleSaveCategory}
                    disabled={!categoryName.trim()}
                    >
                    {categoryToEdit ? 'Guardar Cambios' : 'Crear Categoría'}
                    </Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>

    </div>
  );
}
