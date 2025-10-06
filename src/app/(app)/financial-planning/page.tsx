
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
  CheckCircle,
  Undo2,
  MoreHorizontal,
  Pencil,
  XCircle,
  Settings,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFinances } from '@/app/_providers/FinancesProvider';
import { useUI } from '@/app/_providers/UIProvider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { writeBatch, doc } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { ResponsiveCalendar } from '@/app/(app)/tasks/_components/ResponsiveCalendar';
import Link from 'next/link';


function SortableListItem({
  list,
  selectedListId,
  setSelectedListId,
  handleOpenDeleteDialog,
  handleOpenListDialog,
  children,
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: list.id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center group">
      <Button
        variant={list.id === selectedListId ? 'secondary' : 'ghost'}
        className="w-full justify-start h-auto py-2"
        onClick={() => setSelectedListId(list.id)}
      >
        {children}
      </Button>
      <div className="flex items-center">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleOpenListDialog(list)}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenDeleteDialog(list)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
        <div {...attributes} {...listeners} className="cursor-grab p-2 touch-none">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </li>
  );
}

const motivationalQuotes = [
    "Cuida de los pequeños gastos; un pequeño agujero hunde un barco.",
    "Un presupuesto es decirle a tu dinero a dónde ir, en lugar de preguntarte a dónde se fue.",
    "La compra inteligente de hoy es la tranquilidad financiera de mañana.",
    "Planifica tus compras para comprar tu libertad.",
    "Cada peso que no gastas es un peso que trabaja para ti."
];

const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() + i);
const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: new Date(0, i).toLocaleString('es-ES', { month: 'long' }) }));

