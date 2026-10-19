# Monitoring

## Logs

Lambda writes execution logs to CloudWatch Logs when its execution role has the required permissions. Review the role in each SAM template before adding permissions; SAM's generated execution role commonly includes basic logging permissions unless a custom role overrides them.

**Proposed baseline:** retain application logs for 30 days, subject to team/course requirements and cost/privacy review.

If explicitly managing log groups in CloudFormation, use the correct Lambda logical ID and ensure the log group does not already exist outside the stack. Example pattern (add into the respective template.yml file for each resource):

```yaml
Resources:
  ExampleFunctionLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub "/aws/lambda/${ExampleFunction}"
      RetentionInDays: 30
```

Replace `ExampleFunction` with the actual function logical ID. Add a separate unique log-group logical ID for each function. Existing unmanaged log groups may cause a stack-create failure, so inspect the account/region before adopting this pattern.

## Metrics nad Alarms

| Component | Signal | Rationale |
|---|---|---|
| PSI Refresher Lambda | Errors, failed invocations | Detect refresh failures |
| PSI Refresher Lambda (data refreshness) | Last successful refresh age (custom metric if feasible) | Detect stale PSI data even when the function is not invoked |
| API Gateway | 5xx responses and latency | Detect user-visible API failures |


## Runbook: PSI data looks stale

1. Check the refresher Lambda's latest invocation and error logs.
2. Check whether the schedule is enabled and targets the correct function.
3. Check upstream API status, response shape, timeout, and throttling behavior.
4. Check the refresher's DynamoDB write permissions and table name.
5. Check the timestamp/age of the most recent stored record.
6. After fixing the cause, invoke a safe test run if supported and verify the API returns the updated data.
