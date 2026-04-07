# GitHub Actions Configuration - Issues & Fixes

## ✅ Issues Fixed

### 1. **YAML Indentation in quality-checks Job (Lines 67-83)**
- **Issue**: Improper indentation caused "Run npm audit", "Validate Docker Compose", and "Secret scan with Gitleaks" steps to be malformed
- **Fix**: Corrected indentation to align with other steps using proper 4-space indentation
- **Status**: FIXED ✓

### 2. **Services Definition in migration-check Job (Lines 185-211)**
- **Issue**: Redis service was defined outside the `services:` block, causing YAML parsing error
- **Fix**: Moved redis service indentation to be properly nested under `services:`
- **Fixed Structure**:
  ```yaml
  services:
    postgres: ...
    redis: ...  # Now properly indented
  ```
- **Status**: FIXED ✓

### 3. **Cosign Image Signing Condition (Line 321)**
- **Issue**: Image signing attempted on PRs where image wasn't pushed to registry
- **Fix**: Added condition `if: github.event_name != 'pull_request'` to skip signing on PRs
- **Status**: FIXED ✓

### 4. **Prisma Path Reference (Line 223)**
- **Issue**: Referenced invalid path `./lib/generated/prisma/schema.prisma` that doesn't exist
- **Fix**: Corrected to valid path `./prisma/schema.prisma`
- **Status**: FIXED ✓

### 5. **Notify Job Dependencies (Line 427)**
- **Issue**: Notify job had hard dependencies on deploy-staging, deploy-production, and rollback jobs which may not run
- **Fix**: Changed to only depend on `build` job with `if: always()` condition
- **Status**: FIXED ✓

## ⚠️ Remaining Issues to Address

### 1. **Missing GitHub Secrets**
The workflow requires these secrets to be configured in the repository settings:

```
CODECOV_TOKEN          - For uploading coverage reports to Codecov
KUBE_CONFIG_STAGING    - Base64 encoded kubeconfig for staging cluster
KUBE_CONFIG_PRODUCTION - Base64 encoded kubeconfig for production cluster
SLACK_WEBHOOK          - Slack webhook URL for notifications (optional)
```

**Action Required**: Add these secrets to GitHub repository settings under `Settings → Secrets and variables → Actions`

### 2. **Test Coverage Configuration**
- **File**: `vitest.config.ts`
- **Issue**: Coverage thresholds set to 70% on all metrics, but unclear if test files exist
- **Recommendation**: Ensure `src/__tests__/` directory has actual test files, or adjust thresholds

### 3. **Environment Variables in Test Job**
- **Current Issue**: Test environment includes `NEXTAUTH_SECRET` and `NEXTAUTH_URL`, but unclear if app uses NextAuth
- **Recommendation**: Verify Next.js authentication setup matches environment variables

### 4. **Database Migration Validation**
- **Issue**: Step "Validate migration SQL" may fail if no migrations exist
- **Current**: Uses `--script` flag which should handle empty state, but needs testing

### 5. **Kubernetes Deployments**
- **Issue**: Deployment assumes specific resource names (`stock-app` deployment, `staging`/`production` namespaces)
- **Action**: Verify these match your actual K8s cluster configuration
- **Files to check**: `k8s/overlays/staging/` and `k8s/overlays/production/`

### 6. **Docker Image Build Arguments**
- **Issue**: `BUILD_DATE` uses `github.event.head_commit.timestamp` which may be null for some event types
- **Recommendation**: Consider using `${{ github.event.repository.updated_at }}` as fallback

### 7. **Codecov Upload Failure Handling**
- **Line 178**: `fail_ci_if_error: false` means coverage upload failures don't block the build
- **Recommendation**: Change to `fail_ci_if_error: true` if this is critical, or keep false for non-blocking

## 🔍 Verification Checklist

Before GitHub Actions will work:

- [ ] All required secrets are configured in GitHub repository
- [ ] Node 20 is appropriate for your project (defined in `env.NODE_VERSION`)
- [ ] Docker credentials are configured (uses `${{ github.actor }}` and `GITHUB_TOKEN`)
- [ ] Test command `npm run test:ci` exists and works locally
- [ ] Prisma schema is valid and migrations are committed
- [ ] Kubernetes configuration is correct for your cluster
- [ ] Slack webhook URL is optional but recommended for notifications
- [ ] Docker image builds successfully locally
- [ ] Linting and type checking passes locally

## 📋 Quick Setup Guide

1. **Add GitHub Secrets**:
   ```bash
   # For base64 encoding kubeconfig:
   cat ~/.kube/config | base64 -w 0 | pbcopy
   # Then paste as KUBE_CONFIG_STAGING / KUBE_CONFIG_PRODUCTION secret
   ```

2. **Test Locally Before Push**:
   ```bash
   npm ci
   npm run lint
   npm run test:ci
   npm run build
   docker build -t test-image .
   ```

3. **Verify Workflow Syntax**:
   ```bash
   # Install yamllint if not present
   pip install yamllint
   yamllint .github/workflows/ci-cd.yml
   ```

4. **Monitor First Run**:
   - Push to develop branch for staging deployment test
   - Check GitHub Actions tab for detailed logs
   - Review any failures and adjust as needed
