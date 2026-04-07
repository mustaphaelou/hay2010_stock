# GitHub Actions Setup - Required Configuration

## 🔧 Critical Fixes Applied

All YAML syntax errors have been corrected. The GitHub Actions workflows are now valid.

### Issues Fixed:
1. ✅ Indentation errors in quality-checks job steps
2. ✅ Services definition malformed in migration-check job
3. ✅ Cosign signing condition to prevent PR failures
4. ✅ Prisma migration validation path corrected
5. ✅ Notify job dependency chain fixed
6. ✅ Trailing spaces in release workflow removed
7. ✅ Key duplication errors resolved

---

## 🔐 Required GitHub Secrets

Before GitHub Actions will work, add these secrets in your repository:

**Settings → Secrets and variables → Actions**

### Mandatory Secrets:

#### 1. `CODECOV_TOKEN`
- **Purpose**: Upload coverage reports to Codecov
- **Get it from**: https://codecov.io/
- **Setup**: Add your repository to Codecov, copy the token
- **Optional to disable**: Remove codecov upload step if not needed

#### 2. `KUBE_CONFIG_STAGING`
- **Purpose**: Deploy to staging Kubernetes cluster
- **Format**: Base64 encoded kubeconfig
- **Generate**:
  ```bash
  cat ~/.kube/config-staging | base64 -w 0
  ```
- **Store**: Paste entire output as secret value

#### 3. `KUBE_CONFIG_PRODUCTION`
- **Purpose**: Deploy to production Kubernetes cluster
- **Format**: Base64 encoded kubeconfig
- **Generate**:
  ```bash
  cat ~/.kube/config-prod | base64 -w 0
  ```
- **Store**: Paste entire output as secret value

### Optional Secrets:

#### 4. `SLACK_WEBHOOK` (Recommended)
- **Purpose**: Send deployment notifications to Slack
- **Get it from**: Create Incoming Webhook in Slack workspace
- **Setup**: https://api.slack.com/apps → Create New App → Incoming Webhooks
- **If not set**: Notifications will silently skip (not fail)

---

## 📋 Pre-deployment Checklist

Before your first push to trigger workflows:

### Local Testing:
- [ ] Run `npm ci` - installs exact locked versions
- [ ] Run `npm run lint` - eslint passes
- [ ] Run `npm run test:ci` - tests pass with coverage
- [ ] Run `npm run build` - Next.js builds successfully
- [ ] Run `docker build -t test .` - Docker builds without errors

### Database Setup:
- [ ] PostgreSQL 16+ is available
- [ ] Redis 7+ is available
- [ ] Database migrations are committed to git
- [ ] Schema is valid: `npx prisma validate`

### Kubernetes Setup:
- [ ] Staging cluster has `staging` namespace
- [ ] Production cluster has `production` namespace
- [ ] Both have `stock-app` deployment
- [ ] Kubeconfigs are in base64 format and not expired

### Environment Variables:
- [ ] `NEXTAUTH_SECRET` is set in test env (or use dummy for tests)
- [ ] `NODE_ENV=production` for production builds
- [ ] Database URLs are correctly formatted

---

## 🚀 Workflow Triggers

### CI/CD Pipeline (ci-cd.yml)
Runs automatically on:
- **Push to**: `main`, `develop`, or `feature/**` branches
- **Pull requests**: To `main` or `develop`
- **Release events**: When version is published
- **Manual trigger**: Via GitHub Actions → Workflows

Deployment behavior:
- **Staging**: Deploys on push to `develop` or manual trigger
- **Production**: Deploys only on GitHub Release

### Release Workflow (release.yml)
Runs manually:
- Click "Run workflow" in GitHub Actions
- Select version bump: `patch`, `minor`, or `major`
- Automatically:
  - Bumps version in package.json
  - Creates git tag
  - Creates GitHub Release
  - Triggers production deployment

---

## 🔍 Environment Variable Reference

### Provided by GitHub Actions:
- `GITHUB_REPOSITORY` - Owner/Repo name
- `GITHUB_SHA` - Commit SHA
- `GITHUB_REF` - Branch reference
- `GITHUB_ACTOR` - User triggering workflow
- `GITHUB_TOKEN` - Automatically provided

### Set by Workflow:
- `NODE_VERSION: '20'` - Node.js version
- `REGISTRY: ghcr.io` - Container registry
- `DATABASE_URL` - Test database (PostgreSQL)
- `REDIS_URL` - Test Redis
- `NEXTAUTH_SECRET` - Auth secret for testing
- `NEXTAUTH_URL: http://localhost:3000` - Auth URL for testing

---

## 📊 Monitoring & Debugging

### View Workflow Results:
1. Go to GitHub repository
2. Click "Actions" tab
3. Select branch or workflow
4. Click run to see details

### Common Failures & Fixes:

**Tests Fail**
- Check: `npm run test:ci` locally
- Fix: Update tests or adjust coverage thresholds in `vitest.config.ts`

**Build Fails**
- Check: `npm run build` locally
- Fix: Resolve TypeScript or Next.js errors

**Deployment Fails (Staging)**
- Check: Kubeconfig is valid and cluster is accessible
- Check: `stock-app` deployment exists in `staging` namespace
- Fix: Update KUBE_CONFIG_STAGING secret with fresh kubeconfig

**Deployment Fails (Production)**
- Check: Only triggers on GitHub Release, not regular push
- Check: Release workflow completed with the new version
- Fix: Create a GitHub Release manually if needed

---

## 💡 Tips

1. **Test workflow locally**: Use `act` tool to run workflow offline
   ```bash
   npm install -g act
   act push -b  # Run on branch push
   ```

2. **View logs**: Expand any failed step for detailed output

3. **Re-run failed jobs**: Click "Re-run failed jobs" in GitHub UI

4. **Skip workflow**: Add `[skip ci]` to commit message

5. **Debug workflow**: Add `::debug::` messages in steps

---

## 📞 Support

If workflows fail:
1. Check the "Workflow logs" in GitHub Actions UI
2. Review this setup guide for missing secrets
3. Verify local environment works with same commands
4. Check branch protection rules aren't blocking merges
