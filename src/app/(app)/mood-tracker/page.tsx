import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { moods } from "@/lib/placeholder-data";

const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);

export default function MoodTrackerPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rastreador de Ánimo"
        description="Registra tu ánimo diario y observa tus tendencias emocionales."
      />

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="mb-4 text-center font-bold text-lg">
            Junio 2024
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map(day => (
              <div key={day} className="flex aspect-square flex-col items-center justify-center rounded-lg border bg-card p-2 text-center">
                <span className="text-sm text-muted-foreground">{day}</span>
                <span className="text-2xl mt-1">
                  {day < 18 ? moods[day % moods.length].emoji : '⚪'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-center text-lg font-medium">¿Cómo te sientes hoy?</h3>
          <div className="flex justify-around">
            {moods.map((mood) => (
              <Button key={mood.level} variant="ghost" size="icon" className="h-16 w-16 rounded-full hover:bg-muted">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-3xl">{mood.emoji}</span>
                  <span className="text-xs text-muted-foreground">{mood.label}</span>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
