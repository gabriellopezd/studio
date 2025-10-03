

'use client';

import PageHeader from '@/components/page-header';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronRight, Heart, Wind } from 'lucide-react';
import Link from 'next/link';

export default function MoodSettingsPage() {
  const cards = [
    {
      href: '/settings/mood/feelings',
      icon: Heart,
      title: 'Gestionar Sentimientos',
      description: 'Personaliza la lista de sentimientos que usas para registrar tu ánimo.',
    },
    {
      href: '/settings/mood/influences',
      icon: Wind,
      title: 'Gestionar Influencias',
      description: 'Añade, edita o elimina los factores que influyen en tu estado de ánimo.',
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Personalizar Ánimo"
        description="Ajusta las opciones del rastreador de ánimo para que se adapten mejor a ti."
        imageId="settings-sub-header"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <Link href={card.href} key={card.href} className="block hover:bg-muted/50 rounded-lg border">
            <Card className="h-full shadow-none border-none bg-transparent">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <card.icon className="size-6 text-primary" />
                  <div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <CardDescription className="text-xs">{card.description}</CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
