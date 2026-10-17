import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { ErrorCode } from '../common/errors.js';
import { operationKey } from '../common/operation-key.js';
import type { RouteFacts } from '../permission/route-decision.check.js';

type Json = Record<string, any>;

const ERROR_RESPONSES: Record<string, string> = {
  '400': 'The request is not valid (unknown or invalid fields, or a missing or malformed X-School-Id).',
  '401': 'No valid sign-in.',
  '403': 'Not allowed: the caller is not an active member of the school, or lacks the permission, or a record rule refused it. The answer never says which.',
  '404': 'Not found (also what an unusable public name or another school\'s record looks like).',
  '429': 'Too many requests.',
  '500': 'Something went wrong on the server.',
};

/**
 * The public contract, derived from the registered routes. Everything security relevant is written from the same
 * decorators the guards enforce (@Public, @UserScoped, @Platform, @Permission, @Audit), so the document cannot
 * drift from the behaviour: a route is `security: []` only if it is @Public.
 */
export function buildOpenApi(app: INestApplication, routes: readonly RouteFacts[]): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('OruSchools API')
    .setDescription('Multi-tenant school ERP gateway. Every route except the public ones needs a Firebase ID token; school routes also need X-School-Id.')
    .setVersion('1')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'Firebase ID token' }, 'bearer')
    .build();
  const doc = SwaggerModule.createDocument(app, config, { operationIdFactory: (controllerKey, methodKey) => operationKey(controllerKey, methodKey) });

  const byKey = new Map(routes.map((r) => [r.operationKey, r] as const));
  const components = (doc.components ??= {}) as Json;
  components['schemas'] = {
    ...components['schemas'],
    ErrorEnvelope: {
      type: 'object',
      required: ['error'],
      properties: {
        error: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: { type: 'string', enum: Object.values(ErrorCode), description: 'Machine-readable; clients localise the text from it.' },
            message: { type: 'string', description: 'English fallback text.' },
            requestId: { type: 'string' },
            details: { type: 'array', items: { type: 'object', required: ['field', 'rule'], properties: { field: { type: 'string' }, rule: { type: 'string' } } }, description: 'Field and rule names only, never the submitted values.' },
          },
        },
      },
    },
  };
  components['responses'] = Object.fromEntries(
    Object.entries(ERROR_RESPONSES).map(([status, description]) => [`Error${status}`, { description, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } }]),
  );
  components['parameters'] = { SchoolId: { name: 'X-School-Id', in: 'header', required: true, description: 'The school the request acts in. Checked against the caller\'s active membership; never trusted on its own.', schema: { type: 'string', format: 'uuid' } } };

  for (const [path, item] of Object.entries(doc.paths as Json)) {
    for (const [method, op] of Object.entries(item as Json)) {
      if (typeof op !== 'object' || !op?.operationId) continue;
      const facts = byKey.get(op.operationId);
      if (!facts) throw new Error(`OpenAPI operation ${method.toUpperCase()} ${path} (${op.operationId}) has no matching registered route`);

      const kind = facts.isPublic ? 'public' : facts.scope === 'user' ? 'user' : facts.scope === 'platform' ? 'platform' : 'tenant';
      op['x-access'] = kind;
      if (facts.permission) op['x-permission'] = { resource: facts.permission.resource, action: facts.permission.action };
      if (facts.audit) op['x-audit'] = { action: facts.audit.action, operation: facts.audit.operation };
      op.security = kind === 'public' ? [] : [{ bearer: [] }];
      const own: Json[] = Array.isArray(op.parameters) ? op.parameters : [];
      if (kind === 'tenant') op.parameters = [{ $ref: '#/components/parameters/SchoolId' }, ...own];

      const wanted = [...(facts.skipsThrottle ? [] : ['429']), '500', ...(kind === 'public' ? [] : ['401', '403']), ...(kind === 'tenant' || op.requestBody || (op.parameters ?? []).length ? ['400'] : []), ...((op.parameters ?? []).some((p: Json) => p.in === 'path') ? ['404'] : [])];
      op.responses = { ...op.responses };
      for (const status of wanted) op.responses[status] ??= { $ref: `#/components/responses/Error${status}` };
    }
  }
  return doc;
}

/** Deterministic text: object keys sorted at every level (array order is meaningful and kept). */
export function stableStringify(value: unknown): string {
  const sort = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v as Json).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, x]) => [k, sort(x)])) : v;
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}
