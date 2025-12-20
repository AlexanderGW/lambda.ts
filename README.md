# TypeScript AWS Lambda micro-framework
- Supports AWS Gateway API V2
- Tested with Node 20+
- Vitest test framework with basic I/O simulator

### Todo
- Implement; S3, DynamoDB
- Dev server

## What does it do?
Provides a basic HTTP path routing system, for example `GET /product/foo`
```typescript
import { create, responseJson } from 'lambda.ts';

/** Shared function logic here... */

const λ = create();
λ.routeGet('/product/[s:%s]', (Δ) => {
	return responseJson(Δ.pathData); // { s: 'foo' }
});

export const handler = λ.handler;
```

...will provide S3 object manipulation

```typescript
import { create, objectGet, responseJson } from 'lambda.ts';

const λ = create();
λ.routeGet('/', async () => {
	const result = await objectGet('/foo/bar');
	if (!result) return responseJson('Oops!', 500);
	return responseJson(result.content);
});

export const handler = λ.handler;
```

...will provide NoSQL DynamoDB support

```typescript
import { create, objectGet, responseJson } from 'lambda.ts';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const λ = create();
λ.routeGet('/', async () => {
	try {
		const client = new DynamoDBClient({ region: "REGION" });
		const data = await client.send(command);
		return responseJson(result.content);
	} catch (error) {
		return responseJson('Oops!', 500);
	}
});

export const handler = λ.handler;
```

## Testing
```bash
npx vitest tests
```

Provides a basic AWS Gateway API invocation simulator, where you write tests as...

```typescript
import { describe, it, expect } from "vitest";
import { simulator } from "./simulator";
import { handler } from "./lambda/example";

const result = await simulator(handler, {
	method: "GET",
	path: "/doesnt-exist"
});

expect(result.statusCode).toBe(404);
expect(result.body).toBeUndefined();
```

## Development
Local server to be implemented