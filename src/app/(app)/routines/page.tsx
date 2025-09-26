'use client';

import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Play, PlusCircle } from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function RoutinesPage() {
  const { firestore, user } = useFirebase();

  const routinesQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'routines') : null),
    [firestore, user]
  );
  const { data: routines, isLoading: routinesLoading } =
    useCollection(routinesQuery);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rutinas"
        description="Crea y sigue tus rutinas diarias para construir consistencia."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Rutina
        </Button>
      </PageHeader>

      {routinesLoading && <p>Cargando rutinas...</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {routines?.map((routine) => (
          <Card key={routine.id}>
            <CardHeader>
              <CardTitle>{routine.name}</CardTitle>
              <CardDescription>{routine.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {routine.habits?.map((habit: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm"
                  >
                    <span>{habit.icon}</span>
                    <span>{habit.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardContent>
              <Button className="w-full">
                <Play className="mr-2 h-4 w-4" />
                Comenzar Rutina
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
