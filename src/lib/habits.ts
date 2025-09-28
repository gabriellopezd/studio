import { Timestamp } from 'firebase/firestore';

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
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

export function calculateStreak(habit: any) {
    const today = new Date();
    const lastCompletedDate = habit.lastCompletedAt
      ? (habit.lastCompletedAt as Timestamp).toDate()
      : null;

    const currentStreak = habit.currentStreak || 0;
    let longestStreak = habit.longestStreak || 0;
    let newStreak = 1;

    if (lastCompletedDate) {
      let isConsecutive = false;
      switch (habit.frequency) {
        case 'Semanal':
          isConsecutive = isPreviousWeek(today, lastCompletedDate);
          break;
        case 'Diario':
        default:
          isConsecutive = isPreviousDay(today, lastCompletedDate);
          break;
      }

      if (isConsecutive) {
        newStreak = currentStreak + 1;
      }
    }
    
    longestStreak = Math.max(longestStreak, newStreak);

    return {
        currentStreak: newStreak,
        longestStreak: longestStreak,
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
