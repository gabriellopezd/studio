
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
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/app/_providers/AppProvider';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend, XAxis, YAxis } from 'recharts';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const motivationalQuotes = [
    "Tus finanzas son el reflejo de tus hábitos. ¡Constrúyelos sabiamente!",
    "El control de tus finanzas es el primer paso hacia la libertad.",
    "Un presupuesto bien gestionado es el mapa hacia tus metas.",
    "No es cuánto ganas, sino cuánto guardas.",
    "Invierte en tu futuro financiero. Empieza hoy."
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8442ff', '#ff42f5'];

export default function FinancesPage() {
  const {
    currentMonth,
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
        />
        
        <Tabs defaultValue="monthly">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Resumen Mensual</TabsTrigger>
            <TabsTrigger value="annual">Análisis Anual</TabsTrigger>
          </TabsList>
          
          <TabsContent value="monthly" className="mt-6">
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
    </>
  );
}
