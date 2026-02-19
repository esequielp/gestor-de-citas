# Documento de Diseño Técnico - Backend AgendaPro (MVP)

## 1. Arquitectura General

### Descripción del Sistema
El sistema se basa en una arquitectura **Cliente-Servidor RESTful**.
- **Frontend (SPA):** React + Vite (Existente). Se encarga de la presentación y la experiencia de usuario.
- **Backend (API):** Python (Recomendado: FastAPI o Django Ninja) o Node.js (Express/NestJS). Se encarga de la lógica de negocio, cálculos de disponibilidad y seguridad.
- **Base de Datos:** Relacional (PostgreSQL recomendado). Garantiza la integridad de las citas y relaciones complejas.

### Flujo de Datos
1.  **Cliente (Navegador):** Realiza peticiones HTTP (JSON) a la API.
2.  **API Gateway / Load Balancer:** (Nginx/Traefik) Maneja SSL y enruta el tráfico.
3.  **Application Server:** Valida tokens, ejecuta lógica de negocio y calcula disponibilidad.
4.  **Database:** Almacena y recupera datos persistentes.

### Actores y Roles
1.  **Super Admin:** Acceso total al Dashboard. Crea sucursales, servicios y empleados.
2.  **Profesional (Empleado):** Puede ver su propia agenda y gestionar sus citas asignadas.
3.  **Cliente Final:** Acceso público al Wizard de reservas. Puede consultar historial si se registra.

---

## 2. Modelos de Base de Datos (Schema)

A continuación, el diseño Entidad-Relación propuesto.

### A. Usuarios y Autenticación (`users`)
Tabla base para acceso al sistema (Admins y Profesionales).
*   `id` (PK, UUID)
*   `email` (Unique, String)
*   `password_hash` (String)
*   `role` (Enum: 'ADMIN', 'EMPLOYEE')
*   `is_active` (Boolean)
*   `created_at` (Timestamp)

### B. Sucursales (`branches`)
*   `id` (PK, UUID)
*   `name` (String)
*   `address` (String)
*   `image_url` (String)
*   `lat` (Float)
*   `lng` (Float)
*   `phone` (String)
*   `is_active` (Boolean)

### C. Servicios (`services`)
*   `id` (PK, UUID)
*   `name` (String)
*   `description` (Text)
*   `duration_minutes` (Integer) - *Crítico para calcular slots.*
*   `price` (Decimal)
*   `is_active` (Boolean)

### D. Relación Servicios-Sucursales (`branch_services`)
Tabla pivote. Un servicio puede no estar en todas las sucursales.
*   `branch_id` (FK)
*   `service_id` (FK)
*   `is_active` (Boolean) - Permite apagar un servicio en una sucursal específica.

### E. Profesionales (`employees`)
*   `id` (PK, UUID)
*   `user_id` (FK, Nullable) - Enlace opcional para login.
*   `branch_id` (FK) - Sucursal base.
*   `name` (String)
*   `role_label` (String, ej: "Estilista Senior")
*   `avatar_url` (String)
*   `is_active` (Boolean)

### F. Relación Profesional-Servicios (`employee_services`)
Tabla pivote. Define qué sabe hacer cada empleado.
*   `employee_id` (FK)
*   `service_id` (FK)

### G. Horarios de Empleado (`schedules`)
Define la disponibilidad base semanal.
*   `id` (PK)
*   `employee_id` (FK)
*   `day_of_week` (Integer: 0-6)
*   `start_time` (Time, ej: 09:00)
*   `end_time` (Time, ej: 18:00)
*   `is_work_day` (Boolean)
*   *Nota: Para descansos intermedios, se puede usar una estructura JSONB o una tabla hija `schedule_breaks`.*

### H. Clientes (`clients`)
*   `id` (PK, UUID)
*   `full_name` (String)
*   `email` (String)
*   `phone` (String)
*   `notes` (Text)

