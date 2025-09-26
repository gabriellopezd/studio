'use client';

import { useState } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { moods as moodOptions } from '@/lib/moods';
import {
  useFirebase,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking
} from '@/firebase';
import { collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function MoodTrackerPage() {
  const { firestore, user } = useFirebase();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const moodsQuery = useMemoFirebase(() => {
    if (!user) return null;
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    return query(
      collection(firestore, 'users', user.uid, 'moods'),
      where('date', '>=', start.toISOString()),
      where('date', '<=', end.toISOString())
    );
  }, [firestore, user, currentMonth]);
  
  const { data: moods, isLoading: moodsLoading } = useCollection(moodsQuery);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleMoodSelect = async (moodLevel: number, emoji: string) => {
    if (!user) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const todayISO = today.toISOString().split('T')[0];

    const moodsColRef = collection(firestore, 'users', user.uid, 'moods');
    
    // Check if there's already an entry for today
    const q = query(collection(firestore, 'users', user.uid, 'moods'), where('date', '>=', `${todayISO}T00:00:00.000Z`), where('date', '<=', `${todayISO}T23:59:59.999Z`));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Update existing entry
      const existingDoc = querySnapshot.docs[0];
      updateDocumentNonBlocking(existingDoc.ref, { moodLevel, emoji });
    } else {
      // Add new entry
      addDocumentNonBlocking(moodsColRef, {
        moodLevel,
        emoji,
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });
    }
  };

  const getMoodForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const moodEntry = moods?.find(
      (mood) =>
        new Date(mood.date).toDateString() === date.toDateString()
    );
    return moodEntry;
  };
  
  const changeMonth = (offset: number) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
      return newMonth;
    });
  };
  
  const todayEntry = moods?.find(m => new Date(m.date).toDateString() === new Date().toDateString());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="RASTREADOR DE ÁNIMO"
        description="Registra tu ánimo diario y observa tus tendencias emocionales."
      />

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-center font-bold text-lg">
              {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h2>
            <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {moodsLoading && <p>Cargando historial de ánimo...</p>}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const moodEntry = getMoodForDay(day);
              return (
                <div
                  key={day}
                  className="flex aspect-square flex-col items-center justify-center rounded-lg border bg-card p-2 text-center"
                >
                  <span className="text-sm text-muted-foreground">{day}</span>
                  <span className="text-2xl mt-1">
                    {moodEntry
                      ? moodEntry.emoji
                      : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-center text-lg font-medium">
            ¿Cómo te sientes hoy?
          </h3>
          <div className="flex justify-around">
            {moodOptions.map((mood) => (
              <Button
                key={mood.level}
                variant="ghost"
                size="icon"
                onClick={() => handleMoodSelect(mood.level, mood.emoji)}
                className={`h-16 w-16 rounded-full hover:bg-muted ${todayEntry?.moodLevel === mood.level ? 'bg-muted border-2 border-primary' : ''}`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-3xl">{mood.emoji}</span>
                  <span className="text-xs text-muted-foreground">
                    {mood.label}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
