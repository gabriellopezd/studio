import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
