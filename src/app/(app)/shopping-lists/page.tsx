import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { shoppingLists } from "@/lib/placeholder-data";
import { PlusCircle, Trash2 } from "lucide-react";

export default function ShoppingListsPage() {
  const mainList = shoppingLists[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Listas de Compras"
        description="Organiza tus compras y no olvides nada."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Lista
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Mis Listas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul>
                {shoppingLists.map(list => (
                  <li key={list.id}>
                    <Button variant={list.id === mainList.id ? 'secondary' : 'ghost'} className="w-full justify-start">
                      {list.name}
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{mainList.name}</CardTitle>
                <CardDescription>
                  {mainList.items.filter(i => i.isPurchased).length} de {mainList.items.length} items comprados
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Trash2 className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex w-full items-center space-x-2 mb-4">
                <Input type="text" placeholder="Añadir item..." />
                <Button>Añadir</Button>
              </div>
              <div className="space-y-3">
                {mainList.items.map(item => (
                  <div key={item.itemId} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50">
                    <Checkbox id={`item-${item.itemId}`} checked={item.isPurchased} />
                    <div className="flex-1">
                      <label htmlFor={`item-${item.itemId}`} className="cursor-pointer">
                        <span className={`${item.isPurchased ? 'text-muted-foreground line-through' : ''}`}>
                          {item.name} ({item.quantity})
                        </span>
                      </label>
                      {item.price && (
                        <p className="text-sm text-muted-foreground">
                          ${item.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
