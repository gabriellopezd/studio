
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

    const allTemplates = [...(presetHabits || [])].map(p => ({ ...p, isUserCreated: false }));

    const userCreatedHabitsAsTemplates = (allHabits || [])
        .filter(h => !h.presetHabitId) 
        .map(h => ({
            id: `user-${h.id}`,
            name: h.name,
            icon: h.icon,
            frequency: h.frequency,
            category: h.category,
            description: "Hábito creado por ti.",
            isUserCreated: true,
            originalId: h.id 
        }));

    userCreatedHabitsAsTemplates.forEach(userHabit => {
        if (!allTemplates.some(t => t.name === userHabit.name && t.category === userHabit.category)) {
            allTemplates.push(userHabit);
        }
    });

    return allTemplates;
  }, [presetHabits, allHabits, presetHabitsLoading, habitsLoading]);


  const groupedHabits = useMemo(() => {
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
            presetHabitId: habitTemplate.isUserCreated ? null : habitTemplate.id, 
        };
        const habitsColRef = collection(firestore, 'users', user.uid, 'habits');
        await addDocumentNonBlocking(habitsColRef, newHabit);
    }
  };


  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configurar Biblioteca de Hábitos"
        description="Activa o desactiva los hábitos sugeridos y los que has creado para personalizar tu experiencia."
        imageUrl="https://picsum.photos/seed/habits/1200/300"
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
