'use client';

import {
  Activity,
  CheckCircle2,
  ListTodo,
  Smile,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  dailyHabits,
  mainGoal,
  moods,
  urgentTasks,
} from '@/lib/placeholder-data';
import PageHeader from '@/components/page-header';
import { useState, useEffect } from 'react';

const chartData = [
  { month: 'Enero', goal: 186 },
  { month: 'Febrero', goal: 305 },
  { month: 'Marzo', goal: 237 },
  { month: 'Abril', goal: 73 },
  { month: 'Mayo', goal: 209 },
  { month: 'Junio', goal: 214 },
];

const chartConfig = {
  goal: {
    label: "Progreso",
    color: "hsl(var(--primary))",
  },
};

export default function Dashboard() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const completedHabits = dailyHabits.filter((h) => h.completed).length;
  const totalHabits = dailyHabits.length;
  const habitsProgress = totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0;
  
  const todayString = new Date().toLocaleDateString(
    'es-ES',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="Mi Día"
        description={isClient ? `Resumen de tu actividad para hoy, ${todayString}.` : 'Resumen de tu actividad para hoy.'}
      />
      <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5" />
              <span>Hábitos de Hoy</span>
            </CardTitle>
            <CardDescription>
              Has completado {completedHabits} de {totalHabits} hábitos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={habitsProgress} aria-label={`${habitsProgress}% de hábitos completados`} />
            <div className="space-y-2">
              {dailyHabits.map((habit) => (
                <div
                  key={habit.id}
                  className="flex items-center justify-between rounded-md bg-muted/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{habit.icon}</span>
                    <div>
                      <p className="font-medium">{habit.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Racha: {habit.streak} días
                      </p>
                    </div>
                  </div>
                  <Button variant={habit.completed ? 'secondary' : 'outline'} size="sm">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {habit.completed ? 'Completado' : 'Marcar'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="size-5" />
                <span>Tareas Pendientes</span>
              </CardTitle>
              <CardDescription>Tus tareas más urgentes.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {urgentTasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-3">
                    <div className="mt-1 h-4 w-4 rounded-full border border-primary" />
                    <div>
                      <p className="font-medium">{task.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Vence: {task.dueDate}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smile className="size-5" />
                <span>¿Cómo te sientes?</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-around">
              {moods.map((mood) => (
                <Button key={mood.level} variant="ghost" size="icon" className="h-14 w-14 rounded-full">
                  <span className="text-3xl">{mood.emoji}</span>
                  <span className="sr-only">{mood.label}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-5" />
              <span>Meta Principal</span>
            </CardTitle>
            <CardDescription>{mainGoal.name}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            <div
              className="relative flex h-40 w-40 items-center justify-center rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={mainGoal.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <svg className="absolute inset-0 h-full w-full -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="calc(50% - 10px)"
                  stroke="hsl(var(--border))"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="calc(50% - 10px)"
                  stroke="hsl(var(--primary))"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * mainGoal.progress) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="flex flex-col">
                <span className="text-4xl font-bold text-foreground">
                  {mainGoal.progress}%
                </span>
                <span className="text-sm text-muted-foreground">Completado</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {mainGoal.currentValue} / {mainGoal.targetValue} {mainGoal.unit}
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full">
              <TrendingUp className="mr-2 h-4 w-4" /> Actualizar Progreso
            </Button>
          </CardFooter>
        </Card>
         <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-5" />
                <span>Progreso de Metas</span>
              </CardTitle>
              <CardDescription>Progreso mensual de tus metas.</CardDescription>
            </CardHeader>
            <CardContent>
              {isClient && (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart accessibilityLayer data={chartData}>
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="goal" fill="var(--color-goal)" radius={8} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
