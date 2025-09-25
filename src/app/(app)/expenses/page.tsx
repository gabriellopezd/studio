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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { shoppingLists as initialShoppingLists, transactions as initialTransactions } from '@/lib/placeholder-data';
import { PlusCircle, Trash2, ShoppingCart } from 'lucide-react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from '@/lib/utils';

// This is a mock function to simulate updating finances.
// In a real app, this would be an API call or a shared state management action.
const addTransaction = (newTransaction: any) => {
  // This is for demonstration. In a real app, you'd have a global state.
  console.log("Adding transaction:", newTransaction);
  // You might want to use a global state management like Zustand or Context API
  // to share state between /finances and /expenses
};


export default function ExpensesPage() {
  const [lists, setLists] = useState(initialShoppingLists);
  const [selectedListId, setSelectedListId] = useState(
    initialShoppingLists[0]?.id ?? null
  );
  const [newListName, setNewListName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  
  const [itemToUpdate, setItemToUpdate] = useState<{listId: number, itemId: number, listName: string, itemName: string} | null>(null);
  const [itemPrice, setItemPrice] = useState('');


  const selectedList = lists.find((list) => list.id === selectedListId);
  const itemsToPurchase = selectedList?.items.filter(item => !item.isPurchased) ?? [];
  const purchasedItems = selectedList?.items.filter(item => item.isPurchased) ?? [];

  const handleCreateList = () => {
    if (newListName.trim()) {
      const newList = {
        id: Date.now(),
        name: newListName.trim(),
        items: [],
      };
      setLists([...lists, newList]);
      setSelectedListId(newList.id);
      setNewListName('');
    }
  };

  const handleDeleteList = (listId: number) => {
    const newLists = lists.filter((list) => list.id !== listId);
    setLists(newLists);
    if (selectedListId === listId) {
      setSelectedListId(newLists[0]?.id ?? null);
    }
  };

  const handleAddItem = () => {
    if (newItemName.trim() && selectedList) {
      const newItem = {
        itemId: Date.now(),
        name: newItemName.trim(),
        quantity: newItemQuantity.trim() || '1',
        isPurchased: false,
      };
      const updatedLists = lists.map((list) => {
        if (list.id === selectedListId) {
          return { ...list, items: [...list.items, newItem] };
        }
        return list;
      });
      setLists(updatedLists);
      setNewItemName('');
      setNewItemQuantity('1');
    }
  };

  const handleToggleItem = (itemId: number, isChecked: boolean) => {
    const list = lists.find(l => l.id === selectedListId);
    const item = list?.items.find(i => i.itemId === itemId);

    if (!list || !item) return;

    if (isChecked) {
        setItemToUpdate({ listId: selectedListId!, itemId: itemId, listName: list.name, itemName: item.name });
    } else {
        const updatedLists = lists.map((list) => {
            if (list.id === selectedListId) {
                return {
                    ...list,
                    items: list.items.map((item) =>
                        item.itemId === itemId
                            ? { ...item, isPurchased: false, price: undefined }
                            : item
                    ),
                };
            }
            return list;
        });
        setLists(updatedLists);
    }
  };

  const handleSetItemPrice = () => {
    if (!itemToUpdate || !itemPrice) return;
    
    const price = parseFloat(itemPrice);
    if (isNaN(price)) return;

    const newTransaction = {
        id: Date.now(),
        type: 'expense' as const,
        description: itemToUpdate.itemName,
        category: itemToUpdate.listName,
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' '),
        amount: price,
    };
    
    addTransaction(newTransaction);
    // In a real app, update a global state here.
    // For now, we just update the local shopping list state.
    
    const updatedLists = lists.map((list) => {
      if (list.id === itemToUpdate.listId) {
        return {
          ...list,
          items: list.items.map((item) =>
            item.itemId === itemToUpdate.itemId
              ? { ...item, isPurchased: true, price: price }
              : item
          ),
        };
      }
      return list;
    });
    setLists(updatedLists);
    setItemToUpdate(null);
    setItemPrice('');
  };
  
  const handleDeleteItem = (itemId: number) => {
    const updatedLists = lists.map((list) => {
      if (list.id === selectedListId) {
        return {
          ...list,
          items: list.items.filter((item) => item.itemId !== itemId),
        };
      }
      return list;
    });
    setLists(updatedLists);
  };

  return (
    <>
      <div className="flex flex-col gap-4 md:gap-6">
        <PageHeader
          title="Registro de Gastos"
          description="Organiza tus gastos por categorías y no olvides nada."
        >
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Categoría de Gasto</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="listName">Nombre de la categoría</Label>
                <Input
                  id="listName"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Ej: Comida, Transporte, Ocio..."
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

        <div className="md:hidden">
          <Tabs value={String(selectedListId)} onValueChange={(val) => setSelectedListId(Number(val))} className="w-full">
            <TabsList>
              {lists.map((list) => (
                <TabsTrigger key={list.id} value={String(list.id)}>{list.name}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-4">
          <div className="hidden md:block md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Categorías</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ul className="space-y-1">
                  {lists.map((list) => (
                    <li key={list.id}>
                      <Button
                        variant={list.id === selectedListId ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => setSelectedListId(list.id)}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {list.name}
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-3">
            {selectedList ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{selectedList.name}</CardTitle>
                    <CardDescription>
                      {selectedList.items.filter((i) => i.isPurchased).length} de{' '}
                      {selectedList.items.length} gastos registrados
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
                  <div className="flex w-full items-center space-x-2 mb-6">
                    <Input
                      type="text"
                      placeholder="Añadir gasto..."
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                      className="flex-grow"
                    />
                    <Input
                        type="text"
                        placeholder="Cantidad"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                        className="w-24"
                    />
                    <Button onClick={handleAddItem} disabled={!newItemName.trim()}>Añadir</Button>
                  </div>
                  
                  {itemsToPurchase.length > 0 && (
                    <div className="space-y-3">
                      {itemsToPurchase.map((item) => (
                        <div
                          key={item.itemId}
                          className="flex items-center gap-3 rounded-lg border p-3 shadow-sm transition-all hover:shadow-md"
                        >
                          <Checkbox
                            id={`item-${item.itemId}`}
                            checked={item.isPurchased}
                            onCheckedChange={(checked) => handleToggleItem(item.itemId, !!checked)}
                            className="h-5 w-5"
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={`item-${item.itemId}`}
                              className="cursor-pointer text-base font-medium"
                            >
                                {item.name} <span className="text-sm text-muted-foreground">({item.quantity})</span>
                            </label>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteItem(item.itemId)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {purchasedItems.length > 0 && (
                    <>
                      <Separator className="my-6" />
                      <h3 className="mb-4 text-lg font-medium text-muted-foreground">Gastos Registrados</h3>
                      <div className="space-y-3">
                        {purchasedItems.map((item) => (
                           <div
                            key={item.itemId}
                            className="flex items-center gap-3 rounded-lg border border-dashed p-3"
                          >
                            <Checkbox
                              id={`item-${item.itemId}`}
                              checked={item.isPurchased}
                              onCheckedChange={(checked) => handleToggleItem(item.itemId, !!checked)}
                              className="h-5 w-5"
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`item-${item.itemId}`}
                                className="cursor-pointer text-base text-muted-foreground line-through"
                              >
                                  {item.name} <span className="text-sm">({item.quantity})</span>
                              </label>
                               {item.price && (
                                <p className="text-sm font-semibold text-primary">
                                  {formatCurrency(item.price)}
                                </p>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteItem(item.itemId)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {itemsToPurchase.length === 0 && purchasedItems.length === 0 && (
                     <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-10 text-center">
                        <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                        <h3 className="mt-4 text-lg font-semibold text-muted-foreground">Sin gastos</h3>
                        <p className="mt-2 text-sm text-muted-foreground">Añade un gasto para empezar a organizar tus finanzas.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="flex flex-col items-center justify-center p-10 text-center">
                <CardHeader>
                  <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                  <CardTitle className="mt-4">No hay categorías de gastos</CardTitle>
                  <CardDescription>
                    Crea una categoría para empezar a registrar gastos.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </div>
      <Dialog open={!!itemToUpdate} onOpenChange={(open) => !open && setItemToUpdate(null)}>
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
                    <Button type="button" onClick={() => setItemToUpdate(null)} variant="outline">
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
