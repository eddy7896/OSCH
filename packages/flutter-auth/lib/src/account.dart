import 'dart:convert';

import 'package:flutter_core/flutter_core.dart';

/// One school a person can open in this app, with the role they hold there.
class SchoolChoice {
  const SchoolChoice({required this.id, required this.name, required this.subDomain, required this.role, required this.defaultLanguage});

  factory SchoolChoice.fromJson(Map<String, dynamic> j) => SchoolChoice(
        id: j['id'] as String,
        name: j['name'] as String,
        subDomain: j['subDomain'] as String,
        role: j['role'] as String,
        defaultLanguage: j['defaultLanguage'] as String,
      );

  final String id;
  final String name;
  final String subDomain;
  final String role;
  final String defaultLanguage;

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'subDomain': subDomain, 'role': role, 'defaultLanguage': defaultLanguage};
}

/// Who is signed in, as `GET /v1/me` last said, kept on the device so the app can name the person and the school offline.
class Account {
  const Account({required this.userId, required this.email, required this.displayName, required this.schools});

  factory Account.fromJson(Map<String, dynamic> j) => Account(
        userId: j['userId'] as String,
        email: j['email'] as String,
        displayName: j['displayName'] as String?,
        schools: [for (final s in j['schools'] as List<dynamic>) SchoolChoice.fromJson(s as Map<String, dynamic>)],
      );

  /// Built from the gateway's answer. Only active memberships of active schools count: a suspended school or a revoked
  /// membership is not offered.
  factory Account.fromMe(MeResponseDto me) => Account(
        userId: me.user.id,
        email: me.user.email,
        displayName: me.user.displayName,
        schools: [
          for (final m in me.memberships)
            if (m.status == 'ACTIVE' && m.school.status == 'ACTIVE')
              SchoolChoice(id: m.school.id, name: m.school.name, subDomain: m.school.subDomain, role: m.role, defaultLanguage: m.school.defaultLanguage),
        ],
      );

  final String userId;
  final String email;
  final String? displayName;
  final List<SchoolChoice> schools;

  /// The schools this app can open: where the role is one the app is for (teacher app: Teacher; staff app: the other staff roles).
  List<SchoolChoice> schoolsFor(Set<String> allowedRoles) => [for (final s in schools) if (allowedRoles.contains(s.role)) s];

  SchoolChoice? school(String id) {
    for (final s in schools) {
      if (s.id == id) return s;
    }
    return null;
  }

  String encode() => jsonEncode({'userId': userId, 'email': email, 'displayName': displayName, 'schools': [for (final s in schools) s.toJson()]});
  static Account decode(String s) => Account.fromJson(jsonDecode(s) as Map<String, dynamic>);
}

/// Asks the gateway who the token belongs to.
typedef AccountSource = Future<Account> Function(String idToken);

/// The real [AccountSource]: `GET /v1/me` through the generated client.
AccountSource gatewayAccountSource(Uri baseUrl, {OruTransport Function(String token)? transportFor}) => (token) async {
      final transport = transportFor?.call(token) ?? OruHttpTransport(baseUrl: baseUrl, getToken: (_) => token);
      return Account.fromMe(await OruApi(transport).meGet());
    };
