import {
  LambdaClient,
} from "@aws-sdk/client-lambda";
import type {
	APIGatewayEventRequestContextJWTAuthorizer,
	APIGatewayProxyEventV2,
	APIGatewayProxyHandlerV2,
	APIGatewayProxyStructuredResultV2,
	Context
} from 'aws-lambda';
import {
  GetObjectCommand,
	PutObjectCommand,
  NoSuchKey,
  S3Client,
  S3ServiceException,
	paginateListObjectsV2,
} from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type RouteDataType = "string" | "number" | "boolean";

export type Headers = APIGatewayProxyStructuredResultV2["headers"];

export type Middleware = (
	ctx: HandlerContext,
	next: () => Promise<APIGatewayProxyStructuredResultV2>
) => Promise<APIGatewayProxyStructuredResultV2> | APIGatewayProxyStructuredResultV2;

export type CorsOrigin =
	| string
	| string[]
	| ((origin: string) => boolean);

export interface CorsOptions {
	/** Allowed origin(s). Defaults to `"*"` when CORS is enabled. */
	origin?: CorsOrigin;
	/** Allowed methods. Derived from registered routes when omitted. */
	methods?: HttpMethod[] | string;
	/** Allowed request headers. Reflects the preflight request when omitted. */
	headers?: string[] | string;
	/** Whether credentials (cookies) are allowed. */
	credentials?: boolean;
	/** How long preflight results can be cached, in seconds. */
	maxAge?: number;
	/** Headers the browser may expose to JS. */
	expose?: string[] | string;
}

export interface CreateOptions {
	/** Enable CORS middleware (`true` means `origin: "*"`). */
	cors?: true | CorsOptions;
}

/** HTTP API v2 event. `authorizer` is set when the route uses a JWT authorizer. */
export type HttpApiEvent = APIGatewayProxyEventV2 & {
	requestContext: APIGatewayProxyEventV2['requestContext'] & {
		authorizer?: APIGatewayEventRequestContextJWTAuthorizer;
	};
};

export interface HandlerContext {
	/** Lambda client */
	lambda: LambdaClient;
	/** HTTP API event */
	event: HttpApiEvent;
	/** Lambda context */
	context: Context;
	/** Path data from the route */
	pathData: Record<string, string>;
	/** Path spec from the route */
	pathSpec: Record<string, RouteDataType>,
	/** Query spec from the route */
	querySpec: Record<string, RouteDataType>;
}

export interface LambdaState {
	/** Executor function */
	exec: () => Promise<APIGatewayProxyStructuredResultV2>,
	/** Key/value store */
	kv: Record<string, any>,
	/** Log map */
	log: Map<string, LogDefinition[]>,
	/** Object map */
	object: Map<string, ObjectDefinition>,
	/** Route definitions */
	route: RouteDefinition[],
	/** Middleware functions */
	middleware: Middleware[],
};

/** Route handler */
export type RouteHandler<Q = any> = (
	/** Handler context */
	ctx: HandlerContext,
	/** Query parameters */
	query?: Q,
) => Promise<any> | any;

export interface LambdaResponse {
	_code?: number;
	_headers?: Headers;
	/** Set HTTP status code */
	code: (code: number) => LambdaResponse;
	/** Merge response headers */
	headers: (headers: Record<string, string>) => LambdaResponse;
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
	value: (value?: string | null) => Promise<string | boolean | null>;
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
	/** Add `DELETE` method route */
	delete: <Q = any>(handler: RouteHandler<Q>) => LambdaRoute;
};

export interface LambdaKeyValueConfig {
	/** Persist the state */
	persist?: false,
	/** Name of the table, if persisted (if applicable) */
	table?: string,
};

export interface LambdaKeyValue {
	/** Get/set key's value  */
	value: (value?: any) => Promise<any>;
}

