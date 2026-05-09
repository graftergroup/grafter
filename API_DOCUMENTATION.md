# Grafter Services API Documentation

## Base URL
```
https://api.yourdomain.com/api
```

## Authentication

Two authentication methods are supported:

### 1. JWT Bearer Token
```
Authorization: Bearer <access_token>
```

### 2. API Key
```
Authorization: ApiKey <api_key>
```

## Error Responses

All errors follow this format:
```json
{
  "detail": "Error message"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

---

## Authentication Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "role": "customer"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "role": "customer",
    "franchise_id": "550e8400-e29b-41d4-a716-446655440001",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00",
    "updated_at": "2024-01-15T10:30:00"
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:** Same as Register

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <access_token>
```

**Response:** User object

### Create API Key
```http
POST /auth/api-keys
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Mobile App Integration"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "key": "gfr_d2Vhc2RZZWFkaW5nIGlzIHRoZSBjbG91ZA==",
  "name": "Mobile App Integration",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00",
  "last_used_at": null
}
```

### List API Keys
```http
GET /auth/api-keys
Authorization: Bearer <access_token>
```

**Response:** Array of API key objects

### Delete API Key
```http
DELETE /auth/api-keys/{api_key_id}
Authorization: Bearer <access_token>
```

---

## Customer Endpoints

### Create Customer
```http
POST /customers
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "customer@example.com",
  "phone": "+1234567890",
  "first_name": "Jane",
  "last_name": "Smith",
  "address": "123 Main St",
  "city": "Austin",
  "state": "TX",
  "postal_code": "78701",
  "country": "USA"
}
```

### List Customers
```http
GET /customers
Authorization: Bearer <access_token>
```

### Get Customer
```http
GET /customers/{customer_id}
Authorization: Bearer <access_token>
```

### Update Customer
```http
PUT /customers/{customer_id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "phone": "+1987654321",
  ...
}
```

### Delete Customer
```http
DELETE /customers/{customer_id}
Authorization: Bearer <access_token>
```

---

## Service Endpoints

### Create Service
```http
POST /services
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Lawn Mowing",
  "description": "Professional lawn mowing and yard cleanup",
  "base_price": 79.99,
  "duration_minutes": 60
}
```

### List Services
```http
GET /services
Authorization: Bearer <access_token>
```

### Get Service
```http
GET /services/{service_id}
Authorization: Bearer <access_token>
```

### Update Service
```http
PUT /services/{service_id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Lawn Mowing & Edge Trimming",
  "base_price": 89.99,
  ...
}
```

### Delete Service
```http
DELETE /services/{service_id}
Authorization: Bearer <access_token>
```

---

## Booking Endpoints

### Create Booking
```http
POST /bookings
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",
  "service_id": "550e8400-e29b-41d4-a716-446655440001",
  "scheduled_date": "2024-02-01T10:00:00Z",
  "notes": "Please trim hedges also"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "franchise_id": "550e8400-e29b-41d4-a716-446655440003",
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",
  "service_id": "550e8400-e29b-41d4-a716-446655440001",
  "scheduled_date": "2024-02-01T10:00:00Z",
  "status": "pending",
  "notes": "Please trim hedges also",
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00"
}
```

### List Bookings
```http
GET /bookings
Authorization: Bearer <access_token>
```

### Get Booking
```http
GET /bookings/{booking_id}
Authorization: Bearer <access_token>
```

### Update Booking Status
```http
PUT /bookings/{booking_id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "confirmed",
  "notes": "Updated notes"
}
```

**Valid statuses:** `pending`, `confirmed`, `completed`, `cancelled`

### Delete Booking
```http
DELETE /bookings/{booking_id}
Authorization: Bearer <access_token>
```

---

## Job Endpoints

### Create Job
```http
POST /jobs
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "booking_id": "550e8400-e29b-41d4-a716-446655440000",
  "assigned_technician_id": "550e8400-e29b-41d4-a716-446655440001",
  "vehicle_id": "550e8400-e29b-41d4-a716-446655440002",
  "scheduled_date": "2024-02-01T10:00:00Z",
  "notes": "High priority customer"
}
```

### List Jobs
```http
GET /jobs
Authorization: Bearer <access_token>
```

### Get Job
```http
GET /jobs/{job_id}
Authorization: Bearer <access_token>
```

### Update Job
```http
PUT /jobs/{job_id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "in_progress",
  "assigned_technician_id": "550e8400-e29b-41d4-a716-446655440001",
  "vehicle_id": "550e8400-e29b-41d4-a716-446655440002"
}
```

**Valid statuses:** `pending`, `assigned`, `in_progress`, `completed`, `cancelled`

### Delete Job
```http
DELETE /jobs/{job_id}
Authorization: Bearer <access_token>
```

---

## Health Check

```http
GET /health
```

**Response:**
```json
{
  "ok": true,
  "version": "0.1.0"
}
```

---

## Rate Limiting

Currently not implemented. Coming in Phase 2.

## Pagination

Currently not implemented. Implement in Phase 2 with `limit` and `offset` query parameters.

## Webhooks

Planned for Phase 3:
- Job status changes
- Payment notifications
- Customer notifications
