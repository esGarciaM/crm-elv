# CRM Patrocinios - Project Knowledge

## Overview

Sistema CRM para gestionar patrocinios de un evento estudiantil (simposio "Timelines" en Mexico). Administra el ciclo completo: adquisicion de patrocinadores, seguimiento, finanzas, disenos, redes sociales y comunicaciones oficiales. Todo el UI esta en espanol.

## Tech Stack

| Capa | Tecnologia |
|------|-----------|
| Backend | Node.js v22, Express 4.x (ES modules) |
| Frontend | React 19, Vite 8, react-router-dom 7 |
| Base de datos | SQLite via better-sqlite3 (sin ORM) |
| Auth | JWT (24h TTL) + bcryptjs |
| Uploads | Multer (disk storage, 5-20MB segun modulo) |
| Charts | Recharts 3.x |
| HTTP client | Axios 1.x |
| Containerizacion | Docker + Docker Compose |
| Web server | Nginx (SPA + reverse proxy /api/) |

## Architecture

```
Nginx (80) ──> React SPA (Vite build)
           ──> /api/ ──> Express (3001) ──> SQLite (better-sqlite3)
```

- Produccion: Nginx sirve SPA y proxea /api/ a Express
- Desarrollo: Vite dev server (5173) + Express (3001) con hot reload

## Directory Structure

```
CRM/
  docker-compose.yml          # Produccion
  docker-compose-dev.yml      # Desarrollo (hot reload)
  AGENTS.md                   # Este archivo
  docs/                       # Documentos de diseno (Excel/CSV)
  backend/
    server.js                 # Entry point, rutas, seed admin
    database.js               # Schema SQLite + seeds iniciales
    middleware/auth.js         # JWT middleware (authMiddleware, adminOnly)
    migrations/               # SQL migraciones custom (runner.js)
    routes/                   # 16 archivos de rutas
    uploads/                  # Almacenamiento de archivos
  frontend/
    src/
      App.jsx                 # Router + role-based routing
      context/AuthContext.jsx  # Provider de auth
      components/             # Layout, PrivateRoute
      pages/                  # 14 paginas
```

## How to Run

```bash
# Desarrollo (hot reload)
docker compose -f docker-compose-dev.yml up --build

# Produccion
docker compose up --build

# Backend standalone (sin Docker)
cd backend && npm install && npm run dev
```

- Backend: http://localhost:3001
- Frontend dev: http://localhost:5173
- Admin por defecto: admin / admin123

## Coding Conventions

- **ES modules** en todo (`"type": "module"` en package.json)
- **Sin ORM** — queries SQL raw con prepared statements via better-sqlite3
- **Sin framework CSS** — CSS vanilla con custom properties
- **Foreign keys** habilitadas en SQLite (`pragma foreign_keys = ON`)
- **WAL mode** para mejor concurrencia
- **Migraciones custom** en `backend/migrations/` — runner.js trackea en tabla `_migrations`
- **Uploads** en directorios separados por modulo bajo `uploads/`
- **Fechas** en formato TEXT ISO locale (`datetime('now','localtime')`)

## Module Map

| Modulo | API Route | Frontend Page | Tablas BD |
|--------|-----------|---------------|-----------|
| Auth/Users | `/api/auth`, `/api/users` | Login, Users | `users` |
| Clients | `/api/clients` | Clients, ClientDetail | `clients` |
| Patrocinios | `/api/patrocinios` | Patrocinios | `patrocinios` |
| Seguimiento | `/api/patrocinios/:id/seguimiento` | SeguimientoPatrocinio | `patrocinio_checklist`, `patrocinio_comments` |
| Tasks | `/api/tasks` | Tasks | `tasks`, `task_comments` |
| Documents | `/api/documents` | (dentro de ClientDetail) | `documents`, `document_comments` |
| Departments | `/api/departments` | (API only) | `departments` |
| Employees | `/api/employees` | (API only) | `employees` |
| Expenses | `/api/expenses` | (API only) | `expenses`, `expense_files` |
| Doc Types | `/api/document-types` | (API only) | `document_types` |
| Communications | `/api/communications` | Communications | `communications`, `communication_files` |
| Packages | `/api/packages` | (API only) | `packages`, `package_checklist_items`, `package_checklist` |
| Finance | `/api/finance` | Finance | `finance_contributions`, `finance_solicitudes`, `finance_solicitud_files`, `finance_expenses`, `finance_expense_files`, `finance_committee_budgets`, `finance_monthly_reports` |
| Disenos | `/api/disenos` | Disenos | `disenos` |
| Redes | `/api/redes` | Redes | `redes` |
| Client Portal | `/api/client-portal` | ClientPortal | (usa `clients` con role=client) |

