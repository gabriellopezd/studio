
'use client';

import { useState, useMemo, useEffect } from 'react';
import PageHeader from '@/components/page-header';
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
  Landmark,
  PiggyBank,
  Heart,
  PlusCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/app/_providers/AppProvider';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend, XAxis, YAxis } from 'recharts';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResponsiveCalendar } from '../tasks/_components/ResponsiveCalendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const motivationalQuotes = [
    "Tus finanzas son el reflejo de tus hábitos. ¡Constrúyelos sabiamente!",
    "El control de tus finanzas es el primer paso hacia la libertad.",
    "Un presupuesto bien gestionado es el mapa hacia tus metas.",
    "No es cuánto ganas, sino cuánto guardas.",
    "Invierte en tu futuro financiero. Empieza hoy."
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8442ff', '#ff42f5'];
const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: new Date(0, i).toLocaleString('es-ES', { month: 'long' }) }));

export default function FinancesPage() {
  const {
    currentMonth,
    setCurrentMonth,
    transactions,
    transactionsLoading,
    budgets,
    monthlyIncome,
    monthlyExpenses,
    balance,
    budget503020,
    pendingExpensesTotal,
    pendingIncomesTotal,
    annualFlowData,
    annualCategorySpending,
    monthlySummaryData,
    annualTransactionsLoading,
    expenseCategories,
    incomeCategories,
    categoriesWithoutBudget,
    handleSaveTransaction,
    handleDeleteTransaction,
    handleSaveBudget,
    modalState,
    handleOpenModal,
    handleCloseModal,
    formState,
    setFormState,
  } = useAppContext();
  
  const [motivation, setMotivation] = useState('');
  
  useEffect(() => {
    setMotivation(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  return (
    <>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="SUPERVISIÓN FINANCIERA"
          description="Controla tus ingresos, gastos y presupuestos."
          motivation={motivation}
          imageId="finances-header"
        >
            <div className='flex items-center gap-2'>
                <Select value={String(currentMonth.getFullYear())} onValueChange={(value) => setCurrentMonth(new Date(Number(value), currentMonth.getMonth()))}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={String(currentMonth.getMonth())} onValueChange={(value) => setCurrentMonth(new Date(currentMonth.getFullYear(), Number(value)))}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                        {months.map(month => <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button onClick={() => handleOpenModal('transaction')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Transacción
                </Button>
            </div>
        </PageHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
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
                <CardTitle>Ingresos Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold text-emerald-500/80">
                        {formatCurrency(pendingIncomesTotal)}
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
                     <TooltipProvider>
                        <UITooltip>
                            <TooltipTrigger asChild>
                                <CardTitle>Balance Proyectado</CardTitle>
                            </TooltipTrigger>
                            <TooltipContent>
                            <p>(Ingresos + Pendientes) - (Gastos + Pendientes)</p>
                            </TooltipContent>
                        </UITooltip>
                    </TooltipProvider>
                </CardHeader>
                <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(balance)}</p>
                </CardContent>
            </Card>
        </div>

        {budget503020 && (
            <Card className="mb-6">
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
            <TabsTrigger value="transactions">Transacciones y Presupuestos</TabsTrigger>
            <TabsTrigger value="annual">Análisis Anual</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transactions" className="mt-6">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                    <CardTitle>Transacciones del Mes</CardTitle>
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
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                      <DropdownMenuItem onClick={() => handleOpenModal('transaction', t)}>
                                          <Pencil className="mr-2 h-4 w-4" />
                                          Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                          onSelect={(e) => e.preventDefault()}
                                          onClick={() => handleOpenModal('deleteTransaction', t)}
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
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Presupuestos</CardTitle>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenModal('budget')}>
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
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
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenModal('budget', b)}>
                                        <Pencil className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    </div>
                                    <Progress value={progress} className="h-2"/>
                                </div>
                                );
                            })}
                            {budgets?.length === 0 && (
                                <p className="text-sm text-center text-muted-foreground pt-4">
                                    No has creado ningún presupuesto para este mes.
                                </p>
                                )}
                        </div>
                    </CardContent>
                </Card>
                </div>
          </TabsContent>

           <TabsContent value="annual" className="mt-6 space-y-6">
                {annualTransactionsLoading ? (
                    <p>Cargando análisis anual...</p>
                ) : (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle>Flujo de Caja Anual ({currentMonth.getFullYear()})</CardTitle>
                                <CardDescription>Comparación de ingresos y gastos totales por mes.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={annualFlowData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
                                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                    <Legend />
                                    <Bar dataKey="ingresos" fill="hsl(var(--chart-2))" name="Ingresos" />
                                    <Bar dataKey="gastos" fill="hsl(var(--chart-5))" name="Gastos" />
                                </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <Card className="lg:col-span-2">
                                <CardHeader>
                                    <CardTitle>Desglose de Gastos Anuales</CardTitle>
                                    <CardDescription>Distribución de tus gastos por categoría durante el año.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                        <Pie
                                            data={annualCategorySpending}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {annualCategorySpending.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                        <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                             <Card className="lg:col-span-3">
                                <CardHeader>
                                    <CardTitle>Resumen Mensual del Año</CardTitle>
                                    <CardDescription>Tabla resumen de tu rendimiento financiero cada mes.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Mes</TableHead>
                                                <TableHead className="text-right">Ingresos</TableHead>
                                                <TableHead className="text-right">Gastos</TableHead>
                                                <TableHead className="text-right">Balance</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {monthlySummaryData.map((row) => (
                                                <TableRow key={row.month}>
                                                    <TableCell className="font-medium">{row.month}</TableCell>
                                                    <TableCell className="text-right text-green-600">{formatCurrency(row.ingresos)}</TableCell>
                                                    <TableCell className="text-right text-red-600">{formatCurrency(row.gastos)}</TableCell>
                                                    <TableCell className={`text-right font-semibold ${row.balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>{formatCurrency(row.balance)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                             </Card>
                        </div>
                    </>
                )}
          </TabsContent>
        </Tabs>
      </div>

       {/* Transaction Dialog */}
        <Dialog open={modalState.type === 'transaction'} onOpenChange={() => handleCloseModal('transaction')}>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>{formState.id ? 'Editar' : 'Añadir'} Transacción</DialogTitle>
            </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select value={formState.type || 'expense'} onValueChange={(value) => setFormState(prev => ({...prev, type: value as 'income' | 'expense'}))}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="expense">Gasto</SelectItem>
                            <SelectItem value="income">Ingreso</SelectItem>
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">Monto</Label>
                        <Input id="amount" type="number" value={formState.amount || ''} onChange={(e) => setFormState(prev => ({...prev, amount: e.target.value}))}/>
                    </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Input id="description" value={formState.description || ''} onChange={(e) => setFormState(prev => ({...prev, description: e.target.value}))} />
                    </div>
                <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select value={formState.category || ''} onValueChange={(value) => setFormState(prev => ({...prev, category: value}))}>
                    <SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
                    <SelectContent>
                        {(formState.type === 'expense' ? expenseCategories : incomeCategories).map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">Fecha</Label>
                        <ResponsiveCalendar
                        id="date"
                        value={formState.date ? new Date(formState.date) : new Date()}
                        onSelect={(date) =>
                            setFormState(prev => ({...prev, date: date}))
                        }
                        />
                    </div>
                    {formState.type === 'expense' && (
                        <div className="space-y-2">
                        <Label htmlFor="budget-focus">Enfoque Presupuesto</Label>
                        <Select value={formState.budgetFocus || ''} onValueChange={(value) => setFormState(prev => ({...prev, budgetFocus: value}))}>
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
                <Button type="button" variant="outline" onClick={() => handleCloseModal('transaction')}>Cancelar</Button>
                <Button type="submit" onClick={handleSaveTransaction}>Guardar Cambios</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Delete Transaction Confirmation */}
        <AlertDialog open={modalState.type === 'deleteTransaction'} onOpenChange={() => handleCloseModal('deleteTransaction')}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente
                    la transacción.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => handleCloseModal('deleteTransaction')}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDeleteTransaction}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    Eliminar
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Budget Dialog */}
        <Dialog open={modalState.type === 'budget'} onOpenChange={() => handleCloseModal('budget')}>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>{formState.id ? 'Editar Presupuesto' : 'Añadir Presupuesto'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                <Label htmlFor="budget-category">Categoría</Label>
                <Select
                    value={formState.categoryName || ''}
                    onValueChange={(value) => setFormState(prev => ({ ...prev, categoryName: value }))}
                    disabled={!!formState.id}
                >
                    <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                    {formState.id ? (
                        <SelectItem value={formState.categoryName}>{formState.categoryName}</SelectItem>
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
                    value={formState.monthlyLimit || ''}
                    onChange={(e) => setFormState(prev => ({ ...prev, monthlyLimit: e.target.value }))}
                />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => handleCloseModal('budget')}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" onClick={handleSaveBudget}>
                {formState.id ? 'Guardar Cambios' : 'Guardar Presupuesto'}
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
