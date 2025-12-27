import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyStructuredResultV2, Context } from "aws-lambda";

export interface FakeLambdaInvocation {
  method?: string;
  path?: string;
  query?: Record<string, string | number | boolean>;
  body?: any;
  headers?: Record<string, string>;
}

/** Simulate a fake AWS API Gateway Lambda V2 invocation */
export async function simulator(
	handler: APIGatewayProxyHandlerV2,
  input: FakeLambdaInvocation = {
    method: "GET",
    path: "/"
  }
): Promise<APIGatewayProxyStructuredResultV2> {
  const {
    method = "GET",
    path = "/",
    query = {},
    body = undefined,
    headers = {}
  } = input;

  const queryString =
    Object.keys(query).length > 0
      ? Object.entries(query)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join("&")
      : undefined;

  const fakeEvent = {
    version: "2.0",

    // For route matching
    rawPath: path,
    requestContext: {
      http: {
        method
      }
    },

    // Only include queryStringParameters if present
    queryStringParameters:
      queryString !== null
        ? Object.fromEntries(
            Object.entries(query).map(([k, v]) => [k, String(v)])
          )
        : null,

    // Body handling
    body: body ? JSON.stringify(body) : undefined,
    isBase64Encoded: false,

    headers
  } as unknown as APIGatewayProxyEventV2;

  const fakeContext = {
    functionName: "testLambda",
    awsRequestId: "fakeRequestId",
    invokedFunctionArn: "arn:aws:lambda:local:test",
    getRemainingTimeInMillis: () => 9999
  } as unknown as Context;

  return await handler(fakeEvent, fakeContext, () => {}) as APIGatewayProxyStructuredResultV2;
}