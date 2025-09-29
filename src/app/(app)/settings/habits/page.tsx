
'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAppContext } from '@/app/_providers/AppContext';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';

const habitCategories = ["Productividad", "Conocimiento", "Social", "Físico", "Espiritual", "Hogar", "Profesional", "Relaciones Personales"];

export default function HabitSettingsPage() {
  const { firestore, user, presetHabits, presetHabitsLoading, allHabits } = useAppContext();

  const groupedPresetHabits = useMemo(() => {
    if (!presetHabits) return {};
    return presetHabits.reduce((acc, habit) => {
      const category = habit.category || 'Sin Categoría';
      if (!acc[category]) acc[category] = [];
      acc[category].push(habit);
      return acc;
    }, {} as { [key: string]: any[] });
  }, [presetHabits]);
  
  const handleTogglePresetHabit = async (presetHabit: any, isActive: boolean) => {
    if (!user || !firestore) return;

    if (isActive) {
        // Deactivate: Find user's habit linked to this preset and delete it
        const habitToDelete = allHabits?.find(h => h.presetHabitId === presetHabit.id);
        if (habitToDelete) {
            const habitRef = doc(firestore, 'users', user.uid, 'habits', habitToDelete.id);
            await deleteDocumentNonBlocking(habitRef);
        }
    } else {
        // Activate: Create a new habit for the user from the preset
        const newHabit = {
            name: presetHabit.name,
            icon: presetHabit.icon,
            frequency: presetHabit.frequency,
            category: presetHabit.category,
            currentStreak: 0,
            longestStreak: 0,
            createdAt: serverTimestamp(),
            lastCompletedAt: null,
            userId: user.uid,
            presetHabitId: presetHabit.id, // Link to the preset
        };
        const habitsColRef = collection(firestore, 'users', user.uid, 'habits');
        await addDocumentNonBlocking(habitsColRef, newHabit);
    }
  };


  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configurar Hábitos Preestablecidos"
        description="Activa o desactiva los hábitos sugeridos para personalizar tu experiencia."
      />
      
      {presetHabitsLoading && <p>Cargando hábitos preestablecidos...</p>}

      <div className="space-y-8">
        {habitCategories.map(category => (
          groupedPresetHabits[category] && groupedPresetHabits[category].length > 0 && (
            <div key={category}>
              <h2 className="text-xl font-bold tracking-tight mb-4">
                {category}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {groupedPresetHabits[category].map((preset: any) => {
                    const isActive = allHabits?.some(h => h.presetHabitId === preset.id);
                    return (
                        <Card key={preset.id}>
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-3xl">{preset.icon}</span>
                                    <div>
                                        <CardTitle className="text-lg">{preset.name}</CardTitle>
                                        <CardDescription>{preset.description}</CardDescription>
                                    </div>
                                </div>
                                <Switch
                                    checked={!!isActive}
                                    onCheckedChange={() => handleTogglePresetHabit(preset, !!isActive)}
                                    aria-label={`Activar hábito ${preset.name}`}
                                />
                            </CardHeader>
                        </Card>
                    )
                })}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
