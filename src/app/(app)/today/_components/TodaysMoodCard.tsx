
'use client';

import { useState } from 'react';
import { Smile } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { moodLevels, feelings, influences } from '@/lib/moods';
import { useAppContext } from '@/app/_providers/AppContext';

export function TodaysMoodCard() {
  const { todayMood, handleSaveMood } = useAppContext();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(1);

  const [selectedMood, setSelectedMood] = useState<{
    level: number;
    emoji: string;
    label: string;
  } | null>(null);
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const [selectedInfluences, setSelectedInfluences] = useState<string[]>([]);
  
  const resetForm = () => {
    setStep(1);
    setSelectedMood(null);
    setSelectedFeelings([]);
    setSelectedInfluences([]);
    setDialogOpen(false);
  };

  const handleStartMoodRegistration = () => {
    if (todayMood) {
      const mood = moodLevels.find(m => m.level === todayMood.moodLevel);
      setSelectedMood(mood || null);
      setSelectedFeelings(todayMood.feelings || []);
      setSelectedInfluences(todayMood.influences || []);
    } else {
      resetForm();
    }
    setStep(1);
    setDialogOpen(true);
  };

  const handleMoodSelect = (mood: {
    level: number;
    emoji: string;
    label: string;
  }) => {
    setSelectedMood(mood);
    setStep(2);
  };

  const handleToggleSelection = (
    item: string,
    selection: string[],
    setSelection: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setSelection((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smile className="size-5" />
            <span>¿Cómo te sientes?</span>
          </CardTitle>
          <CardDescription>Registra tu estado de ánimo de hoy.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleStartMoodRegistration} className="w-full mb-4">
            {todayMood ? (
              <>
                <span className="mr-2 text-lg">{todayMood.emoji}</span>
                Actualizar mi día
              </>
            ) : (
              'Registrar mi día'
            )}
          </Button>
          {todayMood && (
            <div className="space-y-4 text-sm">
                <div>
                    <h4 className="font-medium mb-2">Sentimientos:</h4>
                    <div className="flex flex-wrap gap-1">
                        {todayMood.feelings.map((feeling: string) => (
                            <Badge key={feeling} variant="secondary">{feeling}</Badge>
                        ))}
                    </div>
                </div>
                 <div>
                    <h4 className="font-medium mb-2">Influencias:</h4>
                    <div className="flex flex-wrap gap-1">
                        {todayMood.influences.map((influence: string) => (
                            <Badge key={influence} variant="secondary">{influence}</Badge>
                        ))}
                    </div>
                </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm() }}>
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
                  variant={selectedMood?.level === mood.level ? 'secondary' : 'ghost'}
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
                  variant={
                    selectedFeelings.includes(feeling) ? 'secondary' : 'outline'
                  }
                  onClick={() =>
                    handleToggleSelection(
                      feeling,
                      selectedFeelings,
                      setSelectedFeelings
                    )
                  }
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
                  variant={
                    selectedInfluences.includes(influence)
                      ? 'secondary'
                      : 'outline'
                  }
                  onClick={() =>
                    handleToggleSelection(
                      influence,
                      selectedInfluences,
                      setSelectedInfluences
                    )
                  }
                >
                  {influence}
                </Button>
              ))}
            </div>
          )}

          <DialogFooter>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                Atrás
              </Button>
            )}
            {step < 3 && (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 1 && !selectedMood) || (step === 2 && selectedFeelings.length === 0)}
              >
                Siguiente
              </Button>
            )}
            {step === 3 && (
              <Button
                onClick={onSaveMood}
                disabled={selectedInfluences.length === 0}
              >
                Guardar Registro
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
