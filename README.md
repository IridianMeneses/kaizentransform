# Kaizen Coach — reconstrucción v2 (completa)

App reconstruida desde cero, con guardado real en Supabase.
Reemplaza a la app anterior sin sus bugs de guardado.

## Módulos
Coach: Clientes · Rutinas · Dietas · Recetas · Calendario · Librería
Paciente: Inicio (tareas + pasos) · Mi rutina · Mi dieta · Progreso
Login / registro / recuperar contraseña.

## Puesta en marcha
1. `cp .env.example .env` y pega tu anon key (Supabase → Settings → API).
2. `npm install && npm run dev`
3. En el SQL Editor, en orden:
   - supabase/01_schema.sql          (ya corrido)
   - supabase/03_seed_exercises.sql  (ejercicios + cardio)

## Publicar en GitHub Pages
`npm run build` → sube el contenido de `dist/`.

## Por qué ahora sí guarda todo
- Supabase es la única fuente de verdad; el navegador solo cachea.
- Un solo camino de guardado (`src/lib/useResource.js`): optimista con reversa.
- Ningún error se traga: se muestra en pantalla.
- El mapeo de campos vive en un solo lugar (`src/api/mappers.js`): no se pierden campos.
- Existen las 7 tablas que faltaban; los documentos suben archivos reales a Storage.
