import { create } from '../../src/lambda.ts';

const λ = create();

λ.route('/').get(() => λ.response('foo').basic());

// Return 204 on OPTIONS request
λ.route('/foo').options(() => λ.response().code(204).basic());

λ.route('/foo').get((Δ) => λ.response(Δ.pathData).json());
// λ.route("/foo?s=[%s]").get((Δ) => λ.response(Δ.pathData).json());
λ.route("/foo/[s1:%d]/[s2:%s]").get((Δ) => λ.response(Δ.pathData).json());
λ.route("/foo/[d:%d]/[s:%s]").get((Δ) => λ.response(Δ.pathData).json());
// λ.route("/foo/[d:%d]").get((Δ) => λ.response(Δ.pathData).json());
λ.route("/foo/[s:%s]").get((Δ) => λ.response(Δ.pathData).json());

export const handler = λ.handler;