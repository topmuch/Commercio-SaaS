# Coolify Deployment Guide

This guide explains how to deploy Commercio SaaS on Coolify.

## 📋 Prerequisites

- A Coolify account (self-hosted or cloud)
- A GitHub repository with the project code
- A domain name (optional, Coolify can provide one)

## 🚀 Step 1: Prepare the Code

The project is already configured for Coolify with:
- ✅ Production-optimized Dockerfile
- ✅ .dockerignore to reduce image size
- ✅ .env.example with all environment variables
- ✅ Health check endpoint (`/api/health`)
- ✅ Next.js standalone output configuration

## 🔧 Step 2: Push to GitHub

Make sure your code is up to date on GitHub:

```bash
git add .
git commit -m "chore: prepare for Coolify deployment"
git push origin main
```

## 📦 Step 3: Configure Coolify

### 3.1 Connect your GitHub account

1. Log in to your Coolify instance
2. Go to **Settings** → **Git Sources**
3. Click on **Connect GitHub**
4. Authorize access to your repository

### 3.2 Create a new application

1. Go to **Applications** → **Create New Application**
2. Select your GitHub repository: `Commercio-SaaS`
3. Select the branch: `main`
4. Configure the application:

#### Basic Configuration
- **Application Name**: `commercio-saas`
- **Branch**: `main`
- **Build Type**: `Dockerfile`
- **Dockerfile Path**: `Dockerfile` (default path)

#### Container Configuration
- **Container Port**: `3000`
- **Expose Port**: `3000`

#### Environment Variables
Add the necessary environment variables from `.env.example`:

**Required Variables:**
```bash
NODE_ENV=production
DATABASE_URL="file:./db/dev.db"
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=https://your-domain.com
```

**Recommended Variables:**
```bash
NEXT_PUBLIC_APP_NAME=Commercio SaaS
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3.3 Configure Domain

1. In the **Domains** section, click on **Add Domain**
2. Option A: Use a Coolify domain (e.g., `commercio.your-coolify-instance.com`)
3. Option B: Use your own domain:
   - Add your domain (e.g., `commercio.example.com`)
   - Coolify will provide the DNS to configure
   - Configure DNS records with your provider

### 3.4 Configure Volumes (Data Persistence)

Since we use SQLite, we need to persist the database file:

1. In the **Volumes** section, click on **Add Volume**
2. Configuration:
   - **Name**: `db-data`
   - **Mount Path**: `/app/db`
3. This ensures the database persists between redeployments

### 3.5 Configure Health Check

Coolify will automatically use the health check configured in the Dockerfile:
- **Endpoint**: `/api/health`
- **Interval**: 30 seconds
- **Timeout**: 3 seconds
- **Start Period**: 40 seconds

## 🔄 Step 4: First Deployment

1. Click on **Deploy** to start the first deployment
2. Coolify will:
   - Clone your repository
   - Build the Docker image
   - Start the container
   - Run health check
3. Monitor the logs in the **Logs** tab

## 🎯 Step 5: Verification

Once deployment is complete:

1. Check that container status is: **Running**
2. Visit your domain
3. Test the health check: `https://your-domain.com/api/health`

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "database": "connected",
  "uptime": 123.456,
  "memory": { ... },
  "environment": "production"
}
```

## 📊 Step 6: Post-Deployment Configuration

### 6.1 Initialize Database

If needed, you can run migrations:

```bash
# Via Coolify terminal
bun run db:push
```

### 6.2 Configure SSL/TLS

Coolify automatically manages SSL certificates via Let's Encrypt for:
- Coolify domains
- Your own domains with DNS configured

### 6.3 Configure Backups

Coolify offers backup options:
1. Go to **Backups**
2. Configure automatic backups for:
   - Database volume
   - Configuration

## 🔍 Troubleshooting

### Container won't start

1. Check logs in the **Logs** tab
2. Verify all environment variables are configured
3. Verify the volume is mounted correctly

### Database connection error

1. Verify the `db-data` volume is mounted at `/app/db`
2. Check the `DATABASE_URL` variable
3. Check database file permissions

### Health check failing

1. Verify the `/api/health` endpoint responds
2. Verify port 3000 is exposed
3. Check container logs

### Build error

1. Verify `bun.lockb` is in the repository
2. Verify `Dockerfile` is at the root
3. Verify `.dockerignore` doesn't block necessary files

## 📈 Updates

To update the application:

1. Push your changes to GitHub
2. Coolify will automatically detect the new commit
3. You can also click on **Redeploy** in Coolify

## 🔐 Security

### Passwords and Secrets

- Use strong secrets for all API keys
- Change default secrets
- Use Coolify's secrets management
- Never commit secrets to Git

### Sensitive Environment Variables

In Coolify, use the **Environment Variables** section for:
- `NEXTAUTH_SECRET`: Secret for NextAuth.js
- `DATABASE_URL`: Database URL
- API keys for external services (Stripe, Wave, etc.)

### Rate Limiting

The application includes rate limiting. Configure:
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window
- `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds

## 🚀 Optimizations

### Performance

- The Dockerfile uses Next.js `standalone` mode for optimal performance
- Prisma Client is generated during build
- Alpine Linux image for reduced size

### Resources

Configure resource limits in Coolify:
- **CPU**: 1-2 vCPU (minimum)
- **RAM**: 1-2 GB (minimum)
- **Disk**: 10-20 GB (depending on data)

### Scaling

For higher load:
1. Increase allocated resources
2. Use multiple instances with a load balancer
3. Consider migrating to PostgreSQL for better performance

## 📚 Additional Documentation

- [Coolify Documentation](https://coolify.io/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

## 🆘 Support

If you encounter issues:
1. Check logs in Coolify
2. Consult Coolify documentation
3. Check GitHub project issues

---

**Important Note**: This project uses SQLite for the database. For production with many users, consider migrating to PostgreSQL for better performance and advanced features.