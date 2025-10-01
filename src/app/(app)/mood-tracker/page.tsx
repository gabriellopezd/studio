
'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Heart, Wind } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { moodLevels, feelings, influences } from '@/lib/moods';
import { useAppContext } from '@/app/_providers/AppContext';

const motivationalQuotes = [
    "Tus emociones son válidas. Escúchalas.",
    "Comprender tu ánimo es el primer paso para mejorarlo.",
    "Cada sentimiento es un dato. Úsalo para conocerte mejor.",
    "Reconocer cómo te sientes es un acto de valentía.",
    "El autoconocimiento emocional es una superpotencia."
];

export default function MoodTrackerPage() {
  const { 
    currentMonth, 
    setCurrentMonth,
    moods, 
    moodsLoading,
    feelingStats,
    influenceStats,
    handleSaveMood,
  } = useAppContext();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  
  const [selectedMood, setSelectedMood] = useState<{ level: number; emoji: string; label: string } | null>(null);
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const [selectedInfluences, setSelectedInfluences] = useState<string[]>([]);
  const [motivation, setMotivation] = useState('');

  useEffect(() => {
    setMotivation(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

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

  const onSaveMood = async () => {
    if (!selectedMood) return;
    await handleSaveMood({
      moodLevel: selectedMood.level,
      moodLabel: selectedMood.label,
      emoji: selectedMood.emoji,
      feelings: selectedFeelings,
      influences: selectedInfluences,
    });
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
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };
  
  const todayEntry = moods?.find(m => new Date(m.date).toDateString() === new Date().toDateString());

  return (
    <>
    <div className="flex flex-col gap-6">
      <PageHeader
        title="RASTREADOR DE ÁNIMO"
        description="Registra tu ánimo diario y observa tus tendencias emocionales."
        motivation={motivation}
        imageUrl="https://picsum.photos/seed/mood/1200/300"
      >
        <Button onClick={handleStartMoodRegistration}>
          {todayEntry ? 'Actualizar mi día' : 'Registrar mi día'}
        </Button>
      </PageHeader>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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

        <div className="lg:col-span-1 flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Heart className="size-5 text-red-500"/>
                        Sentimientos Frecuentes
                    </CardTitle>
                </CardHeader>
                <CardContent>
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
                        <p className="text-sm text-muted-foreground">No hay suficientes datos este mes.</p>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Wind className="size-5 text-blue-500"/>
                        Influencias Comunes
                    </CardTitle>
                </CardHeader>
                <CardContent>
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
                        <p className="text-sm text-muted-foreground">No hay suficientes datos este mes.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
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
                <Button onClick={() => setStep(s => s + 1)} disabled={(step === 1 && !selectedMood) || (step === 2 && selectedFeelings.length === 0)}>
                    Siguiente
                </Button>
             )}
              {step === 3 && (
                <Button onClick={onSaveMood} disabled={selectedInfluences.length === 0}>
                    Guardar Registro
                </Button>
             )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
