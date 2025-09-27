'use client';

import {
  Smile,
  CalendarDays,
  Heart,
  Wind,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import PageHeader from '@/components/page-header';
import { useState, useEffect, useMemo } from 'react';
import {
  useCollection,
  useFirebase,
} from '@/firebase';
import {
  collection,
  query,
  where,
} from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
};

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const { firestore, user } = useFirebase();
  
  const today = useMemo(() => new Date(), []);
  
  const startOfWeek = useMemo(() => getStartOfWeek(today), [today]);

  const moodsQuery = useMemo(() => {
    if (!user) return null;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    return query(
      collection(firestore, 'users', user.uid, 'moods'),
      where('date', '>=', startOfMonth.toISOString()),
      where('date', '<=', endOfMonth.toISOString())
    );
  }, [firestore, user]);

  const { data: moods, isLoading: moodsLoading } = useCollection(moodsQuery);
  
  const feelingStats = useMemo(() => {
    if (!moods) return [];
    const counts = moods.flatMap(m => m.feelings).reduce((acc, feeling) => {
        acc[feeling] = (acc[feeling] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
  }, [moods]);

  const influenceStats = useMemo(() => {
      if (!moods) return [];
      const counts = moods.flatMap(m => m.influences).reduce((acc, influence) => {
          acc[influence] = (acc[influence] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);

      return Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);
  }, [moods]);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        days.push(day);
    }
    return days;
  }, [startOfWeek]);
  
  const getMoodForDay = (day: Date) => {
    return moods?.find(mood => isSameDay(new Date(mood.date), day));
  };
  
  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  useEffect(() => {
    setIsClient(true);
  }, []);

  const todayString = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard de Bienestar"
        description={
          isClient
            ? `Tu resumen emocional para hoy, ${todayString}.`
            : 'Tu resumen emocional.'
        }
      />
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5" />
              <span>Historial de Ánimo</span>
            </CardTitle>
            <CardDescription>Tu registro emocional de la semana.</CardDescription>
          </CardHeader>
          <CardContent>
             {moodsLoading && <p>Cargando historial de ánimo...</p>}
             <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, index) => {
                  const moodEntry = getMoodForDay(day);
                  const isFuture = day > today && !isSameDay(day, today);
                  return (
                    <div
                      key={day.toISOString()}
                      className="flex aspect-square flex-col items-center justify-center rounded-lg border bg-card p-2 text-center"
                    >
                      <span className="text-sm text-muted-foreground">{dayLabels[index]}</span>
                      <span className="text-2xl mt-1">
                        {moodEntry
                          ? moodEntry.emoji
                          : !isFuture ? '⚪' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Heart className="size-5 text-red-500"/>
                    Sentimientos Frecuentes del Mes
                </CardTitle>
                 <CardDescription>Los sentimientos que más has registrado.</CardDescription>
            </CardHeader>
            <CardContent>
                {moodsLoading && <p>Cargando...</p>}
                {feelingStats.length > 0 ? (
                     <ul className="space-y-2">
                        {feelingStats.map(([feeling, count]) => (
                            <li key={feeling} className="flex justify-between items-center text-sm">
                                <span>{feeling}</span>
                                <Badge variant="secondary">{count} {count > 1 ? 'veces' : 'vez'}</Badge>
                            </li>
                        ))}
                    </ul>
                ) : (
                    !moodsLoading && <p className="text-sm text-muted-foreground">No hay suficientes datos este mes.</p>
                )}
            </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Wind className="size-5 text-blue-500"/>
                    Influencias Comunes del Mes
                </CardTitle>
                <CardDescription>Lo que más ha impactado tu ánimo.</CardDescription>
            </CardHeader>
            <CardContent>
                {moodsLoading && <p>Cargando...</p>}
                {influenceStats.length > 0 ? (
                    <ul className="space-y-2">
                        {influenceStats.map(([influence, count]) => (
                            <li key={influence} className="flex justify-between items-center text-sm">
                                <span>{influence}</span>
                                <Badge variant="secondary">{count} {count > 1 ? 'veces' : 'vez'}</Badge>
                            </li>
                        ))}
                    </ul>
                ) : (
                    !moodsLoading && <p className="text-sm text-muted-foreground">No hay suficientes datos este mes.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
