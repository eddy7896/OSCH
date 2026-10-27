#!/usr/bin/env node
// Generates the Dart client for the mobile apps from the gateway's committed OpenAPI contract (apps/api-gateway/openapi.json):
//   node scripts/generate-dart.mjs           writes packages/flutter-core/lib/src/api/generated
//   node scripts/generate-dart.mjs --check   regenerates in memory and fails if the committed files differ (part of `npm test`)
//
// Only the operations listed in scripts/dart-operations.json are generated (what the phone apps call), with every model they
// reach. The transport (token, school header, retry, errors) is hand-written in flutter-core; this file generates the typed
// part, so a change to a DTO or route in the contract changes Dart code, never silently drifts from it.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SPEC = resolve(HERE, '../../../apps/api-gateway/openapi.json');
const OPS = resolve(HERE, 'dart-operations.json');
const OUT = resolve(HERE, '../../flutter-core/lib/src/api/generated');
const check = process.argv.includes('--check');

const spec = JSON.parse(readFileSync(SPEC, 'utf8'));
const wanted = JSON.parse(readFileSync(OPS, 'utf8'));
const schemas = spec.components.schemas;
const HEADER_REFS = new Set(['#/components/parameters/SchoolId', '#/components/parameters/ActiveSchoolId']);

const KEYWORDS = new Set(['abstract', 'as', 'assert', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'do', 'dynamic', 'else', 'enum', 'extends', 'extension', 'external', 'factory', 'false', 'final', 'finally', 'for', 'get', 'if', 'implements', 'import', 'in', 'is', 'late', 'library', 'mixin', 'new', 'null', 'on', 'operator', 'part', 'required', 'rethrow', 'return', 'set', 'show', 'static', 'super', 'switch', 'sync', 'this', 'throw', 'true', 'try', 'typedef', 'var', 'void', 'while', 'with', 'yield']);
const ident = (n) => {
  const s = n.replace(/[^A-Za-z0-9_$]/g, '_');
  return KEYWORDS.has(s) || /^[0-9]/.test(s) ? `${s}_` : s;
};
const pascal = (s) => s.replace(/(^|[^A-Za-z0-9]+)([A-Za-z0-9])/g, (_, __, c) => c.toUpperCase());
const camel = (s) => {
  const p = pascal(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
};
const refName = (r) => r.split('/').pop();

// ---- operations -------------------------------------------------------------------------------------------------------
const ops = [];
for (const [path, item] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(item)) {
    if (wanted.includes(op.operationId)) ops.push({ method: method.toUpperCase(), path, op });
  }
}
const missing = wanted.filter((id) => !ops.some((o) => o.op.operationId === id));
if (missing.length) throw new Error(`dart-operations.json names operations that are not in the contract: ${missing.join(', ')}`);
ops.sort((a, b) => a.op.operationId.localeCompare(b.op.operationId));

// ---- schema to Dart type ---------------------------------------------------------------------------------------------
const classes = new Map(); // dart name -> { schema, doc }
const reachable = (name) => {
  if (classes.has(name)) return;
  classes.set(name, schemas[name]);
  collect(schemas[name], name);
};
function resolveSchema(s) {
  // `allOf: [ {$ref} ]` (nullable reference) is the same as the reference.
  if (s.allOf && s.allOf.length === 1) return { ...resolveSchema(s.allOf[0]), nullable: s.nullable ?? s.allOf[0].nullable };
  return s;
}
function collect(s, hint) {
  s = resolveSchema(s);
  if (s.$ref) return reachable(refName(s.$ref));
  if (s.type === 'array') return collect(s.items, `${hint}Item`);
  if (s.type === 'object' && s.properties) {
    for (const [k, v] of Object.entries(s.properties)) collect(v, hint + pascal(k));
    if (!s.$ref && !classes.has(hint)) classes.set(hint, s);
  } else if (s.additionalProperties && typeof s.additionalProperties === 'object') collect(s.additionalProperties, `${hint}Value`);
}

