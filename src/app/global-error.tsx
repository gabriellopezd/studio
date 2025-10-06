
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TriangleAlert } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <TriangleAlert className="h-6 w-6 text-destructive" />
                    </div>
                    <CardTitle className="mt-4 text-2xl font-bold">Algo salió mal</CardTitle>
                    <CardDescription>
                        Lo sentimos, pero hemos encontrado un error inesperado.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Puedes intentar recargar la página o volver al inicio.
                    </p>
                    <div className="mt-6 flex justify-center gap-4">
                        <Button onClick={handleReload}>
                            Recargar Página
                        </Button>
                        <Button variant="outline" asChild>
                            <a href="/dashboard">Volver al Inicio</a>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      </body>
    </html>
  );
}
