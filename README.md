# intellecto - Tu Asistente Personal de Productividad y Bienestar

Bienvenido a **intellecto**, una aplicación web moderna diseñada para ayudarte a construir hábitos positivos, gestionar tus tareas, seguir tus metas, monitorear tu estado de ánimo y controlar tus finanzas, todo en un solo lugar.

## ✨ Características Principales

- **Dashboard Unificado:** Una vista general de tu progreso diario y semanal.
- **Seguimiento de Hábitos y Rutinas:** Crea, sigue y analiza tus hábitos con rachas y estadísticas.
- **Gestión de Tareas:** Organiza tus tareas por categorías, prioridades y fechas de vencimiento.
- **Planificación de Metas:** Define y sigue el progreso de tus metas a largo plazo, ya sean genéricas, de ahorro o de deudas.
- **Rastreador de Ánimo:** Registra tu estado de ánimo diario, sentimientos e influencias para entender tus patrones emocionales.
- **Control Financiero:** Supervisa tus ingresos, gastos, presupuestos y planifica tus finanzas mensuales y anuales.

## 🚀 Stack Tecnológico

- **Framework:** [Next.js](https://nextjs.org/) (con App Router)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Base de Datos y Autenticación:** [Firebase](https://firebase.google.com/) (Firestore, Authentication y App Hosting)
- **Componentes UI:** [ShadCN/UI](https://ui.shadcn.com/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Estado Global:** React Context (patrón de un proveedor por funcionalidad)
- **Gráficos y Analíticas:** [Recharts](https://recharts.org/)
- **IA y Lógica Inteligente:** [Genkit (Firebase AI)](https://firebase.google.com/docs/genkit)

## 📁 Estructura del Proyecto

El proyecto está organizado siguiendo un enfoque modular para facilitar el mantenimiento y la escalabilidad.

```
src
├── app
│   ├── (app)                # Rutas protegidas (Dashboard, Hábitos, etc.)
│   │   ├── dashboard
│   │   ├── habits
│   │   ├── settings         # Páginas de configuración anidadas
│   │   └── ...
│   ├── _providers           # El corazón de la gestión de estado global
│   ├── (auth)               # Rutas públicas (login, signup)
│   └── layout.tsx           # Layout raíz de la aplicación
├── components
│   ├── ui                   # Componentes base de ShadCN
│   └── ...                  # Componentes reutilizables
├── firebase
│   └── ...                  # Configuración, proveedores y hooks de Firebase
├── hooks
│   └── ...                  # Hooks personalizados
├── lib
│   └── ...                  # Utilidades, constantes y lógica de negocio
└── docs
    ├── architecture.md      # Documentación de la arquitectura
    └── backend.json         # Definición de entidades de Firestore
```

## 🏁 Cómo Empezar

1.  **Instalar Dependencias:**
    ```bash
    npm install
    ```

2.  **Ejecutar el Servidor de Desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

3.  **Construir para Producción:**
    ```bash
    npm run build
    ```

4.  **Ejecutar en Producción:**
    ```bash
    npm run start
    ```

## 🌍 Despliegue y Producción

La aplicación está desplegada y accesible en producción:

- **URL Principal:** [https://app.intellecto.com.co](https://app.intellecto.com.co)
- **Plataforma:** Firebase App Hosting
- **Infraestructura:** Google Cloud (automáticamente gestionada por Firebase)

### Ciclo de CI/CD
El despliegue es continuo y automático:
1.  Cualquier cambio empujado a la rama `main` en GitHub activa un nuevo build.
2.  Firebase App Hosting detecta el cambio, construye la aplicación (Next.js) y la despliega.
3.  El contenido estático se sirve desde el CDN global de Firebase.

## 🔑 Principios Clave

- **Separación de Responsabilidades:** La lógica de cada funcionalidad principal (hábitos, tareas, finanzas, etc.) está encapsulada en su propio React Context Provider (`src/app/_providers`). Esto hace que el código sea modular, predecible y fácil de depurar.
- **Operaciones No Bloqueantes:** Las escrituras en Firestore se realizan de forma no bloqueante para mantener la interfaz de usuario fluida y receptiva.
- **Seguridad Primero:** Las reglas de seguridad de Firestore están diseñadas para garantizar que los usuarios solo puedan acceder a sus propios datos.

---
**Última actualización:** 14 de Febrero de 2026, 04:02 PM
