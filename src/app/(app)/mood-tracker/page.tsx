'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  useFirebase,
  useCollection,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, serverTimestamp, query, where, getDocs, doc } from 'firebase/firestore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { moodLevels, feelings, influences } from '@/lib/moods';


export default function MoodTrackerPage() {
  const { firestore, user } = useFirebase();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  
  const [selectedMood, setSelectedMood] = useState<{ level: number; emoji: string; label: string } | null>(null);
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const [selectedInfluences, setSelectedInfluences] = useState<string[]>([]);

  const moodsQuery = useMemo(() => {
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

  const resetForm = () => {
    setStep(1);
    setSelectedMood(null);
    setSelectedFeelings([]);
    setSelectedInfluences([]);
    setDialogOpen(false);
  };
  
  const handleStartMoodRegistration = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleMoodSelect = (mood: {level: number; emoji: string; label: string}) => {
    setSelectedMood(mood);
    setStep(2);
  };
  
  const handleToggleSelection = (
    item: string,
    selection: string[],
    setSelection: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setSelection(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleSaveMood = async () => {
    if (!user || !selectedMood) return;

    const today = new Date();
    const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const moodData = {
      moodLevel: selectedMood.level,
      moodLabel: selectedMood.label,
      emoji: selectedMood.emoji,
      feelings: selectedFeelings,
      influences: selectedInfluences,
      date: new Date().toISOString(),
      userId: user.uid
    };

    const moodsColRef = collection(firestore, 'users', user.uid, 'moods');
    const q = query(moodsColRef, where('date', '>=', `${todayISO}T00:00:00.000Z`), where('date', '<=', `${todayISO}T23:59:59.999Z`));

    try {
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Update existing document for today
        const existingDocRef = querySnapshot.docs[0].ref;
        await updateDocumentNonBlocking(existingDocRef, moodData);
      } else {
        // Create a new document for today
        const newDocRef = doc(moodsColRef);
        await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'moods'), {
          ...moodData,
          id: newDocRef.id,
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      // The non-blocking updates will handle permission errors via the emitter
      console.error("Error saving mood", e);
    }
    
    resetForm();
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
    <>
    <div className="flex flex-col gap-6">
      <PageHeader
        title="RASTREADOR DE ÁNIMO"
        description="Registra tu ánimo diario y observa tus tendencias emocionales."
      >
        <Button onClick={handleStartMoodRegistration}>
          {todayEntry ? 'Actualizar mi día' : 'Registrar mi día'}
        </Button>
      </PageHeader>

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
    </div>

    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
                {step === 1 && '¿Cómo te sientes hoy?'}
                {step === 2 && '¿Qué características describen mejor lo que sientes?'}
                {step === 3 && '¿Qué es lo que más está influyendo en tu ánimo?'}
            </DialogTitle>
          </DialogHeader>

          {step === 1 && (
             <div className="flex justify-around py-6">
                {moodLevels.map((mood) => (
                  <Button
                    key={mood.level}
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoodSelect(mood)}
                    className="h-20 w-20 rounded-full"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-4xl">{mood.emoji}</span>
                      <span className="text-xs text-muted-foreground text-center">
                        {mood.label}
                      </span>
                    </div>
                  </Button>
                ))}
            </div>
          )}

          {step === 2 && (
             <div className="flex flex-wrap gap-2 justify-center py-4">
                {feelings.map((feeling) => (
                    <Button 
                        key={feeling} 
                        variant={selectedFeelings.includes(feeling) ? 'secondary' : 'outline'}
                        onClick={() => handleToggleSelection(feeling, selectedFeelings, setSelectedFeelings)}
                    >
                      {feeling}
                    </Button>
                ))}
             </div>
          )}

           {step === 3 && (
             <div className="flex flex-wrap gap-2 justify-center py-4">
                {influences.map((influence) => (
                    <Button 
                        key={influence} 
                        variant={selectedInfluences.includes(influence) ? 'secondary' : 'outline'}
                        onClick={() => handleToggleSelection(influence, selectedInfluences, setSelectedInfluences)}
                    >
                      {influence}
                    </Button>
                ))}
             </div>
          )}

          <DialogFooter>
             {step > 1 && (
                <Button variant="outline" onClick={() => setStep(s => s - 1)}>
                    Atrás
                </Button>
             )}
             {step < 3 && (
                <Button onClick={() => setStep(s => s + 1)} disabled={step === 1 && !selectedMood || step === 2 && selectedFeelings.length === 0}>
                    Siguiente
                </Button>
             )}
              {step === 3 && (
                <Button onClick={handleSaveMood} disabled={selectedInfluences.length === 0}>
                    Guardar Registro
                </Button>
             )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
