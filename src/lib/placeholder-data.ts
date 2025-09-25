
export const dailyHabits = [
  { id: 1, name: 'Leer 10 páginas', icon: '📚', streak: 12, completed: true },
  { id: 2, name: 'Meditar 5 minutos', icon: '🧘', streak: 5, completed: true },
  { id: 3, name: 'Beber 2L de agua', icon: '💧', streak: 23, completed: false },
  { id: 4, name: 'Caminata de 30 min', icon: '🚶‍♂️', streak: 2, completed: false },
];

export const allHabits = [
    { id: 1, name: 'Leer', icon: '📚', frequency: 'Diario', currentStreak: 12, weeklyProgress: 80 },
    { id: 2, name: 'Ejercicio', icon: '💪', frequency: '3 veces/semana', currentStreak: 4, weeklyProgress: 66 },
    { id: 3, name: 'Meditar', icon: '🧘', frequency: 'Diario', currentStreak: 25, weeklyProgress: 100 },
    { id: 4, name: 'Estudiar React', icon: '⚛️', frequency: '5 veces/semana', currentStreak: 8, weeklyProgress: 60 },
    { id: 5, name: 'Planificar semana', icon: '📅', frequency: 'Semanal', currentStreak: 10, weeklyProgress: 100 },
    { id: 6, name: 'Beber Agua', icon: '💧', frequency: 'Diario', currentStreak: 3, weeklyProgress: 40 },
];

export const urgentTasks = [
  { id: 1, name: 'Preparar presentación de proyecto', dueDate: 'Mañana' },
  { id: 2, name: 'Enviar reporte mensual', dueDate: 'Mañana' },
  { id: 3, name: 'Comprar boletos de avión', dueDate: '2 días' },
];

export const allTasks = [
    { id: 1, name: 'Diseñar el dashboard', isCompleted: true, dueDate: '2024-06-15', priority: 'high' },
    { id: 2, name: 'Implementar autenticación', isCompleted: false, dueDate: '2024-06-18', priority: 'high' },
    { id: 3, name: 'Crear componente de Tareas', isCompleted: false, dueDate: '2024-06-20', priority: 'medium' },
    { id: 4, name: 'Testear el flujo de rutinas', isCompleted: false, dueDate: '2024-06-22', priority: 'low' },
    { id: 5, name: 'Revisar la paleta de colores', isCompleted: true, dueDate: '2024-06-14', priority: 'low' },
];

export const moods = [
  { level: 1, emoji: '😞', label: 'Muy mal' },
  { level: 2, emoji: '🙁', label: 'Mal' },
  { level: 3, emoji: '😐', label: 'Neutral' },
  { level: 4, emoji: '🙂', label: 'Bien' },
  { level: 5, emoji: '😄', label: 'Muy bien' },
];

export const mainGoal = {
  id: 1,
  name: 'Aprender Next.js',
  description: 'Convertirme en un experto en desarrollo con Next.js.',
  targetValue: 100,
  currentValue: 65,
  unit: 'horas',
  progress: 65,
  dueDate: '31/12/2024',
};

export const allGoals = [
    { id: 1, name: 'Aprender Next.js', description: 'Dominar el framework para desarrollo web.', targetValue: 100, currentValue: 65, unit: 'horas', progress: 65, dueDate: '31 Dic 2024' },
    { id: 2, name: 'Ahorrar para viaje', description: 'Ahorrar para un viaje a Japón.', targetValue: 5000, currentValue: 1200, unit: 'USD', progress: 24, dueDate: '30 Jun 2025' },
    { id: 3, name: 'Correr 10k', description: 'Prepararme para correr una carrera de 10 kilómetros.', targetValue: 10, currentValue: 5, unit: 'km', progress: 50, dueDate: '15 Sep 2024' },
];

export const routines = [
    {
        id: 1, name: 'Rutina Matutina', description: 'Para empezar el día con energía.', habits: [
            { name: 'Meditar', icon: '🧘' },
            { name: 'Ejercicio', icon: '💪' },
            { name: 'Ducha fría', icon: '🚿' },
        ]
    },
    {
        id: 2, name: 'Preparación Semanal', description: 'Organizar la semana los domingos.', habits: [
            { name: 'Planificar semana', icon: '📅' },
            { name: 'Meal prep', icon: '🍲' },
        ]
    },
    {
        id: 3, name: 'Rutina Nocturna', description: 'Para un descanso reparador.', habits: [
            { name: 'Leer', icon: '📚' },
            { name: 'Sin pantallas', icon: '📵' },
        ]
    },
];

export const transactions = [
    { id: 1, type: 'income', description: 'Salario', category: 'Trabajo', date: '01 Jun 2024', amount: 4000 },
    { id: 2, type: 'expense', description: 'Alquiler', category: 'Vivienda', date: '02 Jun 2024', amount: 1200 },
    { id: 3, type: 'expense', description: 'Supermercado', category: 'Comida', date: '05 Jun 2024', amount: 150.50 },
    { id: 4, type: 'income', description: 'Proyecto freelance', category: 'Trabajo', date: '10 Jun 2024', amount: 1200 },
    { id: 5, type: 'expense', description: 'Restaurante', category: 'Ocio', date: '12 Jun 2024', amount: 75 },
];

export const budgets = [
    { id: 1, categoryName: 'Comida', monthlyLimit: 500, currentSpend: 320 },
    { id: 2, categoryName: 'Ocio', monthlyLimit: 200, currentSpend: 150 },
    { id: 3, categoryName: 'Transporte', monthlyLimit: 100, currentSpend: 45 },
];

export const shoppingLists = [
    {
        id: 1, name: 'Supermercado Semanal', items: [
            { itemId: 1, name: 'Leche', quantity: '2L', isPurchased: true, price: 2.50 },
            { itemId: 2, name: 'Huevos', quantity: '12', isPurchased: true, price: 3.00 },
            { itemId: 3, name: 'Pan integral', quantity: '1', isPurchased: false },
            { itemId: 4, name: 'Pollo', quantity: '500g', isPurchased: false },
            { itemId: 5, name: 'Manzanas', quantity: '6', isPurchased: false },
        ]
    },
    { id: 2, name: 'Ferretería', items: [] },
    { id: 3, name: 'Regalos Cumpleaños', items: [] },
];