export type LambdaApp = {
	/** Register middleware that wraps the Lambda handler */
	use: (mw: Middleware) => LambdaApp;
	/** Define an executor (called if no routes defined) */
	exec: (handler: () => Promise<APIGatewayProxyStructuredResultV2>) => Promise<void>;
	/** Define a log */
	log: (name?: string) => LambdaLog;
	/** Define an object */
	object: (
		key: string,
		bucket?: string
	) => Promise<LambdaObject | null>;
	/** Define multiple objects */
	objects: (
		key: string,
		bucket?: string
	) => Promise<LambdaObject[] | null>;
	/** Define a response */
	response: (value?: any) => LambdaResponse;
	/** Define a route */
	route: (template: string) => LambdaRoute;
	/** Define a key/value pair */
	key: (key: string, config?: LambdaKeyValueConfig) => LambdaKeyValue;
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

	// Default absolute "/"
	if (!segments.length) {
		pattern += "/";
	}

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

const DEFAULT_CORS_METHODS: HttpMethod[] = [
	"GET",
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
	"HEAD",
	"OPTIONS",
];

function getHeader(
	headers: APIGatewayProxyEventV2["headers"] | Headers,
	name: string,
): string | undefined {
	if (!headers) return undefined;
	const lower = name.toLowerCase();
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === lower && value !== undefined) {
			return String(value);
		}
	}
	return undefined;
}

function headerList(value: string[] | string | undefined): string | undefined {
	if (value === undefined) return undefined;
	return Array.isArray(value) ? value.join(", ") : value;
}

function mergeHeaders(
	result: APIGatewayProxyStructuredResultV2,
	extra: Record<string, string>,
): APIGatewayProxyStructuredResultV2 {
	return {
		...result,
		headers: {
			...result.headers,
			...extra,
		},
	};
}

/** HTTP API named stages appear as a prefix on `rawPath` (e.g. `/test/v1/me`). */
function routePath(event: APIGatewayProxyEventV2): string {
	const raw = event.rawPath || "/";
	const stage = event.requestContext?.stage;
	if (!stage || stage === "$default") return raw;
	const prefix = `/${stage}`;
	if (raw === prefix) return "/";
	if (raw.startsWith(`${prefix}/`)) return raw.slice(prefix.length) || "/";
	return raw;
}

function compose(
	middleware: Middleware[],
	core: (ctx: HandlerContext) => Promise<APIGatewayProxyStructuredResultV2>,
): (ctx: HandlerContext) => Promise<APIGatewayProxyStructuredResultV2> {
	return (ctx) => {
		let index = -1;
		const dispatch = (i: number): Promise<APIGatewayProxyStructuredResultV2> => {
			if (i <= index) {
				return Promise.reject(new Error("next() called multiple times"));
			}
			index = i;
			if (i === middleware.length) {
				return Promise.resolve(core(ctx));
			}
			return Promise.resolve(middleware[i](ctx, () => dispatch(i + 1)));
		};
		return dispatch(0);
	};
}

function resolveCorsOrigin(
	originOpt: CorsOrigin | undefined,
	requestOrigin: string | undefined,
	credentials?: boolean,
): string | undefined {
	const configured = originOpt ?? "*";

	if (typeof configured === "function") {
		if (!requestOrigin || !configured(requestOrigin)) return undefined;
		return requestOrigin;
	}

	if (Array.isArray(configured)) {
		if (!requestOrigin || !configured.includes(requestOrigin)) return undefined;
		return requestOrigin;
	}

	if (configured === "*") {
		if (credentials) return requestOrigin;
		return "*";
	}

	return configured;
}

function allowedMethodsFromRoutes(
	routes: RouteDefinition[],
	override?: HttpMethod[] | string,
): string {
	if (override) return headerList(override)!;
	const methods = [...new Set(routes.map((r) => r.method))];
	if (!methods.includes("OPTIONS")) methods.push("OPTIONS");
	if (methods.length === 1 && methods[0] === "OPTIONS") {
		return DEFAULT_CORS_METHODS.join(", ");
	}
	return methods.join(", ");
}

