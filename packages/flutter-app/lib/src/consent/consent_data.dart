import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_core/flutter_core.dart';

import '../services.dart';

const kConsentState = 'ConsentState';

/// Where the parent stands on the privacy notice (P6-5c). The school's answer is kept on the phone so the Parent app opens without a connection
/// after the first time; the school is asked again each time the app starts or comes back to the front, and a new notice version, or consent
/// withdrawn on another phone, closes the app's data at once. Agreeing and withdrawing need a connection: the school must hold the record,
/// because the school refuses a parent's data until it does.
class ConsentController extends ChangeNotifier {
  ConsentController(this.services);

  final OruServices services;

  /// Null while the first answer is awaited; true when the parent has consented to the notice in force.
  bool? current;
  Map<String, dynamic>? status;
  bool busy = false;

  /// Set when the last attempt failed (no connection, or the school refused); cleared by the next attempt.
  bool failed = false;
  bool _disposed = false;

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  void _tell() {
    if (!_disposed) notifyListeners();
  }

  Future<void> load() async {
    final cached = await services.store.record(kConsentState, 'me');
    if (cached != null) {
      status = cached;
      current = cached['current'] == true;
      _tell();
    }
    await refresh();
  }

  /// Asks the school. Offline keeps what the phone knows; with nothing known the parent is asked to agree (which needs a connection).
  Future<void> refresh() async {
    try {
      final s = (await services.api.consentStatus()).toJson();
      await _keep(s);
    } on OruApiError catch (_) {
      if (current == null) {
        current = false;
        _tell();
      }
    }
  }

  Future<void> _keep(Map<String, dynamic> s) async {
    await services.store.upsertRecords(kConsentState, [(id: 'me', parentId: null, json: s)]);
    status = s;
    final was = current;
    current = s['current'] == true;
    _tell();
    if (current == true && was != true) unawaited(services.coordinator.syncNow().catchError((Object _) {}));
  }

  /// Gives (true) or withdraws (false) consent to the notice the parent was shown. Returns whether the school kept it.
  Future<bool> record({required bool given, required int noticeVersion, required String language}) async {
    busy = true;
    failed = false;
    _tell();
    try {
      final s = (await services.api.consentRecord(body: RecordConsentDto(noticeVersion: noticeVersion, language: language, given: given))).toJson();
      await _keep(s);
      return true;
    } on OruApiError catch (_) {
      failed = true;
      return false;
    } finally {
      busy = false;
      _tell();
    }
  }
}
