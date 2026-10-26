# School Overwatch registration lifecycle (Option B)

Classroom Quiz Show GitHub Pages deploy emits a **registration ticket**.
School Mac identity consumes it and updates Overwatch. **No Google credentials
in GitHub Actions. Execution API remains unapproved.**

## Flow

1. Push/merge to `main` → `deploy-pages.yml` builds and deploys Pages.
2. After deploy success, the same job emits `overwatch-registration-ticket`
   artifact (SHA, deployment id, URL, standing established-update policy).
3. School Mac runs `npm run register:overwatch:from-ticket -- --push --deploy`
   (downloads latest ticket artifact if local ticket absent).
4. Hook requires **exact SHA** match for the authorized source commit.
   Otherwise `deployment_pending` (exit 3) — retry after Pages completes.
5. Overwatch Option B register verifies independently, adopts registry, optional
   clasp push/deploy with post-checks. Owner Chrome readback remains a recorded
   gap unless performed separately.

## Rollback

```bash
npm run register:overwatch -- --rollback --sha <prior-success-sha> --push --deploy
# or
npm run register:overwatch -- --rollback --deployment-id <id> --push --deploy
```

## Remaining trigger

Ticket **emission** is automatic in the deploy workflow. Ticket **consume**
still requires school Mac invocation until an owner installs a LaunchAgent or
self-hosted runner. That remaining trigger is intentional: safer than putting
Nolan Google auth in cloud CI.

## Classification

| Claim | Status |
| --- | --- |
| Command exists | Yes (`register:overwatch`, emit/consume ticket) |
| Manual-after-deploy | Yes (fallback) |
| Automatic ticket on successful Pages | Yes (workflow step) |
| Unattended Mac registration E2E | Not claimed without Mac event receiver |
