import {
  LambdaClient,
} from "@aws-sdk/client-lambda";
import {
	type APIGatewayProxyEventQueryStringParameters,
	type APIGatewayProxyEventV2,
	type APIGatewayProxyHandlerV2,
	type APIGatewayProxyStructuredResultV2,
	type Context
} from 'aws-lambda';

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type RouteDataType = "string" | "number" | "boolean";

export type Headers = APIGatewayProxyStructuredResultV2["headers"];

interface RouteDefinition<Q = any> {
  method: HttpMethod;
  template: string;
  pathRegex: RegExp;
  pathSpec: Record<string, RouteDataType>;
  querySpec: Record<string, RouteDataType>;
  handler: RouteHandler<Q>;
}

export const log = (
	...data: any[]
): void => {
	console.log(...data);
};

export const logError = (
	...data: any[]
): void => {
	console.error(...data);
};

export const logWarn = (
	...data: any[]
): void => {
	console.warn(...data);
};

export const logInfo = (
	...data: any[]
): void => {
	console.info(...data);
};

export const logDebug = (
	...data: any[]
): void => {
	// TODO: Conditional debugging
	// console.debug(...data);
};

export const objectExists = (
	path: string,
): Promise<boolean> => {
	logDebug(`objectExists`, path);
	return new Promise((r) => {
		setTimeout(() => r(true), 10);
	});
};

export const objectGet = (
	path: string,
): Promise<any> => {
	logDebug(`objectGet`, path);
	return new Promise((r) => {
		setTimeout(() => r(true), 10);
	});
};

export const objectSet = (
	path: string,
	data: any,
): Promise<any> => {
	logDebug(`objectSet`, path, data);
	return new Promise((r) => {
		setTimeout(() => r(true), 10);
	});
};

/** Returns an AWS Gateway API response with `statusCode`, `body`, and `headers` */
export const response = (
	body?: any,
	code?: number,
	headers?: Headers,
): APIGatewayProxyStructuredResultV2 => {
	const response: APIGatewayProxyStructuredResultV2 = {
		statusCode: code ?? 200,
		headers,
		body: body === null ? undefined : body,
	};
	// logDebug(`Response:`, response);
	return response;
};

/** Prepares JSON data for `response` */
export const responseJson = (
	body?: any,
	code?: number,
	headers?: Headers,
): APIGatewayProxyStructuredResultV2 => {
	return response(
		JSON.stringify(body),
		code ?? 200,
		{ "content-type": "application/json", ...headers },
	);
};

/** Prepares HTML data for `response` */
export const responseHtml = (
	body?: string,
	code?: number,
	headers?: Headers,
): APIGatewayProxyStructuredResultV2 => {
	return response(
		body ?? '<html></html>',
		code ?? 200,
		{ "content-type": "text/html", ...headers },
	);
};

/** Prepares Base64 data for `response` */
export const responseBase64 = (
	body?: string,
	code?: number,
	headers?: Headers,
): APIGatewayProxyStructuredResultV2 => {
	return response(
		atob(body ?? ''),
		code ?? 200,
		{ "content-type": "text/plain", ...headers },
	);
};

/** Prepares plain text data for `response` */
export const responseText = (
	body?: string,
	code?: number,
	headers?: Headers,
): APIGatewayProxyStructuredResultV2 => {
	return response(
		body ?? '',
		code ?? 200,
		{ "content-type": "text/plain", ...headers },
	);
};

export interface HandlerContext {
	lambda: LambdaClient;
	event: APIGatewayProxyEventV2;
	context: Context;
	pathData: Record<string, string>;
	pathSpec: Record<string, RouteDataType>,
	queryData: APIGatewayProxyEventQueryStringParameters | undefined,
	querySpec: Record<string, RouteDataType>;
}

export type RouteHandler<Q = any> = (
  ctx: HandlerContext,
  query?: Q,
) => Promise<any> | any;

const lambdaClient = new LambdaClient({}); // region picked up from env

const routes: RouteDefinition[] = [];

function compilePathPattern(pathTemplate: string): {
  regex: RegExp;
  paramSpec: Record<string, RouteDataType>;
} {
  const segments = pathTemplate.split("/").filter(Boolean);
  let pattern = "^"; // match entire string
  const paramSpec: Record<string, RouteDataType> = {};

  for (const segment of segments) {
    pattern += "/";

    // Match placeholders
    const m = segment.match(/^\[(?<key>[A-Za-z0-9_]+):%(?<type>[ds])\]$/);
    if (m?.groups) {
      const { key, type } = m.groups as { key: string; type: "s" | "b" | "d" };

      const t: RouteDataType =
        type === "d" ? "number" : type === "b" ? "boolean" : "string";

      paramSpec[key] = t;

      // Named capture group for the param
      pattern += `(?<${key}>[^/]+)`;
    } else {
      // Literal segment – escape regex special chars
      const escaped = segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      pattern += escaped;
    }
  }

	pattern += "$";

  return {
    regex: new RegExp(pattern),
    paramSpec,
  };
}

