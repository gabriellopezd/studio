
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
} from '@/components/ui/alert-dialog';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  PlusCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  WalletCards,
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
  Timestamp,
} from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FinancesPage() {
  const { firestore, user } = useFirebase();
  const [currentMonthName, setCurrentMonthName] = useState('');

  const [isTransactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [isRecurringExpenseDialogOpen, setRecurringExpenseDialogOpen] = useState(false);

  const [newTransactionType, setNewTransactionType] = useState<
    'income' | 'expense'
  >('expense');
  const [newTransactionDesc, setNewTransactionDesc] = useState('');
  const [newTransactionAmount, setNewTransactionAmount] = useState('');
  const [newTransactionCategory, setNewTransactionCategory] = useState('');
  
  const [budgetToEdit, setBudgetToEdit] = useState<any | null>(null);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetLimit, setNewBudgetLimit] = useState('');
  
  const [recurringExpenseToEdit, setRecurringExpenseToEdit] = useState<any | null>(null);
  const [newRecurringExpenseName, setNewRecurringExpenseName] = useState('');
  const [newRecurringExpenseAmount, setNewRecurringExpenseAmount] = useState('');
  const [newRecurringExpenseCategory, setNewRecurringExpenseCategory] = useState('');
  const [newRecurringExpenseDay, setNewRecurringExpenseDay] = useState('');


  const [transactionToEdit, setTransactionToEdit] = useState<any | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<any | null>(
    null
  );
  const [recurringExpenseToDelete, setRecurringExpenseToDelete] = useState<any | null>(null);

  useEffect(() => {
    const now = new Date();
    const monthName = now.toLocaleDateString('es-ES', { month: 'long' });
    setCurrentMonthName(monthName.charAt(0).toUpperCase() + monthName.slice(1));
  }, []);

  const transactionsQuery = useMemo(() => {
    if (!user) return null;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return query(
        collection(firestore, 'users', user.uid, 'transactions'),
        where('date', '>=', startOfMonth.toISOString()),
        where('date', '<=', endOfMonth.toISOString())
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

  const recurringExpensesQuery = useMemo(
    () => (user ? collection(firestore, 'users', user.uid, 'recurringExpenses') : null),
    [firestore, user]
  );
  const { data: recurringExpenses, isLoading: recurringExpensesLoading } =
    useCollection(recurringExpensesQuery);

  const monthlyIncome =
    transactions
      ?.filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0) ?? 0;

  const monthlyExpenses =
    transactions
      ?.filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) ?? 0;

  const balance = monthlyIncome - monthlyExpenses;

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
    
    const amountDifference = amount - originalTransaction.amount;

    const transactionRef = doc(
      firestore,
      'users',
      user.uid,
      'transactions',
      transactionToEdit.id
    );
    await updateDocumentNonBlocking(transactionRef, {
      description: transactionToEdit.description,
      amount: amount,
      category: transactionToEdit.category,
      type: transactionToEdit.type,
    });
    
    const batch = writeBatch(firestore);
    
    // Adjust budgets based on the changes
    if (originalTransaction.type === 'expense') {
      const oldBudget = budgets?.find(b => b.categoryName === originalTransaction.category);
      if (oldBudget) {
        const oldBudgetRef = doc(firestore, 'users', user.uid, 'budgets', oldBudget.id);
        batch.update(oldBudgetRef, { currentSpend: Math.max(0, (oldBudget.currentSpend || 0) - originalTransaction.amount) });
      }
    }

    if (transactionToEdit.type === 'expense') {
      const newBudget = budgets?.find(b => b.categoryName === transactionToEdit.category);
      if (newBudget) {
        // We need to refetch the budget to get the most up-to-date currentSpend
         const updatedOldBudget = budgets?.find(b => b.id === newBudget.id);
         const spendAfterRevert = updatedOldBudget ? (updatedOldBudget.currentSpend || 0) - (originalTransaction.category === transactionToEdit.category ? originalTransaction.amount : 0) : 0;
         const newSpend = spendAfterRevert + amount;

        const newBudgetRef = doc(firestore, 'users', user.uid, 'budgets', newBudget.id);
        batch.update(newBudgetRef, { currentSpend: Math.max(0, (newBudget.currentSpend || 0) - (originalTransaction.category === newBudget.categoryName ? originalTransaction.amount : 0) + amount) });
      }
    }
    
    await batch.commit();

    setTransactionToEdit(null);
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete || !user) return;

    const transactionRef = doc(
      firestore,
      'users',
      user.uid,
      'transactions',
      transactionToDelete.id
    );
    await deleteDocumentNonBlocking(transactionRef);

    const batch = writeBatch(firestore);

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
    if (!user || !newRecurringExpenseName || !newRecurringExpenseAmount || !newRecurringExpenseCategory || !newRecurringExpenseDay) return;

    const amount = parseFloat(newRecurringExpenseAmount);
    const dayOfMonth = parseInt(newRecurringExpenseDay, 10);
    if (isNaN(amount) || isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) return;

    const expenseData = {
      name: newRecurringExpenseName,
      amount,
      category: newRecurringExpenseCategory,
      dayOfMonth,
      userId: user.uid,
    };

    if (recurringExpenseToEdit) {
      const expenseRef = doc(firestore, 'users', user.uid, 'recurringExpenses', recurringExpenseToEdit.id);
      await updateDocumentNonBlocking(expenseRef, expenseData);
    } else {
      const expensesColRef = collection(firestore, 'users', user.uid, 'recurringExpenses');
      await addDocumentNonBlocking(expensesColRef, expenseData);
    }
    setRecurringExpenseDialogOpen(false);
  };
  
  const handleDeleteRecurringExpense = async () => {
    if (!recurringExpenseToDelete || !user) return;
    const expenseRef = doc(firestore, 'users', user.uid, 'recurringExpenses', recurringExpenseToDelete.id);
    await deleteDocumentNonBlocking(expenseRef);
    setRecurringExpenseToDelete(null);
  };


  const expenseCategories = [
    ...new Set(
      budgets?.map(b => b.categoryName) ?? []
    ),
    ...new Set(
      transactions
        ?.filter((t) => t.type === 'expense')
        .map((t) => t.category) ?? []
    ),
  ];
  
  const uniqueExpenseCategories = [...new Set(expenseCategories)].filter(Boolean);

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
                      {newTransactionType === 'expense' ? uniqueExpenseCategories.map((cat) => (
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos del Mes</CardTitle>
              <CardDescription>Total de ingresos en {currentMonthName}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-500">
                {formatCurrency(monthlyIncome)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Gastos del Mes</CardTitle>
              <CardDescription>Total de gastos en {currentMonthName}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">
                {formatCurrency(monthlyExpenses)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Balance</CardTitle>
              <CardDescription>Balance actual de {currentMonthName}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
            </CardContent>
          </Card>
        </div>

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
                      <TableHead>Categoría</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="w-[50px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          {t.type === 'income' ? (
                            <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <ArrowDownCircle className="h-5 w-5 text-red-500" />
                          )}
                          {t.description}
                        </TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell>
                          {new Date(t.date).toLocaleString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true,
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
                              <DropdownMenuItem
                                onClick={() => setTransactionToDelete(t)}
                                className="text-red-500 focus:text-red-500"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle>Gestión Financiera</CardTitle>
                <CardDescription>
                  Define presupuestos y gastos fijos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="budgets">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="budgets">Presupuestos</TabsTrigger>
                        <TabsTrigger value="recurring">Recurrentes</TabsTrigger>
                    </TabsList>
                    <TabsContent value="budgets" className="mt-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold">Límites Mensuales</h3>
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
                        </div>
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
                    </TabsContent>
                     <TabsContent value="recurring" className="mt-4">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold">Gastos Fijos Mensuales</h3>
                            <Dialog open={isRecurringExpenseDialogOpen} onOpenChange={(open) => {
                                setRecurringExpenseDialogOpen(open);
                                if (!open) setRecurringExpenseToEdit(null);
                            }}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openRecurringExpenseDialog()}>
                                        <PlusCircle className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{recurringExpenseToEdit ? 'Editar Gasto Recurrente' : 'Añadir Gasto Recurrente'}</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                         <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="recurring-name" className="text-right">Descripción</Label>
                                            <Input id="recurring-name" value={newRecurringExpenseName} onChange={(e) => setNewRecurringExpenseName(e.target.value)} className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="recurring-amount" className="text-right">Monto</Label>
                                            <Input id="recurring-amount" type="number" value={newRecurringExpenseAmount} onChange={(e) => setNewRecurringExpenseAmount(e.target.value)} className="col-span-3" />
                                        </div>
                                         <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="recurring-category" className="text-right">Categoría</Label>
                                            <Select value={newRecurringExpenseCategory} onValueChange={setNewRecurringExpenseCategory}>
                                                <SelectTrigger className="col-span-3">
                                                    <SelectValue placeholder="Selecciona categoría" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                     {uniqueExpenseCategories.map((cat) => (
                                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                     ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="recurring-day" className="text-right">Día del Mes</Label>
                                            <Input id="recurring-day" type="number" min="1" max="31" value={newRecurringExpenseDay} onChange={(e) => setNewRecurringExpenseDay(e.target.value)} className="col-span-3" />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                                        <Button type="submit" onClick={handleSaveRecurringExpense}>{recurringExpenseToEdit ? 'Guardar Cambios' : 'Guardar Gasto'}</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                         </div>
                         <div className="space-y-2">
                            {recurringExpensesLoading && <p>Cargando gastos recurrentes...</p>}
                            {recurringExpenses?.map((expense) => (
                                <div key={expense.id} className="flex items-center justify-between p-2 rounded-md border">
                                    <div className='flex items-center gap-2'>
                                        <WalletCards className="h-5 w-5 text-muted-foreground"/>
                                        <div>
                                            <p className="font-medium text-sm">{expense.name}</p>
                                            <p className="text-xs text-muted-foreground">{expense.category} &middot; Día {expense.dayOfMonth} de cada mes</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-sm">{formatCurrency(expense.amount)}</span>
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => openRecurringExpenseDialog(expense)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setRecurringExpenseToDelete(expense)} className="text-red-500 focus:text-red-500">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                            {recurringExpenses?.length === 0 && !recurringExpensesLoading && (
                                <p className="text-sm text-muted-foreground text-center pt-4">
                                    No tienes gastos recurrentes definidos.
                                </p>
                            )}
                         </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
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
      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!transactionToDelete}
        onOpenChange={(open) => !open && setTransactionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente
              la transacción.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransaction}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Recurring Expense Confirmation */}
      <AlertDialog open={!!recurringExpenseToDelete} onOpenChange={(open) => !open && setRecurringExpenseToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará el gasto recurrente "{recurringExpenseToDelete?.name}" permanentemente.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRecurringExpense} className="bg-destructive hover:bg-destructive/90">
                Eliminar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    
    