/** Dart type of a schema (non-null part) and the code to read and write it. `hint` names inline objects. */
function typeOf(s, hint) {
  s = resolveSchema(s);
  if (s.$ref) return { dart: refName(s.$ref), read: (v) => `${refName(s.$ref)}.fromJson(${v} as Map<String, dynamic>)`, write: (v) => `${v}.toJson()` };
  switch (s.type) {
    case 'string': return { dart: 'String', read: (v) => `${v} as String`, write: (v) => v };
    case 'number': return { dart: 'num', read: (v) => `${v} as num`, write: (v) => v };
    case 'integer': return { dart: 'int', read: (v) => `${v} as int`, write: (v) => v };
    case 'boolean': return { dart: 'bool', read: (v) => `${v} as bool`, write: (v) => v };
    case 'array': {
      const t = nullable(s.items, `${hint}Item`);
      return { dart: `List<${t.dart}>`, read: (v) => `(${v} as List<dynamic>).map((e) => ${t.read('e')}).toList()`, write: (v) => `${v}.map((e) => ${t.write('e')}).toList()` };
    }
    case 'object': {
      if (s.properties) return { dart: hint, read: (v) => `${hint}.fromJson(${v} as Map<String, dynamic>)`, write: (v) => `${v}.toJson()` };
      if (s.additionalProperties && typeof s.additionalProperties === 'object') {
        const t = nullable(s.additionalProperties, `${hint}Value`);
        return { dart: `Map<String, ${t.dart}>`, read: (v) => `(${v} as Map<String, dynamic>).map((k, e) => MapEntry(k, ${t.read('e')}))`, write: (v) => `${v}.map((k, e) => MapEntry(k, ${t.write('e')}))` };
      }
      return { dart: 'Map<String, dynamic>', read: (v) => `${v} as Map<String, dynamic>`, write: (v) => v };
    }
    default: throw new Error(`unsupported schema in ${hint}: ${JSON.stringify(s).slice(0, 120)}`);
  }
}
/** Like typeOf, but a nullable schema reads null as null (used for list elements and map values). */
function nullable(s, hint) {
  const rs = resolveSchema(s);
  const t = typeOf(rs, hint);
  if (!rs.nullable) return t;
  return { dart: `${t.dart}?`, read: (v) => `${v} == null ? null : ${t.read(v)}`, write: (v) => `${v} == null ? null : ${t.write(v)}` };
}

// ---- collect the models the operations reach -----------------------------------------------------------------------------
const bodyOf = (op) => op.requestBody?.content?.['application/json']?.schema;
const okOf = (op) => {
  const r = op.responses['200'] ?? op.responses['201'];
  return r?.content?.['application/json']?.schema;
};
for (const { op } of ops) {
  const b = bodyOf(op);
  if (b) collect(b, `${pascal(op.operationId)}Body`);
  const r = okOf(op);
  if (r) collect(r, `${pascal(op.operationId)}Result`);
}

// ---- emit models -----------------------------------------------------------------------------------------------------------
const header = (what) => `// GENERATED by packages/api-client/scripts/generate-dart.mjs from apps/api-gateway/openapi.json (${what}).\n// Do not edit by hand: run \`npm run generate:dart -w @oruschools/api-client\`.\n// ignore_for_file: public_member_api_docs, unnecessary_cast, unnecessary_null_comparison, use_null_aware_elements\n`;

function emitClass(name, s) {
  s = resolveSchema(s);
  const required = new Set(s.required ?? []);
  const props = Object.entries(s.properties ?? {}).map(([key, ps]) => {
    const rps = resolveSchema(ps);
    const t = typeOf(rps, name + pascal(key));
    const isNull = !required.has(key) || rps.nullable === true;
    return { key, field: ident(camel(key)), t, isNull, req: required.has(key), enumValues: rps.enum, doc: rps.description };
  });
  const out = [];
  if (s.description) out.push(`/// ${s.description.replace(/\n/g, ' ')}`);
  out.push(`class ${name} {`);
  out.push(props.length ? `  const ${name}({${props.map((p) => `${p.req ? 'required ' : ''}this.${p.field}`).join(', ')}});` : `  const ${name}();`);
  for (const p of props) {
    if (p.doc) out.push(`  /// ${p.doc.replace(/\n/g, ' ')}`);
    if (p.enumValues) out.push(`  /// One of: ${p.enumValues.join(', ')}.`);
    out.push(`  final ${p.t.dart}${p.isNull ? '?' : ''} ${p.field};`);
  }
  out.push('');
  out.push(`  factory ${name}.fromJson(Map<String, dynamic> j) => ${name}(`);
  for (const p of props) {
    const v = `j['${p.key}']`;
    out.push(`        ${p.field}: ${p.isNull ? `${v} == null ? null : ${p.t.read(v)}` : p.t.read(v)},`);
  }
  out.push('      );');
  out.push('');
  out.push('  Map<String, dynamic> toJson() => {');
  for (const p of props) {
    const v = p.field;
    out.push(p.isNull ? `        if (${v} != null) '${p.key}': ${p.t.write(`${v}!`)},` : `        '${p.key}': ${p.t.write(v)},`);
  }
  out.push('      };');
  out.push('}');
  return out.join('\n');
}

