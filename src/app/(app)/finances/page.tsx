
'use client';

import { useState, useEffect, useMemo } from 'react';
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
  WalletCards,
  CheckCircle,
  Undo2,
  TrendingDown,
  TrendingUp,
  Landmark,
  PiggyBank,
  Heart,
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
  writeBatch,
  query,
  where,
  getDocs,
  getDoc,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const needsCategories = ["Arriendo", "Servicios", "Transporte", "Salud"];

export default function FinancesPage() {
  const { firestore, user } = useFirebase();
  const [currentMonthName, setCurrentMonthName] = useState('');

  const [isTransactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setBudgetDialogOpen] = useState(false);

  const [newTransactionType, setNewTransactionType] = useState<
    'income' | 'expense'
  >('expense');
  const [newTransactionDesc, setNewTransactionDesc] = useState('');
  const [newTransactionAmount, setNewTransactionAmount] = useState('');
  const [newTransactionCategory, setNewTransactionCategory] = useState('');
  
  const [budgetToEdit, setBudgetToEdit] = useState<any | null>(null);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetLimit, setNewBudgetLimit] = useState('');

  const [transactionToEdit, setTransactionToEdit] = useState<any | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<any | null>(
    null
  );

  const [currentMonthYear, setCurrentMonthYear] = useState('');

  const [isRecurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [recurringToEdit, setRecurringToEdit] = useState<any | null>(null);
  const [recurringToDelete, setRecurringToDelete] = useState<any | null>(null);
  const [recurringType, setRecurringType] = useState<'income' | 'expense'>('expense');
  const [newRecurringName, setNewRecurringName] = useState('');
  const [newRecurringAmount, setNewRecurringAmount] = useState('');
  const [newRecurringCategory, setNewRecurringCategory] = useState('');
  const [newRecurringDay, setNewRecurringDay] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    const now = new Date();
    const monthName = now.toLocaleDateString('es-ES', { month: 'long' });
    setCurrentMonthName(monthName.charAt(0).toUpperCase() + monthName.slice(1));
    setCurrentMonthYear(`${now.getFullYear()}-${now.getMonth()}`);
  }, []);

  const transactionsQuery = useMemo(() => {
    if (!user) return null;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return query(
        collection(firestore, 'users', user.uid, 'transactions'),
        where('date', '>=', startOfMonth.toISOString()),
        where('date', '<=', endOfMonth.toISOString()),
        orderBy('date', 'desc')
    );
  }, [firestore, user]);

  const { data: transactions, isLoading: transactionsLoading } =
    useCollection(transactionsQuery);

  const budgetsQuery = useMemo(
    () => (user ? collection(firestore, 'users', user.uid, 'budgets') : null),
    [firestore, user]
  );
  const { data: budgets, isLoading: budgetsLoading } =
    useCollection(budgetsQuery);
    
  const recurringExpensesQuery = useMemo(() =>
    user ? query(collection(firestore, 'users', user.uid, 'recurringExpenses'), orderBy('dayOfMonth')) : null,
    [firestore, user]
  );
  const { data: recurringExpenses, isLoading: recurringExpensesLoading } = useCollection(recurringExpensesQuery);

  const recurringIncomesQuery = useMemo(() =>
    user ? query(collection(firestore, 'users', user.uid, 'recurringIncomes'), orderBy('dayOfMonth')) : null,
    [firestore, user]
  );
  const { data: recurringIncomes, isLoading: recurringIncomesLoading } = useCollection(recurringIncomesQuery);

  const shoppingListsQuery = useMemo(
    () => user ? query(collection(firestore, 'users', user.uid, 'shoppingLists')) : null,
    [firestore, user]
  );
  const { data: shoppingLists } = useCollection(shoppingListsQuery);

  const wantsCategories = useMemo(() => {
    const fromShoppingLists = shoppingLists?.map((l) => l.name) ?? [];
    return ["Restaurantes", "Entretenimiento", "Hobbies", ...fromShoppingLists];
  }, [shoppingLists]);


  const pendingRecurringExpenses = useMemo(() => {
    if (!recurringExpenses) return [];
    return recurringExpenses.filter(expense => expense.lastInstanceCreated !== currentMonthYear);
  }, [recurringExpenses, currentMonthYear]);
  
  const paidRecurringExpenses = useMemo(() => {
    if (!recurringExpenses) return [];
    return recurringExpenses.filter(expense => expense.lastInstanceCreated === currentMonthYear);
  }, [recurringExpenses, currentMonthYear]);

  const pendingRecurringIncomes = useMemo(() => {
    if (!recurringIncomes) return [];
    return recurringIncomes.filter(income => income.lastInstanceCreated !== currentMonthYear);
  }, [recurringIncomes, currentMonthYear]);

  const receivedRecurringIncomes = useMemo(() => {
    if (!recurringIncomes) return [];
    return recurringIncomes.filter(income => income.lastInstanceCreated === currentMonthYear);
  }, [recurringIncomes, currentMonthYear]);

  const pendingExpensesTotal = useMemo(() => {
    if (!pendingRecurringExpenses) return 0;
    return pendingRecurringExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [pendingRecurringExpenses]);


  const monthlyIncome =
    transactions
      ?.filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0) ?? 0;

  const monthlyExpenses =
    transactions
      ?.filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) ?? 0;

  const balance = monthlyIncome - monthlyExpenses;

  const budget503020 = useMemo(() => {
    if (monthlyIncome === 0) return null;
    
    const needsBudget = monthlyIncome * 0.5;
    const wantsBudget = monthlyIncome * 0.3;
    const savingsBudget = monthlyIncome * 0.2;

    const needsSpend = transactions?.filter(t => t.type === 'expense' && needsCategories.includes(t.category)).reduce((sum, t) => sum + t.amount, 0) ?? 0;
    const wantsSpend = transactions?.filter(t => t.type === 'expense' && wantsCategories.includes(t.category)).reduce((sum, t) => sum + t.amount, 0) ?? 0;
    const savingsSpend = transactions?.filter(t => t.type === 'expense' && !needsCategories.includes(t.category) && !wantsCategories.includes(t.category)).reduce((sum, t) => sum + t.amount, 0) ?? 0;

    return {
        needs: { budget: needsBudget, spend: needsSpend, progress: (needsSpend/needsBudget)*100 },
        wants: { budget: wantsBudget, spend: wantsSpend, progress: (wantsSpend/wantsBudget)*100 },
        savings: { budget: savingsBudget, spend: savingsSpend, progress: (savingsSpend/savingsBudget)*100 },
    };
  }, [monthlyIncome, transactions, wantsCategories]);

  const handleAddTransaction = async () => {
    if (
      !newTransactionDesc ||
      !newTransactionAmount ||
      !newTransactionCategory ||
      !user
    )
      return;
    const amount = parseFloat(newTransactionAmount);
    if (isNaN(amount)) return;

    const newTransaction = {
      type: newTransactionType,
      description: newTransactionDesc,
      category: newTransactionCategory,
      date: new Date().toISOString(),
      amount: amount,
      createdAt: serverTimestamp(),
      userId: user.uid,
    };

    const transactionsColRef = collection(
      firestore,
      'users',
      user.uid,
      'transactions'
    );
    await addDocumentNonBlocking(transactionsColRef, newTransaction);
    
    if (newTransaction.type === 'expense') {
      const budget = budgets?.find(b => b.categoryName === newTransaction.category);
      if (budget) {
        const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
        const newSpend = (budget.currentSpend || 0) + newTransaction.amount;
        updateDocumentNonBlocking(budgetRef, { currentSpend: newSpend });
      }
    }


    setNewTransactionDesc('');
    setNewTransactionAmount('');
    setNewTransactionCategory('');
    setTransactionDialogOpen(false);
  };
  
  const handleSaveBudget = () => {
    if (!user) return;
  
    const category = budgetToEdit ? budgetToEdit.categoryName : newBudgetCategory;
    const limit = parseFloat(newBudgetLimit);
  
    if (!category || !newBudgetLimit || isNaN(limit)) return;
  
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
      const budgetsColRef = collection(firestore, 'users', user.uid, 'budgets');
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
    if (!transactionToEdit || !user) return;
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
    });
    
    // Revert old budget spend
    if (originalTransaction.type === 'expense') {
      const oldBudget = budgets?.find(b => b.categoryName === originalTransaction.category);
      if (oldBudget) {
        const oldBudgetRef = doc(firestore, 'users', user.uid, 'budgets', oldBudget.id);
        const revertedSpend = (oldBudget.currentSpend || 0) - originalTransaction.amount;
        batch.update(oldBudgetRef, { currentSpend: Math.max(0, revertedSpend) });
      }
    }

    await batch.commit();

    // Apply new budget spend in a separate step to ensure reverted spend is committed
    const secondBatch = writeBatch(firestore);
    if (transactionToEdit.type === 'expense') {
      const newBudget = budgets?.find(b => b.categoryName === transactionToEdit.category);
      if (newBudget) {
         const newBudgetRef = doc(firestore, 'users', user.uid, 'budgets', newBudget.id);
         const currentBudgetDoc = await getDocs(query(collection(firestore, 'users', user.uid, 'budgets'), where('categoryName', '==', newBudget.categoryName)));
         const currentBudgetData = currentBudgetDoc.docs[0].data();
         const newSpend = (currentBudgetData.currentSpend || 0) + amount;
         secondBatch.update(newBudgetRef, { currentSpend: newSpend });
      }
    }

    await secondBatch.commit();

    setTransactionToEdit(null);
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete || !user) return;
    
    const batch = writeBatch(firestore);

    const transactionRef = doc(firestore, 'users', user.uid, 'transactions', transactionToDelete.id);
    batch.delete(transactionRef);

    if (transactionToDelete.type === 'expense') {
      const shoppingListsQuery = query(
        collection(firestore, 'users', user.uid, 'shoppingLists'),
        where('name', '==', transactionToDelete.category)
      );
      const querySnapshot = await getDocs(shoppingListsQuery);
      
      if (!querySnapshot.empty) {
        const listDoc = querySnapshot.docs[0];
        const listRef = listDoc.ref;
        const listData = listDoc.data();
        
        const updatedItems = listData.items.map((item: any) => {
          if (item.transactionId === transactionToDelete.id) {
            const { price, transactionId, isPurchased, ...rest } = item;
            return { ...rest, isPurchased: false };
          }
          return item;
        });

        batch.update(listRef, { items: updatedItems });
      }
      
      const budget = budgets?.find(b => b.categoryName === transactionToDelete.category);
      if (budget) {
          const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
          const newSpend = (budget.currentSpend || 0) - transactionToDelete.amount;
          batch.update(budgetRef, { currentSpend: Math.max(0, newSpend) });
      }
    }
    
    await batch.commit();

    setTransactionToDelete(null);
  };

  const openEditDialog = (transaction: any) => {
    setTransactionToEdit({ ...transaction, amount: transaction.amount.toString() });
  };
  
    const openRecurringDialog = (type: 'income' | 'expense', item?: any) => {
    setRecurringType(type);
    if (item) {
      setRecurringToEdit(item);
      setNewRecurringName(item.name);
      setNewRecurringAmount(item.amount.toString());
      setNewRecurringCategory(item.category);
      setNewRecurringDay(item.dayOfMonth.toString());
    } else {
      setRecurringToEdit(null);
      setNewRecurringName('');
      setNewRecurringAmount('');
      setNewRecurringCategory('');
      setNewRecurringDay('');
    }
    setRecurringDialogOpen(true);
  };

  const handleSaveRecurringItem = async () => {
    if (!user || !newRecurringName || !newRecurringAmount || !newRecurringCategory || !newRecurringDay) {
        toast({ variant: "destructive", title: "Error", description: "Todos los campos son obligatorios." });
        return;
    }
    const amount = parseFloat(newRecurringAmount);
    const dayOfMonth = parseInt(newRecurringDay, 10);

    const data = {
      name: newRecurringName,
      amount,
      category: newRecurringCategory,
      dayOfMonth,
      userId: user.uid,
    };
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
    if (!recurringToDelete || !user) return;
    const collectionName = recurringToDelete.type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
    const itemRef = doc(firestore, 'users', user.uid, collectionName, recurringToDelete.id);
    await deleteDocumentNonBlocking(itemRef);
    setRecurringToDelete(null);
  };

  const handlePayRecurringItem = async (item: any, type: 'income' | 'expense') => {
    if (!user) return;

    const transactionData = {
      type: type,
      description: item.name,
      category: item.category,
      date: new Date().toISOString(),
      amount: item.amount,
      userId: user.uid,
      createdAt: serverTimestamp(),
    };

    const batch = writeBatch(firestore);
    const newTransactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
    batch.set(newTransactionRef, transactionData);

    if (type === 'expense') {
      const budget = budgets?.find(b => b.categoryName === item.category);
      if (budget) {
        const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
        const newSpend = (budget.currentSpend || 0) + item.amount;
        batch.update(budgetRef, { currentSpend: newSpend });
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
    if (!user || !item.lastTransactionId) return;

    const transactionRef = doc(firestore, 'users', user.uid, 'transactions', item.lastTransactionId);
    const transactionSnap = await getDoc(transactionRef);
    if (!transactionSnap.exists()) {
      toast({ variant: "destructive", title: "Error", description: "La transacción original no se encontró." });
      return;
    }
    const transactionData = transactionSnap.data();

    const batch = writeBatch(firestore);
    batch.delete(transactionRef);

    if (type === 'expense') {
      const budget = budgets?.find(b => b.categoryName === transactionData.category);
      if (budget) {
        const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
        const newSpend = Math.max(0, (budget.currentSpend || 0) - transactionData.amount);
        batch.update(budgetRef, { currentSpend: newSpend });
      }
    }
    
    const collectionName = type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
    const itemRef = doc(firestore, 'users', user.uid, collectionName, item.id);
    batch.update(itemRef, {
      lastInstanceCreated: null,
      lastTransactionId: null,
    });
    
    await batch.commit();
    toast({ title: 'Reversión exitosa', description: `Se ha deshecho el registro de ${item.name}.` });
  };


  const expenseCategories = useMemo(() => {
    const fromBudgets = budgets?.map(b => b.categoryName) ?? [];
    const fromTransactions = transactions
        ?.filter((t) => t.type === 'expense')
        .map((t) => t.category) ?? [];
    return ["Arriendo", ...new Set([...fromBudgets, ...fromTransactions])];
  }, [budgets, transactions]);
  
  const incomeCategories = useMemo(() => {
    const fromTransactions = transactions
        ?.filter((t) => t.type === 'income')
        .map((t) => t.category) ?? [];
    return ["Salario", "Bonificación", "Otro", ...fromTransactions];
  }, [transactions]);

  const uniqueExpenseCategories = [...new Set(expenseCategories)].filter(Boolean);
  const uniqueIncomeCategories = [...new Set(incomeCategories)].filter(Boolean);

  const categoriesWithoutBudget = uniqueExpenseCategories.filter(
    (cat) => !budgets?.some((b) => b.categoryName === cat)
  );

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="FINANZAS"
          description="Controla tus ingresos, gastos y presupuestos."
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    Tipo
                  </Label>
                  <Select
                    value={newTransactionType}
                    onValueChange={(value) =>
                      setNewTransactionType(value as 'income' | 'expense')
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Gasto</SelectItem>
                      <SelectItem value="income">Ingreso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Descripción
                  </Label>
                  <Input
                    id="description"
                    value={newTransactionDesc}
                    onChange={(e) => setNewTransactionDesc(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">
                    Monto
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    value={newTransactionAmount}
                    onChange={(e) => setNewTransactionAmount(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Categoría
                  </Label>
                  <Select
                    value={newTransactionCategory}
                    onValueChange={setNewTransactionCategory}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {newTransactionType === 'expense' 
                        ? uniqueExpenseCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        )) 
                        : uniqueIncomeCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" onClick={handleAddTransaction}>
                  Guardar Transacción
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                            <span className="text-sm font-medium flex items-center gap-2"><Landmark className="h-4 w-4 text-red-500" />Necesidades</span>
                            <span className="text-sm text-muted-foreground">{formatCurrency(budget503020.needs.spend)} / {formatCurrency(budget503020.needs.budget)}</span>
                        </div>
                        <Progress value={budget503020.needs.progress} className="[&>div]:bg-red-500" />
                    </div>
                     <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium flex items-center gap-2"><Heart className="h-4 w-4 text-amber-500" />Deseos</span>
                            <span className="text-sm text-muted-foreground">{formatCurrency(budget503020.wants.spend)} / {formatCurrency(budget503020.wants.budget)}</span>
                        </div>
                        <Progress value={budget503020.wants.progress} className="[&>div]:bg-amber-500" />
                    </div>
                     <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium flex items-center gap-2"><PiggyBank className="h-4 w-4 text-emerald-500" />Ahorros y Deudas</span>
                            <span className="text-sm text-muted-foreground">{formatCurrency(budget503020.savings.spend)} / {formatCurrency(budget503020.savings.budget)}</span>
                        </div>
                        <Progress value={budget503020.savings.progress} className="[&>div]:bg-emerald-500" />
                    </div>
                </CardContent>
            </Card>
        )}


        <Tabs defaultValue="transactions">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions">Transacciones del Mes</TabsTrigger>
            <TabsTrigger value="recurring">Ingresos y Gastos Fijos</TabsTrigger>
          </TabsList>
          <TabsContent value="transactions" className="mt-4">
             <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                                <TableCell className="font-medium flex items-center gap-2">
                                {t.type === 'income' ? (
                                    <ArrowUpCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                                ) : (
                                    <ArrowDownCircle className="h-5 w-5 text-red-500 shrink-0" />
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
                                    <Button variant="ghost" size="icon">
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
                                <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="budget-category" className="text-right">
                                    Categoría
                                </Label>
                                <Select
                                    value={newBudgetCategory}
                                    onValueChange={setNewBudgetCategory}
                                    disabled={!!budgetToEdit}
                                >
                                    <SelectTrigger className="col-span-3">
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
                                <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="budget-limit" className="text-right">
                                    Límite Mensual
                                </Label>
                                <Input
                                    id="budget-limit"
                                    type="number"
                                    value={newBudgetLimit}
                                    onChange={(e) => setNewBudgetLimit(e.target.value)}
                                    className="col-span-3"
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
                                    <Progress value={progress} />
                                </div>
                                );
                            })}
                            {budgets?.length === 0 && !budgetsLoading && (
                                <p className="text-sm text-muted-foreground text-center pt-4">
                                    No has creado ningún presupuesto.
                                </p>
                                )}
                        </div>
                    </CardContent>
                </Card>
                </div>
          </TabsContent>
          <TabsContent value="recurring" className="mt-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Recurring Incomes Column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Ingresos Fijos Definidos</CardTitle>
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
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => openRecurringDialog('income', income)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setRecurringToDelete({ ...income, type: 'income' })} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                           ))}
                           {recurringIncomes?.length === 0 && <p className="text-sm text-muted-foreground text-center pt-4">No has definido ingresos fijos.</p>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Ingresos Recurrentes Pendientes</CardTitle>
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
                            {pendingRecurringIncomes.length === 0 && <p className="text-sm text-muted-foreground text-center">No tienes ingresos pendientes este mes.</p>}
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader><CardTitle>Ingresos Recibidos este Mes</CardTitle></CardHeader>
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
                             {receivedRecurringIncomes.length === 0 && <p className="text-sm text-muted-foreground text-center">No has recibido ingresos fijos este mes.</p>}
                        </CardContent>
                    </Card>
                </div>
                
                {/* Recurring Expenses Column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Gastos Fijos Definidos</CardTitle>
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
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => openRecurringDialog('expense', expense)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setRecurringToDelete({ ...expense, type: 'expense' })} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                           ))}
                           {recurringExpenses?.length === 0 && <p className="text-sm text-muted-foreground text-center">No has definido gastos fijos.</p>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Gastos Recurrentes Pendientes</CardTitle>
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
                            {pendingRecurringExpenses.length === 0 && <p className="text-sm text-muted-foreground text-center">No tienes gastos pendientes este mes.</p>}
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle>Gastos Pagados este Mes</CardTitle></CardHeader>
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
                            {paidRecurringExpenses.length === 0 && <p className="text-sm text-muted-foreground text-center">No has pagado gastos fijos este mes.</p>}
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
                                ? uniqueExpenseCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>)) 
                                : uniqueIncomeCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))
                            }
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="recurring-day">Día del Mes (1-31)</Label>
                    <Input id="recurring-day" type="number" min="1" max="31" value={newRecurringDay} onChange={(e) => setNewRecurringDay(e.target.value)} />
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
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecurringItem} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Transaction Dialog */}
      <Dialog
        open={!!transactionToEdit}
        onOpenChange={(open) => !open && setTransactionToEdit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Transacción</DialogTitle>
          </DialogHeader>
          {transactionToEdit && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-type" className="text-right">
                  Tipo
                </Label>
                <Select
                  value={transactionToEdit.type}
                  onValueChange={(value) =>
                    setTransactionToEdit({
                      ...transactionToEdit,
                      type: value,
                    })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Gasto</SelectItem>
                    <SelectItem value="income">Ingreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Descripción
                </Label>
                <Input
                  id="edit-description"
                  value={transactionToEdit.description}
                  onChange={(e) =>
                    setTransactionToEdit({
                      ...transactionToEdit,
                      description: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-amount" className="text-right">
                  Monto
                </Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={transactionToEdit.amount}
                  onChange={(e) =>
                    setTransactionToEdit({
                      ...transactionToEdit,
                      amount: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category" className="text-right">
                  Categoría
                </Label>
                <Select
                  value={transactionToEdit.category}
                  onValueChange={(value) =>
                    setTransactionToEdit({
                      ...transactionToEdit,
                      category: value,
                    })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                      {transactionToEdit.type === 'expense' ? uniqueExpenseCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      )) : null}
                      <SelectItem value="Salario">Salario</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTransactionToEdit(null)}
              >
                Cancelar
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button type="submit" onClick={handleUpdateTransaction}>
                Guardar Cambios
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    