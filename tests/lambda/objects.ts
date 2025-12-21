import { create } from '../../src/lambda.ts';

const λ = create();

λ.route('/foo').get(async (Δ) => {
	const fooObj = await λ.object('/foo');
	// const setObj = fooObj.value({
	// 	foo: 'bar',
	// });

	return λ.response(true).json();
});

export const handler = λ.handler;