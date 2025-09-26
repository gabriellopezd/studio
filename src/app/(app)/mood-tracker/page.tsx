'use client';

import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { moods as moodOptions } from '@/lib/moods';
import {
  useFirebase,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
} from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';

const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);

export default function MoodTrackerPage() {
  const { firestore, user } = useFirebase();

  const moodsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'moods') : null),
    [firestore, user]
  );
  const { data: moods, isLoading: moodsLoading } = useCollection(moodsQuery);

  const handleMoodSelect = (moodLevel: number, emoji: string) => {
    if (!user) return;
    const moodsColRef = collection(firestore, 'users', user.uid, 'moods');
    addDocumentNonBlocking(moodsColRef, {
      moodLevel,
      emoji,
      date: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
  };

  const getMoodForDay = (day: number) => {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth(), day);
    const moodEntry = moods?.find(
      (mood) =>
        new Date(mood.date).toDateString() === date.toDateString()
    );
    return moodEntry;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="RASTREADOR DE ÁNIMO"
        description="Registra tu ánimo diario y observa tus tendencias emocionales."
      />

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="mb-4 text-center font-bold text-lg">Junio 2024</div>
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
                      : day < new Date().getDate()
                      ? '⚪'
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
                className="h-16 w-16 rounded-full hover:bg-muted"
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
