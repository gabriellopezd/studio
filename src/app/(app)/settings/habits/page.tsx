
'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAppContext } from '@/app/_providers/AppContext';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';

const habitCategories = ["Productividad", "Conocimiento", "Social", "Físico", "Espiritual", "Hogar", "Profesional", "Relaciones Personales"];

export default function HabitSettingsPage() {
  const { firestore, user, presetHabits, presetHabitsLoading, allHabits } = useAppContext();

  const combinedHabitTemplates = useMemo(() => {
    if (!presetHabits || !allHabits) return [];
    
    const allTemplates = [...presetHabits];
    const userCreatedHabitsAsTemplates = allHabits
        .filter(h => !h.presetHabitId) // Only habits created from scratch
        .map(h => ({
            id: `user-${h.id}`, // Create a unique ID for the template view
            name: h.name,
            icon: h.icon,
            frequency: h.frequency,
            category: h.category,
            description: "Hábito creado por ti.",
            isUserCreated: true,
            originalId: h.id
        }));

    // Add user-created habits, avoiding duplicates by name within the same category
    userCreatedHabitsAsTemplates.forEach(userHabit => {
        if (!allTemplates.some(t => t.name === userHabit.name && t.category === userHabit.category)) {
            allTemplates.push(userHabit);
        }
    });

    return allTemplates;
  }, [presetHabits, allHabits]);


  const groupedHabits = useMemo(() => {
    if (!combinedHabitTemplates) return {};
    return combinedHabitTemplates.reduce((acc, habit) => {
      const category = habit.category || 'Sin Categoría';
      if (!acc[category]) acc[category] = [];
      acc[category].push(habit);
      return acc;
    }, {} as { [key: string]: any[] });
  }, [combinedHabitTemplates]);
  
  const handleTogglePresetHabit = async (habitTemplate: any, isActive: boolean) => {
    if (!user || !firestore) return;

    if (isActive) {
        // Deactivate: Find user's habit and delete it
        const habitIdToDelete = habitTemplate.isUserCreated 
            ? habitTemplate.originalId 
            : allHabits?.find(h => h.presetHabitId === habitTemplate.id)?.id;
        
        if (habitIdToDelete) {
            const habitRef = doc(firestore, 'users', user.uid, 'habits', habitIdToDelete);
            await deleteDocumentNonBlocking(habitRef);
        }
    } else {
        // Activate: Create a new habit for the user from the template
        if(habitTemplate.isUserCreated){
             // If it's a user habit that was deleted, we "re-create" it
             const reCreatedHabit = {
                name: habitTemplate.name,
                icon: habitTemplate.icon,
                frequency: habitTemplate.frequency,
                category: habitTemplate.category,
                currentStreak: 0,
                longestStreak: 0,
                createdAt: serverTimestamp(),
                lastCompletedAt: null,
                userId: user.uid,
                presetHabitId: null, // It's a user habit, not from a global preset
            };
            const habitsColRef = collection(firestore, 'users', user.uid, 'habits');
            await addDocumentNonBlocking(habitsColRef, reCreatedHabit);
        } else {
            const newHabit = {
                name: habitTemplate.name,
                icon: habitTemplate.icon,
                frequency: habitTemplate.frequency,
                category: habitTemplate.category,
                currentStreak: 0,
                longestStreak: 0,
                createdAt: serverTimestamp(),
                lastCompletedAt: null,
                userId: user.uid,
                presetHabitId: habitTemplate.id, // Link to the preset
            };
            const habitsColRef = collection(firestore, 'users', user.uid, 'habits');
            await addDocumentNonBlocking(habitsColRef, newHabit);
        }
    }
  };


  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configurar Hábitos Preestablecidos"
        description="Activa o desactiva los hábitos sugeridos para personalizar tu experiencia."
      />
      
      {(presetHabitsLoading || !allHabits) && <p>Cargando biblioteca de hábitos...</p>}

      <div className="space-y-8">
        {habitCategories.map(category => (
          groupedHabits[category] && groupedHabits[category].length > 0 && (
            <div key={category}>
              <h2 className="text-xl font-bold tracking-tight mb-4">
                {category}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {groupedHabits[category].map((habit: any) => {
                    const isActive = habit.isUserCreated
                        ? allHabits?.some(h => h.id === habit.originalId)
                        : allHabits?.some(h => h.presetHabitId === habit.id);
                    return (
                        <Card key={habit.id}>
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-3xl">{habit.icon}</span>
                                    <div>
                                        <CardTitle className="text-lg">{habit.name}</CardTitle>
                                        <CardDescription>{habit.description}</CardDescription>
                                    </div>
                                </div>
                                <Switch
                                    checked={!!isActive}
                                    onCheckedChange={() => handleTogglePresetHabit(habit, !!isActive)}
                                    aria-label={`Activar hábito ${habit.name}`}
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
