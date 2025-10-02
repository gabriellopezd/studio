
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ResponsiveCalendarProps {
  value: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  id?: string;
}

// Helper function to format a Date object to a 'yyyy-mm-dd' string
function formatDateToInput(date: Date | undefined): string {
  if (!date) return '';
  // Adjust for timezone offset to prevent off-by-one-day errors
  const adjustedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjustedDate.toISOString().split('T')[0];
}

export function ResponsiveCalendar({
  value,
  onSelect,
  id,
}: ResponsiveCalendarProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = event.target.value;
    if (dateValue) {
      // The input value is a string 'YYYY-MM-DD'. The Date constructor
      // correctly interprets this in the local timezone.
      const newDate = new Date(dateValue + 'T00:00:00');
      onSelect(newDate);
    } else {
      onSelect(undefined);
    }
  };

  return (
    <Input
      id={id}
      type="date"
      value={formatDateToInput(value)}
      onChange={handleChange}
      className="w-full"
    />
  );
}
