// Rule no-tracking-sdks (P6-5b, documentation/modules/children-data-protection.md, E-PRIV-1): no advertising or third-party analytics SDK in any app or package. A child's data must never reach an
// advertiser or an analytics vendor, so the build fails if one is added. Error reporting that carries no usage data is a separate question and not covered here.

/** Packages (npm names and pub.dev names) that are advertising, attribution or product-analytics SDKs. */
export const TRACKING_PACKAGES = [
  // advertising
  "google_mobile_ads", "react-native-google-mobile-ads", "@react-native-firebase/admob", "unity_ads_plugin", "applovin_max", "facebook_audience_network", "react-google-adsense",
  // attribution and marketing analytics
  "appsflyer_sdk", "appsflyer-react-native", "adjust_sdk", "adjust-sdk", "branch_sdk", "flutter_branch_sdk", "singular_flutter_sdk", "kochava",
  // product analytics
  "mixpanel_flutter", "mixpanel-browser", "mixpanel", "@segment/analytics-next", "@segment/analytics-node", "analytics-node", "segment_analytics", "amplitude_flutter", "@amplitude/analytics-browser", "amplitude-js",
  "posthog_flutter", "posthog-js", "posthog-node", "firebase_analytics", "google_analytics", "@vercel/analytics", "@next/third-parties", "react-ga", "react-ga4", "ga-4-react", "heap-api", "@hotjar/browser", "hotjar",
  "fullstory", "@fullstory/browser", "logrocket", "clevertap_plugin", "onesignal_flutter", "braze_plugin", "intercom_flutter",
];

/** The names in a package.json or pubspec.yaml that are tracking SDKs. */
export function trackingPackagesIn(manifestText) {
  const found = new Set();
  for (const name of TRACKING_PACKAGES) {
    const escaped = name.replace(/[-/@.]/g, "\\$&");
    // package.json: "name": ...   pubspec.yaml:   name: ^1.0.0 (at the start of a line, indented)
    if (new RegExp(`["']${escaped}["']\\s*:`).test(manifestText) || new RegExp(`^\\s+${escaped}\\s*:`, "m").test(manifestText)) found.add(name);
  }
  return [...found];
}

/** Script tags and calls that load an analytics or advertising tag, in source or HTML. Returns the markers found. */
const MARKERS = [
  [/googletagmanager\.com/i, "Google Tag Manager"],
  [/google-analytics\.com|\bgtag\s*\(/i, "Google Analytics"],
  [/connect\.facebook\.net|\bfbq\s*\(/i, "Meta pixel"],
  [/static\.hotjar\.com|\bhj\s*\(\s*['"]/i, "Hotjar"],
  [/cdn\.segment\.com|\banalytics\.(?:track|identify|page)\s*\(/i, "Segment"],
  [/cdn\.amplitude\.com|\bamplitude\.(?:getInstance|init)\s*\(/i, "Amplitude"],
  [/(?:app|eu)\.posthog\.com|\bposthog\.(?:init|capture)\s*\(/i, "PostHog"],
  [/api\.mixpanel\.com|\bmixpanel\.(?:init|track)\s*\(/i, "Mixpanel"],
  [/pagead2\.googlesyndication\.com|doubleclick\.net/i, "Google advertising"],
];
export function trackingMarkersIn(text) {
  return MARKERS.filter(([re]) => re.test(text)).map(([, name]) => name);
}
