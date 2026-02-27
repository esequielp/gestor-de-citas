# AgendaPro - Estado del Proyecto y Siguientes Pasos

Este documento sirve como resumen del estado actual de **AgendaPro** (Sistema de Agendamiento Multi-tenant con Chatbot de IA) para retomar el trabajo en un nuevo hilo o sesión de desarrollo.

---

## 🚀 Logros Recientes (Implementados Exitosamente)

1. **Configuración Dinámica de IA por Tenant:**
   - La IA (`gpt-5-mini`) ahora responde basándose en la configuración específica de cada empresa (Nombre, Tipo de Negocio, Mensaje de Saludo, Personalidad e Instrucciones Especiales).
   - Se incluyó un selector con **24 tipos de negocio reales** clasificados en: *Estética y Belleza, Salud, y Bienestar*.
   - Los tenants pueden apagar o encender el Chatbot de IA en su panel de administración.

2. **Integración Web - Widget Embebible (Go-to-Market):**
   - Se desarrolló un snippet en Vanilla JS (ruta `GET /api/widget/js`), que inyecta automáticamente una burbuja flotante estilizada.
   - El script levanta un iframe (`?view=widget&tenantId=XYZ`) que carga la app de React en un nuevo modo Standalone (`CHAT_WIDGET_ONLY`), mostrando **solo el Chatbot**.
   - En el panel Admin (`AdminDashboard` > Configuración), hay una nueva tarjeta con el código `<script>` exacto para que el dueño del negocio lo copie y pegue en su web externa (Ej. WordPress, Shopify, Wix).

---

## 🎯 Estrategias de Crecimiento & RoadMap (Siguientes Pasos)

Para continuar iterando en el sistema, estas son las opciones estratégicas recomendadas para desarrollo:

### Fase 1: Consolidar "Growth" (Alta Conversión)
- [ ] **WhatsApp Booking (Alta prioridad):**
  - Conectar la misma IA y lógica de reservas para que funcione directo en canales de WhatsApp de las empresas.
- [ ] **Pasarela de Pagos (Stripe / MercadoPago):**
  - Cobrar anticipos, servicios al reservar, o planes de suscripción para las empresas (Ej: Free trial de 50 turnos).
- [ ] **Plugins nativos (Opcional a medio plazo):**
  - **WordPress:** Un plugin sencillísimo donde solo peguen el `tenantId` para inyectar el widget embebible sin tocar el HTML.
  - **Shopify App:** Entrar directamente a la tienda de Shopify.

### Fase 2: Power Features (Casos de uso profesionales)
- [ ] **Sincronización con Google Calendar:**
  - Evitar choques de horario sincronizando bidireccionalmente el calendario personal de los profesionales.
- [ ] **Citas Grupales (Clases, Cupos):**
  - Modificar el core de `appointment.service.ts` para aceptar a múltiples `clientIds` en un solo slot si el servicio es tipo "Clase Yoga" (Max 15 personas).
- [ ] **Citas Recurrentes & Packs de sesiones:**
  - Generar reservas automáticas semanales/mensuales.

---

## 💻 Detalles Técnicos para el Siguiente Hilo

* **Stack Frontend:** React + Vite + TailwindCSS + Lucide Icons.
* **Stack Backend:** Express + Node.js + TypeScript.
* **Database:** Supabase (PostgreSQL). Multitenant a nivel tabla por `empresa_id`.
* **Motor de citas:** `appointment.service.ts` soporta lógica compleja (duración variable, disponibilidad de personal, excepciones horarias).
* **Comandos Clave:**
  * Iniciar Dev: `npm run dev`
  * Compilar: `npm run build` o `npx tsc --noEmit` para TypeCheck pleno.

> **Instrucción para el IA en el nuevo hilo:**
> “Toma como contexto este archivo `AGENDA_PRO_NEXT_STEPS.md`. Nos vamos a enfocar en continuar con el siguiente paso prioritario: [Escribir el feature]”.
