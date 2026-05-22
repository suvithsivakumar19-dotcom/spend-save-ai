# Deployment Guide

## Pre-Deployment Checklist

- ✅ Code builds without errors: `npm run build`
- ✅ Tests pass: `npm run vitest run` (if Vitest installed)
- ✅ No TypeScript errors: `npx tsc --noEmit`
- ✅ Email configured (optional but recommended): See [EMAIL_SETUP.md](./EMAIL_SETUP.md)
- ✅ Environment variables set in hosting platform

## Quick Deploy

### 1. Build

```bash
npm run build
```

Output: `dist/client` + `dist/server` ready to deploy.

### 2. Choose Platform

#### Vercel (Recommended for Next.js-like projects)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Set environment variables in Vercel dashboard:**

- `RESEND_API_KEY` (optional, for email)
- `APP_URL` (optional, for audit links)

#### Cloudflare Workers (Recommended for edge)

```bash
# Deploy
npm run build
wrangler deploy

# Set secrets
wrangler secret put RESEND_API_KEY
# Paste your API key when prompted
```

#### Self-Hosted / Docker

Requires Node.js 18+:

```bash
# Build
npm run build

# Start production server
NODE_ENV=production node dist/server/index.js
```

### 3. Custom Domain

Configure DNS:

- **Vercel**: Add CNAME in Vercel dashboard
- **Cloudflare**: Update nameservers
- **Self-hosted**: Point A record to your server

## Environment Variables

| Variable         | Required  | Description                  | Example              |
| ---------------- | --------- | ---------------------------- | -------------------- |
| `RESEND_API_KEY` | Optional  | Email API key                | `re_xxxxx`           |
| `APP_URL`        | Optional  | App base URL for audit links | `https://credex.app` |
| `NODE_ENV`       | Automatic | Environment (dev/production) | `production`         |

## Post-Deployment

1. **Test audit flow:**
   - Visit `/`
   - Click "Audit My AI Spend"
   - Fill form and submit
   - Verify results page loads
   - Test email capture (check spam folder)

2. **Update README:**
   - Replace `_add deployed URL after publishing_` with actual URL

3. **Monitor:**
   - Check error logs for issues
   - Monitor Resend dashboard for email delivery (if enabled)

## Troubleshooting

| Issue                    | Cause                | Fix                                 |
| ------------------------ | -------------------- | ----------------------------------- |
| Build fails              | Missing dependencies | Run `npm install`                   |
| Results page shows error | Audit engine issue   | Check browser console, create issue |
| Email not sent           | No API key set       | Add `RESEND_API_KEY` env var        |
| 404 on `/audit/$id`      | Route not registered | Rebuild and redeploy                |

## Performance Notes

- **Cold start:** ~500ms (acceptable for this workload)
- **Audit execution:** <1ms per audit (deterministic, O(n×rules))
- **Bundle size:** ~360 KB client (gzipped: 114 KB)
- **Edge caching:** `/audit/$id` can be cached indefinitely (stateless)

## Scaling

This app is highly scalable because:

1. **No database queries** — all logic in URL-encoded state
2. **Stateless** — every request is independent
3. **Edge-compatible** — works on Cloudflare, Vercel Edge, etc.
4. **Fast audit engine** — O(n) where n ≤ 8 tools typically

To scale:

- Add Supabase for lead persistence (see `ARCHITECTURE.md`)
- Add Slack/email digest via serverless cron jobs
- Cache frequently viewed reports via CDN

## Rollback

**Vercel:**

```bash
vercel rollback
```

**Cloudflare:**

```bash
# Redeploy previous build
wrangler deploy --env production
```

## Next Steps

1. **Deploy to staging first** if possible
2. **Test thoroughly** before production
3. **Set up analytics** (Plausible, PostHog) for metrics
4. **Create feedback channel** for users
5. **Monitor email delivery** via Resend dashboard

## Support

- **Vite docs**: https://vitejs.dev
- **TanStack Start**: https://tanstack.com/start
- **Vercel docs**: https://vercel.com/docs
- **Cloudflare docs**: https://developers.cloudflare.com/workers
- **Resend docs**: https://resend.com/docs
