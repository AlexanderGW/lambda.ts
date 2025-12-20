import { create, objectGet, responseJson, objectSet } from '../../src/lambda.ts';

const λ = create();

λ.routeGet('/foo', async (Δ) => {
	const getObj = await objectGet('/foo');
	const setObj = await objectSet('/foo', {
		foo: 'bar',
	});
	return responseJson(getObj);
});

export const handler = λ.handler;