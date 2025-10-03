

'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAppContext } from '@/app/_providers/AppContext';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
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

const influenceCategories = ["Relaciones", "Trabajo y Crecimiento", "Bienestar", "Entorno y Ocio", "Interno"];

export default function InfluenceSettingsPage() {
  const { firestore, user, influences, influencesLoading } = useAppContext();
  const { toast } = useToast();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<any | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Relaciones');
  const [icon, setIcon] = useState('');

  const groupedItems = useMemo(() => {
    return (influences || []).reduce((acc, item) => {
      const group = item.category || 'Sin Categoría';
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {} as { [key: string]: any[] });
  }, [influences]);

  const resetForm = () => {
    setName('');
    setCategory('Relaciones');
    setIcon('');
    setItemToEdit(null);
  };
  
  const handleOpenDialog = (item?: any) => {
    if (item) {
        setItemToEdit(item);
        setName(item.name);
        setCategory(item.category);
        setIcon(item.icon);
    } else {
        resetForm();
    }
    setDialogOpen(true);
  };

  const handleToggle = async (itemId: string, currentStatus: boolean) => {
    if (!user || !firestore) return;
    const itemRef = doc(firestore, 'users', user.uid, 'influences', itemId);
    await updateDocumentNonBlocking(itemRef, { isActive: !currentStatus });
  };

  const handleSave = async () => {
    if (!user || !firestore || !name.trim() || !category.trim() || !icon.trim()) {
        toast({ variant: 'destructive', title: 'Todos los campos son obligatorios.'});
        return;
    }

    const data = { name, category, icon, userId: user.uid };
    
    if (itemToEdit) {
        const itemRef = doc(firestore, 'users', user.uid, 'influences', itemToEdit.id);
        await updateDocumentNonBlocking(itemRef, data);
        toast({ title: 'Influencia actualizada' });
    } else {
        const colRef = collection(firestore, 'users', user.uid, 'influences');
        await addDocumentNonBlocking(colRef, { ...data, isActive: true });
        toast({ title: 'Influencia creada' });
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!itemToDelete || !user || !firestore) return;
    const itemRef = doc(firestore, 'users', user.uid, 'influences', itemToDelete.id);
    await deleteDocumentNonBlocking(itemRef);
    setItemToDelete(null);
    toast({ title: 'Influencia eliminada' });
  };


  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Personalizar Influencias"
        description="Crea, edita y gestiona las influencias para tu rastreador de ánimo."
        imageId="settings-sub-header"
      >
        <div className="flex items-center gap-2">
            <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Influencia
            </Button>
            <Button variant="outline" asChild>
                <Link href="/settings/mood">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Link>
            </Button>
        </div>
      </PageHeader>

      {influencesLoading && <p>Cargando influencias...</p>}

      <div className="space-y-8">
        {influenceCategories.map(groupName => (
          groupedItems[groupName] && groupedItems[groupName].length > 0 && (
            <div key={groupName}>
              <h2 className="text-xl font-bold tracking-tight mb-4">{groupName}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedItems[groupName].map((item: any) => (
                  <Card key={item.id}>
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{item.icon}</span>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!item.isActive}
                          onCheckedChange={() => handleToggle(item.id, !!item.isActive)}
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleOpenDialog(item)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog open={itemToDelete?.id === item.id} onOpenChange={(open) => !open && setItemToDelete(null)}>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setItemToDelete(item)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará "{item.name}" permanentemente.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDelete}
                                    className="bg-destructive hover:bg-destructive/90"
                                >
                                    Eliminar
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{itemToEdit ? 'Editar Influencia' : 'Crear Influencia'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Amistades" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="icon">Ícono</Label>
                    <Input id="icon" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Ej: 🤗" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger id="category"><SelectValue/></SelectTrigger>
                        <SelectContent>
                            {influenceCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline" onClick={resetForm}>Cancelar</Button></DialogClose>
                <Button onClick={handleSave}>{itemToEdit ? 'Guardar Cambios' : 'Crear'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
