import { create, response, responseJson } from '../../src/lambda.ts';

const λ = create();

λ.routeGet('/', () => {
	return responseJson('foo');
});

// Return 204 on OPTIONS request
λ.routeOptions('/foo', () => response(null, 204));

λ.routeGet('/foo', (Δ) => {
	// console.log(`pathData:`, Δ.pathData);
	// console.log(`queryData:`, Δ.queryData);
	// console.log(`querySpec:`, Δ.querySpec);
	return responseJson(Δ.pathData);
});

// λ.routeGet("/foo?s=[%s]", (Δ) => {
// 	console.log(`pathData:`, Δ.pathData);
// 	console.log(`queryData:`, Δ.queryData);
// 	console.log(`querySpec:`, Δ.querySpec);
// 	return responseJson(Δ.pathData);
// });

λ.routeGet("/foo/[s1:%d]/[s2:%s]", (Δ) => {
	// console.log(`pathData:`, Δ.pathData);
	// console.log(`queryData:`, Δ.queryData);
	// console.log(`querySpec:`, Δ.querySpec);
	return responseJson(Δ.pathData);
});

// λ.routeGet("/foo/[d:%d]/[s:%s]", (Δ) => {
// 	console.log(`pathData:`, Δ.pathData);
// 	console.log(`querySpec:`, Δ.querySpec);
// 	return responseJson(Δ.pathData);
// });

// λ.routeGet("/foo/[d:%d]", (Δ) => {
// 	console.log(`pathData:`, Δ.pathData);
// 	console.log(`querySpec:`, Δ.querySpec);
// 	return responseJson(Δ.pathData);
// });

λ.routeGet("/foo/[s:%s]", (Δ) => {
	// console.log(`pathData:`, Δ.pathData);
	// console.log(`queryData:`, Δ.queryData);
	// console.log(`querySpec:`, Δ.querySpec);
	return responseJson(Δ.pathData);
});

export const handler = λ.handler;