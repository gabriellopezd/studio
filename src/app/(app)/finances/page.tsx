
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
  orderBy
} from 'firebase/firestore';

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

  const recurringExpensesQuery = useMemo(
    () =>
      user
        ? query(collection(firestore, 'users', user.uid, 'recurringExpenses'))
        : null,
    [firestore, user]
  );
  const { data: recurringExpenses } = useCollection(recurringExpensesQuery);

  const pendingRecurringExpensesTotal = useMemo(() => {
    if (!recurringExpenses) return 0;
    return recurringExpenses
      .filter((expense) => expense.lastInstanceCreated !== currentMonthYear)
      .reduce((total, expense) => total + expense.amount, 0);
  }, [recurringExpenses, currentMonthYear]);


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

  const expenseCategories = useMemo(() => {
    const fromBudgets = budgets?.map(b => b.categoryName) ?? [];
    const fromTransactions = transactions
        ?.filter((t) => t.type === 'expense')
        .map((t) => t.category) ?? [];
    return [...new Set([...fromBudgets, ...fromTransactions])];
  }, [budgets, transactions]);
  
  const uniqueExpenseCategories = [...new Set(expenseCategories)].filter(Boolean);

  const categoriesWithoutBudget = uniqueExpenseCategories.filter(
    (cat) => !budgets?.some((b) => b.categoryName === cat)
  );

  return (
    <>
      <div className="flex flex-col gap-8">
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
              <CardTitle>Gastos Pendientes</CardTitle>
              <CardDescription>Total de gastos recurrentes por pagar</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold text-amber-500">
                    {formatCurrency(pendingRecurringExpensesTotal)}
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
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransaction}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
