
'use client';

import { Input } from '@/components/ui/input';

interface ResponsiveCalendarProps {
  value: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  id?: string;
}

// Helper function to format a Date object to a 'yyyy-mm-dd' string
function formatDateToInput(date: Date | undefined): string {
    if (!date) return '';

    let dateObject = date;
    // If the date is a Firestore Timestamp object, convert it to a JS Date
    if (date && typeof (date as any).toDate === 'function') {
        dateObject = (date as any).toDate();
    }
    
    // Ensure it's a valid Date object before trying to format
    if (!(dateObject instanceof Date) || isNaN(dateObject.getTime())) {
        return '';
    }

    const year = dateObject.getFullYear();
    const month = (dateObject.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObject.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
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
