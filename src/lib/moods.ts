

export const moodLevels = [
  { level: 1, emoji: '😞', label: 'Muy mal' },
  { level: 2, emoji: '🙁', label: 'Mal' },
  { level: 3, emoji: '😟', label: 'Algo mal' },
  { level: 4, emoji: '😐', label: 'Neutral' },
  { level: 5, emoji: '🙂', label: 'Algo bien' },
  { level: 6, emoji: '😄', label: 'Bien' },
  { level: 7, emoji: '🤩', label: 'Muy bien' },
];

export const defaultFeelings = [
    // Positivos de alta energía
    { name: 'Eufórico/a', icon: '🎉', type: 'Positivo Alta Energía' },
    { name: 'Emocionado/a', icon: '🤩', type: 'Positivo Alta Energía' },
    { name: 'Inspirado/a', icon: '💡', type: 'Positivo Alta Energía' },
    { name: 'Motivado/a', icon: '🚀', type: 'Positivo Alta Energía' },
    { name: 'Enérgico/a', icon: '⚡', type: 'Positivo Alta Energía' },
    { name: 'Creativo/a', icon: '🎨', type: 'Positivo Alta Energía' },
    { name: 'Concentrado/a', icon: '🎯', type: 'Positivo Alta Energía' },

    // Positivos de baja energía
    { name: 'Relajado/a', icon: '😌', type: 'Positivo Baja Energía' },
    { name: 'Tranquilo/a', icon: '🧘', type: 'Positivo Baja Energía' },
    { name: 'Satisfecho/a', icon: '😊', type: 'Positivo Baja Energía' },
    { name: 'Agradecido/a', icon: '🙏', type: 'Positivo Baja Energía' },
    { name: 'Sereno/a', icon: '🏞️', type: 'Positivo Baja Energía' },
    { name: 'Cómodo/a', icon: '🛋️', type: 'Positivo Baja Energía' },
    { name: 'Seguro/a', icon: '🛡️', type: 'Positivo Baja Energía' },

    // Negativos de alta energía
    { name: 'Estresado/a', icon: '🤯', type: 'Negativo Alta Energía' },
    { name: 'Ansioso/a', icon: '😰', type: 'Negativo Alta Energía' },
    { name: 'Enojado/a', icon: '😠', type: 'Negativo Alta Energía' },
    { name: 'Irritable', icon: '😤', type: 'Negativo Alta Energía' },
    { name: 'Frustrado/a', icon: '😫', type: 'Negativo Alta Energía' },
    { name: 'Abrumado/a', icon: '😵', type: 'Negativo Alta Energía' },

    // Negativos de baja energía
    { name: 'Triste', icon: '😢', type: 'Negativo Baja Energía' },
    { name: 'Cansado/a', icon: '😴', type: 'Negativo Baja Energía' },
    { name: 'Aburrido/a', icon: '😒', type: 'Negativo Baja Energía' },
    { name: 'Solitario/a', icon: '👤', type: 'Negativo Baja Energía' },
    { name: 'Apático/a', icon: '😑', type: 'Negativo Baja Energía' },
    { name: 'Desanimado/a', icon: '😞', type: 'Negativo Baja Energía' },
];

export const defaultInfluences = [
    // Relaciones
    { name: 'Amistades', icon: '🧑‍🤝‍🧑', category: 'Relaciones' },
    { name: 'Pareja', icon: '❤️', category: 'Relaciones' },
    { name: 'Familia', icon: '👨‍👩‍👧‍👦', category: 'Relaciones' },
    { name: 'Social', icon: '🎉', category: 'Relaciones' },

    // Trabajo y Crecimiento
    { name: 'Trabajo', icon: '💼', category: 'Trabajo y Crecimiento' },
    { name: 'Estudios', icon: '📚', category: 'Trabajo y Crecimiento' },
    { name: 'Finanzas', icon: '💰', category: 'Trabajo y Crecimiento' },
    { name: 'Metas', icon: '🎯', category: 'Trabajo y Crecimiento' },

    // Bienestar
    { name: 'Ejercicio', icon: '🏋️', category: 'Bienestar' },
    { name: 'Dieta', icon: '🥗', category: 'Bienestar' },
    { name: 'Sueño', icon: '😴', category: 'Bienestar' },
    { name: 'Salud', icon: '🏥', category: 'Bienestar' },

    // Entorno y Ocio
    { name: 'Clima', icon: '🌦️', category: 'Entorno y Ocio' },
    { name: 'Hogar', icon: '🏠', category: 'Entorno y Ocio' },
    { name: 'Hobbies', icon: '🎨', category: 'Entorno y Ocio' },
    { name: 'Música', icon: '🎵', category: 'Entorno y Ocio' },

    // Interno
    { name: 'Espiritualidad', icon: '🙏', category: 'Interno' },
    { name: 'Reflexión', icon: '🤔', category: 'Interno' },
];

export const feelings = defaultFeelings.map(f => f.name);
export const influences = defaultInfluences.map(i => i.name);