const names = [...classes.keys()].sort();
const models = [header('models'), ...names.map((n) => emitClass(n, classes.get(n)))].join('\n\n') + '\n';

// ---- emit the api --------------------------------------------------------------------------------------------------------
const api = [];
api.push(header('operations'));
api.push(`import '../api_transport.dart';\nimport 'models.g.dart';\n`);
api.push(`/// One entry per generated operation: how the transport must treat it.\nconst List<OruRoute> kOruRoutes = [`);
const routeConst = (op) => `_r${pascal(op.operationId)}`;
for (const { op } of ops) api.push(`  ${routeConst(op)},`);
api.push('];\n');
for (const { method, path, op } of ops) api.push(`const ${routeConst(op)} = OruRoute('${method}', '${path}', OruAccess.${op['x-access']}, '${op.operationId}');`);
api.push('');
api.push('/// The operations the phone apps call, as typed methods. Every method throws an [OruApiError] on failure.');
api.push('class OruApi {\n  const OruApi(this._t);\n\n  final OruTransport _t;\n');
for (const { method, path, op } of ops) {
  const params = (op.parameters ?? []).filter((p) => !HEADER_REFS.has(p.$ref));
  const pathParams = params.filter((p) => p.in === 'path');
  const queryParams = params.filter((p) => p.in === 'query');
  const body = bodyOf(op);
  const result = okOf(op);
  const rt = result ? nullable(result, `${pascal(op.operationId)}Result`) : null;
  const bt = body ? typeOf(body, `${pascal(op.operationId)}Body`) : null;
  const args = [];
  for (const p of pathParams) args.push(`required String ${ident(camel(p.name))}`);
  if (bt) args.push(`required ${bt.dart} body`);
  for (const p of queryParams) {
    const t = typeOf(p.schema, 'Query');
    args.push(`${p.required ? 'required ' : ''}${t.dart}${p.required ? '' : '?'} ${ident(camel(p.name))}`);
  }
  const sig = args.length ? `{${args.join(', ')}}` : '';
  let urlPath = path.replace(/\{(\w+)\}/g, (_, n) => `\${Uri.encodeComponent(${ident(camel(n))})}`);
  const doc = op.summary ? `  /// ${op.summary}\n` : '';
  const q = queryParams.length ? `, query: {${queryParams.map((p) => `'${p.name}': ${ident(camel(p.name))}`).join(', ')}}` : '';
  const route = routeConst(op);
  const call = `_t.send(${route}, "${urlPath}"${q}${bt ? `, body: ${bt.write('body')}` : ''})`;
  const name = ident(camel(op.operationId));
  api.push(doc + `  /// ${method} ${path}`);
  if (rt) api.push(`  Future<${rt.dart}> ${name}(${sig}) async {\n    final j = await ${call};\n    return ${rt.read('j')};\n  }\n`);
  else api.push(`  Future<void> ${name}(${sig}) async {\n    await ${call};\n  }\n`);
}
api.push('}\n');

// ---- error codes -----------------------------------------------------------------------------------------------------------
const codes = schemas.ErrorEnvelope.properties.error.properties.code.enum;
const errorCodes = [
  header('error codes'),
  `/// The machine codes the gateway sends in its error envelope. Screens translate by code; the English message is a fallback only.`,
  `const List<String> kGatewayErrorCodes = [${codes.map((c) => `'${c}'`).join(', ')}];\n`,
].join('\n');

const files = { 'models.g.dart': models, 'api.g.dart': api.join('\n'), 'error_codes.g.dart': errorCodes };

if (check) {
  const stale = Object.entries(files).filter(([f, text]) => !existsSync(join(OUT, f)) || readFileSync(join(OUT, f), 'utf8') !== text).map(([f]) => f);
  if (stale.length) {
    console.error(`packages/flutter-core/lib/src/api/generated is out of date with apps/api-gateway/openapi.json or dart-operations.json (${stale.join(', ')}). Run: npm run generate:dart -w @oruschools/api-client, and commit the result.`);
    process.exit(1);
  }
  console.log('api-client (dart): generated code is current');
} else {
  mkdirSync(OUT, { recursive: true });
  for (const [f, text] of Object.entries(files)) writeFileSync(join(OUT, f), text);
  console.log(`api-client (dart): wrote ${ops.length} operations and ${names.length} models to packages/flutter-core/lib/src/api/generated`);
}
