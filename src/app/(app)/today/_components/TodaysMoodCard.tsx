
'use client';

import { useState } from 'react';
import { Smile } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/app/_providers/AppProvider';
import Link from 'next/link';

export function TodaysMoodCard() {
  const { todayMood } = useAppContext();

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
          <Button asChild className="w-full mb-4">
            <Link href="/mood-tracker">
                {todayMood ? (
                <>
                    <span className="mr-2 text-lg">{todayMood.emoji}</span>
                    Actualizar mi día
                </>
                ) : (
                'Registrar mi día'
                )}
            </Link>
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
    </>
  );
}
