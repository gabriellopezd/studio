# Arquitectura de la Aplicación Inngenia

Este documento describe la arquitectura de la aplicación, diseñada para ser modular, escalable y fácil de mantener. El principio fundamental es la **separación de responsabilidades** a través de contextos especializados de React.

## 1. Stack Tecnológico

- **Framework**: [Next.js](https://nextjs.org/) con App Router.
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/).
- **Base de Datos y Autenticación**: [Firebase](https://firebase.google.com/) (Firestore y Authentication).
- **UI**: [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/) y [ShadCN/UI](https://ui.shadcn.com/) para los componentes base.
- **Estado Global**: React Context.

## 2. Estructura de Directorios Clave

```
src
├── app
│   ├── (app)                   # Rutas protegidas de la aplicación principal
│   │   ├── dashboard
│   │   ├── finances
│   │   ├── ...
│   │   └── layout.tsx            # Layout principal con la barra lateral
│   ├── (auth)                    # Rutas públicas de autenticación (login, signup)
│   ├── _providers                # El corazón de la gestión de estado
│   └── layout.tsx                # Layout raíz
├── components
│   ├── ui                      # Componentes base de ShadCN
│   ├── icons.tsx               # Iconos SVG personalizados
│   └── page-header.tsx         # Componente de encabezado reutilizable
├── firebase
│   ├── config.ts               # Configuración del proyecto Firebase
│   ├── provider.tsx            # Proveedor principal de Firebase
│   ├── use-collection.ts       # Hook para suscripciones a colecciones
│   └── ...
├── lib
│   ├── habits.ts               # Lógica de negocio para hábitos (rachas, etc.)
│   ├── placeholder-images.ts   # Gestión de imágenes de demostración
│   └── utils.ts                # Funciones de utilidad (ej. cn, formatCurrency)
└── docs
    ├── architecture.md         # Este documento
    └── backend.json            # Definición de entidades y estructura de Firestore
```

## 3. Gestión de Estado: Contextos Especializados por Funcionalidad

Esta es la pieza central de la arquitectura. Para evitar el acoplamiento y los errores en cascada, la aplicación abandona un único `AppContext` monolítico y adopta un patrón de un proveedor por cada dominio funcional.

Cada proveedor encapsula los datos, el estado de carga y las acciones (funciones para modificar los datos) de su respectiva área.

### Los Proveedores:

-   **`UIProvider`**: Gestiona el estado de la UI que es transversal, como qué diálogo modal está abierto y el estado de los datos de sus formularios. Se consume con `useUI()`.
-   **`SessionProvider`**: Un proveedor ultra específico que solo gestiona el estado del cronómetro de enfoque (sesión activa), permitiendo que sea visible globalmente. Se consume con `useSession()`.
-   **`HabitsProvider`**: Gestiona todo lo relacionado con hábitos, rutinas y sus analíticas. Se consume con `useHabits()`.
-   **`TasksProvider`**: Se encarga de las tareas, sus categorías y estadísticas de productividad. Se consume con `useTasks()`.
-   **`FinancesProvider`**: Centraliza toda la lógica financiera: transacciones, presupuestos, planificación de compras, proyecciones anuales, etc. Se consume con `useFinances()`.
-   **`GoalsProvider`**: Gestiona la creación, seguimiento y actualización de metas a largo plazo. Se consume con `useGoals()`.
-   **`MoodProvider`**: Maneja los registros de ánimo, el calendario y las estadísticas de sentimientos e influencias. Se consume con `useMood()`.

### Flujo de Datos:

1.  El `layout.tsx` de la aplicación envuelve todas las páginas en estos proveedores.
2.  Una página (ej. `src/app/(app)/tasks/page.tsx`) necesita mostrar y modificar tareas.
3.  Dentro de la página, se utiliza el hook `useTasks()` para obtener los datos (`tasks`, `tasksLoading`) y las funciones para modificarlos (`handleSaveTask`, `handleDeleteTask`).
4.  La página no sabe ni le importa cómo funciona el `FinancesProvider`. Su única dependencia es `useTasks()`, lo que la hace aislada y robusta.


*(Este es un marcador de posición para un diagrama visual que ilustre el flujo).*

## 4. Integración con Firebase

-   **Inicialización**: La conexión con Firebase se gestiona de forma segura en `src/firebase/client-provider.tsx`, asegurando que solo se inicialice una vez en el lado del cliente.
-   **Lectura de Datos**: Se utilizan los hooks `useCollectionData` y `useDoc` que están optimizados para React y Firebase, proporcionando datos en tiempo real, estados de carga y manejo de errores.
-   **Escritura de Datos**: Las operaciones de escritura (`setDoc`, `addDoc`, `updateDoc`) se realizan a través de funciones no bloqueantes para mantener la interfaz de usuario fluida y receptiva. Los errores de permisos se capturan y se emiten a través de un `errorEmitter` global.
-   **Seguridad**: La estructura de la base de datos y las reglas de seguridad de Firestore (definidas en `firestore.rules`) están diseñadas para un aislamiento estricto de los datos por usuario, basándose en el `userId` en la ruta de los documentos.

## 5. Conclusión

Esta arquitectura modular por funcionalidad permite:
-   **Mantenibilidad**: Es fácil encontrar y modificar la lógica de una funcionalidad específica sin afectar al resto de la aplicación.
-   **Escalabilidad**: Añadir una nueva funcionalidad (ej. "Diario Personal") es tan simple como crear un nuevo `JournalProvider` y su página correspondiente.
-   **Rendimiento**: Los re-renders de React son más eficientes, ya que solo los componentes que consumen un contexto específico se actualizan cuando ese contexto cambia.
-   **Robustez**: El aislamiento reduce drásticamente la posibilidad de que un cambio introduzca errores en cascada en toda la aplicación.
