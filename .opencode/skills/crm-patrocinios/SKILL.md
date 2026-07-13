---
name: crm-patrocinios
description: Knowledge base detallada del CRM Patrocinios. Actívala SIEMPRE que se trabaje en el proyecto CRM/ — incluye schema completo de BD, catálogo de endpoints, workflows de negocio y deep-dive por módulo.
---

# CRM Patrocinios — Knowledge Base Detallada

Esta skill contiene el conocimiento profundo del proyecto. Úsala como referencia al crear/modificar endpoints, tablas, o lógica de negocio.

---

## 1. Database Schema Completo

### users
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,          -- bcrypt hash
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user','viewer','client')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### clients
```sql
CREATE TABLE clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT,
  contact_person TEXT,
  phone TEXT,
  sponsorship_type TEXT,          -- "Efectivo" o "Especie"
  package TEXT,                   -- nombre del paquete, ej: "Legado ($$6000)"
  visit_status TEXT,
  payment_status TEXT,            -- "Pagado", "Pendiente", "Abonado", "Cancelado"
  student_obtained TEXT,
  student_contacted TEXT,
  in_kind_detail TEXT,
  payment_detail TEXT,
  social_media_fulfilled TEXT,
  tickets_delivered TEXT,
  logo_requested TEXT,
  notes TEXT,
  client_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### patrocinios
```sql
CREATE TABLE patrocinios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT,
  contact_person TEXT,
  phone TEXT,
  sponsorship_type TEXT,
  package TEXT,
  visit_status TEXT,
  payment_status TEXT,
  student_obtained TEXT,
  student_contacted TEXT,
  in_kind_detail TEXT,
  payment_detail TEXT,
  social_media_fulfilled TEXT,
  tickets_delivered TEXT,
  logo_requested TEXT,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### tasks
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
  due_date TEXT,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  patrocinio_id INTEGER REFERENCES patrocinios(id) ON DELETE SET NULL,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### task_comments
```sql
CREATE TABLE task_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### documents
```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- nombre en disco (UUID-based)
  original_name TEXT NOT NULL,     -- nombre original del archivo
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('public','private')),
  uploaded_by INTEGER REFERENCES users(id),
  category TEXT DEFAULT 'general',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### document_comments
```sql
CREATE TABLE document_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### patrocinio_documents
```sql
CREATE TABLE patrocinio_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patrocinio_id INTEGER NOT NULL REFERENCES patrocinios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  category TEXT DEFAULT 'general',
  uploaded_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### departments
```sql
CREATE TABLE departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
-- Seed: Diseño, Redes, Decoración, Logística, Patrocinio, Producción Audiovisual, Comunicados
```

### employees
```sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### expenses
```sql
CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  responsible_name TEXT NOT NULL,
  concept TEXT NOT NULL,
  description TEXT,
  justification TEXT,
  amount REAL NOT NULL,
  required_date TEXT,
  quote_date TEXT,
  impact_if_not_done TEXT,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','paid')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### expense_files
