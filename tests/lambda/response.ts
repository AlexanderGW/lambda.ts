import { create, response, responseBase64, responseHtml, responseJson, responseText } from '../../src/lambda.ts';

const λ = create();

λ.routeGet('/basic', () => response('foo'));
λ.routeGet('/string', () => responseText('foo'));
λ.routeGet('/json', () => responseJson({ foo: 'bar' }));
λ.routeGet('/base64', () => responseBase64('foo'));
λ.routeGet('/html', () => responseHtml());

export const handler = λ.handler;