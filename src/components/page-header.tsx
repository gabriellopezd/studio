
import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardHeader } from '@/components/ui/card';

type PageHeaderProps = {
  title: string;
  description: string;
  motivation?: string;
  children?: ReactNode;
};

export default function PageHeader({ title, description, motivation, children }: PageHeaderProps) {
  return (
    <Card>
        <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight uppercase sm:text-3xl">
                    {title}
                    </h1>
                    <p className="text-muted-foreground">{description}</p>
                    {motivation && (
                        <p className="flex items-center gap-2 pt-1 text-sm italic text-amber-600 dark:text-amber-400">
                            <Sparkles className="h-4 w-4" />
                            {motivation}
                        </p>
                    )}
                </div>
                {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
            </div>
        </CardHeader>
    </Card>
  );
}