## Key Relationships

```
users ──< clients (client_user_id)
users ──< tasks (assigned_to, created_by)
users ──< patrocinios (created_by, updated_by)

clients ──< tasks (client_id)
clients ──< documents (client_id)

patrocinios ──< tasks (patrocinio_id)
patrocinios ──< patrocinio_documents (patrocinio_id)
patrocinios ──< patrocinio_checklist ──> package_checklist_items
patrocinios ──< patrocinio_comments
patrocinios ──< disenos (patrocinio_id)
patrocinios ──< redes (patrocinio_id)

packages ──< package_checklist ──> package_checklist_items

departments ──< employees
departments ──< expenses
departments ──< communications

finance_solicitudes ──< finance_solicitud_files
finance_expenses ──< finance_expense_files

communications ──< communication_files
```

**Nota:** `clients` y `patrocinios` son tablas paralelas con esquema similar. `clients` es el original; `patrocinios` es una refactorizacion con audit trail (created_by/updated_by). Ambas coexisten.

## Auth & Roles

| Rol | Permisos |
|-----|----------|
| `admin` | CRUD completo, gestion de usuarios, configuracion |
| `user` | Ver/editar contenido asignado, crear tareas |
| `viewer` | Solo lectura |
| `client` | Solo ve su perfil y documentos publicos via `/api/client-portal` |

- Token JWT via `Authorization: Bearer <token>` o query param `?token=`
- Middleware: `authMiddleware` (cualquier usuario autenticado), `adminOnly` (solo admin)
- TTL: 24 horas

## File Uploads

| Modulo | Directorio | Max Size |
|--------|-----------|----------|
| Documents (clients) | `/uploads/` | 20MB |
| Patrocinios | `/uploads/patrocinios/` | 10MB |
| Expenses | `/uploads/expenses/` | 10MB |
| Communications | `/uploads/communications/` | 10MB |
| Disenos | `/uploads/disenos/` | 10MB |
| Seguimiento comments | `/uploads/seguimiento/` | 10MB |
| Finance solicitudes | `/uploads/finance/` | 10MB |

## Database Overview

SQLite con 25+ tablas. Sin ORM — todas las queries son SQL raw con prepared statements.

**Tablas core:** `users`, `clients`, `patrocinios`, `tasks`, `task_comments`
**Documentos:** `documents`, `document_comments`, `patrocinio_documents`, `communication_files`, `expense_files`, `finance_solicitud_files`, `finance_expense_files`
**Tracking:** `patrocinio_checklist`, `patrocinio_comments`
**Catalogos:** `departments`, `employees`, `document_types`, `packages`, `package_checklist_items`, `package_checklist`
**Finanzas:** `finance_contributions`, `finance_solicitudes`, `finance_expenses`, `finance_committee_budgets`, `finance_monthly_reports`
**Otros:** `expenses`, `disenos`, `redes`, `communications`

## Conventions for AI

- **Siempre** usar prepared statements, nunca concatenar input del usuario en queries
- **Seguir** el patron de rutas existente: CRUD basico + paginacion + search
- **No agregar** ORM — mantener SQL raw
- **Mantener** ES modules (import/export, no require)
- **Usar** `addColumn()` helper para migraciones seguras (no romper si la columna ya existe)
- **Respeta** los CHECK constraints en las tablas (statuses, roles, priorities)
- **Al crear** nuevos endpoints, agregar auth middleware y follow el patron del archivo de ruta correspondiente
- **Al crear** nuevas paginas, agregar route en App.jsx y seguir el patron de paginas existentes
- **Archivos** subidos se guardan en `uploads/<modulo>/` con nombre unico via multer