```sql
CREATE TABLE expense_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### document_types
```sql
CREATE TABLE document_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
-- Seed: Permiso, Invitación, Comunicado, Oficio, Contrato
```

### communications
```sql
CREATE TABLE communications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio TEXT UNIQUE NOT NULL,       -- auto-generado: COM-YYMM-NNNN
  employee_name TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  document_type_id INTEGER REFERENCES document_types(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'asignado' CHECK(status IN ('asignado','en_redaccion','en_revision','aprobado','entregado')),
  priority TEXT NOT NULL DEFAULT 'media' CHECK(priority IN ('alta','media','baja')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### communication_files
```sql
CREATE TABLE communication_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  communication_id INTEGER NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### packages
```sql
CREATE TABLE packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  amount REAL,
  type TEXT CHECK(type IN ('monetario','especie','mixto')),
  sort_order INTEGER DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
-- Seed: Origen ($$1000), Origen E (1000), Presente ($$2500), Presente E (3000),
--        Futuro ($$3500), Futuro E (4500), Legado ($$6000), Legado E (6500)
```

### package_checklist_items
```sql
CREATE TABLE package_checklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
-- 17 items: welcome_post, event_ticket, promo_post, logo_main_banner,
-- event_day_mention, company_social_post, vacancy_promotion, marketing_workshop,
-- logo_event_screen, kit_relindo, social_story_design, promo_video_30s,
-- lobby_activation, promo_video_1min, press_conference, sponsor_brunch,
-- photo_with_speakers
```

### package_checklist
```sql
CREATE TABLE package_checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES package_checklist_items(id) ON DELETE CASCADE,
  UNIQUE(package_id, item_id)
);
```

### patrocinio_checklist
```sql
CREATE TABLE patrocinio_checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patrocinio_id INTEGER NOT NULL REFERENCES patrocinios(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES package_checklist_items(id) ON DELETE CASCADE,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE(patrocinio_id, item_id)
);
```

### patrocinio_comments
```sql
CREATE TABLE patrocinio_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patrocinio_id INTEGER NOT NULL REFERENCES patrocinios(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  deleted INTEGER NOT NULL DEFAULT 0,
  deleted_by INTEGER REFERENCES users(id),
  deleted_at TEXT,
  file_url TEXT,
  file_name TEXT
);
```

### disenos
```sql
CREATE TABLE disenos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  n_orden INTEGER,
  n_paquete TEXT,
  descripcion_proyecto TEXT,
  responsable_patrocinio TEXT,
  fecha_inicio TEXT,
  fecha_vencimiento TEXT,
  prioridad TEXT CHECK(prioridad IN ('MAXIMA','ALTA','MEDIA','BAJA')),
  costo REAL DEFAULT 0,
  liquidado REAL DEFAULT 0,
  comites_involucrados TEXT,      -- comma-separated
  responsable_diseno TEXT,
  status TEXT DEFAULT 'PENDIENTE' CHECK(status IN ('PENDIENTE','SE TRABAJA','EN REVISION','COMPLETADO','CANCELADO')),
  comentarios_extras TEXT,
  patrocinio_id INTEGER REFERENCES patrocinios(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### redes
```sql
CREATE TABLE redes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio TEXT,
  empresa_nombre TEXT,
  responsable TEXT,
  actividad TEXT,
  fecha_inicio TEXT,
  fecha_limite TEXT,
  estado TEXT DEFAULT 'incompleto' CHECK(estado IN ('completo','en progreso','incompleto')),
  post_programados TEXT CHECK(post_programados IN ('SI','No','en diseño')),
  reels TEXT CHECK(reels IN ('grabados','editando','programados','no aplica')),
  observaciones TEXT,
  patrocinio_id INTEGER REFERENCES patrocinios(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### finance_contributions
```sql
CREATE TABLE finance_contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  salon TEXT NOT NULL CHECK(salon IN ('A','B','C','D')),
  amount REAL NOT NULL DEFAULT 0,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### finance_solicitudes
```sql
CREATE TABLE finance_solicitudes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  committee TEXT NOT NULL,
  responsible TEXT NOT NULL,
  concept TEXT NOT NULL,
  justification TEXT,
  amount_requested REAL NOT NULL DEFAULT 0,
  amount_approved REAL,
  amount_paid REAL,
  priority TEXT NOT NULL DEFAULT 'media' CHECK(priority IN ('baja','media','alta','urgente')),
  quote_file TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente','aprobada','rechazada','pagada')),
  reviewed_by INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  payment_date TEXT,
  observations TEXT,
  impact_if_not_done TEXT,
  email TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### finance_solicitud_files
```sql
CREATE TABLE finance_solicitud_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  solicitud_id INTEGER NOT NULL REFERENCES finance_solicitudes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### finance_expenses
```sql
CREATE TABLE finance_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  committee TEXT,
  concept TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  responsible TEXT NOT NULL,
  receipts_count INTEGER DEFAULT 0,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### finance_expense_files
```sql
CREATE TABLE finance_expense_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL REFERENCES finance_expenses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

### finance_committee_budgets
```sql
CREATE TABLE finance_committee_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  committee TEXT UNIQUE NOT NULL,
  budget REAL NOT NULL DEFAULT 0,
  spent REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'RIESGO' CHECK(status IN ('RIESGO','Alerta','OK')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
-- 10 comites: Finanzas, Comunicados, Diseño, Decoración, Redes, Patrocinio,
-- Logística, Producción Audiovisual, Conferencistas, Otro
```

### finance_monthly_reports
```sql
CREATE TABLE finance_monthly_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  initial_balance REAL NOT NULL DEFAULT 0,
  contributions_total REAL NOT NULL DEFAULT 0,
  sponsorships_cash REAL NOT NULL DEFAULT 0,
  sponsorships_kind REAL NOT NULL DEFAULT 0,
  expenses_total REAL NOT NULL DEFAULT 0,
  final_balance REAL NOT NULL DEFAULT 0,
  written_report TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE(month, year)
);
```

---

## 2. API Endpoints Completos

### Auth (`/api/auth`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| POST | `/login` | No | Login, retorna JWT + user |
| GET | `/me` | JWT | Perfil del usuario actual |
| GET | `/` | admin | Listar todos los usuarios |
| POST | `/` | admin | Crear usuario |
| PUT | `/:id` | admin | Actualizar usuario |

### Users (`/api/users`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | JWT | Listar usuarios activos (para dropdowns) |

### Clients (`/api/clients`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | JWT | Listar clientes (paginado, search) |
| GET | `/:id` | JWT | Detalle + tareas del cliente |
| POST | `/` | JWT | Crear cliente |
| PUT | `/:id` | JWT | Actualizar cliente |
| DELETE | `/:id` | JWT | Eliminar cliente |

### Patrocinios (`/api/patrocinios`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | JWT | Listar (paginado, search, con progreso checklist) |
| GET | `/stats` | JWT | Estadisticas agregadas |
| GET | `/:id` | JWT | Detalle + documentos + tareas |
| POST | `/` | JWT | Crear (validado) |
| PUT | `/:id` | JWT | Actualizar (tracks updated_by) |
| DELETE | `/:id` | JWT | Eliminar |
| GET | `/:id/documents` | JWT | Listar documentos |
| POST | `/:id/documents` | JWT | Subir documento (10MB max) |
| DELETE | `/:id/documents/:docId` | JWT | Eliminar documento |
| GET | `/:id/documents/:docId/download` | JWT | Descargar documento |
| GET | `/:id/tasks` | JWT | Listar tareas vinculadas |
| POST | `/:id/tasks` | JWT | Crear tarea vinculada |

### Patrocinio Seguimiento (`/api/patrocinios/:id/seguimiento`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | JWT | Datos completos: patrocinio + paquete + checklist + comments |
| PUT | `/checklist` | JWT | Toggle completado de item |
| POST | `/comments` | JWT | Agregar comentario + archivo opcional |
| DELETE | `/comments/:commentId` | admin | Soft-delete comentario |
| GET | `/comments/:commentId/download` | JWT | Descargar archivo adjunto |

### Tasks (`/api/tasks`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | JWT | Listar (filtro status, assigned_to, client_id) |
| POST | `/` | JWT | Crear tarea |
| PUT | `/:id` | JWT | Actualizar tarea |
| DELETE | `/:id` | JWT | Eliminar tarea |
| POST | `/:id/comments` | JWT | Agregar comentario |
| GET | `/:id/comments` | JWT | Listar comentarios |

### Documents (`/api/documents`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/client/:clientId` | JWT | Documentos del cliente |
| GET | `/client/:clientId/public` | JWT | Documentos publicos |
| POST | `/upload/:clientId` | JWT | Subir archivo (20MB max) |
| PATCH | `/:id/visibility` | JWT | Cambiar visibilidad |
| GET | `/download/:id` | JWT | Descargar archivo |
| DELETE | `/:id` | JWT | Eliminar documento |
| GET | `/:id/comments` | JWT | Listar comentarios |
| POST | `/:id/comments` | JWT | Agregar comentario |

### Client Portal (`/api/client-portal`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/profile` | client | Perfil vinculado + docs publicos |
| GET | `/documents` | client | Documentos publicos del cliente |

### Departments (`/api/departments`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | JWT | Listar departamentos |
| POST | `/` | admin | Crear departamento |
| PUT | `/:id` | admin | Actualizar departamento |
| DELETE | `/:id` | admin | Eliminar departamento |

### Employees (`/api/employees`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | JWT | Listar empleados (con departamento) |
| POST | `/` | admin | Crear empleado |
| PUT | `/:id` | admin | Actualizar empleado |
| DELETE | `/:id` | admin | Eliminar empleado |

### Expenses (`/api/expenses`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | JWT | Listar (paginado, con archivos) |
| GET | `/:id` | JWT | Detalle + archivos |
| POST | `/` | JWT | Crear (hasta 5 archivos, 10MB c/u) |
| PUT | `/:id` | JWT | Actualizar |
| DELETE | `/:id` | JWT | Eliminar + archivos |
| GET | `/download/:fileId` | JWT | Descargar adjunto |

### Document Types (`/api/document-types`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | JWT | Listar tipos |
| POST | `/` | JWT | Crear tipo |
| PUT | `/:id` | JWT | Actualizar tipo |
| DELETE | `/:id` | JWT | Eliminar tipo |

### Communications (`/api/communications`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | JWT | Listar (paginado, con archivos) |
| GET | `/stats` | JWT | Stats por status y tipo |
| GET | `/:id` | JWT | Detalle + archivos |
| POST | `/` | JWT | Crear (auto-folio COM-YYMM-NNNN, hasta 10 archivos) |
| PUT | `/:id` | JWT | Actualizar |
| DELETE | `/:id` | JWT | Eliminar + archivos |
| GET | `/download/:fileId` | JWT | Descargar adjunto |

### Packages (`/api/packages`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | JWT | Listar activos (all=true muestra todos) |
| POST | `/` | admin | Crear paquete |
| PUT | `/:id` | admin | Actualizar paquete |
| DELETE | `/:id` | admin | Soft-delete (desactivar) |
| GET | `/checklist-items` | JWT | Listar items de checklist |
| POST | `/checklist-items` | admin | Crear item |
| PUT | `/checklist-items/:id` | admin | Actualizar item |
| DELETE | `/checklist-items/:id` | admin | Eliminar item |
| GET | `/:id/checklist` | JWT | Items asignados al paquete |
| PUT | `/:id/checklist` | admin | Reemplazar checklist del paquete |

### Finance (`/api/finance`)

**Contributions:**
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/contributions` | JWT | Listar + totales por salon |
| POST | `/contributions` | JWT | Crear contribucion |
| PUT | `/contributions/:id` | JWT | Actualizar |
| DELETE | `/contributions/:id` | JWT | Eliminar |

**Sponsorships (finance view):**
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/sponsorships` | JWT | Patrocinios con totales financieros |

**Solicitudes:**
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/solicitudes` | JWT | Listar (paginado, con breakdown status) |
| GET | `/solicitudes/:id` | JWT | Detalle + archivos |
| POST | `/solicitudes` | JWT | Crear (hasta 5 archivos) |
| PUT | `/solicitudes/:id` | JWT | Actualizar |
| DELETE | `/solicitudes/:id` | JWT | Eliminar + archivos |
| GET | `/solicitudes/download/:fileId` | JWT | Descargar adjunto |

**Expenses (salidas):**
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/expenses` | JWT | Listar + totales por comite |
| POST | `/expenses` | JWT | Crear (actualiza budget del comite) |
| PUT | `/expenses/:id` | JWT | Actualizar (refresca budgets) |
| DELETE | `/expenses/:id` | JWT | Eliminar + refresca budgets |
| GET | `/expenses/download/:fileId` | JWT | Descargar adjunto |

**Budgets:**
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/budgets` | JWT | Listar todos los budgets |
| PUT | `/budgets/:committee` | JWT | Actualizar budget del comite |

**Summary:**
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/summary` | JWT | Resumen global financiero |

**Monthly Reports:**
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/monthly-reports` | JWT | Listar reportes |
| GET | `/monthly-reports/:id` | JWT | Detalle reporte |
| POST | `/monthly-reports` | JWT | Crear reporte |
| PUT | `/monthly-reports/:id` | JWT | Actualizar reporte |
| DELETE | `/monthly-reports/:id` | JWT | Eliminar reporte |
| POST | `/monthly-reports/generate` | JWT | Auto-generar datos del reporte |

**Webhook:**
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| POST | `/webhook/form` | No | Recibe Google Forms -> crea solicitud automaticamente |

### Disenos (`/api/disenos`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | JWT | Listar (paginado, search, filtros) |
| GET | `/stats` | JWT | Stats por status, prioridad, costos |
| GET | `/:id` | JWT | Detalle + docs del patrocinio |
| POST | `/` | JWT | Crear (validado) |
| PUT | `/:id` | JWT | Actualizar (tracks updated_by) |
| DELETE | `/:id` | JWT | Eliminar |
| GET | `/patrocinios/search` | JWT | Buscar patrocinios para vincular |

### Redes (`/api/redes`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | JWT | Listar (paginado, search, filtros) |
| GET | `/stats` | JWT | Stats por estado, posts, reels |
| GET | `/:id` | JWT | Detalle + patrocinio vinculado |
| POST | `/` | JWT | Crear (validado) |
| PUT | `/:id` | JWT | Actualizar (tracks updated_by) |
| DELETE | `/:id` | JWT | Eliminar |

### Stats (`/api/stats`)
| Method | Path | Auth | Descripcion |
|--------|------|------|-------------|
| GET | `/` | No | Dashboard stats: clients, tasks, patrocinios |

---

## 3. Workflows de Negocio

### Ciclo de Vida de un Patrocinio
```
1. Creacion → patrocinio registrado con empresa, contacto, tipo, paquete
2. Seguimiento → checklist del paquete se va completando item por item
3. Documentos → se suben contratos, logos, comprobantes
4. Tareas → se crean tareas vinculadas para acciones específicas
5. Finanzas → se registra en finance/sponsorships para tracking monetario
6. Disenos → se crean proyectos de diseño vinculados
7. Redes → se gestiona contenido social media del patrocinador
```

### Workflow de Aprobacion de Solicitudes (Finance)
```
pendiente → aprobada → pagada
    ↓
rechazada
```
- Se crea via formulario o webhook de Google Forms
- Reviewed by / approved_by trackean quien aprobo
- Amount approved puede diferir de amount requested

### Sistema de Folios
- **Communications:** `COM-YYMM-NNNN` (ej: COM-2607-0001)
- Auto-generado secuencialmente al crear
- Unique constraint en la tabla

### Checklist por Paquete
- Cada paquete tiene N items de checklist asignados
- Al crear patrocinio, se copia el checklist del paquete a `patrocinio_checklist`
- Items se marcan completados individualmente
- Progreso calculado como `completed / total items`

### Budget Tracking por Comite
- 10 comites con budget asignado
- Al crear/eliminar expense, se recalcula `spent` del comite
- Status se actualiza automaticamente: `OK` (>50% disponible), `Alerta` (25-50%), `RIESGO` (<25%)

---

## 4. Frontend Pages

| Ruta | Componente | Descripcion |
|------|-----------|-------------|
| `/` | Dashboard | Stats financieros + workload de tareas |
| `/clients` | Clients | Lista con search/pagination |
| `/clients/:id` | ClientDetail | Detalle + tareas + documentos |
| `/tasks` | Tasks | Tablero de tareas con filtros |
| `/users` | Users | Gestion de usuarios (admin) |
| `/finance` | Finance | Dashboard financiero completo |
| `/communications` | Communications | Comunicaciones oficiales |
| `/settings` | Settings | Configuracion del sistema (admin) |
| `/patrocinios` | Patrocinios | Lista de patrocinios |
| `/patrocinios/:id/seguimiento` | SeguimientoPatrocinio | Checklist + timeline |
| `/disenos` | Disenos | Tablero de proyectos de diseño |
| `/redes` | Redes | Gestion de redes sociales |
| `/portal` | ClientPortal | Portal del cliente (role=client) |

---

## 5. Seed Data

### Auto-seed en server.js
- Admin user: `admin` / `admin123` (si no existe)

### Auto-seed en database.js
- 8 paquetes (Origen → Legado, monetario + especie)
- 17 items de checklist
- 5 tipos de documento (Permiso, Invitación, Comunicado, Oficio, Contrato)
- 7 departamentos (Diseño, Redes, Decoración, Logística, Patrocinio, Producción Audiovisual, Comunicados)
- 1 diseño de ejemplo (Perfumería)
- 10 comites de budget (finanzas hasta "Otro")

### Seeders custom (via Docker)
```bash
docker exec -it <backend_container> node seed.js          # users, clients, tasks, docs
docker exec -it <backend_container> node seed-checklist.js # checklist items
docker exec -it <backend_container> node seed-packages.js  # packages
docker exec -it <backend_container> node seed-patrocinios.js # patrocinios
```

---

## 6. Migraciones

Sistema custom en `backend/migrations/runner.js`:
- Archivos `.sql` numerados (001_, 002_, etc.)
- Trackeados en tabla `_migrations`
- Ejecutados al iniciar el server via `database.js`

### Migraciones existentes
1. `001_finance_contributions.sql` — Tabla de aportaciones por salon
2. `002_finance_solicitudes.sql` — Solicitudes + archivos
3. `003_finance_expenses.sql` — Gastos por comite + budgets
4. `004_finance_monthly_reports.sql` — Reportes mensuales

### Para crear nueva migracion
1. Crear archivo `NNN_descripcion.sql` en `backend/migrations/`
2. Usar `CREATE TABLE IF NOT EXISTS` para tablas nuevas
3. Usar `addColumn()` helper para columnas nuevas (no romper si ya existe)
4. La migracion se ejecuta automaticamente al reiniciar el server

---

## 7. Patron de Rutas (Backend)

Cada archivo de ruta sigue este patron:

```javascript
import { Router } from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import db from '../database.js';

const router = Router();

// GET / — listado con paginacion y search
router.get('/', authMiddleware, (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  // ... query con WHERE LIKE, LIMIT, OFFSET
  // ... COUNT(*) para total
  res.json({ data: [], total: 0, page: 1, totalPages: 1 });
});

// GET /:id — detalle
router.get('/:id', authMiddleware, (req, res) => {
  // ... query por id
  res.json(item);
});

// POST / — crear
router.post('/', authMiddleware, (req, res) => {
  // ... validacion + INSERT
  res.status(201).json(item);
});

// PUT /:id — actualizar
router.put('/:id', authMiddleware, (req, res) => {
  // ... UPDATE con COALESCE para campos opcionales
  res.json(item);
});

// DELETE /:id — eliminar
router.delete('/:id', authMiddleware, (req, res) => {
  // ... DELETE
  res.json({ message: 'Eliminado' });
});

export default router;
```

### Convenciones de queries
- Siempre `db.prepare().get()` o `.all()` o `.run()`
- Paginacion: `LIMIT ? OFFSET ?` con `(page-1)*limit`
- Search: `WHERE column LIKE ?` con `%search%`
- Updates: `SET col = COALESCE(?, col)` para campos opcionales
- Fechas: `datetime('now','localtime')` en defaults

---

## 8. Convenciones de Frontend

### Estructura de pagina
```jsx
import { useState, useEffect } from 'react';
import api from '../api';

export default function MiPagina() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const res = await api.get('/mi-endpoint');
    setData(res.data);
    setLoading(false);
  };

  if (loading) return <div>Cargando...</div>;
  return (/* JSX */);
}
```

### API client (`src/api/index.js`)
- Axios instance con base URL `/api`
- Interceptor agrega JWT del localStorage
- Manejo de errores 401 → logout
