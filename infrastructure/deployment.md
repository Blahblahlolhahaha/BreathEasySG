# Deployment and change workflow

## 1. Work on an isolated branch

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/infrastructure-docs
```

If a branch with that name already exists, choose a new name rather than resetting or overwriting it. Keep this work based on `main` unless the team explicitly asks for a dependency on another feature branch.

## 2. Inspect before changing

```bash
git status --short
find . -name template.yaml -o -name samconfig.toml -o -name amplify.yml
```

For each component, inspect its `template.yaml` and `samconfig.toml`. Check the stack name, region, profile, parameters, capabilities, and resource ownership. A local profile configured in a sample file may not exist on your machine.

## 3. Validate each SAM template

Run from the directory containing the relevant template:

```bash
sam validate --template-file template.yaml
sam build --template-file template.yaml
```

If available, use `cfn-lint template.yaml` for additional CloudFormation checks. Do not treat a successful build as proof that deployment is safe.

## 4. Review deployment dependencies

A sensible order, subject to actual stack outputs and parameters, is:

1. Deploy the stack that owns the PSI DynamoDB table and refresher.
2. Deploy the PSI API configured to read that table.
3. Deploy the users/location backend if it is independent.
4. Deploy or publish the frontend after confirming the API endpoint and environment configuration.

Follow the real dependency graph in the templates. If stacks export outputs or import values, deploy producers before consumers. Do not duplicate a table merely to make a consumer stack deploy independently.

## 5. Preview and deploy deliberately

Use the project's existing `samconfig.toml` settings only after checking them. For a stack with a configured environment, a typical preview is:

```bash
sam deploy --config-file samconfig.toml --guided
```

`--guided` can update local deployment configuration; inspect the resulting diff before committing it. If the project already has a reviewed deployment command, use that instead of introducing a competing workflow. Review the change set and confirm AWS account, region, stack name, and parameter values before approving changes.

## 6. Post-deployment verification

- Confirm the stack update completed without unexpected replacements or deletions.
- Confirm API Gateway endpoint and Lambda integrations.
- Invoke a safe test endpoint and check status code, response schema, and error behavior.
- Confirm the scheduled rule is enabled and the refresher runs successfully.
- Confirm the expected DynamoDB table is receiving fresh records.
- Inspect CloudWatch logs and metrics for errors, throttles, and unexpected duration.
- Confirm frontend environment/API configuration points to the intended environment.

## 7. Rollback and data safety

- Do not delete a stack as a routine rollback; this can delete data-bearing resources.
- Before changes to DynamoDB schemas, table names, retention, deletion protection, or `DeletionPolicy`, get explicit team review and plan a backup/restore path.
- Prefer a forward fix or a reviewed CloudFormation change set when stateful resources are involved.
- Keep deployment logs and the last known-good commit/stack version available to the team.
