
import data from './preset-habits.json';

export type PresetHabit = {
  id: string;
  name: string;
  icon: string;
  frequency: string;
  category: string;
  description: string;
};

export const PresetHabits: PresetHabit[] = data.presetHabits;

    