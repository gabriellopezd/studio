import { Timestamp } from 'firebase/firestore';

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

const isSameDay = (d1: Date, d2: Date) => {
  d1.setHours(0,0,0,0);
  d2.setHours(0,0,0,0);
  return d1.getTime() === d2.getTime();
};

const isSameWeek = (d1: Date, d2: Date) => {
  const startOfWeek1 = getStartOfWeek(d1);
  const startOfWeek2 = getStartOfWeek(d2);
  return isSameDay(startOfWeek1, startOfWeek2);
};

const isPreviousDay = (d1: Date, d2: Date) => {
  const yesterday = new Date(d1);
  yesterday.setDate(d1.getDate() - 1);
  return isSameDay(d2, yesterday);
};

const isPreviousWeek = (d1: Date, d2: Date) => {
  const lastWeek = new Date(d1);
  lastWeek.setDate(d1.getDate() - 7);
  return isSameWeek(d2, lastWeek);
};

export function isHabitCompletedToday(habit: any) {
    if (!habit || !habit.lastCompletedAt) return false;
    const lastCompletedDate = (habit.lastCompletedAt as Timestamp).toDate();
    const today = new Date();
    
    switch (habit.frequency) {
        case 'Semanal':
            return isSameWeek(lastCompletedDate, today);
        case 'Diario':
        default:
            return isSameDay(lastCompletedDate, today);
    }
}

export function checkHabitStreak(habit: any) {
    const today = new Date();
    const lastCompletedDate = habit.lastCompletedAt ? (habit.lastCompletedAt as Timestamp).toDate() : null;

    if (!lastCompletedDate || isSameDay(lastCompletedDate, today)) {
        return null; // No need to update streak yet or already updated
    }
    
    const currentStreak = habit.currentStreak || 0;
    const longestStreak = habit.longestStreak || 0;
    
    let isConsecutive = false;
    let streakShouldReset = false;

    switch (habit.frequency) {
        case 'Semanal':
            isConsecutive = isPreviousWeek(today, lastCompletedDate);
             if (!isConsecutive && !isSameWeek(today, lastCompletedDate)) {
                streakShouldReset = true;
            }
            break;
        case 'Diario':
        default:
            isConsecutive = isPreviousDay(today, lastCompletedDate);
            if (!isConsecutive && !isSameDay(today, lastCompletedDate)) {
                streakShouldReset = true;
            }
            break;
    }

    if (isConsecutive) {
        const newStreak = currentStreak + 1;
        return {
            currentStreak: newStreak,
            longestStreak: Math.max(longestStreak, newStreak),
        };
    } else if (streakShouldReset && currentStreak > 0) {
        return {
            currentStreak: 0,
        };
    }

    return null;
}

export function resetStreak() {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedAt: null,
    previousStreak: null,
    previousLastCompletedAt: null,
  };
}
