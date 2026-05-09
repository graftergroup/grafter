# Quick Start Guide - Grafter Services

## 🚀 Getting Started (5 minutes)

### Prerequisites
- Docker & Docker Compose
- (Optional) AWS Account for production deployment

### Local Development

#### 1. Clone/Navigate to Project
```bash
cd grafter_services
```

#### 2. Start Services
```bash
docker-compose up
```

This starts:
- PostgreSQL database (auto-initialized)
- FastAPI backend at `http://localhost:8000`
- Vite frontend dev server at `http://localhost:5173`

#### 3. Test the Application

**Open in browser:**
```
http://localhost:5173
```

**Create account:**
- Email: test@example.com
- Password: (anything)
- First Name: John
- Last Name: Doe

**Login:** Use the same credentials

**Explore Dashboard:**
- View statistics
- See empty bookings/jobs (no data yet)

#### 4. Test API Directly

**Get health status:**
```bash
curl http://localhost:8000/api/health
```

**Register user:**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Use token:**
```bash
# Copy access_token from login response
export TOKEN="your_access_token"

curl http://localhost:8000/api/customers \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 Common Tasks

### Create a Service
```bash
curl -X POST http://localhost:8000/api/services \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lawn Mowing",
    "description": "Professional lawn mowing",
    "base_price": 79.99,
    "duration_minutes": 60
  }'
```

### Create a Customer
```bash
curl -X POST http://localhost:8000/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "phone": "+1234567890",
    "first_name": "Jane",
    "last_name": "Smith"
  }'
```

### Create a Booking
```bash
curl -X POST http://localhost:8000/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "CUSTOMER_UUID",
    "service_id": "SERVICE_UUID",
    "scheduled_date": "2024-02-01T10:00:00Z",
    "notes": "Please trim hedges"
  }'
```

---

## 🏗️ Development Workflow

### Frontend Development
- Edit files in `src/`
- Changes auto-reload via Vite HMR
- No need to restart

### Backend Development
- Edit files in `backend/`
- Backend auto-reloads (watchfiles)
- No need to restart Docker

### Database Changes
1. Update models in `backend/models.py`
2. Restart backend: `docker-compose restart backend`
3. Tables auto-create

---

## 🐳 Docker Commands

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Rebuild images
docker-compose build

# Rebuild and restart
docker-compose up --build
```

---

## 🔑 API Authentication

### JWT Bearer Token
```bash
Authorization: Bearer <access_token>
```

### Static API Key
```bash
Authorization: ApiKey <api_key>
```

### Create API Key
```bash
curl -X POST http://localhost:8000/api/auth/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mobile App"
  }'
```

---

## 📊 Database Access (Local)

**Connection string:**
```
postgresql://grafter_user:grafter_password@localhost:5432/grafter_services
```

**Using psql:**
```bash
psql -h localhost -U grafter_user -d grafter_services
```

**View tables:**
```sql
\dt
```

---

## 🚀 Production Deployment

### Prerequisites
1. AWS Account
2. AWS RDS PostgreSQL instance running
3. ECR repository created

### Step-by-Step
1. Read `DEPLOYMENT.md` (comprehensive guide)
2. Set up AWS Secrets Manager
3. Build and push Docker image to ECR
4. Create ECS cluster and task definition
5. Deploy service

**Quick deploy:**
```bash
# 1. Set environment variables
export AWS_REGION=us-east-1
export ECR_REGISTRY=YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# 2. Build and push
docker build -t grafter-services:latest .
docker tag grafter-services:latest $ECR_REGISTRY/grafter-services:latest
docker push $ECR_REGISTRY/grafter-services:latest

# 3. Follow DEPLOYMENT.md for ECS setup
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process using port
lsof -i :8000  # or :5173, :5432
kill -9 <PID>

# Or use different port in docker-compose.yml
```

### Database Connection Error
```bash
# Verify PostgreSQL is running
docker-compose logs postgres

# Check connection string in .env
DATABASE_URL=postgresql://grafter_user:grafter_password@postgres:5432/grafter_services
```

### API Returns 401 Unauthorized
- Token expired → call `/auth/refresh` with refresh_token
- Missing header → add `Authorization: Bearer <token>`
- Invalid token → login again

### Frontend shows blank screen
- Check browser console for errors
- Verify backend is running: `curl http://localhost:8000/api/health`
- Clear browser cache and localStorage

---

## 📚 Documentation

- **Full API docs**: `API_DOCUMENTATION.md`
- **Deployment guide**: `DEPLOYMENT.md`
- **Implementation details**: `IMPLEMENTATION_SUMMARY.md`
- **Swagger UI**: http://localhost:8000/docs (when running)

---

## 🔒 Security Reminders

✅ **Do:**
- Keep `.env` files out of git
- Use strong JWT_SECRET_KEY in production
- Store secrets in AWS Secrets Manager
- Use HTTPS in production
- Whitelist specific CORS origins

❌ **Don't:**
- Commit `.env` file
- Hardcode secrets in code
- Use default Docker Compose credentials in production
- Enable CORS for all origins

---

## 💡 Next Steps

1. **Test the API** - Use curl commands above
2. **Read API docs** - See `API_DOCUMENTATION.md`
3. **Build features** - Add more endpoints/pages as needed
4. **Deploy** - Follow `DEPLOYMENT.md` when ready

---

**Need help?** Check the docs or review code comments in `backend/` and `src/` directories.
