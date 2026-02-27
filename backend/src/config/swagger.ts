import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AgendaPro API',
      version: '1.0.0',
      description: 'API REST para sistema de gestión de citas multisucursal. Documentación generada automáticamente.',
      contact: {
        name: 'Soporte AgendaPro',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Servidor Local',
      },
    ],
    components: {
      schemas: {
        Branch: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            address: { type: 'string' },
            lat: { type: 'number' },
            lng: { type: 'number' },
          },
        },
        Service: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            duration: { type: 'integer' },
            price: { type: 'number' },
          },
        },
        Appointment: {
          type: 'object',
          required: ['branchId', 'serviceId', 'employeeId', 'clientId', 'date', 'time'],
          properties: {
            branchId: { type: 'string', format: 'uuid' },
            serviceId: { type: 'string', format: 'uuid' },
            employeeId: { type: 'string', format: 'uuid' },
            clientId: { type: 'string', format: 'uuid' },
            date: { type: 'string', format: 'date', example: '2024-10-25' },
            time: { type: 'integer', example: 10 },
          },
        },
      },
    },
  },
  apis: ['./backend/src/routes/*.ts'], // Archivos donde buscar anotaciones JSDoc
};

export default swaggerJsdoc(options);