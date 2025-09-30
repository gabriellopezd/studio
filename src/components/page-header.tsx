
import type { ReactNode } from 'react';
import { Card, CardHeader } from '@/components/ui/card';

type PageHeaderProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <Card>
        <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight uppercase sm:text-3xl">
                    {title}
                    </h1>
                    <p className="text-muted-foreground">{description}</p>
                </div>
                {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
            </div>
        </CardHeader>
    </Card>
  );
}

    