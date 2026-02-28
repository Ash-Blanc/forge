# Issue: Migrate Amazon Bedrock to OpenAI-Compatible API once Nova models are supported

## Context
Currently, the application relies on the `amazon:amazon.nova-lite-v1:0` model via the native `AwsBedrock` Agno provider. We explicitly pass a `boto3.Session` to ensure the `AWS_BEARER_TOKEN_BEDROCK` is used for authentication instead of standard IAM keys.

## The Problem
We attempted to migrate this to `OpenAIChat` using Amazon Bedrock's official OpenAI-compatible endpoints (e.g., `https://bedrock-runtime.us-east-1.amazonaws.com/openai/v1`). However, while the endpoint successfully authenticates the bearer token, it currently returns a `404 Not Found` error for `amazon.nova-lite-v1:0` (and `meta.llama3` / `anthropic.claude`).

It appears the OpenAI-compatible wrapper on Bedrock is currently restricted to a specific subset of open-weight models (e.g., `openai.gpt-oss-20b`), or Nova models have not yet been exposed through this abstraction interface.

## Acceptance Criteria
- [ ] Periodically monitor AWS Bedrock's updates to see when `amazon.nova-lite` or `amazon.nova-pro` becomes available via the `/openai/v1/chat/completions` endpoint.
- [ ] Once supported, refactor `server.py` and `knowledge.py` to use `OpenAIChat(id="amazon.nova-lite-v1:0", base_url="https://bedrock-runtime.[region].amazonaws.com/openai/v1", api_key=os.environ["AWS_BEARER_TOKEN_BEDROCK"])`.
- [ ] Remove the explicit `boto3` session injection since standard OpenAI HTTP requests won't need it.