function createCorsMiddleware(
	options: CorsOptions = {},
	getMethods?: () => string,
): Middleware {
	return async (ctx, next) => {
		const method = (ctx.event.requestContext?.http?.method || "GET") as HttpMethod;
		const requestOrigin = getHeader(ctx.event.headers, "origin");
		const allowOrigin = resolveCorsOrigin(
			options.origin,
			requestOrigin,
			options.credentials,
		);

		const corsHeaders: Record<string, string> = {};

		if (allowOrigin) {
			corsHeaders["access-control-allow-origin"] = allowOrigin;
			if (allowOrigin !== "*") {
				corsHeaders["vary"] = "Origin";
			}
		}

		const allowMethods = options.methods
			? headerList(options.methods)
			: getMethods?.() ?? DEFAULT_CORS_METHODS.join(", ");
		if (allowMethods) {
			corsHeaders["access-control-allow-methods"] = allowMethods;
		}

		const requestHeaders = getHeader(ctx.event.headers, "access-control-request-headers");
		const allowHeaders = headerList(options.headers)
			?? requestHeaders
			?? (options.credentials ? requestHeaders : "*");
		if (allowHeaders) {
			corsHeaders["access-control-allow-headers"] = allowHeaders;
		}

		if (options.credentials) {
			corsHeaders["access-control-allow-credentials"] = "true";
		}

		if (options.maxAge !== undefined) {
			corsHeaders["access-control-max-age"] = String(options.maxAge);
		}

		const expose = headerList(options.expose);
		if (expose) {
			corsHeaders["access-control-expose-headers"] = expose;
		}

		if (method === "OPTIONS") {
			return {
				statusCode: 204,
				headers: corsHeaders,
			};
		}

		const result = await next();
		return mergeHeaders(result, corsHeaders);
	};
}

/** CORS middleware for API Gateway HTTP API v2 proxy responses */
export function cors(options: CorsOptions = {}): Middleware {
	return createCorsMiddleware(options);
}

