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
import { shoppingLists as initialShoppingLists } from '@/lib/placeholder-data';
import { PlusCircle, Trash2 } from 'lucide-react';
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

export default function ShoppingListsPage() {
  const [lists, setLists] = useState(initialShoppingLists);
  const [selectedListId, setSelectedListId] = useState(
    initialShoppingLists[0]?.id ?? null
  );
  const [newListName, setNewListName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  
  const [itemToUpdate, setItemToUpdate] = useState<{listId: number, itemId: number} | null>(null);
  const [itemPrice, setItemPrice] = useState('');


  const selectedList = lists.find((list) => list.id === selectedListId);

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

  const handleToggleItem = (itemId: number, isPurchased: boolean) => {
    if (!isPurchased) {
        setItemToUpdate({ listId: selectedListId!, itemId: itemId });
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
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Listas de Compras"
          description="Organiza tus compras y no olvides nada."
        >
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Lista
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Lista de Compras</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="listName">Nombre de la lista</Label>
                <Input
                  id="listName"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Ej: Supermercado, Ferretería..."
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    type="button"
                    onClick={handleCreateList}
                    disabled={!newListName.trim()}
                  >
                    Crear Lista
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Mis Listas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul>
                  {lists.map((list) => (
                    <li key={list.id}>
                      <Button
                        variant={list.id === selectedListId ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => setSelectedListId(list.id)}
                      >
                        {list.name}
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            {selectedList ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{selectedList.name}</CardTitle>
                    <CardDescription>
                      {selectedList.items.filter((i) => i.isPurchased).length} de{' '}
                      {selectedList.items.length} items comprados
                    </CardDescription>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Esto eliminará
                          permanentemente la lista de compras "{selectedList.name}"
                          y todos sus productos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteList(selectedList.id)}
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardHeader>
                <CardContent>
                  <div className="flex w-full items-center space-x-2 mb-4">
                    <Input
                      type="text"
                      placeholder="Añadir item..."
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
                  <div className="space-y-3">
                    {selectedList.items.map((item) => (
                      <div
                        key={item.itemId}
                        className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50"
                      >
                        <Checkbox
                          id={`item-${item.itemId}`}
                          checked={item.isPurchased}
                          onCheckedChange={(checked) => handleToggleItem(item.itemId, !!checked)}
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`item-${item.itemId}`}
                            className="cursor-pointer"
                          >
                            <span
                              className={`${
                                item.isPurchased
                                  ? 'text-muted-foreground line-through'
                                  : ''
                              }`}
                            >
                              {item.name} ({item.quantity})
                            </span>
                          </label>
                          {item.price && (
                            <p className="text-sm text-muted-foreground">
                              ${item.price.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleDeleteItem(item.itemId)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex flex-col items-center justify-center p-10 text-center">
                <CardHeader>
                  <CardTitle>No hay listas de compras</CardTitle>
                  <CardDescription>
                    Crea una nueva lista para empezar a añadir productos.
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
                <DialogTitle>Añadir precio</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
                <Label htmlFor="itemPrice">Precio</Label>
                <Input
                    id="itemPrice"
                    type="number"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="0.00"
                />
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" onClick={() => setItemToUpdate(null)} variant="outline">
                        Cancelar
                    </Button>
                </DialogClose>
                <Button
                    type="button"
                    onClick={handleSetItemPrice}
                    disabled={!itemPrice.trim()}
                >
                    Guardar
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
