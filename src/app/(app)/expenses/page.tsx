
'use client';

import { useState, useMemo, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  PlusCircle,
  Trash2,
  ShoppingCart,
  GripVertical,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  useFirebase,
  useCollection,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  doc,
  serverTimestamp,
  query,
  orderBy,
  writeBatch,
  getDoc,
  increment,
} from 'firebase/firestore';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from '@/components/ui/checkbox';

function SortableListItem({
  list,
  selectedListId,
  setSelectedListId,
  children,
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center">
      <Button
        variant={list.id === selectedListId ? 'secondary' : 'ghost'}
        className="w-full justify-start"
        onClick={() => setSelectedListId(list.id)}
      >
        {children}
      </Button>
      <div {...attributes} {...listeners} className="cursor-grab p-2 touch-none">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
    </li>
  );
}

export default function ExpensesPage() {
  const { firestore, user } = useFirebase();

  // State for Shopping Lists
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newListBudgetFocus, setNewListBudgetFocus] = useState('Deseos');
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  
  const [isPurchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [itemToPurchase, setItemToPurchase] = useState<any | null>(null);
  const [purchasePrice, setPurchasePrice] = useState('');


  const { toast } = useToast();

  // Queries
  const shoppingListsQuery = useMemo(
    () =>
      user
        ? query(
            collection(firestore, 'users', user.uid, 'shoppingLists'),
            orderBy('order')
          )
        : null,
    [firestore, user]
  );
  const { data: lists, isLoading: listsLoading } =
    useCollection(shoppingListsQuery);

  const budgetsQuery = useMemo(
    () =>
      user ? collection(firestore, 'users', user.uid, 'budgets') : null,
    [firestore, user]
  );
  const { data: budgets } = useCollection(budgetsQuery);

  const sensors = useSensors(useSensor(PointerSensor));

  const sortedLists = useMemo(() => {
    return lists ? [...lists].sort((a, b) => a.order - b.order) : [];
  }, [lists]);

  // Shopping List Handlers
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && user && over) {
      const oldIndex = sortedLists.findIndex((list) => list.id === active.id);
      const newIndex = sortedLists.findIndex((list) => list.id === over.id);

      const newOrder = arrayMove(sortedLists, oldIndex, newIndex);

      const batch = writeBatch(firestore);
      newOrder.forEach((list, index) => {
        const listRef = doc(
          firestore,
          'users',
          user.uid,
          'shoppingLists',
          list.id
        );
        batch.update(listRef, { order: index });
      });

      try {
        await batch.commit();
      } catch (error) {
        console.error("Error updating list order:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo actualizar el orden de las categorías.",
        });
      }
    }
  };

  const selectedList = lists?.find((list) => list.id === selectedListId);


  const handleCreateList = async () => {
    if (newListName.trim() && user) {
      const categoryName = newListName.trim();

      const batch = writeBatch(firestore);
      
      const newList = {
        name: categoryName,
        budgetFocus: newListBudgetFocus,
        createdAt: serverTimestamp(),
        items: [],
        userId: user.uid,
        order: lists?.length || 0,
      };
      const listsColRef = collection(
        firestore,
        'users',
        user.uid,
        'shoppingLists'
      );
      const listDocRef = doc(listsColRef);
      batch.set(listDocRef, newList);

      const existingBudget = budgets?.find(b => b.categoryName === categoryName);
      if (!existingBudget) {
        const newBudget = {
          categoryName: categoryName,
          monthlyLimit: 1000000,
          currentSpend: 0,
          userId: user.uid,
        };
        const budgetsColRef = collection(
          firestore,
          'users',
          user.uid,
          'budgets'
        );
        const budgetDocRef = doc(budgetsColRef);
        batch.set(budgetDocRef, newBudget);
      }
      
      try {
        await batch.commit();
        setSelectedListId(listDocRef.id);
        setNewListName('');
        setNewListBudgetFocus('Deseos');
      } catch (error) {
         console.error("Error creating list and budget:", error);
         toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo crear la categoría de compra.",
        });
      }
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!user) return;

    const listToDelete = lists?.find((l) => l.id === listId);
    if (!listToDelete) return;
    
    const batch = writeBatch(firestore);
    
    const listRef = doc(firestore, 'users', user.uid, 'shoppingLists', listId);
    batch.delete(listRef);
    
    try {
        await batch.commit();
        if (selectedListId === listId) {
          setSelectedListId(sortedLists?.[0]?.id ?? null);
        }
    } catch(error) {
        console.error("Error deleting list:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo eliminar la categoría.",
        });
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemAmount.trim() || !selectedListId || !user) return;

    const amount = parseFloat(newItemAmount);
    if (isNaN(amount)) {
        toast({ variant: "destructive", title: "Error", description: "El monto debe ser un número válido." });
        return;
    }
    
    const newItem = {
        itemId: doc(collection(firestore, 'temp')).id,
        name: newItemName.trim(),
        amount: amount,
        isPurchased: false,
        price: null,
        transactionId: null,
    };
    
    const listRef = doc(firestore, 'users', user.uid, 'shoppingLists', selectedListId);
    
    await updateDocumentNonBlocking(listRef, {
        items: [...(selectedList?.items || []), newItem],
    });

    setNewItemName('');
    setNewItemAmount('');
};

  const handleTogglePurchase = async (itemId: string, isPurchased: boolean) => {
      if (!selectedList || !user) return;
      const item = selectedList.items.find((i: any) => i.itemId === itemId);
      if (!item) return;

      if (isPurchased) { // Un-purchasing
          const updatedItems = selectedList.items.map((i: any) =>
              i.itemId === itemId ? { ...i, isPurchased: false, price: null, transactionId: null } : i
          );

          const batch = writeBatch(firestore);
          const listRef = doc(firestore, 'users', user.uid, 'shoppingLists', selectedListId!);
          batch.update(listRef, { items: updatedItems });

          if (item.transactionId) {
              const transactionRef = doc(firestore, 'users', user.uid, 'transactions', item.transactionId);
              const transactionSnap = await getDoc(transactionRef);
              if (transactionSnap.exists()) {
                  const transactionData = transactionSnap.data();
                  batch.delete(transactionRef);
                  const budget = budgets?.find(b => b.categoryName === transactionData.category);
                  if (budget) {
                      const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
                      batch.update(budgetRef, { currentSpend: increment(-transactionData.amount) });
                  }
              }
          }
          await batch.commit();
          toast({ title: "Gasto revertido" });

      } else { // Purchasing
          setItemToPurchase(item);
          setPurchasePrice(item.amount.toString());
          setPurchaseDialogOpen(true);
      }
  };

  const handleConfirmPurchase = async () => {
    if (!itemToPurchase || !user || !selectedList || !purchasePrice) return;
    
    const finalPrice = parseFloat(purchasePrice);
    if (isNaN(finalPrice)) {
        toast({ variant: 'destructive', title: 'Error', description: 'El precio debe ser un número válido.' });
        return;
    }
    
    const batch = writeBatch(firestore);

    // 1. Create new transaction document
    const newTransactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
    batch.set(newTransactionRef, {
        type: 'expense',
        description: itemToPurchase.name,
        category: selectedList.name,
        amount: finalPrice,
        budgetFocus: selectedList.budgetFocus, // This was the source of the error
        date: new Date().toISOString(),
        userId: user.uid,
        createdAt: serverTimestamp(),
    });

    // 2. Update the item in the shopping list
    const updatedItems = selectedList.items.map((i: any) =>
        i.itemId === itemToPurchase.itemId ? { ...i, isPurchased: true, price: finalPrice, transactionId: newTransactionRef.id } : i
    );
    const listRef = doc(firestore, 'users', user.uid, 'shoppingLists', selectedListId!);
    batch.update(listRef, { items: updatedItems });
    
    // 3. Update the budget
    const budget = budgets?.find(b => b.categoryName === selectedList.name);
    if (budget) {
        const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
        batch.update(budgetRef, { currentSpend: increment(finalPrice) });
    }

    try {
        await batch.commit();
        toast({
            title: 'Gasto Registrado',
            description: `${itemToPurchase.name} por ${formatCurrency(finalPrice)} ha sido registrado.`,
        });
    } catch(error) {
        console.error("Error confirming purchase:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar el gasto.' });
    }

    setPurchaseDialogOpen(false);
    setItemToPurchase(null);
    setPurchasePrice('');
  };


  const handleDeleteItem = async (itemId: string) => {
    if (!selectedList || !user) return;
    const itemToDelete = selectedList.items.find(
      (item: any) => item.itemId === itemId
    );
    
    const batch = writeBatch(firestore);

    if (itemToDelete && itemToDelete.transactionId) {
      const transactionRef = doc(
        firestore,
        'users',
        user.uid,
        'transactions',
        itemToDelete.transactionId
      );
      batch.delete(transactionRef);

      const budget = budgets?.find(
        (b) => b.categoryName === selectedList.name
      );
      if (budget && itemToDelete.price) {
        const budgetRef = doc(
          firestore,
          'users',
          user.uid,
          'budgets',
          budget.id
        );
        batch.update(budgetRef, { currentSpend: increment(-itemToDelete.price) });
      }
    }

    const updatedItems = selectedList.items.filter(
      (item: any) => item.itemId !== itemId
    );
    const listRef = doc(
      firestore,
      'users',
      user.uid,
      'shoppingLists',
      selectedListId!
    );
    batch.update(listRef, { items: updatedItems });
    
    try {
        await batch.commit();
    } catch(error) {
        console.error("Error deleting item:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo eliminar el artículo.",
        });
    }
  };

  // General Logic
  useEffect(() => {
    if (!listsLoading && !selectedListId && sortedLists && sortedLists.length > 0) {
      setSelectedListId(sortedLists[0].id);
    }
  }, [lists, listsLoading, selectedListId, sortedLists]);
  

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="REGISTRO DE GASTOS"
        description="Planifica tus compras y registra tus gastos diarios."
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Categoría de Compra
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Categoría de Compra</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="listName">Nombre de la categoría</Label>
                <Input
                  id="listName"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Ej: Supermercado, Farmacia..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="list-budget-focus">Enfoque Presupuesto</Label>
                <Select value={newListBudgetFocus} onValueChange={setNewListBudgetFocus}>
                    <SelectTrigger id="list-budget-focus">
                        <SelectValue placeholder="Selecciona" />
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
                  onClick={handleCreateList}
                  disabled={!newListName.trim()}
                >
                  Crear Categoría
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

        <div className="md:hidden">
            <Select
            value={String(selectedListId)}
            onValueChange={(val) => setSelectedListId(val)}
            >
            <SelectTrigger className="w-full mb-4">
                <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
                {sortedLists?.map((list) => (
                    <SelectItem key={list.id} value={String(list.id)}>
                    {list.name}
                    </SelectItem>
                ))}
            </SelectContent>
            </Select>
        </div>
        
        {listsLoading && <p>Cargando categorías...</p>}

        <div className="grid grid-cols-1 md:grid-cols-4 mt-6 md:mt-0 gap-6">
            <div className="hidden md:block md:col-span-1">
                { !listsLoading && sortedLists.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Categorías</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={sortedLists.map((list) => list.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <ul className="space-y-1">
                          {sortedLists.map((list) => (
                            <SortableListItem
                              key={list.id}
                              list={list}
                              selectedListId={selectedListId}
                              setSelectedListId={setSelectedListId}
                            >
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              {list.name}
                            </SortableListItem>
                          ))}
                        </ul>
                      </SortableContext>
                    </DndContext>
                  </CardContent>
                </Card>
                )}
            </div>

            <div className="md:col-span-3">
              {selectedList ? (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{selectedList.name}</CardTitle>
                      <CardDescription>
                        {selectedList.items?.length || 0} artículos en la lista
                      </CardDescription>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará
                            permanentemente la categoría "{selectedList.name}"
                            y todos sus artículos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteList(selectedList.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6 space-y-4 rounded-lg border bg-muted/50 p-4">
                        <h4 className="font-medium">Planificar Nuevo Artículo</h4>
                        <div className="space-y-2">
                           <Label htmlFor="new-item-name">Descripción</Label>
                           <Input id="new-item-name" placeholder="Leche, pan, etc." value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-item-amount">Monto Estimado</Label>
                                <Input id="new-item-amount" type="number" placeholder="5000" value={newItemAmount} onChange={(e) => setNewItemAmount(e.target.value)} />
                            </div>
                        </div>

                        <Button onClick={handleAddItem} disabled={!newItemName.trim() || !newItemAmount.trim()} className="w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4"/> Añadir a la Lista
                        </Button>
                    </div>
                    
                    <Separator className="my-6" />

                    <div className="space-y-3">
                      {selectedList.items && selectedList.items.length > 0 ? (
                        selectedList.items.map((item: any) => (
                          <div
                            key={item.itemId}
                            className="flex items-center gap-3 rounded-lg border p-3 shadow-sm transition-all"
                          >
                            <Checkbox id={`item-${item.itemId}`} checked={item.isPurchased} onCheckedChange={(checked) => handleTogglePurchase(item.itemId, !!checked)}/>
                            <div className="flex-1">
                              <label htmlFor={`item-${item.itemId}`} className={`font-medium cursor-pointer ${item.isPurchased ? 'line-through text-muted-foreground' : ''}`}>
                                {item.name}
                              </label>
                              <p className="text-sm font-semibold text-primary">
                                  {formatCurrency(item.price ?? item.amount)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteItem(item.itemId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-10 text-center">
                          <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                          <h3 className="mt-4 text-lg font-semibold text-muted-foreground">
                            Lista de compras vacía
                          </h3>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Añade artículos para empezar a planificar tus compras.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                  !listsLoading && (
                  <Card className="flex flex-col items-center justify-center p-10 text-center md:min-h-96">
                      <CardHeader>
                      <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                      <CardTitle className="mt-4">
                          No hay categorías de gastos
                      </CardTitle>
                      <CardDescription>
                          Crea una categoría para empezar a registrar gastos.
                      </CardDescription>
                      </CardHeader>
                  </Card>
                  )
              )}
            </div>
        </div>

        <Dialog open={isPurchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirmar Compra: {itemToPurchase?.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="purchase-price">Precio Final</Label>
                    <Input
                        id="purchase-price"
                        type="number"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        placeholder="Introduce el precio final"
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleConfirmPurchase}>Confirmar Gasto</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
