
'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ResponsiveCalendarProps {
  value: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel?: string;
}

export function ResponsiveCalendar({
  value,
  onSelect,
  open,
  onOpenChange,
  triggerLabel = 'Selecciona una fecha',
}: ResponsiveCalendarProps) {
  const isMobile = useIsMobile();

  const handleSelect = (date: Date | undefined) => {
    onSelect(date);
    onOpenChange(false); // Close after selection
  };

  const TriggerButton = () => (
    <Button
      variant={'outline'}
      className={cn(
        'w-full justify-start text-left font-normal',
        !value && 'text-muted-foreground'
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {value ? format(value, 'PPP', { locale: es }) : <span>{triggerLabel}</span>}
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <TriggerButton />
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{triggerLabel}</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center py-4">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleSelect}
              initialFocus
            />
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Cerrar</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <TriggerButton />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

