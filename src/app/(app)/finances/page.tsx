'use client';

import { useState } from 'react';
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
import { ArrowDownCircle, ArrowUpCircle, PlusCircle } from 'lucide-react';
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
  useMemoFirebase,
  addDocumentNonBlocking,
} from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';

export default function FinancesPage() {
  const { firestore, user } = useFirebase();

  const transactionsQuery = useMemoFirebase(
    () =>
      user ? collection(firestore, 'users', user.uid, 'transactions') : null,
    [firestore, user]
  );
  const { data: transactions, isLoading: transactionsLoading } =
    useCollection(transactionsQuery);

  const budgetsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'budgets') : null),
    [firestore, user]
  );
  const { data: budgets, isLoading: budgetsLoading } =
    useCollection(budgetsQuery);

  const [newTransactionType, setNewTransactionType] = useState<
    'income' | 'expense'
  >('expense');
  const [newTransactionDesc, setNewTransactionDesc] = useState('');
  const [newTransactionAmount, setNewTransactionAmount] = useState('');
  const [newTransactionCategory, setNewTransactionCategory] = useState('');

  const monthlyIncome =
    transactions
      ?.filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0) ?? 0;

  const monthlyExpenses =
    transactions
      ?.filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) ?? 0;

  const balance = monthlyIncome - monthlyExpenses;

  const handleAddTransaction = () => {
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
    };

    const transactionsColRef = collection(
      firestore,
      'users',
      user.uid,
      'transactions'
    );
    addDocumentNonBlocking(transactionsColRef, newTransaction);

    // Reset form
    setNewTransactionDesc('');
    setNewTransactionAmount('');
    setNewTransactionCategory('');
  };

  const expenseCategories = [
    ...new Set(
      transactions
        ?.filter((t) => t.type === 'expense')
        .map((t) => t.category) ?? []
    ),
  ];

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Finanzas"
          description="Controla tus ingresos, gastos y presupuestos."
        >
          <Dialog>
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
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                      <SelectItem value="Salario">Salario</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="submit" onClick={handleAddTransaction}>
                    Guardar Transacción
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos del Mes</CardTitle>
              <CardDescription>Total de ingresos en Junio</CardDescription>
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
              <CardDescription>Total de gastos en Junio</CardDescription>
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
              <CardDescription>Balance actual de Junio</CardDescription>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
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
                        {new Date(t.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          t.type === 'income'
                            ? 'text-emerald-500'
                            : 'text-red-500'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Presupuestos</CardTitle>
              <CardDescription>
                Seguimiento de tus límites mensuales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {budgetsLoading && <p>Cargando presupuestos...</p>}
              {budgets?.map((b) => (
                <div key={b.id}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">
                      {b.categoryName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(b.currentSpend)} /{' '}
                      {formatCurrency(b.monthlyLimit)}
                    </span>
                  </div>
                  <Progress
                    value={(b.currentSpend / b.monthlyLimit) * 100}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
