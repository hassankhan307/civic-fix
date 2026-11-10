# CivicFix REST API Specification

The API is versioned under `/api/v1` and fully documented with interactive Swagger UI at `/api/docs`.

## 1. Authentication Endpoints

### `POST /api/v1/auth/register`
Creates a new user account.
- **Request Body**:
  ```json
  {
    "email": "citizen@civicfix.org",
    "password": "Password123!",
    "name": "Jane Doe",
    "phone": "+1 555-0100",
    "role": "CITIZEN"
  }
  ```
- **Response `201`**: User record, `accessToken` (1h), and `refreshToken` (7d).

### `POST /api/v1/auth/login`
Authenticates credentials.
- **Request Body**:
  ```json
  {
    "email": "admin@civicfix.org",
    "password": "Admin123!"
  }
  ```

### `GET /api/v1/auth/me`
Returns authenticated user profile (`Bearer <token>` required).

---

## 2. Report Endpoints

### `POST /api/v1/reports`
Submits a civic issue report.
- **Headers**: `Authorization: Bearer <token>`
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `title`: string
  - `description`: string
  - `category`: string
  - `severity`: string
  - `latitude`: number
  - `longitude`: number
  - `address`: string (optional)
  - `landmark`: string (optional)
  - `images`: file[] (up to 5 images)
  - `aiAnalysis`: json string (optional)

### `GET /api/v1/reports`
Lists public and personal reports.
- **Query Parameters**:
  - `page`: integer (default 1)
  - `limit`: integer (default 20)
  - `category`: string
  - `status`: string
  - `severity`: string
  - `search`: string
  - `mine`: boolean ("true" returns current citizen's reports)

### `GET /api/v1/reports/:id`
Retrieves report details, full lifecycle history, images, and comments.

### `POST /api/v1/reports/:id/comments`
Adds a public inquiry or internal staff note.

### `POST /api/v1/reports/:id/confirm-resolution`
Citizen confirms or challenges the resolution of their reported issue.

---

## 3. AI Intelligence Endpoints

### `POST /api/v1/ai/analyze-image`
Submits an image file for damage category classification, severity estimation, and priority calculation.

### `POST /api/v1/ai/check-duplicates`
Finds nearby unresolved reports matching coordinates and category.

---

## 4. Administrative Endpoints (`ADMIN` or `FIELD_STAFF` required)

- `GET /api/v1/admin/dashboard`: Overview summary KPIs.
- `GET /api/v1/admin/reports`: Paginated triage table.
- `PATCH /api/v1/admin/reports/:id/status`: Transitions status (`VERIFIED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`).
- `PATCH /api/v1/admin/reports/:id/priority`: Adjusts score (0–100).
- `POST /api/v1/admin/reports/:id/assign`: Assigns department & field worker.
- `POST /api/v1/admin/reports/:id/merge`: Merges duplicate tickets into canonical record.
- `GET /api/v1/admin/analytics`: Computes datasets for Recharts graphs.
- `GET /api/v1/admin/map`: Reports for operational mapping.
- `GET /api/v1/admin/heatmap`: Density intensity points for heatmap layer.
- `GET /api/v1/admin/export/csv`: Generates downloadable CSV dump of reports.