/** Create a new Lambda app */
export function create(options?: CreateOptions): LambdaApp {
	const _state: LambdaState = {
		exec: async () => {
			// Default 404 response
			return app.response().code(404).basic();
		},
		kv: {},
		log: new Map(),
		object: new Map(),
		route: [],
		middleware: [],
	};

	const app: LambdaApp = {
		use: (mw) => {
			_state.middleware.push(mw);
			return app;
		},

		exec: async (handler) => {
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
			bucket?: string,
		): Promise<LambdaObject | null> => {
			const client = new S3Client({});

			try {
				const response = await client.send(
					new GetObjectCommand({
						Bucket: bucket,
						Key: key,
					}),
				);
				// The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
				const str = await response.Body?.transformToString();
				
				app.log().info(str);
			} catch (caught) {
				if (caught instanceof NoSuchKey) {
					app.log().error(
						`Error from S3 while getting object "${key}" from "${bucket}". No such key exists.`,
					);
				} else if (caught instanceof S3ServiceException) {
					app.log().error(
						`Error from S3 while getting object from ${bucket}. ${caught.name}: ${caught.message}`,
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
				value: async (
					value
				) => {
					app.log().debug(`objects('${key}')`);
					if (!key) return null;

					// Get value
					if (value === undefined) {
						const response = await client.send(
							new GetObjectCommand({
								Bucket: bucket,
								Key: key,
							}),
						);
						app.log().debug(`objects('${key}').getValue().response`, response);

						const getValue = await response.Body?.transformToString('utf-8');
						if (!getValue) return null;

						return getValue;
					}

					// Put value
					const response = await client.send(
						new PutObjectCommand({
							Bucket: bucket,
							Key: key,
							Body: value ?? '',
							ContentType: 'text/plain',
						}),
					);
					app.log().debug(`objects('${key}').putValue().response`, response);

					return response.$metadata.httpStatusCode === 200;
				},
			};

			return object;
		},

		objects: async (
			key: string,
			bucket?: string,
			pageSize: number = 10,
		): Promise<LambdaObject[] | null> => {
			const result: LambdaObject[] = [];

			try {
				const client = new S3Client({});

				const paginator = paginateListObjectsV2(
					{ client, /* Max items per page */ pageSize },
					{ Bucket: bucket },
				);
		
				for await (const page of paginator) {
					if (!page.Contents || page.Contents.length === 0) continue;

					page.Contents.forEach((o) => {
						result.push({
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
							value: async (
								value
							) => {
								app.log().debug(`objects('${o.Key}')`);
								if (!o?.Key) return null;
	
								// Get value
								if (value === undefined) {
									const response = await client.send(
										new GetObjectCommand({
											Bucket: bucket,
											Key: o.Key,
										}),
									);
									app.log().debug(`objects('${key}').getValue().response`, response);

									const getValue = await response.Body?.transformToString('utf-8');
									if (!getValue) return null;

									return getValue;
								}

								// Put value
								const response = await client.send(
									new PutObjectCommand({
										Bucket: bucket,
										Key: o.Key,
										Body: value ?? '',
										ContentType: 'text/plain',
									}),
								);
								app.log().debug(`objects('${key}').putValue().response`, response);

								return response.$metadata.httpStatusCode === 200;
							},
						});
					});
				}
			} catch (caught) {
				if (caught instanceof NoSuchKey) {
					app.log().error(
						`Error from S3 while getting object "${key}". No such key exists.`,
					);
				} else if (caught instanceof S3ServiceException) {
					app.log().error(
						`Error from S3 while getting object. ${caught.name}: ${caught.message}`,
					);
				} else {
					throw caught;
				}
			} finally {
				return result;
			}
		},

		response: (
			body?: string,
		): LambdaResponse => {
			const response: LambdaResponse = {
				code: (code: number) => {
					response._code = code;
					return response;
				},

				headers: (headers) => {
					response._headers = { ...response._headers, ...headers };
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
				) => route.add<Q>("GET", template, handler),
			
				post: <Q = any>(
					handler: RouteHandler<Q>
				) => route.add<Q>("POST", template, handler),
			
				put: <Q = any>(
					handler: RouteHandler<Q>
				) => route.add<Q>("PUT", template, handler),
			
				patch: <Q = any>(
					handler: RouteHandler<Q>
				) => route.add<Q>("PATCH", template, handler),
			
				head: <Q = any>(
					handler: RouteHandler<Q>
				) => route.add<Q>("HEAD", template, handler),
			
				options: <Q = any>(
					handler: RouteHandler<Q>
				) => route.add<Q>("OPTIONS", template, handler),

				delete: <Q = any>(
					handler: RouteHandler<Q>
				) => route.add<Q>("DELETE", template, handler)
			};

			return route;
		},

		key: (key, config) => {
			if (config?.persist && !config.table?.length)
				throw new Error(`key(${key}): Table required for persistence`);

			const get = async () => {
				if (config?.persist) {
					const client = new DynamoDBClient({});
					const docClient = DynamoDBDocumentClient.from(client);

					const command = new GetCommand({
						TableName: config?.table,
						Key: {
							[key]: key,
						},
					});

					const response = await docClient.send(command);
					app.log().debug(response);
				}

				return _state.kv[key] ?? null;
			};

			const set = async (value: any) => {
				if (config?.persist) {
					const client = new DynamoDBClient({});
					const docClient = DynamoDBDocumentClient.from(client);

					const command = new PutCommand({
						TableName: config?.table,
						Item: {
							[key]: value,
						},
					});
				
					const response = await docClient.send(command);
					app.log().debug(response);
				}

				_state.kv[key] = value;

				return true;
			};

			const kv: LambdaKeyValue = {
				value: async (value?: any) => {
					if (value === undefined) return await get();
					return await set(value);
				},
			};

			return kv;
		},
	
		handler: async (
			event,
			context
		): Promise<APIGatewayProxyStructuredResultV2> => {
			const ctx: HandlerContext = {
				lambda: lambdaClient,
				event,
				context,
				pathData: {},
				pathSpec: {},
				querySpec: {},
			};

			const core = async (
				ctx: HandlerContext
			): Promise<APIGatewayProxyStructuredResultV2> => {
				try {
					// No routes defined, attempt executor
					if (!_state.route.length && _state.exec) {
						return _state.exec();
					}

					const method = (event.requestContext?.http?.method ||
						"GET") as HttpMethod;

					const path = routePath(event);

					let matchedRoute: RouteDefinition | null = null;

					// Process routes
					for (const r of _state.route) {
						if (r.method !== method) continue;

						const m = r.pathRegex.exec(path);
						if (m) {
							matchedRoute = r;
							ctx.pathData = (m.groups || {});
							ctx.pathSpec = r.pathSpec;
							ctx.querySpec = r.querySpec;
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
				}
			};

			try {
				return await compose(_state.middleware, core)(ctx);
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

	if (options?.cors) {
		const corsOpts = options.cors === true ? {} : options.cors;
		app.use(createCorsMiddleware(corsOpts, () =>
			allowedMethodsFromRoutes(_state.route, corsOpts.methods)
		));
	}

	return app;
}