### I. Citas / Reservas (`appointments`)
*   `id` (PK, UUID)
*   `client_id` (FK)
*   `branch_id` (FK)
*   `service_id` (FK)
*   `employee_id` (FK)
*   `start_datetime` (Timestamp with Timezone)
*   `end_datetime` (Timestamp with Timezone) - Calculado (start + service.duration).
*   `status` (Enum: 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')
*   `cancellation_reason` (Text, Nullable)
*   `created_at` (Timestamp)

---

## 3. Lógica de Negocio (Backend Core)

### 3.1. Flujo de Reserva (Servicio Primero)
1.  **Filtrado de Sucursales:** Al recibir un `service_id`, la API debe hacer un `JOIN` entre `branches` y `branch_services` donde `service_id` coincida y `is_active` sea true.
2.  **Cálculo de Disponibilidad:**
    *   Entrada: `service_id`, `branch_id`, `date`.
    *   Algoritmo:
        1.  Buscar todos los empleados de la sucursal que realicen el servicio (`employee_services`).
        2.  Para cada empleado, obtener su horario base (`schedules`) para el día de la semana de `date`.
        3.  Obtener todas las citas existentes (`appointments`) de esos empleados en esa fecha.
        4.  Generar "Time Slots" (ventanas de tiempo) basadas en la duración del servicio.
        5.  Restar los intervalos ocupados por citas existentes.
        6.  Retornar lista de horas disponibles.

### 3.2. Prevención de Doble Reserva (Race Conditions)
*   Usar **Transacciones de Base de Datos** (ACID) al momento de crear la cita.
*   Nivel de aislamiento: `SERIALIZABLE` o bloqueo de fila (`SELECT FOR UPDATE`) al verificar disponibilidad justo antes de insertar.
*   Constraint SQL opcional: Un índice de exclusión (PostgreSQL `ExclusionConstraint`) para evitar solapamiento de rangos de tiempo por `employee_id`.

### 3.3. Asignación Automática ("Cualquier Profesional")
Si el frontend envía `employee_id: null` (o flag "any"):
1.  El backend busca todos los empleados disponibles en el slot seleccionado.
2.  Estrategia de asignación:
    *   **Random:** Carga distribuida.
    *   **Round Robin:** Turnos.
    *   **Más libre:** El que tenga menos citas ese día.

---

## 4. Endpoints (API REST)

Prefijo global: `/api/v1`

### Módulo Público (Booking Wizard)

| Método | Ruta | Descripción | Input | Output |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/services` | Listar servicios activos | - | `[{id, name, duration, price}]` |
| `GET` | `/services/{id}/branches` | Sucursales que tienen el servicio X | - | `[{id, name, lat, lng, distance}]` |
| `GET` | `/availability` | Obtener slots disponibles | `?service_id=X&branch_id=Y&date=YYYY-MM-DD` | `[{hour: 9, employees: [id...]}]` |
| `POST` | `/appointments` | **Reservar Cita** | `{clientId, serviceId, branchId, employeeId, date, time}` | `{id, status, confirmationCode}` |

### Módulo Administrativo (Dashboard) - *Requiere Auth*

| Método | Ruta | Descripción | Input | Output |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Login Admin/Empleado | `{email, password}` | `{token, user}` |
| `GET` | `/dashboard/stats` | KPIs del Dashboard | `?date_range=...` | `{todayAppts, income, etc}` |
| `GET` | `/appointments` | Listar citas (filtros) | `?start_date=&end_date=&branch_id=` | `[Appointment]` |
| `PUT` | `/appointments/{id}/status` | Cambiar estado (Cancelar/Confirmar) | `{status: 'CANCELLED'}` | `Appointment` |
| `POST` | `/employees` | Crear empleado | `{name, branch_id, services: []}` | `Employee` |
| `PUT` | `/employees/{id}/schedule` | Actualizar horario | `[{day: 1, ranges: []}]` | `Success` |

---

## 5. Seguridad

1.  **JWT (JSON Web Tokens):**
    *   Al hacer login, el servidor firma un token con `sub` (userId) y `role`.
    *   El token expira en 8 horas (jornada laboral).
2.  **Middleware de Autorización:**
    *   Rutas `/admin/*` verifican `role == 'ADMIN'`.
    *   Rutas de profesionales solo permiten ver/editar citas propias o de su sucursal.
3.  **CORS:** Configurar estrictamente para permitir peticiones solo desde el dominio del frontend (Vercel).
4.  **Validación de Datos:** Usar esquemas estrictos (Zod en Node o Pydantic en Python) para evitar inyección SQL o datos corruptos.

---

## 6. Integración con Frontend

### Estrategia de Migración
Actualmente usas `localStorage`. Para integrar este backend:

1.  **Crear `apiClient.ts`:** Una instancia de Axios configurada con la `BASE_URL` del backend.
2.  **Interceptor:** Configurar Axios para inyectar el header `Authorization: Bearer {token}` automáticamente si existe en localStorage.
3.  **Refactorizar `dataService.ts`:**
    *   Cambiar `getServices()` para que retorne `apiClient.get('/services')`.
    *   Cambiar `addAppointment()` para que haga `apiClient.post('/appointments', data)`.
    *   Manejar estados de carga (`loading`) y errores (`try/catch`) en los componentes de React.

### Manejo de Fechas
*   **Backend:** Siempre guardar en UTC (Timezone Aware).
*   **Frontend:** Convertir a hora local del navegador solo al momento de mostrar (render).
*   **Comunicación:** Usar formato ISO 8601 (`2024-03-20T14:30:00Z`).

---

## 7. Recomendaciones Técnicas

1.  **Logging Estructurado:** Implementar logs que registren no solo "Error", sino el contexto: `[BookingFailed] Service: Haircut, Branch: Central, Reason: SlotTaken`.
2.  **Manejo de Errores HTTP:**
    *   `400 Bad Request`: Datos de entrada inválidos.
    *   `401 Unauthorized`: Token inválido o expirado.
    *   `403 Forbidden`: Intento de acceder a recurso de otro rol.
    *   `409 Conflict`: Doble reserva (Slot ya ocupado).
    *   `422 Unprocessable Entity`: Error de validación de campos.
3.  **Escalabilidad (Futuro):**
    *   Implementar Redis para cachear la respuesta de `/availability` (los horarios no cambian cada segundo).
4.  **Notificaciones:**
    *   Integrar servicio de Email (SendGrid/AWS SES) o WhatsApp (Twilio) para confirmar citas automáticamente tras el `POST /appointments`.
