import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_test/flutter_test.dart';

class FakePort implements DeviceLockPort {
  bool available = true;
  bool passes = true;
  int asked = 0;
  @override
  Future<bool> isAvailable() async => available;
  @override
  Future<bool> authenticate() async {
    asked++;
    return passes;
  }
}

void main() {
  int now = 0;
  late FakePort port;
  late MemorySecureStorage storage;
  late AppLock lock;
  setUp(() {
    now = 1000;
    port = FakePort();
    storage = MemorySecureStorage();
    lock = AppLock(port: port, storage: storage, graceMs: 60000, nowMs: () => now);
  });

  test('off by default: nothing is ever locked', () async {
    await lock.restore();
    lock.onBackgrounded();
    now += 3600 * 1000;
    lock.onResumed();
    expect(lock.locked, isFalse);
  });

  test('it can only be turned on by someone who passes the phone\'s check, and not on a phone with no lock', () async {
    port.passes = false;
    expect(await lock.enable(), isFalse);
    expect(lock.enabled, isFalse);
    port.passes = true;
    port.available = false;
    expect(await lock.enable(), isFalse);
    port.available = true;
    expect(await lock.enable(), isTrue);
    expect(storage.values['appLockEnabled'], 'true');
  });

  test('a short trip to the background does not lock; a long one does; unlocking needs the phone\'s check', () async {
    await lock.enable();
    lock.onBackgrounded();
    now += 10000;
    lock.onResumed();
    expect(lock.locked, isFalse);
    lock.onBackgrounded();
    now += 61000;
    lock.onResumed();
    expect(lock.locked, isTrue);
    port.passes = false;
    expect(await lock.unlock(), isFalse);
    expect(lock.locked, isTrue);
    port.passes = true;
    expect(await lock.unlock(), isTrue);
    expect(lock.locked, isFalse);
  });

  test('a clock set backwards while away locks (it never opens)', () async {
    await lock.enable();
    lock.onBackgrounded();
    now -= 500000;
    lock.onResumed();
    expect(lock.locked, isTrue);
  });

  test('closed with the lock on, the app starts locked', () async {
    await lock.enable();
    final again = AppLock(port: port, storage: storage, nowMs: () => now);
    await again.restore();
    expect(again.locked, isTrue);
  });

  test('a phone whose screen lock was removed does not lock the person out of their own work: the lock switches itself off', () async {
    await lock.enable();
    port.available = false;
    final again = AppLock(port: port, storage: storage, nowMs: () => now);
    await again.restore();
    expect(again.locked, isFalse);
    expect(again.enabled, isFalse);
    expect(storage.values['appLockEnabled'], isNull);
  });

  test('turning it off unlocks', () async {
    await lock.enable();
    lock.onBackgrounded();
    now += 99999;
    lock.onResumed();
    await lock.disable();
    expect(lock.locked, isFalse);
  });
}
