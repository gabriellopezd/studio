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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  PlusCircle,
  Trash2,
  ShoppingCart,
  GripVertical,
  WalletCards,
  MoreHorizontal,
  Pencil,
  CheckCircle,
  Undo2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  getDocs,
  where,
  Timestamp,
  getDoc,
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
      <div {...attributes} {...listeners} className="p-2 cursor-grab touch-none">
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
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [itemToUpdate, setItemToUpdate] = useState<{
    listId: string;
    itemId: string;
    listName: string;
    itemName: string;
  } | null>(null);
  const [itemPrice, setItemPrice] = useState('');

  // State for Recurring Expenses
  const [isRecurringExpenseDialogOpen, setRecurringExpenseDialogOpen] =
    useState(false);
  const [recurringExpenseToEdit, setRecurringExpenseToEdit] =
    useState<any | null>(null);
  const [newRecurringExpenseName, setNewRecurringExpenseName] = useState('');
  const [newRecurringExpenseAmount, setNewRecurringExpenseAmount] =
    useState('');
  const [newRecurringExpenseCategory, setNewRecurringExpenseCategory] =
    useState('');
  const [newRecurringExpenseDay, setNewRecurringExpenseDay] = useState('');
  const [recurringExpenseToDelete, setRecurringExpenseToDelete] =
    useState<any | null>(null);
  const [currentMonthYear, setCurrentMonthYear] = useState('');

  useEffect(() => {
    const now = new Date();
    setCurrentMonthYear(`${now.getFullYear()}-${now.getMonth()}`);
  }, []);

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

  const recurringExpensesQuery = useMemo(
    () =>
      user
        ? query(collection(firestore, 'users', user.uid, 'recurringExpenses'), orderBy('dayOfMonth'))
        : null,
    [firestore, user]
  );
  const { data: recurringExpenses, isLoading: recurringExpensesLoading } =
    useCollection(recurringExpensesQuery);

  const sensors = useSensors(useSensor(PointerSensor));

  const sortedLists = useMemo(() => {
    return lists ? [...lists].sort((a, b) => a.order - b.order) : [];
  }, [lists]);

  const expenseCategories = useMemo(() => {
    return lists?.map((l) => l.name) ?? [];
  }, [lists]);
  
  const uniqueExpenseCategories = [...new Set(expenseCategories)].filter(
    Boolean
  );

  const pendingRecurringExpenses = useMemo(() => {
    if (!recurringExpenses) return [];
    return recurringExpenses.filter(
      (expense) => expense.lastInstanceCreated !== currentMonthYear
    );
  }, [recurringExpenses, currentMonthYear]);
  
  const paidRecurringExpenses = useMemo(() => {
    if (!recurringExpenses) return [];
    return recurringExpenses.filter(
      (expense) => expense.lastInstanceCreated === currentMonthYear
    );
  }, [recurringExpenses, currentMonthYear]);

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

  const itemsToPurchase =
    selectedList?.items?.filter((item: any) => !item.isPurchased) ?? [];
  const purchasedItems =
    selectedList?.items?.filter((item: any) => item.isPurchased) ?? [];

  const addTransaction = async (newTransaction: any) => {
    if (!user) return null;
    try {
      const transactionsColRef = collection(
        firestore,
        'users',
        user.uid,
        'transactions'
      );
      const docRef = await addDocumentNonBlocking(transactionsColRef, {
        ...newTransaction,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
  
      if (newTransaction.type === 'expense') {
        const budget = budgets?.find(
          (b) => b.categoryName === newTransaction.category
        );
        if (budget) {
          const budgetRef = doc(
            firestore,
            'users',
            user.uid,
            'budgets',
            budget.id
          );
          const newSpend = (budget.currentSpend || 0) + newTransaction.amount;
          updateDocumentNonBlocking(budgetRef, { currentSpend: newSpend });
        }
      }
  
      toast({
        title: 'Gasto Registrado',
        description: `${
          newTransaction.description
        } por ${formatCurrency(
          newTransaction.amount
        )} ha sido añadido a tus finanzas.`,
      });
      return docRef;
    } catch (error) {
        console.error("Error adding transaction:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo registrar la transacción.",
        });
        return null;
    }
  };

  const handleCreateList = async () => {
    if (newListName.trim() && user) {
      const categoryName = newListName.trim();

      const batch = writeBatch(firestore);
      
      const newList = {
        name: categoryName,
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
      
      try {
        await batch.commit();
        setSelectedListId(listDocRef.id);
        setNewListName('');
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

    const budgetsQuery = query(
      collection(firestore, 'users', user.uid, 'budgets'),
      where('categoryName', '==', listToDelete.name)
    );
    const budgetSnapshot = await getDocs(budgetsQuery);
    budgetSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    try {
        await batch.commit();
        if (selectedListId === listId) {
          setSelectedListId(sortedLists?.[0]?.id ?? null);
        }
    } catch(error) {
        console.error("Error deleting list and budget:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo eliminar la categoría.",
        });
    }
  };

  const handleAddItem = () => {
    if (newItemName.trim() && selectedList && user) {
      const newItem = {
        itemId: doc(collection(firestore, 'temp')).id,
        name: newItemName.trim(),
        quantity: newItemQuantity.trim() || '1',
        isPurchased: false,
      };
      const listRef = doc(
        firestore,
        'users',
        user.uid,
        'shoppingLists',
        selectedListId!
      );
      updateDocumentNonBlocking(listRef, {
        items: [...(selectedList.items || []), newItem],
      });
      setNewItemName('');
      setNewItemQuantity('1');
    }
  };

  const handleToggleItem = async (itemId: string, isChecked: boolean) => {
    const list = lists?.find((l) => l.id === selectedListId);
    const item = list?.items.find((i: any) => i.itemId === itemId);

    if (!list || !item || !user) return;

    if (isChecked) {
      setItemToUpdate({
        listId: selectedListId!,
        itemId: itemId,
        listName: list.name,
        itemName: item.name,
      });
    } else {
      // Logic to "un-purchase" an item
      if (item.transactionId) {
        const batch = writeBatch(firestore);
        
        const transactionRef = doc(
          firestore,
          'users',
          user.uid,
          'transactions',
          item.transactionId
        );
        batch.delete(transactionRef);

        const budget = budgets?.find((b) => b.categoryName === list.name);
        if (budget && item.price) {
          const budgetRef = doc(
            firestore,
            'users',
            user.uid,
            'budgets',
            budget.id
          );
          const newSpend = Math.max(0, (budget.currentSpend || 0) - item.price);
          batch.update(budgetRef, { currentSpend: newSpend });
        }
        
        const updatedItems = list.items.map((i: any) => {
            if (i.itemId === itemId) {
                const { price, transactionId, ...rest } = i;
                return { ...rest, isPurchased: false };
            }
            return i;
        });
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
        } catch (error) {
            console.error("Error un-purchasing item:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo deshacer la compra.",
            });
        }
      }
    }
  };

  const handleSetItemPrice = async () => {
    if (!itemToUpdate || !itemPrice || !user) return;

    const price = parseFloat(itemPrice);
    if (isNaN(price)) return;

    const newTransaction = {
      type: 'expense' as const,
      description: itemToUpdate.itemName,
      category: itemToUpdate.listName,
      date: new Date().toISOString(),
      amount: price,
    };

    const transactionDoc = await addTransaction(newTransaction);
    if (!transactionDoc) return;

    const list = lists?.find((l) => l.id === itemToUpdate.listId);
    if (list) {
      const updatedItems = list.items.map((item: any) =>
        item.itemId === itemToUpdate.itemId
          ? {
              ...item,
              isPurchased: true,
              price: price,
              transactionId: transactionDoc.id,
            }
          : item
      );
      const listRef = doc(
        firestore,
        'users',
        user.uid,
        'shoppingLists',
        itemToUpdate.listId
      );
      updateDocumentNonBlocking(listRef, { items: updatedItems });
    }

    setItemToUpdate(null);
    setItemPrice('');
  };

  const handleDeleteItem = (itemId: string) => {
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
        const newSpend = Math.max(
          0,
          (budget.currentSpend || 0) - itemToDelete.price
        );
        batch.update(budgetRef, { currentSpend: newSpend });
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
    
    batch.commit().catch(error => {
        console.error("Error deleting item:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo eliminar el gasto.",
        });
    });
  };

  // Recurring Expenses Handlers
  const openRecurringExpenseDialog = (expense?: any) => {
    if (expense) {
      setRecurringExpenseToEdit(expense);
      setNewRecurringExpenseName(expense.name);
      setNewRecurringExpenseAmount(expense.amount.toString());
      setNewRecurringExpenseCategory(expense.category);
      setNewRecurringExpenseDay(expense.dayOfMonth.toString());
    } else {
      setRecurringExpenseToEdit(null);
      setNewRecurringExpenseName('');
      setNewRecurringExpenseAmount('');
      setNewRecurringExpenseCategory('');
      setNewRecurringExpenseDay('');
    }
    setRecurringExpenseDialogOpen(true);
  };

  const handleSaveRecurringExpense = async () => {
    if (
      !user ||
      !newRecurringExpenseName ||
      !newRecurringExpenseAmount ||
      !newRecurringExpenseCategory ||
      !newRecurringExpenseDay
    ) {
        toast({ variant: "destructive", title: "Error", description: "Todos los campos son obligatorios." });
        return;
    }

    const amount = parseFloat(newRecurringExpenseAmount);
    const dayOfMonth = parseInt(newRecurringExpenseDay, 10);
    if (isNaN(amount) || isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
        toast({ variant: "destructive", title: "Error", description: "El monto o día del mes no son válidos." });
        return;
    }

    const expenseData = {
      name: newRecurringExpenseName,
      amount,
      category: newRecurringExpenseCategory,
      dayOfMonth,
      userId: user.uid,
    };

    try {
        if (recurringExpenseToEdit) {
            const expenseRef = doc(
                firestore,
                'users',
                user.uid,
                'recurringExpenses',
                recurringExpenseToEdit.id
            );
            await updateDocumentNonBlocking(expenseRef, expenseData);
        } else {
            const expensesColRef = collection(
                firestore,
                'users',
                user.uid,
                'recurringExpenses'
            );
            await addDocumentNonBlocking(expensesColRef, expenseData);
        }
        setRecurringExpenseDialogOpen(false);
    } catch(error) {
        console.error("Error saving recurring expense:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el gasto recurrente." });
    }
  };

  const handleDeleteRecurringExpense = async () => {
    if (!recurringExpenseToDelete || !user) return;
    const expenseRef = doc(
      firestore,
      'users',
      user.uid,
      'recurringExpenses',
      recurringExpenseToDelete.id
    );
    await deleteDocumentNonBlocking(expenseRef);
    setRecurringExpenseToDelete(null);
  };

  const handlePayRecurringExpense = async (expense: any) => {
    if (!user) return;
  
    const now = new Date();
    // Create new transaction
    const newTransaction = {
      type: 'expense' as const,
      description: expense.name,
      category: expense.category,
      date: new Date(
        now.getFullYear(),
        now.getMonth(),
        expense.dayOfMonth
      ).toISOString(),
      amount: expense.amount,
      userId: user.uid,
      createdAt: serverTimestamp(),
    };
  
    const batch = writeBatch(firestore);
  
    // Add transaction
    const transactionsColRef = collection(firestore, 'users', user.uid, 'transactions');
    const newTransactionRef = doc(transactionsColRef);
    batch.set(newTransactionRef, newTransaction);
  
    // Update budget
    const budget = budgets?.find((b) => b.categoryName === expense.category);
    if (budget) {
      const budgetRef = doc(
        firestore,
        'users',
        user.uid,
        'budgets',
        budget.id
      );
      const newSpend = (budget.currentSpend || 0) + expense.amount;
      batch.update(budgetRef, { currentSpend: newSpend });
    }
  
    // Update recurring expense
    const expenseRef = doc(
      firestore,
      'users',
      user.uid,
      'recurringExpenses',
      expense.id
    );
    batch.update(expenseRef, {
      lastInstanceCreated: currentMonthYear,
      lastTransactionId: newTransactionRef.id
    });
  
    try {
        await batch.commit();
        toast({
          title: 'Gasto Recurrente Pagado',
          description: `${expense.name} por ${formatCurrency(
            expense.amount
          )} ha sido registrado.`,
        });
    } catch(error) {
        console.error("Error paying recurring expense:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo registrar el pago del gasto recurrente.",
        });
    }
  };

  const handleRevertPayment = async (expense: any) => {
    if (!user || !expense.lastTransactionId) return;

    try {
        const transactionRef = doc(firestore, 'users', user.uid, 'transactions', expense.lastTransactionId);
        const transactionSnap = await getDoc(transactionRef);
        
        if (!transactionSnap.exists()) {
            toast({ variant: "destructive", title: "Error", description: "La transacción original no se encontró." });
            return;
        }
        
        const transactionData = transactionSnap.data();
        const batch = writeBatch(firestore);

        // 1. Delete the transaction
        batch.delete(transactionRef);

        // 2. Revert the budget
        const budgetToRevert = budgets?.find(b => b.categoryName === transactionData.category);
        if (budgetToRevert) {
            const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budgetToRevert.id);
            const newSpend = Math.max(0, (budgetToRevert.currentSpend || 0) - transactionData.amount);
            batch.update(budgetRef, { currentSpend: newSpend });
        }

        // 3. Revert the recurring expense
        const expenseRef = doc(firestore, 'users', user.uid, 'recurringExpenses', expense.id);
        batch.update(expenseRef, {
            lastInstanceCreated: null,
            lastTransactionId: null,
        });

        await batch.commit();
        toast({
            title: 'Pago Revertido',
            description: `Se ha deshecho el pago de ${expense.name}.`,
        });
    } catch (error) {
        console.error("Error reverting payment:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo revertir el pago.",
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
    <>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="REGISTRO DE GASTOS"
          description="Organiza tus compras y gestiona tus pagos recurrentes."
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
              <div className="space-y-2">
                <Label htmlFor="listName">Nombre de la categoría</Label>
                <Input
                  id="listName"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Ej: Supermercado, Farmacia..."
                />
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

        <Tabs defaultValue="shopping" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="shopping">Listas de Compras</TabsTrigger>
            <TabsTrigger value="recurring">Gastos Recurrentes</TabsTrigger>
          </TabsList>
          <TabsContent value="shopping" className="mt-6">
            <div className="md:hidden">
              <Tabs
                value={String(selectedListId)}
                onValueChange={(val) => setSelectedListId(val)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedLists?.map((list) => (
                    <TabsTrigger key={list.id} value={String(list.id)}>
                      {list.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            
            {listsLoading && <p>Cargando categorías...</p>}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-4 mt-6 md:mt-0">
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
                          {
                            selectedList.items?.filter(
                              (i: any) => i.isPurchased
                            ).length
                          }{' '}
                          de {selectedList.items?.length || 0} gastos
                          registrados
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
                              y todos sus gastos.
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
                      <div className="flex w-full flex-col sm:flex-row items-center gap-2 mb-6">
                        <Input
                          type="text"
                          placeholder="Añadir gasto..."
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === 'Enter' && handleAddItem()
                          }
                          className="flex-grow"
                        />
                        <div className="flex w-full sm:w-auto gap-2">
                          <Input
                            type="text"
                            placeholder="Cantidad"
                            value={newItemQuantity}
                            onChange={(e) =>
                              setNewItemQuantity(e.target.value)
                            }
                            onKeyDown={(e) =>
                              e.key === 'Enter' && handleAddItem()
                            }
                            className="w-full sm:w-24"
                          />
                          <Button
                            onClick={handleAddItem}
                            disabled={!newItemName.trim()}
                            className="w-full sm:w-auto"
                          >
                            Añadir
                          </Button>
                        </div>
                      </div>

                      {itemsToPurchase.length > 0 && (
                        <div className="space-y-3">
                          {itemsToPurchase.map((item: any) => (
                            <div
                              key={item.itemId}
                              className="flex items-center gap-3 rounded-lg border p-3 shadow-sm transition-all hover:shadow-md"
                            >
                              <Checkbox
                                id={`item-${item.itemId}`}
                                checked={item.isPurchased}
                                onCheckedChange={(checked) =>
                                  handleToggleItem(item.itemId, !!checked)
                                }
                                className="h-5 w-5"
                              />
                              <div className="flex-1">
                                <label
                                  htmlFor={`item-${item.itemId}`}
                                  className="cursor-pointer text-base font-medium"
                                >
                                  {item.name}{' '}
                                  <span className="text-sm text-muted-foreground">
                                    ({item.quantity})
                                  </span>
                                </label>
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
                          ))}
                        </div>
                      )}

                      {purchasedItems.length > 0 && (
                        <>
                          <Separator className="my-6" />
                          <h3 className="mb-4 text-lg font-medium text-muted-foreground">
                            Gastos Registrados
                          </h3>
                          <div className="space-y-3">
                            {purchasedItems.map((item: any) => (
                              <div
                                key={item.itemId}
                                className="flex items-center gap-3 rounded-lg border border-dashed p-3"
                              >
                                <Checkbox
                                  id={`item-${item.itemId}`}
                                  checked={item.isPurchased}
                                  onCheckedChange={(checked) =>
                                    handleToggleItem(item.itemId, !!checked)
                                  }
                                  className="h-5 w-5"
                                />
                                <div className="flex-1">
                                  <label
                                    htmlFor={`item-${item.itemId}`}
                                    className="cursor-pointer text-base text-muted-foreground line-through"
                                  >
                                    {item.name}{' '}
                                    <span className="text-sm">
                                      ({item.quantity})
                                    </span>
                                  </label>
                                  {item.price != null && (
                                    <p className="text-sm font-semibold text-primary">
                                      {formatCurrency(item.price)}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() =>
                                    handleDeleteItem(item.itemId)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {itemsToPurchase.length === 0 &&
                        purchasedItems.length === 0 && (
                          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-10 text-center">
                            <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                            <h3 className="mt-4 text-lg font-semibold text-muted-foreground">
                              Sin gastos
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Añade un gasto para empezar a organizar tus
                              finanzas.
                            </p>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="flex flex-col items-center justify-center p-10 text-center md:h-full">
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
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="recurring" className="mt-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Gastos Recurrentes Pendientes</CardTitle>
                    <CardDescription>
                      Estos gastos fijos están pendientes de pago para este
                      mes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recurringExpensesLoading ? (
                        <p>Cargando...</p>
                    ) : pendingRecurringExpenses.length > 0 ? (
                        <div className="space-y-3">
                            {pendingRecurringExpenses.map((expense) => (
                            <div
                                key={expense.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-card shadow-sm"
                            >
                                <div>
                                <p className="font-semibold">{expense.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {expense.category} -{' '}
                                    {formatCurrency(expense.amount)} - Vence el {expense.dayOfMonth}
                                </p>
                                </div>
                                <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePayRecurringExpense(expense)}
                                >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Pagar
                                </Button>
                            </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-10 text-center">
                            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                            <h3 className="mt-4 text-lg font-semibold text-muted-foreground">Todo al día</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                No tienes gastos recurrentes pendientes para este mes.
                            </p>
                        </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Gastos Pagados este Mes</CardTitle>
                    <CardDescription>
                      Estos son los gastos recurrentes que ya has pagado.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recurringExpensesLoading ? (
                        <p>Cargando...</p>
                    ) : paidRecurringExpenses.length > 0 ? (
                        <div className="space-y-3">
                            {paidRecurringExpenses.map((expense) => (
                            <div
                                key={expense.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                            >
                                <div>
                                <p className="font-semibold text-muted-foreground line-through">{expense.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {expense.category} -{' '}
                                    {formatCurrency(expense.amount)}
                                </p>
                                </div>
                                <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevertPayment(expense)}
                                >
                                <Undo2 className="mr-2 h-4 w-4" />
                                Revertir
                                </Button>
                            </div>
                            ))}
                        </div>
                    ) : (
                       <p className="text-sm text-muted-foreground text-center pt-4">
                          Aún no has pagado ningún gasto recurrente este mes.
                        </p>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Gastos Fijos Definidos</CardTitle>
                    <Dialog
                      open={isRecurringExpenseDialogOpen}
                      onOpenChange={(open) => {
                        setRecurringExpenseDialogOpen(open);
                        if (!open) setRecurringExpenseToEdit(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openRecurringExpenseDialog()}
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {recurringExpenseToEdit
                              ? 'Editar Gasto Recurrente'
                              : 'Añadir Gasto Recurrente'}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label
                              htmlFor="recurring-name"
                              className="text-right"
                            >
                              Descripción
                            </Label>
                            <Input
                              id="recurring-name"
                              value={newRecurringExpenseName}
                              onChange={(e) =>
                                setNewRecurringExpenseName(e.target.value)
                              }
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label
                              htmlFor="recurring-amount"
                              className="text-right"
                            >
                              Monto
                            </Label>
                            <Input
                              id="recurring-amount"
                              type="number"
                              value={newRecurringExpenseAmount}
                              onChange={(e) =>
                                setNewRecurringExpenseAmount(e.target.value)
                              }
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label
                              htmlFor="recurring-category"
                              className="text-right"
                            >
                              Categoría
                            </Label>
                            <Select
                              value={newRecurringExpenseCategory}
                              onValueChange={setNewRecurringExpenseCategory}
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecciona categoría" />
                              </SelectTrigger>
                              <SelectContent>
                                {uniqueExpenseCategories.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label
                              htmlFor="recurring-day"
                              className="text-right"
                            >
                              Día del Mes
                            </Label>
                            <Input
                              id="recurring-day"
                              type="number"
                              min="1"
                              max="31"
                              value={newRecurringExpenseDay}
                              onChange={(e) =>
                                setNewRecurringExpenseDay(e.target.value)
                              }
                              className="col-span-3"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button" variant="outline">
                              Cancelar
                            </Button>
                          </DialogClose>
                          <Button
                            type="submit"
                            onClick={handleSaveRecurringExpense}
                          >
                            {recurringExpenseToEdit
                              ? 'Guardar Cambios'
                              : 'Guardar Gasto'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {recurringExpensesLoading && (
                      <p>Cargando gastos recurrentes...</p>
                    )}
                    {recurringExpenses?.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-2 rounded-md border"
                      >
                        <div className="flex items-center gap-2">
                          <WalletCards className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">
                              {expense.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {expense.category} &middot; Día {expense.dayOfMonth}{' '}
                              de cada mes
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-sm">
                            {formatCurrency(expense.amount)}
                          </span>
                          <AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                <DropdownMenuItem
                                    onClick={() =>
                                    openRecurringExpenseDialog(expense)
                                    }
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                </DropdownMenuItem>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        onClick={() => setRecurringExpenseToDelete(expense)}
                                        className="text-red-500 focus:text-red-500"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará el gasto recurrente
                                    "{recurringExpenseToDelete?.name}" permanentemente.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setRecurringExpenseToDelete(null)}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                    onClick={handleDeleteRecurringExpense}
                                    className="bg-destructive hover:bg-destructive/90"
                                    >
                                    Eliminar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                    {recurringExpenses?.length === 0 &&
                      !recurringExpensesLoading && (
                        <p className="text-sm text-muted-foreground text-center pt-4">
                          No tienes gastos recurrentes definidos.
                        </p>
                      )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={!!itemToUpdate}
        onOpenChange={(open) => !open && setItemToUpdate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="itemPrice">Precio</Label>
            <Input
              id="itemPrice"
              type="number"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
              placeholder="0"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                onClick={() => {
                  if (itemToUpdate) {
                    handleToggleItem(itemToUpdate.itemId, false);
                  }
                  setItemToUpdate(null);
                }}
                variant="outline"
              >
                Cancelar
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                type="button"
                onClick={handleSetItemPrice}
                disabled={!itemPrice.trim()}
              >
                Guardar Gasto
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
