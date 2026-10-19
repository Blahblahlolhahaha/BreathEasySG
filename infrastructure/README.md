# BreatheEasySG infrastructure

This folder documents the proposed infrastructure and deployment practices for BreatheEasySG. It is documentation only: it does not deploy AWS resources or modify the application's SAM templates.

## At a glance

BreatheEasySG is a serverless application. The frontend is configured through the root `amplify.yml`. Backend components use AWS SAM templates (`template.yaml`) and SAM configuration (`samconfig.toml`). Confirm the exact paths and current contents on the branch you are working on before deploying; some backend work may exist only on feature branches.

| Component | Responsibility | Ownership boundary |
|---|---|---|
| Frontend | Build and deploy the web application through Amplify | Frontend build settings and hosting configuration |
| PSI API | Serve PSI-related API requests | API Gateway and its Lambda handler; reads the PSI data table rather than creating a second copy |
| Refresher | Refresh PSI data on a schedule | Scheduled Lambda and the `psi_data` DynamoDB table, if that is how the current template is defined |
| Users backend | User/location-related operations | User and location tables and postal-code lookup resources defined by its template |

The table above records the known design intent, not a guarantee that every resource is present on `main`. Check the actual templates before relying on it.

## Environment conventions

- AWS Region: `ap-southeast-1` (Singapore), unless the team explicitly agrees otherwise.
- Keep account IDs, credentials, API keys, and personal data out of Git.
- `samconfig.toml` may contain local profile names or environment-specific settings. Do not assume a profile such as `nus` exists on every developer's machine.
- Use separate stacks for independently deployed backend components if that matches the existing templates and team workflow.
- Use a feature branch and pull request for infrastructure changes. Do not deploy directly from an unreviewed feature branch to a shared environment.

## Resource ownership rules

1. Each AWS resource should have one clear owning stack/template.
2. The refresher stack should own the PSI data table if it currently creates it; the PSI API should consume that table through configuration or a stack output/parameter.
3. Avoid defining the same DynamoDB table in multiple templates.
4. Before adding a CloudWatch log group explicitly, check whether Lambda has already created it. CloudFormation can fail if a log group with the same name already exists but is not managed by the stack.
5. Preserve any existing retention/deletion-protection settings unless the team explicitly reviews a change. Data-bearing resources should not be replaced or deleted casually.

## Suggested first checks

From the repository root:

```bash
git status --short
git branch --show-current
git log -1 --oneline
find . -name template.yaml -o -name samconfig.toml -o -name amplify.yml
```

For each SAM component, run validation/build commands from the directory containing its template:

```bash
sam validate --template-file template.yaml
sam build --template-file template.yaml
```

See [deployment.md](deployment.md), [architecture.md](architecture.md), [monitoring.md](monitoring.md), and [security-cost-checklist.md](security-cost-checklist.md).
