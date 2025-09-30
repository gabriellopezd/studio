
'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAppContext } from '@/app/_providers/AppContext';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const habitCategories = ["Productividad", "Conocimiento", "Social", "Físico", "Espiritual", "Hogar", "Profesional", "Relaciones Personales"];

export default function HabitSettingsPage() {
  const { firestore, user, presetHabits, allHabits, habitsLoading, presetHabitsLoading } = useAppContext();

  const combinedHabitTemplates = useMemo(() => {
    if (presetHabitsLoading || habitsLoading) return [];
    
    // Start with a clone of preset habits
    const allTemplates = [...presetHabits];
    
    // Create templates from user-created habits (those without a presetHabitId)
    const userCreatedHabitsAsTemplates = (allHabits || [])
        .filter(h => !h.presetHabitId) 
        .map(h => ({
            id: `user-${h.id}`, // A unique ID for the template view
            name: h.name,
            icon: h.icon,
            frequency: h.frequency,
            category: h.category,
            description: "Hábito creado por ti.",
            isUserCreated: true,
            originalId: h.id // Keep track of the original DB id
        }));

    // Add user-created templates if they don't already exist in the presets by name/category
    userCreatedHabitsAsTemplates.forEach(userHabit => {
        if (!allTemplates.some(t => t.name === userHabit.name && t.category === userHabit.category)) {
            allTemplates.push(userHabit);
        }
    });

    return allTemplates;
  }, [presetHabits, allHabits, presetHabitsLoading, habitsLoading]);


  const groupedHabits = useMemo(() => {
    if (!combinedHabitTemplates) return {};
    return combinedHabitTemplates.reduce((acc, habit) => {
      const category = habit.category || 'Sin Categoría';
      if (!acc[category]) acc[category] = [];
      acc[category].push(habit);
      return acc;
    }, {} as { [key: string]: any[] });
  }, [combinedHabitTemplates]);
  
  const handleToggleHabit = async (habitTemplate: any, isActive: boolean) => {
    if (!user || !firestore || !allHabits) return;

    if (isActive) {
        // DEACTIVATE: Find the user's habit and delete it.
        const habitToDelete = allHabits.find(h => 
            habitTemplate.isUserCreated 
                ? h.id === habitTemplate.originalId 
                : h.presetHabitId === habitTemplate.id
        );
        
        if (habitToDelete) {
            const habitRef = doc(firestore, 'users', user.uid, 'habits', habitToDelete.id);
            await deleteDocumentNonBlocking(habitRef);
        }
    } else {
        // ACTIVATE: Create a new habit for the user from the template.
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
            // Link to the preset ID if it's not a user-created habit
            presetHabitId: habitTemplate.isUserCreated ? null : habitTemplate.id, 
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
      >
        <Button variant="outline" asChild>
          <Link href="/habits">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Hábitos
          </Link>
        </Button>
      </PageHeader>
      
      {(presetHabitsLoading || habitsLoading) && <p>Cargando biblioteca de hábitos...</p>}

      <div className="space-y-8">
        {habitCategories.map(category => (
          groupedHabits[category] && groupedHabits[category].length > 0 && (
            <div key={category}>
              <h2 className="text-xl font-bold tracking-tight mb-4">
                {category}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {groupedHabits[category].map((habit: any) => {
                    // An habit is active if it exists in the user's `allHabits` collection.
                    // We check either by its original ID (if user-created) or by the preset ID it's linked to.
                    const isActive = allHabits?.some(h => 
                        habit.isUserCreated 
                            ? h.id === habit.originalId 
                            : h.presetHabitId === habit.id
                    );
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
                                    onCheckedChange={() => handleToggleHabit(habit, !!isActive)}
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
