import { PlaceHolderImages, type ImagePlaceholder } from "@/lib/placeholder-images";

function findImage(id: string): ImagePlaceholder | undefined {
    return PlaceHolderImages.find((img) => img.id === id);
}

export const dashboardHeaderImage = findImage('dashboard-header');
export const todayHeaderImage = findImage('today-header');
export const habitsHeaderImage = findImage('habits-header');
export const routinesHeaderImage = findImage('routines-header');
export const tasksHeaderImage = findImage('tasks-header');
export const goalsHeaderImage = findImage('goals-header');
export const moodHeaderImage = findImage('mood-header');
export const financesHeaderImage = findImage('finances-header');
export const expensesHeaderImage = findImage('expenses-header');
export const settingsHeaderImage = findImage('settings-header');
