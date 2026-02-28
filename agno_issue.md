# Feature Request: Native support for Amazon Bedrock Bearer Tokens (AWS_BEARER_TOKEN_BEDROCK)

## Description
Currently, `AwsBedrock` requires explicit `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to be present in the environment (or passed explicitly). If these variables are not present, Agno throws an error during the model instantiation:

```text
ERROR: AWS credentials not found. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables or provide a boto3 session.
```

However, Amazon Bedrock now officially supports authenticating via a Bearer token (`AWS_BEARER_TOKEN_BEDROCK`), such as Bedrock API keys generated from the AWS console. The underlying `boto3` client natively supports this variable when `boto3.Session()` or `boto3.client("bedrock")` is called.

Because Agno's validation explicitly checks for SigV4 (IAM) variables before instantiating the Boto3 client, it blocks users who are relying solely on the Bearer Token. 

## Suggested Solution
Modify the validation logic inside `AwsBedrock` to also check for the existence of `os.environ.get("AWS_BEARER_TOKEN_BEDROCK")`. If this token is present, bypass the traditional IAM credential check, as Boto3 will automatically utilize the Bearer token.

## Workaround
Currently, providing an explicit `boto3.Session` to the agent bypasses the check successfully:

```python
import boto3
from agno.agent import Agent
from agno.models.aws.bedrock import AwsBedrock

boto_session = boto3.Session(region_name="us-east-1")
model = AwsBedrock(id="amazon.nova-lite-v1:0", session=boto_session)

agent = Agent(model=model)
```