export default function FinancialPlanningPage() {
  const { 
    firestore, 
    user,
    currentMonth,
    setCurrentMonth,
    shoppingLists,
    shoppingListsLoading,
    recurringExpenses,
    recurringExpensesLoading,
    recurringIncomes,
    recurringIncomesLoading,
    expenseCategories,
    incomeCategories,
    pendingRecurringExpenses,
    paidRecurringExpenses,
    pendingRecurringIncomes,
    receivedRecurringIncomes,
    handleSaveRecurringItem,
    handleDeleteRecurringItem,
    handlePayRecurringItem,
    handleRevertRecurringItem,
    handleOmitRecurringItem,
    handleCreateList,
    handleUpdateList,
    handleDeleteList,
    handleAddItem,
    handleConfirmPurchase,
    handleDeleteItem,
    handleRevertPurchase,
    handleSaveTransaction,
  } = useFinances();

  const {
    modalState,
    handleOpenModal,
    handleCloseModal,
    formState,
    setFormState,
  } = useUI();

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [motivation, setMotivation] = useState('');
  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    setMotivation(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  const activeShoppingLists = useMemo(() => {
    const activeMonth = currentMonth.getMonth();
    return shoppingLists?.filter(list => 
        list.isActive && 
        (!list.activeMonths || list.activeMonths.length === 0 || list.activeMonths.includes(activeMonth))
    ) || [];
  }, [shoppingLists, currentMonth]);

  const sortedLists = useMemo(() => {
    if (!activeShoppingLists) return [];
    return [...activeShoppingLists].sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
  }, [activeShoppingLists]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && user && over && firestore) {
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

  const selectedList = shoppingLists?.find((list) => list.id === selectedListId);
  const pendingItems = useMemo(() => selectedList?.items.filter((i: any) => !i.isPurchased) || [], [selectedList]);
  const purchasedItems = useMemo(() => selectedList?.items.filter((i: any) => i.isPurchased) || [], [selectedList]);
  
  const onListDelete = async () => {
    if (!formState.id) return;
    await handleDeleteList(formState.id);
    if(selectedListId === formState.id){
      setSelectedListId(sortedLists?.[0]?.id ?? null);
    }
  }


  useEffect(() => {
    if (!shoppingListsLoading && !selectedListId && sortedLists && sortedLists.length > 0) {
      setSelectedListId(sortedLists[0].id);
    }
     // If selected list becomes inactive, switch to the first active one
    if (selectedListId && !sortedLists.some(l => l.id === selectedListId)) {
      setSelectedListId(sortedLists?.[0]?.id ?? null);
    }
  }, [shoppingLists, shoppingListsLoading, selectedListId, sortedLists]);
  

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="PLANIFICACIÓN FINANCIERA"
        description="Configura y planifica tus ingresos y gastos, tanto fijos como variables."
        motivation={motivation}
        imageId="expenses-header"
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
            <Button onClick={() => handleOpenModal('transaction', { date: new Date() })}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Transacción
            </Button>
        </div>
      </PageHeader>
        
        <Tabs defaultValue="variable">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="variable">Gastos Variables</TabsTrigger>
            <TabsTrigger value="fixed">Ingresos y Gastos Fijos</TabsTrigger>
          </TabsList>

          <TabsContent value="variable" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Listas de Compra</CardTitle>
                    <CardDescription>Usa estas listas para planificar tus gastos variables como mercado, antojos, etc.</CardDescription>
                </CardHeader>
                <CardContent>
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
                    
                    {shoppingListsLoading && <p>Cargando categorías...</p>}

                    <div className="grid grid-cols-1 md:grid-cols-4 mt-6 md:mt-0 gap-6">
                        <div className="hidden md:block md:col-span-1">
                            { !shoppingListsLoading && sortedLists.length > 0 && (
                            <Card>
                            <CardHeader>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <CardTitle>Categorías de Compra</CardTitle>
                                        <CardDescription>Arrastra para reordenar.</CardDescription>
                                    </div>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenModal('list')}>
                                        <PlusCircle className="h-4 w-4" />
                                    </Button>
                                </div>
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
                                        handleOpenDeleteDialog={(l: any) => handleOpenModal('deleteList', l)}
                                        handleOpenListDialog={(l: any) => handleOpenModal('editList', l)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <ShoppingCart className="mr-2 h-4 w-4" />
                                                <span className="flex-1 text-left">{list.name}</span>
                                            </div>
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
                                 <div className="md:hidden">
                                     <Button variant="outline" size="sm" onClick={() => handleOpenModal('list')}><PlusCircle className="mr-2 h-4 w-4" />Crear</Button>
                                 </div>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-6 space-y-4 rounded-lg border bg-muted/50 p-4">
                                    <h4 className="font-medium">Planificar Nuevo Artículo</h4>
                                    <div className="space-y-2">
                                    <Label htmlFor="new-item-name">Descripción</Label>
                                    <Input id="new-item-name" placeholder="Leche, pan, etc." value={formState.itemName || ''} onChange={(e) => setFormState((p: any) => ({...p, itemName: e.target.value}))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new-item-amount">Monto Estimado</Label>
                                        <Input id="new-item-amount" type="number" placeholder="5000" value={formState.itemAmount || ''} onChange={(e) => setFormState((p: any) => ({...p, itemAmount: e.target.value}))} />
                                    </div>
                                    <Button onClick={() => handleAddItem(selectedListId)} disabled={!formState.itemName || !formState.itemAmount} className="w-full sm:w-auto">
                                        <PlusCircle className="mr-2 h-4 w-4"/> Añadir a la Lista
                                    </Button>
                                </div>
                                
                                <Separator className="my-6" />

                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-medium mb-3">Artículos Pendientes</h4>
                                        <div className="space-y-3">
                                            {pendingItems.length > 0 ? (
                                                pendingItems.map((item: any) => (
                                                <div key={item.itemId} className="flex items-center gap-3 rounded-lg border p-3 shadow-sm">
                                                    <div className="flex-1">
                                                        <p className="font-medium">{item.name}</p>
                                                        <p className="text-sm font-semibold text-primary">{formatCurrency(item.amount)} (Estimado)</p>
                                                    </div>
                                                    <Button onClick={() => handleOpenModal('purchaseItem', item)} size="sm">
                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                        Pagar
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteItem(selectedList.id, item.itemId)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-muted-foreground text-center">No hay artículos pendientes.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-medium mb-3">Artículos Comprados</h4>
                                        <div className="space-y-3">
                                        {purchasedItems.length > 0 ? (
                                            purchasedItems.map((item: any) => (
                                                <div key={item.itemId} className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                                                    <div className="flex-1">
                                                        <p className="font-medium line-through text-muted-foreground">{item.name}</p>
                                                        <p className="text-sm font-semibold">{formatCurrency(item.price)} (Final)</p>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => selectedListId && handleRevertPurchase(selectedListId, item)}>
                                                        <Undo2 className="mr-2 h-4 w-4" />
                                                        Revertir
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteItem(selectedList.id, item.itemId)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center">No hay artículos comprados en esta lista.</p>
                                        )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            </Card>
                        ) : (
                            !shoppingListsLoading && (
                            <Card className="flex flex-col items-center justify-center p-10 text-center md:min-h-96">
                                <CardHeader>
                                <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                                <CardTitle className="mt-4">
                                    No hay categorías de gastos activas
                                </CardTitle>
                                <CardDescription>
                                    Crea una categoría o activa una desde la configuración para empezar a registrar gastos.
                                </CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <Button asChild><Link href="/settings/finances"><Settings className="mr-2 h-4 w-4" />Gestionar Categorías</Link></Button>
                                </CardContent>
                            </Card>
                            )
                        )}
                        </div>
                    </div>
                </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="fixed" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Recurring Incomes Column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Ingresos Fijos</CardTitle>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenModal('recurringItem', { type: 'income', activeMonths: [0,1,2,3,4,5,6,7,8,9,10,11] })}>
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
                                            <DropdownMenuItem onClick={() => handleOpenModal('recurringItem', { ...income, type: 'income' })}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => handleOpenModal('deleteRecurring', { ...income, type: 'income' })} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                            </div>
                            ))}
                            {recurringIncomes?.length === 0 && !recurringIncomesLoading && <p className="text-sm text-center text-muted-foreground pt-4">No has definido ingresos fijos.</p>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Ingresos Pendientes este Mes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {pendingRecurringIncomes.length > 0 ? pendingRecurringIncomes.map(income => (
                                <div key={income.id} className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm">
                                    <div>
                                        <p className="font-semibold">{income.name}</p>
                                        <p className="text-sm text-muted-foreground">{formatCurrency(income.amount)}</p>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handlePayRecurringItem(income, 'income')}><CheckCircle className="mr-2 h-4 w-4" />Marcar como Recibido</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleOmitRecurringItem(income, 'income')}><XCircle className="mr-2 h-4 w-4" />Omitir este Mes</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => handleOpenModal('deleteRecurring', { ...income, type: 'income' })} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar Regla</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )) : (
                                !recurringIncomesLoading && <p className="text-sm text-center text-muted-foreground">No tienes ingresos pendientes este mes.</p>
                            )}
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader><CardTitle>Ingresos Recibidos este Mes</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {receivedRecurringIncomes.length > 0 ? receivedRecurringIncomes.map(income => (
                                <div key={income.id} className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                                     <div>
                                        <p className="font-semibold text-muted-foreground line-through">{income.name}</p>
                                        <p className="text-sm text-muted-foreground">{formatCurrency(income.amount)}</p>
                                    </div>
                                    <Button variant="ghost" onClick={() => handleRevertRecurringItem(income, 'income')}><Undo2 className="mr-2 h-4 w-4" />Revertir</Button>
                                </div>
                            )) : (
                               !recurringIncomesLoading && <p className="text-sm text-center text-muted-foreground">No has recibido ingresos fijos este mes.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
                
                {/* Recurring Expenses Column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Gastos Fijos</CardTitle>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenModal('recurringItem', { type: 'expense', activeMonths: [0,1,2,3,4,5,6,7,8,9,10,11] })}>
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
                                            <DropdownMenuItem onClick={() => handleOpenModal('recurringItem', { ...expense, type: 'expense' })}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => handleOpenModal('deleteRecurring', { ...expense, type: 'expense' })} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                            </div>
                            ))}
                            {recurringExpenses?.length === 0 && !recurringExpensesLoading && <p className="text-sm text-center text-muted-foreground pt-4">No has definido gastos fijos.</p>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Gastos Pendientes este Mes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {pendingRecurringExpenses.length > 0 ? pendingRecurringExpenses.map(expense => (
                                <div key={expense.id} className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm">
                                    <div>
                                        <p className="font-semibold">{expense.name}</p>
                                        <p className="text-sm text-muted-foreground">{formatCurrency(expense.amount)}</p>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handlePayRecurringItem(expense, 'expense')}><CheckCircle className="mr-2 h-4 w-4" />Marcar como Pagado</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleOmitRecurringItem(expense, 'expense')}><XCircle className="mr-2 h-4 w-4" />Omitir este Mes</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => handleOpenModal('deleteRecurring', { ...expense, type: 'expense' })} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar Regla</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )) : (
                               !recurringExpensesLoading && <p className="text-sm text-center text-muted-foreground">No tienes gastos pendientes este mes.</p>
                            )}
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle>Gastos Pagados este Mes</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {paidRecurringExpenses.length > 0 ? paidRecurringExpenses.map(expense => (
                                <div key={expense.id} className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                                     <div>
                                        <p className="font-semibold text-muted-foreground line-through">{expense.name}</p>
                                        <p className="text-sm text-muted-foreground">{formatCurrency(expense.amount)}</p>
                                    </div>
                                    <Button variant="ghost" onClick={() => handleRevertRecurringItem(expense, 'expense')}><Undo2 className="mr-2 h-4 w-4" />Revertir</Button>
                                </div>
                            )) : (
                                !recurringExpensesLoading && <p className="text-sm text-center text-muted-foreground">No has pagado gastos fijos este mes.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* MODALS */}
        
        <Dialog open={modalState.type === 'list'} onOpenChange={(open) => !open && handleCloseModal('list')}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear Nueva Categoría de Gasto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="listName">Nombre de la categoría</Label>
                        <Input 
                            id="listName" 
                            value={formState.name || ''} 
                            onChange={(e) => setFormState((p: any) => ({...p, name: e.target.value}))}
                            placeholder="Ej: Mercado, Antojos..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="list-budget-focus">Enfoque Presupuesto</Label>
                        <Select value={formState.budgetFocus || 'Deseos'} onValueChange={(val) => setFormState((p: any) => ({...p, budgetFocus: val}))}>
                            <SelectTrigger id="list-budget-focus"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Necesidades">Necesidades</SelectItem>
                                <SelectItem value="Deseos">Deseos</SelectItem>
                                <SelectItem value="Ahorros y Deudas">Ahorros y Deudas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" onClick={() => handleCloseModal('list')}>Cancelar</Button></DialogClose>
                    <Button type="button" onClick={handleCreateList} disabled={!formState.name}>
                        Crear Categoría
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={modalState.type === 'deleteList'} onOpenChange={(open) => !open && handleCloseModal('deleteList')}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se desactivará la categoría "{formState.name}" y no será visible en la página de planificación.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => handleCloseModal('deleteList')}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onListDelete}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        Desactivar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={modalState.type === 'purchaseItem'} onOpenChange={() => handleCloseModal('purchaseItem')}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirmar Compra: {formState?.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="purchase-price">Precio Final</Label>
                    <Input
                        id="purchase-price"
                        type="number"
                        value={formState.purchasePrice || ''}
                        onChange={(e) => setFormState((p: any) => ({...p, purchasePrice: e.target.value}))}
                        placeholder="Introduce el precio final"
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={() => handleConfirmPurchase(selectedListId)}>Confirmar Gasto</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


        {/* Recurring Item Dialog */}
        <Dialog open={modalState.type === 'recurringItem'} onOpenChange={() => handleCloseModal('recurringItem')}>
            <DialogContent className="max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{formState.id ? 'Editar' : 'Crear'} {formState.type === 'income' ? 'Ingreso' : 'Gasto'} Fijo</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 overflow-y-auto px-1">
                    <div className="space-y-2">
                        <Label htmlFor="recurring-name">Descripción</Label>
                        <Input id="recurring-name" value={formState.name || ''} onChange={(e) => setFormState((prev: any) => ({...prev, name: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="recurring-amount">Monto</Label>
                        <Input id="recurring-amount" type="number" value={formState.amount as string || ''} onChange={(e) => setFormState((prev: any) => ({...prev, amount: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="recurring-category">Categoría</Label>
                        <Select value={formState.category || ''} onValueChange={(value) => setFormState((prev: any) => ({...prev, category: value}))}>
                            <SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
                            <SelectContent>
                                {formState.type === 'expense'
                                    ? expenseCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>)) 
                                    : incomeCategories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))
                                }
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="recurring-day">Día del Mes (1-31)</Label>
                            <Input id="recurring-day" type="number" min="1" max="31" value={formState.dayOfMonth || ''} onChange={(e) => setFormState((prev: any) => ({...prev, dayOfMonth: e.target.value}))} />
                        </div>
                        {formState.type === 'expense' && (
                            <div className="space-y-2">
                                <Label htmlFor="recurring-budget-focus">Enfoque Presupuesto</Label>
                                <Select value={formState.budgetFocus || ''} onValueChange={(value) => setFormState((prev: any) => ({...prev, budgetFocus: value}))}>
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
                    <div className="space-y-3">
                        <Label>Meses Activos</Label>
                        <div className="grid grid-cols-4 gap-2 rounded-md border p-4">
                            {months.map(month => (
                                <div key={month.value} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`month-${month.value}`}
                                        checked={(formState.activeMonths || []).includes(month.value)}
                                        onCheckedChange={(checked) => {
                                            const currentMonths = formState.activeMonths || [];
                                            const newMonths = checked
                                                ? [...currentMonths, month.value]
                                                : currentMonths.filter((m: number) => m !== month.value);
                                            setFormState((prev: any) => ({ ...prev, activeMonths: newMonths.sort((a:number,b:number) => a-b) }));
                                        }}
                                    />
                                    <label htmlFor={`month-${month.value}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {month.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" onClick={() => handleCloseModal('recurringItem')}>Cancelar</Button></DialogClose>
                    <Button onClick={handleSaveRecurringItem}>{formState.id ? 'Guardar Cambios' : 'Guardar'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        {/* Delete Recurring Item Confirmation */}
        <AlertDialog open={modalState.type === 'deleteRecurring'} onOpenChange={() => handleCloseModal('deleteRecurring')}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará "{formState?.name}" permanentemente de todos los meses.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => handleCloseModal('deleteRecurring')}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRecurringItem} className="bg-destructive hover:bg-destructive/90">
                Eliminar
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

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
                        <Select value={formState.type || 'expense'} onValueChange={(value) => setFormState((prev: any) => ({...prev, type: value as 'income' | 'expense'}))}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="expense">Gasto</SelectItem>
                            <SelectItem value="income">Ingreso</SelectItem>
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">Monto</Label>
                        <Input id="amount" type="number" value={formState.amount || ''} onChange={(e) => setFormState((prev: any) => ({...prev, amount: e.target.value}))}/>
                    </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Input id="description" value={formState.description || ''} onChange={(e) => setFormState((prev: any) => ({...prev, description: e.target.value}))} />
                    </div>
                <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select value={formState.category || ''} onValueChange={(value) => setFormState((prev: any) => ({...prev, category: value}))}>
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
                        value={formState.date ? new Date(formState.date) : undefined}
                        onSelect={(date) =>
                            setFormState((prev: any) => ({...prev, date: date}))
                        }
                        />
                    </div>
                    {formState.type === 'expense' && (
                        <div className="space-y-2">
                        <Label htmlFor="budget-focus">Enfoque Presupuesto</Label>
                        <Select value={formState.budgetFocus || ''} onValueChange={(value) => setFormState((prev: any) => ({...prev, budgetFocus: value}))}>
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
    </div>
  );
}
