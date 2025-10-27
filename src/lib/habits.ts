
import { Timestamp } from 'firebase/firestore';

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  // Assuming Sunday is the first day of the week (0)
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const isSameWeek = (d1: Date, d2: Date) => {
  if (!d1 || !d2) return false;
  const startOfWeek1 = getStartOfWeek(d1);
  const startOfWeek2 = getStartOfWeek(d2);
  return startOfWeek1.getTime() === startOfWeek2.getTime();
};

const isPreviousDay = (today: Date, otherDate: Date) => {
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return isSameDay(yesterday, otherDate);
};

const isPreviousWeek = (today: Date, otherDate: Date) => {
  const startOfThisWeek = getStartOfWeek(today);
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
  
  const startOfOtherWeek = getStartOfWeek(otherDate);
  
  return startOfLastWeek.getTime() === startOfOtherWeek.getTime();
};


export function isHabitCompletedToday(habit: any) {
    if (!habit || !habit.lastCompletedAt) return false;
    
    // Firestore Timestamps have a toDate() method.
    // Standard JS Date objects do not.
    // This handles both cases gracefully.
    const lastCompletedDate = habit.lastCompletedAt.toDate ? habit.lastCompletedAt.toDate() : new Date(habit.lastCompletedAt);
    if (isNaN(lastCompletedDate.getTime())) return false; // Invalid date

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
    if (!habit.id) return null;

    const today = new Date();
    const lastCompletedDate = habit.lastCompletedAt ? (habit.lastCompletedAt as Timestamp).toDate() : null;

    // If the habit was already completed in the current period, no need to check/update streak.
    if (lastCompletedDate) {
        if (habit.frequency === 'Semanal' && isSameWeek(today, lastCompletedDate)) {
            return null;
        }
        if (habit.frequency === 'Diario' && isSameDay(today, lastCompletedDate)) {
            return null;
        }
    }
    
    let shouldReset = false;

    if (lastCompletedDate) {
        if (habit.frequency === 'Semanal') {
            if (!isPreviousWeek(today, lastCompletedDate)) {
                shouldReset = true;
            }
        } else { // 'Diario'
            if (!isPreviousDay(today, lastCompletedDate)) {
                shouldReset = true;
            }
        }
    } else {
        // If it has never been completed, it shouldn't have a streak. But let's not reset if it's 0.
        if (habit.currentStreak > 0) {
            shouldReset = true;
        }
    }

    if (shouldReset && habit.currentStreak > 0) {
        return { currentStreak: 0 };
    }
    
    return null;
}


export function calculateStreak(habit: any) {
    const today = new Date();
    const lastCompletedDate = habit.lastCompletedAt ? (habit.lastCompletedAt as Timestamp).toDate() : null;
    
    let newStreak = 1;
    if(lastCompletedDate) {
        if(habit.frequency === 'Diario' && isPreviousDay(today, lastCompletedDate)) {
            newStreak = (habit.currentStreak || 0) + 1;
        } else if (habit.frequency === 'Semanal' && isPreviousWeek(today, lastCompletedDate)) {
            newStreak = (habit.currentStreak || 0) + 1;
        }
    }

    return {
        currentStreak: newStreak,
        longestStreak: Math.max(habit.longestStreak || 0, newStreak),
    };
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
