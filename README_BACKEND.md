# AgendaPro - Backend Setup con Supabase

## 1. Configuración de Supabase
1. Crea un nuevo proyecto en [Supabase](https://supabase.com).
2. Ve al panel de "SQL Editor" en Supabase.
3. Copia el contenido del archivo `backend/supabase/schema.sql` y ejecútalo para crear todas las tablas, relaciones y políticas RLS.

## 2. Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto (basado en `.env.example`) y configura:

```env
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

*Nota: La `SERVICE_ROLE_KEY` es necesaria porque el backend actúa como administrador que maneja los datos de los inquilinos (empresas) inyectando el `tenantId` en las consultas de forma segura.*

## 3. Ejecución Local
1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
3. El servidor backend estará corriendo en `http://localhost:3000`. 
4. La documentación Swagger está disponible en: `http://localhost:3000/api/docs`.

## Arquitectura y Endpoints

### Patrón
- **Rutas (`backend/src/routes`)**: Definición de endpoints REST y asignación a Middlewares (como la extracción de `X-Tenant-Id`).
- **Controladores (`backend/src/controllers`)**: Despachan las llamadas a los servicios o ejecutan consultas preparadas a Supabase para CRUD estándar.
- **Servicios (`backend/src/services`)**: Lógica de núcleo (Ej: prevención de dobles reservas o CRON para recordatorios n8n).

### Endpoints Principales (Ejemplos rápidos)
- `POST /api/empresas` -> Crea un nuevo tenant.
- `GET /api/services` -> Requiere cabecera `X-Tenant-Id: <uuid>`, devuelve los servicios del inquilino.
- `POST /api/appointments` -> Valida conflictos horarios y crea la cita.
- `GET /api/availability?employeeId=X&date=Y&time=Z` -> Verifica si el slot horario está libre.
- `GET /api/widget/init?tenantId=X` -> Endpoint de inicialización liviano para insertar widget de reservas en terceros.
- `POST /api/webhook/n8n` -> Para integrar la salida del procesador de citas hacia agentes conversacionales n8n-WhatsApp.

### Tareas en Segundo Plano (Cron Job)
El servidor incluye un Node-Cron en `server.ts` que se ejecuta cada minuto llamando a `reminderService.processReminders()`, buscando reservas cercanas para disparar endpoints a n8n y enviar recordatorios WhatsApp o Emails configurados por tenant.
