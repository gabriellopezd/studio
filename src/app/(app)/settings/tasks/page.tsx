
'use client';

import { useState, useMemo } from 'react';
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
import { ArrowLeft, PlusCircle, Trash2 } from 'lucide-react';
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
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryFocus, setNewCategoryFocus] = useState('Deseos');
  const { toast } = useToast();

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

  const handleCreateCategory = async () => {
    if (!user || !firestore || !newCategoryName.trim()) return;

    const categoryName = newCategoryName.trim();
    const categoryExists = taskCategories?.some(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (categoryExists) {
      toast({
        variant: 'destructive',
        title: 'Categoría Duplicada',
        description: `La categoría "${categoryName}" ya existe.`,
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
      name: categoryName,
      isActive: true,
      userId: user.uid,
      budgetFocus: newCategoryFocus,
    });
    setNewCategoryName('');
    setNewCategoryFocus('Deseos');
  };

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
            <Dialog>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Categoría
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Crear Nueva Categoría</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="categoryName">Nombre de la categoría</Label>
                        <Input
                        id="categoryName"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Ej: Universidad, Trabajo Secundario..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="budgetFocus">Enfoque Presupuesto</Label>
                        <Select value={newCategoryFocus} onValueChange={setNewCategoryFocus}>
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
                <DialogClose asChild>
                    <Button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim()}
                    >
                    Crear Categoría
                    </Button>
                </DialogClose>
                </DialogFooter>
            </DialogContent>
            </Dialog>

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
                )}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
