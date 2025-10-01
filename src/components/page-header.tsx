import type { ReactNode } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { PlaceHolderImages, type ImagePlaceholder } from '@/lib/placeholder-images';

type PageHeaderProps = {
  title: string;
  description?: string;
  motivation?: string;
  imageId?: string;
  children?: ReactNode;
};

export default function PageHeader({
  title,
  description,
  motivation,
  imageId,
  children,
}: PageHeaderProps) {
  const image: ImagePlaceholder | undefined = imageId ? PlaceHolderImages.find(img => img.id === imageId) : undefined;

  return (
    <Card className={cn('group relative overflow-hidden border-0 shadow-none', image && 'min-h-[200px] flex items-center justify-center')}>
      {image?.imageUrl && (
        <Image
          src={image.imageUrl}
          alt={image.description || `Fondo para ${title}`}
          data-ai-hint={image.imageHint}
          fill
          className="object-cover"
          priority
        />
      )}
       <div className={cn('absolute inset-0', image?.imageUrl && 'bg-black/50')} />
      <div className={cn('relative w-full', image?.imageUrl && 'text-primary-foreground')}>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight uppercase sm:text-3xl">
                {title}
              </h1>
              {description && (
                <p
                  className={cn(
                    image?.imageUrl ? 'text-white/80' : 'text-muted-foreground'
                  )}
                >
                  {description}
                </p>
              )}
              {motivation && (
                <p
                  className={cn(
                    'text-sm',
                    image?.imageUrl ? 'text-white/70 italic' : 'text-muted-foreground'
                  )}
                >
                  {motivation}
                </p>
              )}
            </div>
            {children && (
              <div className="flex shrink-0 items-center gap-2 [&_[data-variant=outline]]:bg-black/20 [&_[data-variant=outline]]:border-primary-foreground/50 [&_[data-variant=outline]]:text-primary-foreground [&_[data-variant=outline]]:hover:bg-black/40 [&_[data-variant=outline]]:hover:text-primary-foreground">{children}</div>
            )}
          </div>
        </CardHeader>
      </div>
    </Card>
  );
}
