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

import {
  GetObjectCommand,
  NoSuchKey,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type RouteDataType = "string" | "number" | "boolean";

export type Headers = APIGatewayProxyStructuredResultV2["headers"];

export interface HandlerContext {
	lambda: LambdaClient;
	event: APIGatewayProxyEventV2;
	context: Context;
	pathData: Record<string, string>;
	pathSpec: Record<string, RouteDataType>,
	queryData: APIGatewayProxyEventQueryStringParameters | undefined,
	querySpec: Record<string, RouteDataType>;
}

export interface LambdaStateData {
	exec: () => APIGatewayProxyStructuredResultV2,
	kv: Record<string, any>,
	log: Map<string, LogDefinition[]>,
	object: Map<string, ObjectDefinition>,
	route: RouteDefinition[],
};

export type RouteHandler<Q = any> = (
  ctx: HandlerContext,
  query?: Q,
) => Promise<any> | any;

export interface LambdaResponse {
	_code?: number;
	_headers?: Headers;
	/** Set HTTP status code */
	code: (code: number) => LambdaResponse;
	/** Returns response */
	basic: (
		body?: any
	) => APIGatewayProxyStructuredResultV2;
	/** Returns response as JSON */
	json: () => APIGatewayProxyStructuredResultV2;
	/** Returns response as HTML */
	html: () => APIGatewayProxyStructuredResultV2;
	/** Returns response as Base64 */
	base64: () => APIGatewayProxyStructuredResultV2;
	/** Returns response as plain text */
	text: () => APIGatewayProxyStructuredResultV2;
};

export interface LambdaLog {
	/** Add custom type and data */
	add: (type: string, ...data: any[]) => void;
	/** Add debug entry */
	debug: (...data: any[]) => void;
	/** Add error entry */
	error: (...data: any[]) => void;
	/** Add info entry */
	info: (...data: any[]) => void;
	/** Add log entry */
	log: (...data: any[]) => void;
	/** Add warning entry */
	warn: (...data: any[]) => void;
};

export interface LambdaObject {
	acl: (key?: string) => boolean;
	meta: (key?: string) => null;
	value: (value?: string | null) => string | boolean | null;
};

export interface LambdaRoute {
	/** Add custom route */
	add: <Q = any>(method: HttpMethod, template: string, handler: RouteHandler<Q>) => LambdaRoute;
	/** Add `GET` method route */
	get: <Q = any>(handler: RouteHandler<Q>) => LambdaRoute;
	/** Add `HEAD` method route */
	head: <Q = any>(handler: RouteHandler<Q>) => LambdaRoute;
	/** Add `OPTIONS` method route */
	options: <Q = any>(handler: RouteHandler<Q>) => LambdaRoute;
	/** Add `PATCH` method route */
	patch: <Q = any>(handler: RouteHandler<Q>) => LambdaRoute;
	/** Add `POST` method route */
	post: <Q = any>(handler: RouteHandler<Q>) => LambdaRoute;
	/** Add `PUT` method route */
	put: <Q = any>(handler: RouteHandler<Q>) => LambdaRoute;
};

export interface LambdaState {
	/** Get state K/V */
	get: (key: string) => any;
	/** Set state K/V */
	set: (key: string, value: any) => any;
}

export type LambdaApp = {
	/** Define an executor (called if no routes defined) */
	exec: (handler: () => APIGatewayProxyStructuredResultV2) => void;
	/** Define a log */
	log: (name?: string) => LambdaLog;
	/** Define an object */
	object: (key: string) => Promise<LambdaObject | null>;
	/** Define a response */
	response: (value?: any) => LambdaResponse;
	/** Define a route */
	route: (template: string) => LambdaRoute;
	/** Define a route */
	state: (name?: string) => LambdaState;
	/** The app handler to be exposed for Lambda invocation */
	handler: APIGatewayProxyHandlerV2;
};

interface LogDefinition {
	type: string;
	value: any[];
};

interface ObjectDefinition {
	path: string;
	value: unknown;
};

interface RouteDefinition<Q = any> {
  method: HttpMethod;
  template: string;
  pathRegex: RegExp;
  pathSpec: Record<string, RouteDataType>;
  querySpec: Record<string, RouteDataType>;
  handler: RouteHandler<Q>;
}

const lambdaClient = new LambdaClient({}); // region picked up from env

function compilePathPattern(
	pathTemplate: string
): {
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

/** Create a new Lambda app */
export function create(): LambdaApp {
	const _state: LambdaStateData = {
		exec: () => {
			return app.response().code(404).basic();
		},
		kv: {},
		log: new Map(),
		object: new Map(),
		route: [],
	};

	const app: LambdaApp = {
		exec: (handler) => {
			_state.exec = handler;
		},

		log: (
			name?: string,
		): LambdaLog => {
			const log: LambdaLog = {
				add: (
					type: string,
					...data: any[]
				) => {
					// TODO: Implement logger?
					// const logger = _state.log.get(name ?? 'app') ?? _state.log.set('app', []);
					// logger.set(
					// 	type,
					// 	[...logger?.get(type), ]
					// );

					switch (type) {
						// TODO: Conditional debugging
						// case 'debug':
						// 	console.debug(...data);
						// 	break;
						case 'error':
							console.error(...data);
							break;
						case 'info':
							console.info(...data);
							break;
						case 'log':
							console.log(...data);
							break;
						case 'warn':
							console.warn(...data);
							break;
					}
				},

				debug: (
					...data: any[]
				) => {
					log.add('debug', ...data);
				},
				
				error: (
					...data: any[]
				) => {
					log.add('error', ...data);
				},
				
				info: (
					...data: any[]
				) => {
					log.add('info', ...data);
				},
		
				log: (
					...data: any[]
				) => {
					log.add('log', ...data);
				},
				
				warn: (
					...data: any[]
				) => {
					log.add('warn', ...data);
				},
			};

			return log;
		},

		object: async (
			key: string,
		): Promise<LambdaObject> => {
			const client = new S3Client({});

			const bucketName = 'foobar';

			try {
				const response = await client.send(
					new GetObjectCommand({
						Bucket: bucketName,
						Key: key,
					}),
				);
				// The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
				const str = await response.Body?.transformToString();
				
				app.log().info(str);

			} catch (caught) {
				if (caught instanceof NoSuchKey) {
					app.log().error(
						`Error from S3 while getting object "${key}" from "${bucketName}". No such key exists.`,
					);
				} else if (caught instanceof S3ServiceException) {
					app.log().error(
						`Error from S3 while getting object from ${bucketName}.  ${caught.name}: ${caught.message}`,
					);
				} else {
					throw caught;
				}
			}

			const object: LambdaObject = {
				acl: (
					key?
				) => {
					return true;
				},
				meta: (
					key?
				) => {
					return null;
				},
				value: (
					value?
				) => {
					return true;
				},
			};

			return object;
		},

		response: (
			body?: string,
		): LambdaResponse => {
			const response: LambdaResponse = {
				code: (code: number) => {
					response._code = code;
					return response;
				},

				basic: (
					_?: any,
				) => {
					response._code = response._code ?? 200;
					const result: APIGatewayProxyStructuredResultV2 = {
						statusCode: response._code,
						headers: response._headers,
						body: _ === undefined ? body : _,
					};
					// log().debug(`Response:`, result);
					return result;
				},

				json: () => {
					response._headers = { "content-type": "application/json", ...response._headers };
					return response.basic(
						JSON.stringify(body),
					);
				},

				html: () => {
					response._headers = { "content-type": "text/html", ...response._headers };
					return response.basic(
						body ?? '<html></html>',
					);
				},

				base64: () => {
					response._headers = { "content-type": "text/plain", ...response._headers };
					return response.basic(
						atob(body ?? ''),
					);
				},

				text: () => {
					response._headers = { "content-type": "text/plain", ...response._headers };
					return response.basic(
						body ?? '',
					);
				},
			};

			return response;
		},

		route: (
			template: string
		): LambdaRoute => {
			const route: LambdaRoute = {
				add: <Q = any>(
					method: HttpMethod,
					template: string,
					handler: RouteHandler<Q>
				) => {
					const [pathPart, queryPart] = template.split("?");
					const pathTemplate = pathPart || "/";
			
					const { regex: pathRegex, paramSpec: pathSpec } =
						compilePathPattern(pathTemplate);
			
					const querySpec = parseQueryTemplate(queryPart);
			
					_state.route.push({
						method,
						template,
						pathRegex,
						pathSpec,
						querySpec,
						handler,
					});

					return route;
				},
	
				get: <Q = any>(
					handler: RouteHandler<Q>
				) => {
					route.add<Q>("GET", template, handler);
					return route;
				},
			
				post: <Q = any>(
					handler: RouteHandler<Q>
				) => {
					route.add<Q>("POST", template, handler);
					return route;
				},
			
				put: <Q = any>(
					handler: RouteHandler<Q>
				) => {
					route.add<Q>("PUT", template, handler);
					return route;
				},
			
				patch: <Q = any>(
					handler: RouteHandler<Q>
				) => {
					route.add<Q>("PATCH", template, handler);
					return route;
				},
			
				head: <Q = any>(
					handler: RouteHandler<Q>
				) => {
					route.add<Q>("HEAD", template, handler);
					return route;
				},
			
				options: <Q = any>(
					handler: RouteHandler<Q>
				) => {
					route.add<Q>("OPTIONS", template, handler);
					return route;
				}
			};

			return route;
		},

		state: () => {
			const state: LambdaState = {
				get: (key: string) => {
					return _state.kv[key] ?? null;
				},

				set: (key: string, value: any) => {
					_state.kv[key] = value;
					return state;
				},
			};

			return state;
		},
	
		// The actual Lambda handler
		handler: async (
			event,
			context
		): Promise<APIGatewayProxyStructuredResultV2> => {
			try {
				// const [method, routePath] = event.routeKey.split(' ');
				const method = (event.requestContext?.http?.method ||
					"GET") as HttpMethod;
		
				const path = event.rawPath || "/";
		
				let matchedRoute: RouteDefinition | undefined;
				let pathData: Record<string, string> = {};

				// No routes defined, attempt executor
				if (!_state.route.length && _state.exec) {
					return _state.exec();
				}

				// Process routes
				for (const r of _state.route) {
					if (r.method !== method) continue;
		
					const m = r.pathRegex.exec(path);
					if (m) {
						matchedRoute = r;
						pathData = (m.groups || {});
						break;
					}
				}
		
				app.log().debug(`event.requestContext`, event.requestContext);
				app.log().debug(`method`, method);
				app.log().debug(`path`, path);
				app.log().debug(`matchedRoute`, matchedRoute);
		
				// No routes matched
				if (!matchedRoute) {
					return app.response().code(404).basic();
				}
				
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
	
				return app.response().basic(
					result ?? null
				);
			} catch (err: any) {
				app.log().error("Handler error", err);
				
				return app.response({
					message: "Internal Server Error",
					error: err?.message ?? "Unknown error",
				}).code(500).json();
			} finally {
				// process.on('exit', async (code) => {
					const used = process.memoryUsage().heapUsed / 1024 / 1024;
					console.info(`The app used approximately ${Math.round(used * 100) / 100} MB`);
				// 	console.info(`Exit code: ${code}`);
				// });
				// process.exit();
			}
		}
	};

	return app;
}
