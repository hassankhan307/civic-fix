import request from 'supertest';
import app from '../src/app';

describe('CivicFix Backend API Test Suite', () => {
  let citizenToken = '';
  let adminToken = '';
  let createdReportId = '';

  describe('Authentication Endpoints', () => {
    it('should login as admin successfully and return JWT tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@civicfix.org',
          password: 'Admin123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('ADMIN');
      adminToken = res.body.data.accessToken;
    });

    it('should login as citizen successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'citizen@civicfix.org',
          password: 'Citizen123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('CITIZEN');
      citizenToken = res.body.data.accessToken;
    });

    it('should reject invalid credentials with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@civicfix.org',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should register a new citizen account', async () => {
      const uniqueEmail = `testuser_${Date.now()}@civicfix.org`;
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Password123!',
          name: 'Automated Test User',
          phone: '+1 555-9999',
          role: 'CITIZEN',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(uniqueEmail.toLowerCase());
    });
  });

  describe('Reports Endpoints', () => {
    it('should list public reports without authentication', async () => {
      const res = await request(app).get('/api/v1/reports');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should submit a new report when authenticated as citizen', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'Damaged sidewalk slab outside library',
          description: 'Concrete paving slab is raised 3 inches forming a tripping hazard.',
          category: 'DAMAGED_SIDEWALK',
          severity: 'MEDIUM',
          latitude: 40.7135,
          longitude: -74.0055,
          address: '420 Library Way',
          landmark: 'Front steps of Public Library',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketNumber).toMatch(/^CF-\d{4}-\d{6}/);
      expect(res.body.data.status).toBe('REPORTED');
      createdReportId = res.body.data.id;
    });

    it('should get report details by ticket reference or ID', async () => {
      const res = await request(app).get(`/api/v1/reports/${createdReportId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdReportId);
      expect(res.body.data.statusHistory.length).toBeGreaterThan(0);
    });

    it('should add a public comment to the report', async () => {
      const res = await request(app)
        .post(`/api/v1/reports/${createdReportId}/comments`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          content: 'I noticed warning tape was placed around it today. Thank you!',
          isInternal: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toContain('warning tape');
    });
  });

  describe('RBAC & Administrative Endpoints', () => {
    it('should forbid citizens from accessing admin dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow admin to access dashboard metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalReports).toBeGreaterThan(0);
      expect(res.body.data.averageResolutionHours).toBeDefined();
    });

    it('should allow admin to verify a reported ticket', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/reports/${createdReportId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'VERIFIED',
          comment: 'Verified with municipal inspector and marked for action.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('VERIFIED');
    });

    it('should reject invalid status transitions', async () => {
      // Trying to jump from VERIFIED directly to RESOLVED without IN_PROGRESS
      const res = await request(app)
        .patch(`/api/v1/admin/reports/${createdReportId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'RESOLVED',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should fetch database-driven analytics for charts', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categoryData).toBeDefined();
      expect(res.body.data.severityData).toBeDefined();
      expect(res.body.data.timelineData).toBeDefined();
    });
  });

  describe('Duplicate Detection and Proximity Check', () => {
    it('should detect proximity duplicates when matching category and coordinates', async () => {
      const res = await request(app)
        .post('/api/v1/ai/check-duplicates')
        .send({
          latitude: 40.7135,
          longitude: -74.0055,
          category: 'DAMAGED_SIDEWALK',
          title: 'Cracked sidewalk pavement hazard',
          description: 'Tripping hazard on concrete sidewalk',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // The created report is right at this coordinate
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].distanceMeters).toBeLessThan(100);
    });
  });
});
