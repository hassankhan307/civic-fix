import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'CivicFix API Documentation',
    version: '1.0.0',
    description:
      'RESTful APIs for the CivicFix AI-Powered Municipal Problem Reporting and Management Platform.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API Version 1',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', example: 'citizen@civicfix.org' },
                  password: { type: 'string', example: 'Password123!' },
                  name: { type: 'string', example: 'Jane Citizen' },
                  phone: { type: 'string', example: '+15551234567' },
                  role: { type: 'string', enum: ['CITIZEN', 'ADMIN', 'FIELD_STAFF'], default: 'CITIZEN' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Registration successful' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Log in and obtain access & refresh tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@civicfix.org' },
                  password: { type: 'string', example: 'Admin123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
        },
      },
    },
    '/reports': {
      get: {
        tags: ['Reports'],
        summary: 'List civic reports with filtering, searching, and pagination',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'severity', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'List of reports returned' } },
      },
      post: {
        tags: ['Reports'],
        summary: 'Submit a new civic issue report',
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Report created successfully' } },
      },
    },
    '/reports/{id}': {
      get: {
        tags: ['Reports'],
        summary: 'Get report details by ID or ticket reference',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Report details' } },
      },
    },
    '/ai/analyze-image': {
      post: {
        tags: ['AI Analysis'],
        summary: 'Upload an image for computer vision classification and priority scoring',
        responses: { 200: { description: 'AI visual diagnostics and priority calculation' } },
      },
    },
    '/ai/check-duplicates': {
      post: {
        tags: ['AI Analysis'],
        summary: 'Search for existing proximate issues matching location and category',
        responses: { 200: { description: 'Ranked candidate duplicates' } },
      },
    },
    '/admin/dashboard': {
      get: {
        tags: ['Administration'],
        summary: 'Retrieve administrative KPIs and summary statistics',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Dashboard metrics' } },
      },
    },
    '/admin/analytics': {
      get: {
        tags: ['Administration'],
        summary: 'Retrieve database-driven chart data for Recharts',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Analytics chart series' } },
      },
    },
  },
};

export function setupSwagger(app: Express): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/api/docs.json', (_req, res) => {
    res.json(swaggerDocument);
  });
}
