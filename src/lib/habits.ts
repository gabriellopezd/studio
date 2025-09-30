
import { Timestamp } from 'firebase/firestore';

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const isSameWeek = (d1: Date, d2: Date) => {
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
    if (!habit.id) return null;

    const today = new Date();
    const lastCompletedDate = habit.lastCompletedAt ? (habit.lastCompletedAt as Timestamp).toDate() : null;

    // If the habit was already completed today, no need to check/update streak.
    if (lastCompletedDate && isHabitCompletedToday(habit)) {
        return null;
    }

    let shouldReset = false;
    let isConsecutive = false;

    if (lastCompletedDate) {
        if (habit.frequency === 'Semanal') {
            const sameWeek = isSameWeek(today, lastCompletedDate);
            const prevWeek = isPreviousWeek(today, lastCompletedDate);
            isConsecutive = prevWeek;
            if (!sameWeek && !prevWeek) {
                shouldReset = true;
            }
        } else { // 'Diario'
            const sameDay = isSameDay(today, lastCompletedDate);
            const prevDay = isPreviousDay(today, lastCompletedDate);
            isConsecutive = prevDay;
            if (!sameDay && !prevDay) {
                shouldReset = true;
            }
        }
    } else {
        // If it has never been completed, it shouldn't have a streak.
        shouldReset = true;
    }

    if (shouldReset && habit.currentStreak > 0) {
        return { currentStreak: 0 };
    }
    
    // Note: The logic to increment the streak is now handled when a habit is marked complete.
    // This function's primary role is to RESET a broken streak.
    // We return null if no reset is needed.
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
