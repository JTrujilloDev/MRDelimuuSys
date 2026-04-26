# Backend - DelimuuSys

Backend de la aplicación DelimuuSys construido con Express.js y TypeScript

## Requisitos
- Node.js (v16 o superior)
- npm o yarn

## Instalación

```bash
npm install
```

## Configuración

1. Copia `.env.example` a `.env`:
```bash
cp .env.example .env
```

2. Configura las variables de entorno en el archivo `.env`

## Scripts

- `npm run build` - Compila TypeScript a JavaScript
- `npm start` - Inicia el servidor en producción (necesita compilación previa)
- `npm run dev` - Inicia el servidor en desarrollo con ts-node
- `npm run dev:watch` - Inicia en desarrollo con hot reload (nodemon + ts-node)

## Estructura del Proyecto

```
src/
├── index.ts           # Entry point
├── routes/            # Rutas de la API
├── controllers/       # Controllers (lógica de negocio)
├── middleware/        # Middleware personalizado
├── config/            # Configuración (BD, servicios, etc)
└── utils/             # Utilidades y funciones auxiliares

dist/                  # Código compilado (generado con npm run build)
tsconfig.json          # Configuración de TypeScript
```

## API Endpoints

- `GET /health` - Verificar estado del servidor
- `GET /api` - Mensaje de bienvenida

## Desarrollo

Para añadir nuevas rutas:

1. Crea un archivo en `src/routes/`
2. Crea los controllers correspondientes en `src/controllers/`
3. Importa y usa las rutas en `src/routes/index.ts`

Ejemplo de una ruta con TypeScript:

```typescript
// src/routes/users.ts
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Get all users' });
});

export default router;
```
