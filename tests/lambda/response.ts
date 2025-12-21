import { create } from '../../src/lambda.ts';

const λ = create();

λ.route('/basic').get(() => λ.response('foo').basic());
λ.route('/string').get(() => λ.response('foo').text());
λ.route('/json').get(() => λ.response({ foo: 'bar' }).json());
λ.route('/base64').get(() => λ.response('foo').base64());
λ.route('/html').get(() => λ.response().html());

export const handler = λ.handler;