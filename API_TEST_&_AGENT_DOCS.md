# Documentación de API y Guía de Integración de Agente (AgendaPro)

Esta guía detalla cómo probar las APIs de AgendaPro y cómo integrar un agente inteligente (vía LangChain) para la programación automática de citas.

## 1. Comandos cURL para Pruebas de API

Para todas las peticiones, se requiere el encabezado `x-tenant-id` (ID de la Empresa).

### Sucursales (Branches)
- **Listar Sucursales:**
  ```bash
  curl -H "x-tenant-id: <COMPANY_ID>" http://localhost:3000/api/branches
  ```
- **Crear Sucursal:**
  ```bash
  curl -X POST -H "Content-Type: application/json" -H "x-tenant-id: <COMPANY_ID>" \
  -d '{"name":"Sede Central","address":"Av. Siempre Viva 123","lat":-34.6037,"lng":-58.3816}' \
  http://localhost:3000/api/branches
  ```

### Servicios (Services)
- **Listar Servicios:**
  ```bash
  curl -H "x-tenant-id: <COMPANY_ID>" http://localhost:3000/api/services
  ```
- **Crear Servicio:**
  ```bash
  curl -X POST -H "Content-Type: application/json" -H "x-tenant-id: <COMPANY_ID>" \
  -d '{"name":"Corte de Cabello","description":"Corte moderno","duration":30,"price":20}' \
  http://localhost:3000/api/services
  ```

### Empleados (Employees)
- **Listar Empleados por Sede:**
  ```bash
  curl -H "x-tenant-id: <COMPANY_ID>" http://localhost:3000/api/branches/<BRANCH_ID>/employees
  ```

### Citas (Appointments)
- **Verificar Disponibilidad:**
  ```bash
  curl "http://localhost:3000/api/availability?employeeId=<EMP_ID>&date=2023-12-01&time=10" \
  -H "x-tenant-id: <COMPANY_ID>"
  ```
- **Crear Cita:**
  ```bash
  curl -X POST -H "Content-Type: application/json" -H "x-tenant-id: <COMPANY_ID>" \
  -d '{
    "branchId": "<BRANCH_ID>",
    "serviceId": "<SERVICE_ID>",
    "employeeId": "<EMPLOYEE_ID>",
    "clientId": "<CLIENT_ID>",
    "date": "2023-12-01",
    "time": 10,
    "clientName": "Juan Cliente"
  }' http://localhost:3000/api/appointments
  ```

---

## 2. Integración con Agente (LangChain)

Para que un chatbot pueda agendar citas, utilizamos el concepto de **Tools (Herramientas)** en LangChain.

### Estructura de la Implementación
1. **Model**: GPT-4 o Gemini 1.5 Pro.
2. **Tools**: Funciones de Python/Node que llaman a los endpoints anteriores.
3. **Agent**: Un `OpenAIFunctionsAgent` o `StructuredChatAgent`.

### Definición de Herramientas (Ejemplo en Python)
```python
@tool
def get_available_branches(company_id: str):
    """Obtiene las sedes disponibles para la empresa."""
    # Llama a GET /api/branches con el header x-tenant-id
    pass

@tool
def book_appointment(branch_id: str, service_id: str, employee_id: str, date: str, time: int, client_name: str, company_id: str):
    """Reserva una cita confirmada."""
    # Llama a POST /api/appointments
    pass
```

### Flujo del Agente
1. **Usuario**: "Hola, quiero cortarme el pelo el viernes en la sede norte."
2. **Agente**: Llama a `get_available_branches` para encontrar el ID de la "sede norte".
3. **Agente**: Llama a `get_services` para ver qué cortes hay y sus IDs.
4. **Agente**: Llama a `get_available_slots` para el viernes.
5. **Agente**: Presenta las opciones al usuario.
6. **Usuario**: "A las 10am con Marcos."
7. **Agente**: Ejecuta `book_appointment` y confirma.

### Beneficios
- **Lenguaje Natural**: El usuario no necesita formularios complejos.
- **Validación en Tiempo Real**: El agente verifica disponibilidad antes de proponer horarios.
- **Omnicanalidad**: Funciona igual en WhatsApp, Web Chat o Telegram.

---

## 3. Estado de la Implementación
- **Imágenes**: Soportadas en Sucursales (`image_url`), Empleados (`avatar_url`) y Servicios (`image_url`). La carga se realiza mediante base64 comprimido (WebP) desde el Dashboard.
- **CRUD**: Verificado mediante scripts de prueba automatizados para todas las entidades base.
- **Mobile-First**: La interfaz del Dashboard ha sido optimizada para dispositivos móviles, incluyendo los nuevos modales de edición.
