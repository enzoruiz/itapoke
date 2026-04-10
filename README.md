# Itapoke

Aplicacion web para explorar expansiones y cartas de Pokemon TCG, con busqueda en vivo, detalle visual por set y colecciones personales persistidas por usuario.

## Descripcion del proyecto

Itapoke combina un frontend en `React` sobre `Vite` con una capa de API serverless compatible con `Vercel`.

La app consume datos de `pokemontcg.io`, permite navegar por expansiones oficiales, abrir el detalle completo de cada set, buscar cartas con filtros combinables y guardar colecciones propias usando autenticacion con Google y persistencia en MongoDB.

## Funcionalidades

- Explorador de cartas con filtros por nombre, expansion, artista, tipo de carta, elemento y rareza.
- Biblioteca de expansiones agrupada por series y ordenada por fecha de lanzamiento.
- Vista detallada de expansion con busqueda local, ordenamiento y carga progresiva de cartas.
- Modal de detalle de carta con imagen ampliada, zoom y enlaces externos.
- Prefetch de imagen grande al hacer hover para mejorar la percepcion de velocidad.
- Inicio de sesion con Google.
- Colecciones personales por usuario.
- Creacion de colecciones desde una busqueda del explorador o desde el detalle de una expansion.
- Seguimiento de progreso dentro de cada coleccion marcando cartas obtenidas o faltantes.
- Renombrado y eliminacion de colecciones.
- Service Worker y metricas de Web Vitals.
- API propia para sesion, colecciones y persistencia en MongoDB.

## Stack

- `React`
- `React DOM`
- `Vite`
- JavaScript ES Modules
- `Vercel` Functions
- `MongoDB`
- `Google Identity Services`
- `Playwright`
- `ESLint`
- `Lighthouse`

## Estructura principal

- `src/`: interfaz React, rutas cliente, filtros, modales, auth y consumo de API.
- `api/`: endpoints serverless para autenticacion, sesion y colecciones.
- `public/`: assets publicos y service worker.
- `reports/lighthouse/`: reportes de auditoria.

## Variables de entorno

Crea `.env.local` con estos valores:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@itapokebd.wmm5sdv.mongodb.net/itapoke?retryWrites=true&w=majority&appName=ItapokeBD
MONGODB_DB_NAME=itapoke
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
```

## Ejecutar en local

### Opcion A: Vite + API local

1. Instala dependencias con `npm install`.
2. Agrega tu IP a `Network Access` en MongoDB Atlas.
3. Verifica que el usuario de base de datos tenga permisos de lectura y escritura.
4. En Google Cloud OAuth agrega `http://localhost:5173` en `Authorized JavaScript origins`.
5. Ejecuta `npm run dev:local`.
6. Abre `http://localhost:5173`.

El frontend usa Vite y redirige `/api/*` al servidor local en `3001`.

### Opcion B: Simular Vercel localmente

1. Instala dependencias con `npm install`.
2. Agrega tu IP a `Network Access` en MongoDB Atlas.
3. Verifica que el usuario de base de datos tenga permisos de lectura y escritura.
4. En Google Cloud OAuth agrega `http://localhost:3000` en `Authorized JavaScript origins`.
5. Ejecuta `npm run dev:vercel`.
6. Abre `http://localhost:3000`.

## Scripts

- `npm run dev`: frontend React con Vite.
- `npm run dev:api`: API local para desarrollo.
- `npm run dev:local`: frontend y API local en paralelo.
- `npm run dev:vercel`: entorno local con `vercel dev`.
- `npm run build`: build de produccion.
- `npm run lint`: analisis estatico.
- `npm run test:e2e`: pruebas end-to-end con Playwright.
- `npm run lighthouse`: auditoria Lighthouse.
- `npm run quality`: lint + build + e2e + lighthouse.

## Notas

- Si la password de MongoDB tiene caracteres especiales, codificala en la URL de `MONGODB_URI`.
- Si el login falla tras cambiar la configuracion de Google, espera unos minutos y vuelve a probar.
- `vercel dev` solo es necesario si quieres replicar mas de cerca el runtime de Vercel.
