import { DatabaseError, mapDataConnectError } from './errors.js';

const gql = (...codes: string[]) => ({
  code: 'data-connect/query-error',
  httpResponse: { status: 200, data: { errors: codes.map((code) => ({ message: 'secret: SELECT * FROM student', extensions: { code, debugDetails: 'pq: relation "student"' } })) } },
});

describe('mapDataConnectError', () => {
  it.each([
    [['PERMISSION_DENIED', 'ABORTED'], 'FORBIDDEN_REFERENCE', 403],
    [['ABORTED'], 'FORBIDDEN_REFERENCE', 403],
    [['ALREADY_EXISTS', 'ABORTED'], 'CONFLICT', 409], // a duplicate inside a rolled-back transaction is a conflict, not a tenant violation
    [['INVALID_ARGUMENT', 'ABORTED'], 'INVALID_ARGUMENT', 400],
    [['INVALID_ARGUMENT'], 'INVALID_ARGUMENT', 400],
    [['ALREADY_EXISTS'], 'CONFLICT', 409],
    [['SOMETHING_NEW'], 'INTERNAL', 500],
  ] as const)('%j -> %s (%i)', (codes, kind, status) => {
    const e = mapDataConnectError(gql(...codes));
    expect(e).toBeInstanceOf(DatabaseError);
    expect(e.kind).toBe(kind);
    expect(e.httpStatus).toBe(status);
  });

  it('maps an unreachable server to UNAVAILABLE (502)', () => {
    expect(mapDataConnectError({ code: 'app/network-error', message: 'connect ECONNREFUSED 127.0.0.1:9399' })).toMatchObject({ kind: 'UNAVAILABLE', httpStatus: 502 });
  });

  it('treats anything unrecognised as INTERNAL, never as success or as a client error', () => {
    for (const odd of [undefined, null, 'boom', new Error('x'), {}]) expect(mapDataConnectError(odd)).toMatchObject({ kind: 'INTERNAL', httpStatus: 500 });
  });

  it('never leaks the original message, SQL or reason; the cause is kept for the server log only', () => {
    const e = mapDataConnectError(gql('PERMISSION_DENIED'));
    expect(JSON.stringify({ message: e.message, name: e.name, kind: e.kind })).not.toMatch(/SELECT|student|relation|secret/);
    expect((e.cause as { code: string }).code).toBe('data-connect/query-error');
  });

  it('is idempotent on a DatabaseError', () => {
    const e = new DatabaseError('CONFLICT');
    expect(mapDataConnectError(e)).toBe(e);
  });
});
