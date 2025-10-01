

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
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  ArrowDownCircle,
  ArrowUpCircle,
  PlusCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle,
  Undo2,
  Landmark,
  PiggyBank,
  Heart,
  CalendarIcon,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import {
  doc,
  serverTimestamp,
  writeBatch,
  query,
  collection,
  where,
  getDocs,
  getDoc,
  Timestamp,
  orderBy,
  increment,
} from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/app/_providers/AppContext';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const motivationalQuotes = [
    "Tus finanzas son el reflejo de tus hábitos. ¡Constrúyelos sabiamente!",
    "El control de tus finanzas es el primer paso hacia la libertad.",
    "Un presupuesto bien gestionado es el mapa hacia tus metas.",
    "No es cuánto ganas, sino cuánto guardas.",
    "Invierte en tu futuro financiero. Empieza hoy."
];

export default function FinancesPage() {
  const {
    firestore,
    user,
    currentMonthName,
    currentMonthYear,
    transactions,
    transactionsLoading,
    budgets,
    budgetsLoading,
    recurringExpenses,
    recurringExpensesLoading,
    recurringIncomes,
    recurringIncomesLoading,
    shoppingLists,
    monthlyIncome,
    monthlyExpenses,
    balance,
    budget503020,
    pendingRecurringExpenses,
    paidRecurringExpenses,
    pendingRecurringIncomes,
    receivedRecurringIncomes,
    pendingExpensesTotal,
    expenseCategories,
    incomeCategories,
    categoriesWithoutBudget,
  } = useAppContext();
  
  const [isTransactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setBudgetDialogOpen] = useState(false);

  const [newTransactionType, setNewTransactionType] = useState<'income' | 'expense'>('expense');
  const [newTransactionDesc, setNewTransactionDesc] = useState('');
  const [newTransactionAmount, setNewTransactionAmount] = useState('');
  const [newTransactionCategory, setNewTransactionCategory] = useState('');
  const [newTransactionDate, setNewTransactionDate] = useState<Date | undefined>(new Date());
  const [newTransactionBudgetFocus, setNewTransactionBudgetFocus] = useState('Deseos');

  
  const [budgetToEdit, setBudgetToEdit] = useState<any | null>(null);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetLimit, setNewBudgetLimit] = useState('');

  const [transactionToEdit, setTransactionToEdit] = useState<any | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<any | null>(null);

  const [isRecurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [recurringToEdit, setRecurringToEdit] = useState<any | null>(null);
  const [recurringToDelete, setRecurringToDelete] = useState<any | null>(null);
  const [recurringType, setRecurringType] = useState<'income' | 'expense'>('expense');
  const [newRecurringName, setNewRecurringName] = useState('');
  const [newRecurringAmount, setNewRecurringAmount] = useState('');
  const [newRecurringCategory, setNewRecurringCategory] = useState('');
  const [newRecurringDay, setNewRecurringDay] = useState('');
  const [newRecurringBudgetFocus, setNewRecurringBudgetFocus] = useState('Necesidades');
  const [motivation, setMotivation] = useState('');

  const { toast } = useToast();
  const headerImage = PlaceHolderImages.find((img) => img.id === 'finances-header');
  
  useEffect(() => {
    setMotivation(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  const handleAddTransaction = async () => {
    if (
      !newTransactionDesc ||
      !newTransactionAmount ||
      !newTransactionCategory ||
      !newTransactionDate ||
      !user ||
      !firestore
    )
      return;
    const amount = parseFloat(newTransactionAmount);
    if (isNaN(amount)) return;

    const batch = writeBatch(firestore);
    
    const newTransaction = {
      type: newTransactionType,
      description: newTransactionDesc,
      category: newTransactionCategory,
      date: newTransactionDate.toISOString(),
      amount: amount,
      budgetFocus: newTransactionType === 'expense' ? newTransactionBudgetFocus : null,
      createdAt: serverTimestamp(),
      userId: user.uid,
    };

    const newTransactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
    batch.set(newTransactionRef, newTransaction);
    
    if (newTransaction.type === 'expense') {
      const budget = budgets?.find(b => b.categoryName === newTransaction.category);
      if (budget) {
        const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
        batch.update(budgetRef, { currentSpend: increment(newTransaction.amount) });
      }
    }

    await batch.commit();

    setNewTransactionDesc('');
    setNewTransactionAmount('');
    setNewTransactionCategory('');
    setTransactionDialogOpen(false);
  };
  
  const handleSaveBudget = () => {
    if (!user || !firestore) return;
  
    const category = budgetToEdit ? budgetToEdit.categoryName : newBudgetCategory;
    const limit = parseFloat(newBudgetLimit);
  
    if (!category || !newBudgetLimit || isNaN(limit)) return;
  
    if (!budgetToEdit) {
      const categoryExists = shoppingLists?.some(l => l.name.toLowerCase() === category.toLowerCase()) || 
                             budgets?.some(b => b.categoryName.toLowerCase() === category.toLowerCase());

      if (categoryExists) {
          toast({
              variant: "destructive",
              title: "Categoría Duplicada",
              description: `La categoría "${category}" ya existe.`,
          });
          return;
      }
    }

    if (budgetToEdit) {
      const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budgetToEdit.id);
      updateDocumentNonBlocking(budgetRef, { monthlyLimit: limit });
    } else {
      const newBudget = {
        categoryName: category,
        monthlyLimit: limit,
        currentSpend: 0,
        userId: user.uid,
      };
      const budgetsColRef = collection(
        firestore,
        'users',
        user.uid,
        'budgets'
      );
      addDocumentNonBlocking(budgetsColRef, newBudget);
    }
  
    setBudgetToEdit(null);
    setNewBudgetCategory('');
    setNewBudgetLimit('');
    setBudgetDialogOpen(false);
  };

  const openBudgetDialog = (budget?: any) => {
    if (budget) {
      setBudgetToEdit(budget);
      setNewBudgetCategory(budget.categoryName);
      setNewBudgetLimit(budget.monthlyLimit.toString());
    } else {
      setBudgetToEdit(null);
      setNewBudgetCategory('');
      setNewBudgetLimit('');
    }
    setBudgetDialogOpen(true);
  };

  const handleUpdateTransaction = async () => {
    if (!transactionToEdit || !user || !firestore) return;
    const amount = parseFloat(transactionToEdit.amount);
    if (isNaN(amount)) return;

    const originalTransaction = transactions?.find(t => t.id === transactionToEdit.id);
    if (!originalTransaction) return;
    
    const batch = writeBatch(firestore);

    // Update transaction
    const transactionRef = doc(firestore, 'users', user.uid, 'transactions', transactionToEdit.id);
    batch.update(transactionRef, {
      description: transactionToEdit.description,
      amount: amount,
      category: transactionToEdit.category,
      type: transactionToEdit.type,
      date: new Date(transactionToEdit.date).toISOString(),
      budgetFocus: transactionToEdit.type === 'expense' ? transactionToEdit.budgetFocus : null,
    });
    
    const amountDifference = amount - originalTransaction.amount;

    if (originalTransaction.category === transactionToEdit.category) {
      if (transactionToEdit.type === 'expense') {
        const budget = budgets?.find(b => b.categoryName === transactionToEdit.category);
        if (budget) {
          const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
          batch.update(budgetRef, { currentSpend: increment(amountDifference) });
        }
      }
    } else {
      // Revert old budget spend
      if (originalTransaction.type === 'expense') {
        const oldBudget = budgets?.find(b => b.categoryName === originalTransaction.category);
        if (oldBudget) {
          const oldBudgetRef = doc(firestore, 'users', user.uid, 'budgets', oldBudget.id);
          batch.update(oldBudgetRef, { currentSpend: increment(-originalTransaction.amount) });
        }
      }
      // Apply new budget spend
      if (transactionToEdit.type === 'expense') {
        const newBudget = budgets?.find(b => b.categoryName === transactionToEdit.category);
        if (newBudget) {
          const newBudgetRef = doc(firestore, 'users', user.uid, 'budgets', newBudget.id);
          batch.update(newBudgetRef, { currentSpend: increment(amount) });
        }
      }
    }


    await batch.commit();
    setTransactionToEdit(null);
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete || !user || !firestore) return;
  
    const batch = writeBatch(firestore);
    const transactionIdToDelete = transactionToDelete.id;
  
    // 1. Delete the transaction
    const transactionRef = doc(firestore, 'users', user.uid, 'transactions', transactionIdToDelete);
    batch.delete(transactionRef);
  
    if (transactionToDelete.type === 'expense') {
      // 2. Revert budget spend
      const budget = budgets?.find(b => b.categoryName === transactionToDelete.category);
      if (budget) {
        const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
        batch.update(budgetRef, { currentSpend: increment(-transactionToDelete.amount) });
      }
  
      // 3. Find and revert shopping list item if it exists
      const listWithItem = shoppingLists?.find(list =>
        list.items.some((item: any) => item.transactionId === transactionIdToDelete)
      );
      if (listWithItem) {
        const listRef = doc(firestore, 'users', user.uid, 'shoppingLists', listWithItem.id);
        const updatedItems = listWithItem.items.map((item: any) =>
          item.transactionId === transactionIdToDelete
            ? { ...item, isPurchased: false, price: null, transactionId: null }
            : item
        );
        batch.update(listRef, { items: updatedItems });
      }
  
      // 4. Find and revert recurring expense if it exists
      const recurringExpense = recurringExpenses?.find(re => re.lastTransactionId === transactionIdToDelete);
      if (recurringExpense) {
        const recurringExpenseRef = doc(firestore, 'users', user.uid, 'recurringExpenses', recurringExpense.id);
        batch.update(recurringExpenseRef, {
          lastInstanceCreated: null,
          lastTransactionId: null,
        });
      }
    } else { // type is 'income'
      // 5. Find and revert recurring income if it exists
      const recurringIncome = recurringIncomes?.find(ri => ri.lastTransactionId === transactionIdToDelete);
      if (recurringIncome) {
        const recurringIncomeRef = doc(firestore, 'users', user.uid, 'recurringIncomes', recurringIncome.id);
        batch.update(recurringIncomeRef, {
          lastInstanceCreated: null,
          lastTransactionId: null,
        });
      }
    }
  
    try {
      await batch.commit();
      toast({ title: 'Transacción eliminada' });
    } catch (error) {
      console.error("Error deleting transaction and reverting related items:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la transacción.' });
    }
  
    setTransactionToDelete(null);
  };

  const openEditDialog = (transaction: any) => {
    setTransactionToEdit({ ...transaction, amount: transaction.amount.toString(), date: new Date(transaction.date) });
  };
  
    const openRecurringDialog = (type: 'income' | 'expense', item?: any) => {
    setRecurringType(type);
    if (item) {
      setRecurringToEdit(item);
      setNewRecurringName(item.name);
      setNewRecurringAmount(item.amount.toString());
      setNewRecurringCategory(item.category);
      setNewRecurringDay(item.dayOfMonth.toString());
      setNewRecurringBudgetFocus(item.budgetFocus || 'Necesidades');
    } else {
      setRecurringToEdit(null);
      setNewRecurringName('');
      setNewRecurringAmount('');
      setNewRecurringCategory('');
      setNewRecurringDay('');
      setNewRecurringBudgetFocus('Necesidades');
    }
    setRecurringDialogOpen(true);
  };

  const handleSaveRecurringItem = async () => {
    if (!user || !newRecurringName || !newRecurringAmount || !newRecurringCategory || !newRecurringDay || !firestore) {
        toast({ variant: "destructive", title: "Error", description: "Todos los campos son obligatorios." });
        return;
    }
    const amount = parseFloat(newRecurringAmount);
    const dayOfMonth = parseInt(newRecurringDay, 10);

    const data: any = {
      name: newRecurringName,
      amount,
      category: newRecurringCategory,
      dayOfMonth,
      userId: user.uid,
    };
    
    if (recurringType === 'expense') {
        data.budgetFocus = newRecurringBudgetFocus;
    }

    const collectionName = recurringType === 'income' ? 'recurringIncomes' : 'recurringExpenses';

    if (recurringToEdit) {
      const itemRef = doc(firestore, 'users', user.uid, collectionName, recurringToEdit.id);
      await updateDocumentNonBlocking(itemRef, data);
    } else {
      const colRef = collection(firestore, 'users', user.uid, collectionName);
      await addDocumentNonBlocking(colRef, data);
    }
    setRecurringDialogOpen(false);
  };

  const handleDeleteRecurringItem = async () => {
    if (!recurringToDelete || !user || !firestore) return;
    const collectionName = recurringToDelete.type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
    const itemRef = doc(firestore, 'users', user.uid, collectionName, recurringToDelete.id);
    await deleteDocumentNonBlocking(itemRef);
    setRecurringToDelete(null);
  };

  const handlePayRecurringItem = async (item: any, type: 'income' | 'expense') => {
    if (!user || !firestore) return;
    
    const batch = writeBatch(firestore);

    const transactionData = {
      type: type,
      description: item.name,
      category: item.category,
      date: new Date().toISOString(),
      amount: item.amount,
      budgetFocus: type === 'expense' ? item.budgetFocus : null,
      userId: user.uid,
      createdAt: serverTimestamp(),
    };

    const newTransactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
    batch.set(newTransactionRef, transactionData);

    if (type === 'expense') {
      const budget = budgets?.find(b => b.categoryName === item.category);
      if (budget) {
        const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
        batch.update(budgetRef, { currentSpend: increment(item.amount) });
      }
    }

    const collectionName = type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
    const itemRef = doc(firestore, 'users', user.uid, collectionName, item.id);
    batch.update(itemRef, {
      lastInstanceCreated: currentMonthYear,
      lastTransactionId: newTransactionRef.id,
    });

    await batch.commit();
    toast({ title: `Registro exitoso`, description: `${item.name} ha sido registrado.` });
  };
  
const handleRevertRecurringItem = async (item: any, type: 'income' | 'expense') => {
    if (!user || !item.lastTransactionId || !firestore) return;

    const batch = writeBatch(firestore);
    const transactionRef = doc(firestore, 'users', user.uid, 'transactions', item.lastTransactionId);
    const transactionSnap = await getDoc(transactionRef);

    if (transactionSnap.exists()) {
        const transactionData = transactionSnap.data();
        batch.delete(transactionRef);

        if (type === 'expense') {
            const budget = budgets?.find(b => b.categoryName === transactionData.category);
            if (budget) {
                const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
                batch.update(budgetRef, { currentSpend: increment(-transactionData.amount) });
            }
        }
    } else {
        toast({
            variant: "destructive",
            title: "Advertencia",
            description: "La transacción original no se encontró, pero se revertirá el estado del registro fijo."
        });
    }

    const collectionName = type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
    const itemRef = doc(firestore, 'users', user.uid, collectionName, item.id);
    batch.update(itemRef, {
        lastInstanceCreated: null,
        lastTransactionId: null,
    });

    try {
        await batch.commit();
        toast({ title: 'Reversión exitosa', description: `Se ha deshecho el registro de ${item.name}.` });
    } catch (error) {
        console.error("Error reverting recurring item:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo completar la reversión." });
    }
};


  return (
    <>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="MIS FINANZAS"
          description="Controla tus ingresos, gastos y presupuestos."
          motivation={motivation}
          imageUrl={headerImage?.imageUrl}
          imageHint={headerImage?.imageHint}
        >
          <Dialog open={isTransactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Transacción
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Nueva Transacción</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select value={newTransactionType} onValueChange={(value) => setNewTransactionType(value as 'income' | 'expense')}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Gasto</SelectItem>
                        <SelectItem value="income">Ingreso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="amount">Monto</Label>
                     <Input id="amount" type="number" value={newTransactionAmount} onChange={(e) => setNewTransactionAmount(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Input id="description" value={newTransactionDesc} onChange={(e) => setNewTransactionDesc(e.target.value)} />
                </div>
                 
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={newTransactionCategory} onValueChange={setNewTransactionCategory}>
                    <SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
                    <SelectContent>
                      {newTransactionType === 'expense' 
                        ? expenseCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>)) 
                        : incomeCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))
                      }
                    </SelectContent>
                  </Select>
                </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 relative">
                        <Label>Fecha</Label>
                        <Input
                            type="date"
                            value={newTransactionDate ? format(newTransactionDate, 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                                const date = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                                setNewTransactionDate(date);
                            }}
                            className="block w-full"
                        />
                    </div>
                    {newTransactionType === 'expense' && (
                        <div className="space-y-2">
                          <Label htmlFor="budget-focus">Enfoque Presupuesto</Label>
                          <Select value={newTransactionBudgetFocus} onValueChange={setNewTransactionBudgetFocus}>
                            <SelectTrigger id="budget-focus"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Necesidades">Necesidades</SelectItem>
                              <SelectItem value="Deseos">Deseos</SelectItem>
                              <SelectItem value="Ahorros y Deudas">Ahorros y Deudas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                    )}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit" onClick={handleAddTransaction}>Guardar Transacción</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardHeader>
                <CardTitle>Ingresos del Mes</CardTitle>
                </CardHeader>
                <CardContent>
                <p className="text-2xl font-bold text-emerald-500">
                    {formatCurrency(monthlyIncome)}
                </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                <CardTitle>Gastos del Mes</CardTitle>
                </CardHeader>
                <CardContent>
                <p className="text-2xl font-bold text-red-500">
                    {formatCurrency(monthlyExpenses)}
                </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                <CardTitle>Gastos Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold text-amber-500">
                        {formatCurrency(pendingExpensesTotal)}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                <CardTitle>Balance del Mes</CardTitle>
                </CardHeader>
                <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(balance)}</p>
                </CardContent>
            </Card>
        </div>

         {budget503020 && (
            <Card>
                <CardHeader>
                    <CardTitle>Presupuesto 50/30/20</CardTitle>
                    <CardDescription>Una guía para distribuir tus ingresos: 50% Necesidades, 30% Deseos, 20% Ahorros y Deudas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium flex items-center gap-2"><Landmark className="size-4 text-red-500" />Necesidades</span>
                            <span className="text-sm text-muted-foreground">{formatCurrency(budget503020.needs.spend)} / {formatCurrency(budget503020.needs.budget)}</span>
                        </div>
                        <Progress value={budget503020.needs.progress} className="h-2 [&>div]:bg-red-500" />
                    </div>
                     <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium flex items-center gap-2"><Heart className="size-4 text-amber-500" />Deseos</span>
                            <span className="text-sm text-muted-foreground">{formatCurrency(budget503020.wants.spend)} / {formatCurrency(budget503020.wants.budget)}</span>
                        </div>
                        <Progress value={budget503020.wants.progress} className="h-2 [&>div]:bg-amber-500" />
                    </div>
                     <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium flex items-center gap-2"><PiggyBank className="size-4 text-emerald-500" />Ahorros y Deudas</span>
                            <span className="text-sm text-muted-foreground">{formatCurrency(budget503020.savings.spend)} / {formatCurrency(budget503020.savings.budget)}</span>
                        </div>
                        <Progress value={budget503020.savings.progress} className="h-2 [&>div]:bg-emerald-500" />
                    </div>
                </CardContent>
            </Card>
        )}


        <Tabs defaultValue="transactions">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions">Transacciones del Mes</TabsTrigger>
            <TabsTrigger value="recurring">Ingresos y Gastos Fijos</TabsTrigger>
          </TabsList>
          <TabsContent value="transactions" className="mt-6">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                    <CardTitle>Transacciones Recientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                    {transactionsLoading && <p>Cargando transacciones...</p>}
                    <div className="overflow-x-auto">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="hidden sm:table-cell">Categoría</TableHead>
                            <TableHead className="hidden md:table-cell">Fecha</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead className="w-[50px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions?.map((t) => (
                            <TableRow key={t.id}>
                                <TableCell className="flex items-center gap-2 font-medium">
                                {t.type === 'income' ? (
                                    <ArrowUpCircle className="size-5 shrink-0 text-emerald-500" />
                                ) : (
                                    <ArrowDownCircle className="size-5 shrink-0 text-red-500" />
                                )}
                                <span className="truncate">{t.description}</span>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">{t.category}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                {new Date(t.date).toLocaleString('es-ES', {
                                    day: 'numeric',
                                    month: 'short',
                                })}
                                </TableCell>
                                <TableCell
                                className={`text-right font-semibold ${
                                    t.type === 'income'
                                    ? 'text-emerald-500'
                                    : 'text-red-500'
                                }`}
                                >
                                {t.type === 'income' ? '+' : '-'}
                                {formatCurrency(t.amount)}
                                </TableCell>
                                <TableCell className="text-right">
                                <AlertDialog>
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                      <DropdownMenuItem onClick={() => openEditDialog(t)}>
                                          <Pencil className="mr-2 h-4 w-4" />
                                          Editar
                                      </DropdownMenuItem>
                                      <AlertDialogTrigger asChild>
                                          <DropdownMenuItem
                                          onSelect={(e) => e.preventDefault()}
                                          onClick={() => setTransactionToDelete(t)}
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
                                          Esta acción no se puede deshacer. Esto eliminará permanentemente
                                          la transacción.
                                      </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                          onClick={handleDeleteTransaction}
                                          className="bg-destructive hover:bg-destructive/90"
                                      >
                                          Eliminar
                                      </AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Presupuestos</CardTitle>
                        <Dialog open={isBudgetDialogOpen} onOpenChange={(open) => {
                            setBudgetDialogOpen(open);
                            if (!open) setBudgetToEdit(null);
                        }}>
                            <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openBudgetDialog()}>
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                            </DialogTrigger>
                            <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{budgetToEdit ? 'Editar Presupuesto' : 'Añadir Presupuesto'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                <Label htmlFor="budget-category">Categoría</Label>
                                <Select
                                    value={newBudgetCategory}
                                    onValueChange={setNewBudgetCategory}
                                    disabled={!!budgetToEdit}
                                >
                                    <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    {budgetToEdit ? (
                                        <SelectItem value={budgetToEdit.categoryName}>{budgetToEdit.categoryName}</SelectItem>
                                    ) : categoriesWithoutBudget.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                        {cat}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                </div>
                                <div className="space-y-2">
                                <Label htmlFor="budget-limit">Límite Mensual</Label>
                                <Input
                                    id="budget-limit"
                                    type="number"
                                    value={newBudgetLimit}
                                    onChange={(e) => setNewBudgetLimit(e.target.value)}
                                />
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                <Button type="button" variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button type="submit" onClick={handleSaveBudget}>
                                {budgetToEdit ? 'Guardar Cambios' : 'Guardar Presupuesto'}
                                </Button>
                            </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {budgetsLoading && <p>Cargando presupuestos...</p>}
                            {budgets?.map((b) => {
                                const currentSpend = b.currentSpend || 0;
                                const progress = (currentSpend / b.monthlyLimit) * 100;

                                return (
                                <div key={b.id}>
                                    <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium">
                                        {b.categoryName}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                        {formatCurrency(currentSpend)} /{' '}
                                        {formatCurrency(b.monthlyLimit)}
                                        </span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openBudgetDialog(b)}>
                                        <Pencil className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    </div>
                                    <Progress value={progress} className="h-2"/>
                                </div>
                                );
                            })}
                            {budgets?.length === 0 && !budgetsLoading && (
                                <p className="text-sm text-center text-muted-foreground pt-4">
                                    No has creado ningún presupuesto.
                                </p>
                                )}
                        </div>
                    </CardContent>
                </Card>
                </div>
          </TabsContent>
          <TabsContent value="recurring" className="mt-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Recurring Incomes Column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Ingresos Fijos</CardTitle>
                             <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openRecurringDialog('income')}>
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-2">
                           {recurringIncomes?.map(income => (
                             <div key={income.id} className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <p className="font-semibold">{income.name}</p>
                                    <p className="text-sm text-muted-foreground">{formatCurrency(income.amount)} - Día {income.dayOfMonth}</p>
                                </div>
                                <AlertDialog open={recurringToDelete?.id === income.id} onOpenChange={(open) => !open && setRecurringToDelete(null)}>
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                          <DropdownMenuItem onClick={() => openRecurringDialog('income', income)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                          <AlertDialogTrigger asChild>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setRecurringToDelete({ ...income, type: 'income' })} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                          </AlertDialogTrigger>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                                </AlertDialog>
                            </div>
                           ))}
                           {recurringIncomes?.length === 0 && !recurringIncomesLoading && <p className="text-sm text-center text-muted-foreground pt-4">No has definido ingresos fijos.</p>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Ingresos Pendientes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {pendingRecurringIncomes.map(income => (
                                <div key={income.id} className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm">
                                    <div>
                                        <p className="font-semibold">{income.name}</p>
                                        <p className="text-sm text-muted-foreground">{formatCurrency(income.amount)}</p>
                                    </div>
                                    <Button onClick={() => handlePayRecurringItem(income, 'income')}><CheckCircle className="mr-2 h-4 w-4" />Recibir</Button>
                                </div>
                            ))}
                            {pendingRecurringIncomes.length === 0 && !recurringIncomesLoading && <p className="text-sm text-center text-muted-foreground">No tienes ingresos pendientes este mes.</p>}
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader><CardTitle>Ingresos Recibidos</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {receivedRecurringIncomes.map(income => (
                                <div key={income.id} className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                                     <div>
                                        <p className="font-semibold text-muted-foreground line-through">{income.name}</p>
                                        <p className="text-sm text-muted-foreground">{formatCurrency(income.amount)}</p>
                                    </div>
                                    <Button variant="ghost" onClick={() => handleRevertRecurringItem(income, 'income')}><Undo2 className="mr-2 h-4 w-4" />Revertir</Button>
                                </div>
                            ))}
                             {receivedRecurringIncomes.length === 0 && !recurringIncomesLoading && <p className="text-sm text-center text-muted-foreground">No has recibido ingresos fijos este mes.</p>}
                        </CardContent>
                    </Card>
                </div>
                
                {/* Recurring Expenses Column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Gastos Fijos</CardTitle>
                             <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openRecurringDialog('expense')}>
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-2">
                           {recurringExpenses?.map(expense => (
                             <div key={expense.id} className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <p className="font-semibold">{expense.name}</p>
                                    <p className="text-sm text-muted-foreground">{formatCurrency(expense.amount)} - Día {expense.dayOfMonth}</p>
                                </div>
                                <AlertDialog open={recurringToDelete?.id === expense.id} onOpenChange={(open) => !open && setRecurringToDelete(null)}>
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                          <DropdownMenuItem onClick={() => openRecurringDialog('expense', expense)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                          <AlertDialogTrigger asChild>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setRecurringToDelete({ ...expense, type: 'expense' })} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                          </AlertDialogTrigger>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                                </AlertDialog>
                            </div>
                           ))}
                           {recurringExpenses?.length === 0 && !recurringExpensesLoading && <p className="text-sm text-center text-muted-foreground pt-4">No has definido gastos fijos.</p>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Gastos Pendientes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {pendingRecurringExpenses.map(expense => (
                                <div key={expense.id} className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm">
                                    <div>
                                        <p className="font-semibold">{expense.name}</p>
                                        <p className="text-sm text-muted-foreground">{formatCurrency(expense.amount)}</p>
                                    </div>
                                    <Button onClick={() => handlePayRecurringItem(expense, 'expense')}><CheckCircle className="mr-2 h-4 w-4" />Pagar</Button>
                                </div>
                            ))}
                            {pendingRecurringExpenses.length === 0 && !recurringExpensesLoading && <p className="text-sm text-center text-muted-foreground">No tienes gastos pendientes este mes.</p>}
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle>Gastos Pagados</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {paidRecurringExpenses.map(expense => (
                                <div key={expense.id} className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                                     <div>
                                        <p className="font-semibold text-muted-foreground line-through">{expense.name}</p>
                                        <p className="text-sm text-muted-foreground">{formatCurrency(expense.amount)}</p>
                                    </div>
                                    <Button variant="ghost" onClick={() => handleRevertRecurringItem(expense, 'expense')}><Undo2 className="mr-2 h-4 w-4" />Revertir</Button>
                                </div>
                            ))}
                            {paidRecurringExpenses.length === 0 && !recurringExpensesLoading && <p className="text-sm text-center text-muted-foreground">No has pagado gastos fijos este mes.</p>}
                        </CardContent>
                    </Card>
                </div>

            </div>
          </TabsContent>
        </Tabs>
      </div>

       {/* Recurring Item Dialog */}
      <Dialog open={isRecurringDialogOpen} onOpenChange={setRecurringDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{recurringToEdit ? 'Editar' : 'Añadir'} {recurringType === 'income' ? 'Ingreso' : 'Gasto'} Fijo</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="recurring-name">Descripción</Label>
                    <Input id="recurring-name" value={newRecurringName} onChange={(e) => setNewRecurringName(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="recurring-amount">Monto</Label>
                    <Input id="recurring-amount" type="number" value={newRecurringAmount} onChange={(e) => setNewRecurringAmount(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="recurring-category">Categoría</Label>
                    <Select value={newRecurringCategory} onValueChange={setNewRecurringCategory}>
                        <SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
                        <SelectContent>
                             {recurringType === 'expense' 
                                ? expenseCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>)) 
                                : incomeCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))
                            }
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="recurring-day">Día del Mes (1-31)</Label>
                        <Input id="recurring-day" type="number" min="1" max="31" value={newRecurringDay} onChange={(e) => setNewRecurringDay(e.target.value)} />
                    </div>
                     {recurringType === 'expense' && (
                        <div className="space-y-2">
                            <Label htmlFor="recurring-budget-focus">Enfoque Presupuesto</Label>
                            <Select value={newRecurringBudgetFocus} onValueChange={setNewRecurringBudgetFocus}>
                               <SelectTrigger><SelectValue placeholder="Selecciona enfoque" /></SelectTrigger>
                               <SelectContent>
                                    <SelectItem value="Necesidades">Necesidades</SelectItem>
                                    <SelectItem value="Deseos">Deseos</SelectItem>
                                    <SelectItem value="Ahorros y Deudas">Ahorros y Deudas</SelectItem>
                               </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleSaveRecurringItem}>{recurringToEdit ? 'Guardar Cambios' : 'Guardar'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Recurring Item Confirmation */}
      <AlertDialog open={!!recurringToDelete} onOpenChange={(open) => !open && setRecurringToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará "{recurringToDelete?.name}" permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRecurringToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecurringItem} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!transactionToEdit} onOpenChange={(open) => !open && setTransactionToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Transacción</DialogTitle>
          </DialogHeader>
          {transactionToEdit && (
            <div className="grid gap-4 py-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-type">Tipo</Label>
                    <Select value={transactionToEdit.type} onValueChange={(value) => setTransactionToEdit({...transactionToEdit, type: value,})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Gasto</SelectItem>
                        <SelectItem value="income">Ingreso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="edit-amount">Monto</Label>
                     <Input id="edit-amount" type="number" value={transactionToEdit.amount} onChange={(e) => setTransactionToEdit({...transactionToEdit, amount: e.target.value,})}/>
                  </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-description">Descripción</Label>
                    <Input id="edit-description" value={transactionToEdit.description} onChange={(e) => setTransactionToEdit({...transactionToEdit, description: e.target.value,})} />
                </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Categoría</Label>
                <Select value={transactionToEdit.category} onValueChange={(value) => setTransactionToEdit({...transactionToEdit, category: value,})}>
                  <SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
                  <SelectContent>
                      {transactionToEdit.type === 'expense' ? expenseCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      )) : incomeCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
               <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Fecha</Label>
                        <Input
                            type="date"
                            value={transactionToEdit.date ? format(new Date(transactionToEdit.date), 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                                const date = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                                setTransactionToEdit({ ...transactionToEdit, date: date });
                            }}
                            className="block w-full"
                        />
                    </div>
                    {transactionToEdit.type === 'expense' && (
                        <div className="space-y-2">
                          <Label htmlFor="edit-budget-focus">Enfoque Presupuesto</Label>                          <Select value={transactionToEdit.budgetFocus} onValueChange={(value) => setTransactionToEdit({...transactionToEdit, budgetFocus: value})}>
                            <SelectTrigger id="edit-budget-focus"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Necesidades">Necesidades</SelectItem>
                              <SelectItem value="Deseos">Deseos</SelectItem>
                              <SelectItem value="Ahorros y Deudas">Ahorros y Deudas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                    )}
                </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" onClick={() => setTransactionToEdit(null)}>Cancelar</Button></DialogClose>
            <DialogClose asChild><Button type="submit" onClick={handleUpdateTransaction}>Guardar Cambios</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