function parseQueryTemplate(
  queryPart: string | undefined
): Record<string, RouteDataType> {
  const querySpec: Record<string, RouteDataType> = {};
  if (!queryPart) return querySpec;

  const pairs = queryPart.split("&");

  for (const pair of pairs) {
    const [key, rawVal] = pair.split("=");
    if (!key || !rawVal) continue;

    const match = rawVal.match(/\[%([sbd])\]/);
    let type: RouteDataType = "string";

    if (match) {
      const code = match[1];
      if (code === "d") type = "number";
      else if (code === "b") type = "boolean";
    }

    querySpec[key] = type;
  }

  return querySpec;
}

export type LambdaApp = {
	/** Add routing for HTTP method and path template, to handler */
	route: <Q = any>(method: HttpMethod, template: string, handler: RouteHandler<Q>) => void;
	/** Wrapper for `route` with `GET` method */
	routeGet: <Q = any>(template: string, handler: RouteHandler<Q>) => void;
	/** Wrapper for `route` with `POST` method */
	routePost: <Q = any>(template: string, handler: RouteHandler<Q>) => void;
	/** Wrapper for `route` with `PUT` method */
	routePut: <Q = any>(template: string, handler: RouteHandler<Q>) => void;
	/** Wrapper for `route` with `PATCH` method */
	routePatch: <Q = any>(template: string, handler: RouteHandler<Q>) => void;
	/** Wrapper for `route` with `HEAD` method */
	routeHead: <Q = any>(template: string, handler: RouteHandler<Q>) => void;
	/** Wrapper for `route` with `OPTIONS` method */
	routeOptions: <Q = any>(template: string, handler: RouteHandler<Q>) => void;
	/** The app handler to be exposed for Lambda invocation */
	handler: APIGatewayProxyHandlerV2;
};

/** Create a new Lambda app */
export function create(): LambdaApp {
  function route<Q>(
    method: HttpMethod,
    template: string,
    handler: RouteHandler<Q>
  ) {
		const [pathPart, queryPart] = template.split("?");
    const pathTemplate = pathPart || "/";

    const { regex: pathRegex, paramSpec: pathSpec } =
      compilePathPattern(pathTemplate);

    const querySpec = parseQueryTemplate(queryPart);

    routes.push({
      method,
      template,
      pathRegex,
      pathSpec,
      querySpec,
      handler,
    });
  }

  function routeGet<Q = any>(
    template: string,
    handler: RouteHandler<Q>
  ) {
    route<Q>("GET", template, handler);
  }

  function routePost<Q = any>(
    template: string,
    handler: RouteHandler<Q>
  ) {
    route<Q>("POST", template, handler);
  }

  function routePut<Q = any>(
    template: string,
    handler: RouteHandler<Q>
  ) {
    route<Q>("PUT", template, handler);
  }

  function routePatch<Q = any>(
    template: string,
    handler: RouteHandler<Q>
  ) {
    route<Q>("PATCH", template, handler);
  }

  function routeHead<Q = any>(
    template: string,
    handler: RouteHandler<Q>
  ) {
    route<Q>("HEAD", template, handler);
  }

  function routeOptions<Q = any>(
    template: string,
    handler: RouteHandler<Q>
  ) {
    route<Q>("OPTIONS", template, handler);
  }

  // The actual Lambda handler
  const handler: APIGatewayProxyHandlerV2 = async (
    event,
    context
  ): Promise<APIGatewayProxyStructuredResultV2> => {
		// const [method, routePath] = event.routeKey.split(' ');
    const method = (event.requestContext?.http?.method ||
      "GET") as HttpMethod;

    const path = event.rawPath || "/";

    let matchedRoute: RouteDefinition | undefined;
    let pathData: Record<string, string> = {};

    for (const r of routes) {
      if (r.method !== method) continue;

      const m = r.pathRegex.exec(path);
      if (m) {
        matchedRoute = r;
        pathData = (m.groups || {});
        break;
      }
    }

		logDebug(`requestContext`, event.requestContext?.http);
		logDebug(`Method`, method);
		logDebug(`Path`, path);
		logDebug(`Matched route`, matchedRoute);

    if (!matchedRoute) {
			return response(
				null,
				404
			);
    }

    try {
      const ctx: HandlerContext = {
				lambda: lambdaClient,
				event,
				context,
				pathData,
				pathSpec: matchedRoute.pathSpec,
				queryData: event.queryStringParameters,
				querySpec: matchedRoute.querySpec,
			};

      const result = await matchedRoute.handler(ctx);

      // Normalize to an HTTP response
      if (typeof result === "object" && result !== null && "statusCode" in result) {
        return result; // assume user returned full APIGW response
      }

			return response(
				result ?? null
			);
    } catch (err: any) {
      logError("Handler error", err);
			
			return responseJson(
				JSON.stringify({
          message: "Internal Server Error",
          error: err?.message ?? "Unknown error",
        }),
				500
			);
    }
  };

  return {
		route,
    routeGet,
    routePost,
		routePut,
    routePatch,
		routeHead,
		routeOptions,
    handler,
  };
}
