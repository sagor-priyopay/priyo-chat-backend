# Production Deployment Guide

## Pre-deployment Checklist

### 1. Environment Variables
Copy `.env.example` to `.env` and update all values:

```bash
cp .env.example .env
```

**Critical variables to change:**
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_ACCESS_SECRET` - Strong 32+ character secret
- `JWT_REFRESH_SECRET` - Different 32+ character secret
- `CORS_ORIGIN` - Your production domain(s)
- `NODE_ENV=production`

### 2. Database Setup
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# (Optional) Seed initial data
npx prisma db seed
```

### 3. Security Configuration

#### JWT Secrets
Generate strong secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### CORS Origins
Update `CORS_ORIGIN` with your production domains:
```
CORS_ORIGIN="https://yourdomain.com,https://www.yourdomain.com"
```

### 4. SSL/TLS Setup
- Enable HTTPS in production
- Configure SSL certificates
- Update widget URLs to use HTTPS

### 5. Database Configuration
- Use PostgreSQL in production (not SQLite)
- Enable connection pooling
- Set up database backups
- Configure read replicas if needed

### 6. Monitoring & Logging
- Logs are written to `logs/` directory
- Health check available at `/health`
- Metrics available at `/metrics`
- Set up log rotation and monitoring alerts

### 7. Performance Optimization
- Enable gzip compression
- Set up CDN for static assets
- Configure Redis for session storage (optional)
- Enable database query optimization

## Deployment Commands

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name "priyo-chat-backend"

# Save PM2 configuration
pm2 save
pm2 startup
```

## Docker Deployment

### Using Docker Compose
```bash
# Production deployment
docker-compose -f docker-compose.yml up -d
```

### Environment Variables in Docker
Create `.env.production` file with production values.

## Security Hardening

### Rate Limiting
- API rate limiting: 100 requests/15 minutes
- User-specific rate limiting implemented
- WebSocket connection limits

### Headers
- HSTS enabled in production
- XSS protection headers
- Content Security Policy configured
- CORS properly configured

### Input Validation
- All inputs sanitized
- Joi validation on all endpoints
- File upload restrictions

## Monitoring

### Health Checks
- `/health` - Basic health status
- `/api/health` - Widget-compatible health check
- `/metrics` - System metrics

### Logging
- Structured JSON logging with Winston
- Error logs in `logs/error.log`
- Combined logs in `logs/app.log`
- Request audit logging for sensitive operations

### Alerts
Set up monitoring for:
- Database connection failures
- High error rates
- Memory/CPU usage
- Response time degradation

## Backup Strategy

### Database Backups
```bash
# Daily backup script
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### File Uploads
- Regular backup of `uploads/` directory
- Consider cloud storage (AWS S3, etc.)

## Scaling Considerations

### Horizontal Scaling
- Use Redis for session storage
- Database connection pooling
- Load balancer configuration
- WebSocket sticky sessions

### Vertical Scaling
- Monitor memory usage
- CPU optimization
- Database query optimization

## Troubleshooting

### Common Issues
1. **Database Connection Errors**
   - Check `DATABASE_URL`
   - Verify database is running
   - Check network connectivity

2. **JWT Token Issues**
   - Verify secrets are set
   - Check token expiration
   - Validate token format

3. **CORS Errors**
   - Update `CORS_ORIGIN`
   - Check protocol (HTTP vs HTTPS)
   - Verify domain spelling

4. **WebSocket Connection Issues**
   - Check firewall settings
   - Verify WebSocket support
   - Check authentication tokens

### Log Analysis
```bash
# View recent errors
tail -f logs/error.log

# Search for specific issues
grep "ERROR" logs/app.log

# Monitor real-time logs
pm2 logs priyo-chat-backend
```

## Performance Tuning

### Database
- Enable query logging in development
- Use database indexes appropriately
- Monitor slow queries
- Configure connection pooling

### Node.js
- Use cluster mode for CPU-intensive tasks
- Monitor memory leaks
- Optimize garbage collection
- Use compression middleware

## Security Updates

### Regular Maintenance
- Update dependencies monthly
- Monitor security advisories
- Rotate JWT secrets periodically
- Review access logs regularly

### Vulnerability Scanning
```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix
```

## Support & Maintenance

### Log Rotation
Set up logrotate for log files:
```bash
# /etc/logrotate.d/priyo-chat
/path/to/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

### Monitoring Scripts
Create monitoring scripts for:
- Database connectivity
- API response times
- Error rates
- System resources
