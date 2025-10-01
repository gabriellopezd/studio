
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
  const imageUrl = image?.imageUrl;
  const imageHint = image?.imageHint;

  return (
    <Card className={cn('relative overflow-hidden', !imageUrl && 'border-0 shadow-none')}>
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={description || `Fondo para ${title}`}
          data-ai-hint={imageHint}
          fill
          className="object-cover"
          priority
        />
      )}
      <div
        className={cn(
          'relative',
          imageUrl && 'bg-gradient-to-t from-black/60 to-black/20 text-primary-foreground'
        )}
      >
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl font-bold tracking-tight uppercase sm:text-3xl">
                {title}
              </h1>
              {description && (
                <p
                  className={cn(
                    imageUrl ? 'text-white/80' : 'text-muted-foreground'
                  )}
                >
                  {description}
                </p>
              )}
              {motivation && (
                <p
                  className={cn(
                    'text-sm',
                    imageUrl ? 'text-white/70 italic' : 'text-muted-foreground'
                  )}
                >
                  {motivation}
                </p>
              )}
            </div>
            {children && (
              <div className="flex shrink-0 items-center gap-2">{children}</div>
            )}
          </div>
        </CardHeader>
      </div>
    </Card>
  );
}
