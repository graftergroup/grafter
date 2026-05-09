# Deployment Guide - Grafter Services API

## Production Deployment to AWS ECS

### Prerequisites
- AWS Account with ECR, ECS, and RDS access
- Docker installed locally
- AWS CLI configured
- AWS RDS PostgreSQL instance running

### Step 1: Set Up AWS RDS PostgreSQL

1. Create RDS PostgreSQL database:
   - Engine: PostgreSQL 15+
   - DB instance class: db.t3.micro (or higher for production)
   - Storage: 100GB (adjust as needed)
   - Multi-AZ: Enabled for production
   - Backup retention: 30 days

2. Configure security group:
   - Allow inbound traffic on port 5432 from ECS security group

3. Note the connection string:
   ```
   postgresql://username:password@your-rds-endpoint:5432/grafter_services
   ```

### Step 2: Set Up AWS Secrets Manager

Store sensitive configuration in AWS Secrets Manager:

```bash
# Database URL
aws secretsmanager create-secret \
  --name grafter/database-url \
  --secret-string "postgresql://username:password@your-rds-endpoint:5432/grafter_services"

# JWT Secret Key (generate a strong random key)
aws secretsmanager create-secret \
  --name grafter/jwt-secret \
  --secret-string "your-secure-random-jwt-key-here"
```

### Step 3: Create ECR Repository

```bash
aws ecr create-repository --repository-name grafter-services --region us-east-1
```

### Step 4: Build and Push Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t grafter-services:latest .

# Tag image for ECR
docker tag grafter-services:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/grafter-services:latest

# Push to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/grafter-services:latest
```

### Step 5: Create ECS Cluster and Task Definition

1. Create ECS cluster:
   ```bash
   aws ecs create-cluster --cluster-name grafter-services-cluster
   ```

2. Update `ecs-task-definition.json`:
   - Replace `YOUR_ECR_REGISTRY` with your ECR URI
   - Replace `REGION` and `ACCOUNT` with your AWS details
   - Update secret manager ARNs

3. Register task definition:
   ```bash
   aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
   ```

### Step 6: Create ECS Service

```bash
aws ecs create-service \
  --cluster grafter-services-cluster \
  --service-name grafter-api \
  --task-definition grafter-services \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=grafter-api,containerPort=8000"
```

### Step 7: Set Up Application Load Balancer (ALB)

1. Create ALB
2. Create target group pointing to ECS service on port 8000
3. Create listener rule to forward traffic to target group

### Step 8: Configure Environment Variables

Create `.env.production` with production values:

```
DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/grafter_services
JWT_SECRET_KEY=your-secure-random-key
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
DEBUG=False
```

Note: In ECS, use AWS Secrets Manager instead of `.env` files.

### Monitoring & Logging

1. CloudWatch Logs:
   - Access logs via `/ecs/grafter-services` log group
   - Monitor container health checks

2. Set up alarms for:
   - Task failures
   - High CPU/Memory
   - Database connection errors

### CI/CD Pipeline (Example: GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com
      
      - name: Build and push Docker image
        run: |
          docker build -t grafter-services:${{ github.sha }} .
          docker tag grafter-services:${{ github.sha }} YOUR_ECR_REGISTRY/grafter-services:latest
          docker push YOUR_ECR_REGISTRY/grafter-services:latest
      
      - name: Update ECS service
        run: |
          aws ecs update-service --cluster grafter-services-cluster --service grafter-api --force-new-deployment
```

### Local Development with Docker Compose

```bash
# Start services
docker-compose up

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend
```

### Database Migrations

On first deployment or after schema changes:

```bash
# Inside ECS task:
python -c "from backend.db import create_all_tables; create_all_tables()"
```

Or use Alembic for advanced migrations (optional).

### Scaling

- **Horizontal**: Increase ECS task count for load distribution
- **Vertical**: Increase task CPU/memory

### Disaster Recovery

- RDS automated backups: 30 days retention
- Cross-region replication for critical data
- Regular testing of recovery procedures
