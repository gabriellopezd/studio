import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { budgets, transactions } from "@/lib/placeholder-data";
import { ArrowDownCircle, ArrowUpCircle, PlusCircle } from "lucide-react";

export default function FinancesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Finanzas"
        description="Controla tus ingresos, gastos y presupuestos."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Transacción
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos del Mes</CardTitle>
            <CardDescription>Total de ingresos en Junio</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-500">$5,200.00</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gastos del Mes</CardTitle>
            <CardDescription>Total de gastos en Junio</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-500">$1,850.50</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Balance</CardTitle>
            <CardDescription>Balance actual de Junio</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">$3,349.50</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Transacciones Recientes</CardTitle>
          </CardHeader>
          <CardContent>
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
                {transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                        {t.type === 'income' ? <ArrowUpCircle className="h-5 w-5 text-emerald-500" /> : <ArrowDownCircle className="h-5 w-5 text-red-500" />}
                        {t.description}
                    </TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell>{t.date}</TableCell>
                    <TableCell className={`text-right font-semibold ${t.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
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
            <CardDescription>Seguimiento de tus límites mensuales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgets.map(b => (
                <div key={b.id}>
                    <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{b.categoryName}</span>
                        <span className="text-sm text-muted-foreground">${b.currentSpend} / ${b.monthlyLimit}</span>
                    </div>
                    <Progress value={(b.currentSpend / b.monthlyLimit) * 100} />
                </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
