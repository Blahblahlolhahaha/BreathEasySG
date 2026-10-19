# Monitoring and operational readiness

## Logs

Lambda writes execution logs to CloudWatch Logs when its execution role has the required permissions. Review the role in each SAM template before adding permissions; SAM's generated execution role commonly includes basic logging permissions unless a custom role overrides them.

**Proposed baseline:** retain application logs for 30 days, subject to team/course requirements and cost/privacy review. This is a recommendation, not a setting already deployed.

If explicitly managing log groups in CloudFormation, use the correct Lambda logical ID and ensure the log group does not already exist outside the stack. Example pattern only:

```yaml
Resources:
  ExampleFunctionLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub "/aws/lambda/${ExampleFunction}"
      RetentionInDays: 30
```

Replace `ExampleFunction` with the actual function logical ID. Add a separate unique log-group logical ID for each function. Existing unmanaged log groups may cause a stack-create failure, so inspect the account/region before adopting this pattern.

## Recommended metrics and alarms

Start with the following, then tune thresholds to actual traffic and the course/project requirements:

| Component | Signal | Why it matters |
|---|---|---|
| PSI API Lambda | Errors and throttles | Detect broken requests and capacity limits |
| PSI API Lambda | Duration approaching timeout | Detect slow upstream or database access |
| Refresher Lambda | Errors, failed invocations | Detect refresh failures |
| Refresher Lambda | Last successful refresh age (custom metric if feasible) | Detect stale PSI data even when the function is not invoked |
| API Gateway | 5xx responses and latency | Detect user-visible API failures |
| DynamoDB | Throttling and system errors | Detect read/write capacity or service issues |

Avoid paging on low-signal metrics before establishing normal behavior. For a student project, a CloudWatch dashboard and one or two meaningful alarms may be a reasonable starting point.

## Logging practices

- Log operation start/end, duration, outcome, and safe identifiers useful for troubleshooting.
- Do not log access tokens, credentials, full request headers, or unnecessary personal data.
- Keep log messages structured and consistent across functions.
- Include enough context to distinguish an upstream API failure from a DynamoDB or application error.
- Ensure errors are surfaced; do not silently swallow exceptions in the refresher.

## Runbook: PSI data looks stale

1. Check the refresher Lambda's latest invocation and error logs.
2. Check whether the schedule is enabled and targets the correct function.
3. Check upstream API status, response shape, timeout, and throttling behavior.
4. Check the refresher's DynamoDB write permissions and table name.
5. Check the timestamp/age of the most recent stored record.
6. After fixing the cause, invoke a safe test run if supported and verify the API returns the updated data.
