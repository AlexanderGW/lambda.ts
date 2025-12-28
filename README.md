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
import { create } from 'lambda.ts';

/** Shared function logic here... */

const λ = create();
λ.route('/product/[s:%s]').get((Δ) => {
	return λ.response(Δ.pathData).json(); // { s: 'foo' }
});

export const handler = λ.handler;
```

...will provide S3 object manipulation

```typescript
import { create } from 'lambda.ts';

const λ = create();
λ.route('/').get(async () => {
	const obj = await λ.object('/foo/bar');
	const result = obj.value();
	if (!result) return λ.response('Oops!').code(500).text();
	return λ.response(result).json();
});

export const handler = λ.handler;
```

...will provide key/value storage, with option to `persist` via DynamoDB

```typescript
import { create } from 'lambda.ts';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const λ = create();
λ.route('/').get(async () => {
	try {
		const foo = await λ.key('foo', { persist: true, table: 'bar' });
		return λ.response(foo.value()).json();
	} catch (error) {
		return λ.response('Oops!').code(500).text();
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