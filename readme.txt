=== Garage Door Science — Diagnostic Chat ===
Contributors: sethshoultes
Tags: garage door, ai, chat, diagnostic, widget, homeowner
Requires at least: 6.0
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 0.1.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Embed a garage-door diagnostic AI widget on any WordPress page via [gds-diagnose]. Powered by garagedoorscience.com's public API.

== Description ==

A lightweight chat widget that lets homeowners describe a garage-door problem and receive likely causes, cost ranges, and safety flags. Powered by the public API at garagedoorscience.com.

**Drop-in on any page:**

`[gds-diagnose]`

Optional attributes override the default copy:

`[gds-diagnose heading="Having trouble?" lede="Describe the issue." cta="Check it"]`

**What it does:**

* Accepts a plain-English description of a garage-door problem
* Calls `POST /api/v1/diagnose` against garagedoorscience.com
* Renders likely issues with cost ranges, urgency, and "call a pro" safety flags
* Works without any API key on the public tier (60 calls/min per visitor IP, 2,000/day)

**Who this is for:**

* Garage-door service companies who want a diagnostic Q&A on their own website
* Home-service directories
* Real estate and property management sites offering value-adds to tenants

**Not included in this version (v0.1.0):**

* A Gutenberg block (shortcode only for now — block is planned for v0.2)
* Partner routing (`routeByZip`) — shortcode and block coming
* Conversation history / session persistence (this is single-shot diagnosis)
* Lead-capture integration with your CRM

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/` or install via the WP admin Plugins → Add New → Upload
2. Activate the plugin
3. (Optional) Settings → GDS Chat → paste a `gds_live_` key to use the pro tier
4. Drop `[gds-diagnose]` into any page or post

== Frequently Asked Questions ==

= Do I need an API key? =

No. The widget works out of the box using the public tier (60 calls/min per visitor IP, 2,000/day). Paste a `gds_live_` key in Settings only if you want the pro tier (4x rate limits, deeper retrieval). Grab one free at [garagedoorscience.com/developers](https://garagedoorscience.com/developers).

= Will visitors see my API key? =

Yes, if you paste one in the settings. The widget runs client-side, so any API key in the config is visible in page source. **Only use keys for public read-only tiers. Never paste a write-scoped key here.**

= Can I change the colors? =

Yes. Settings → GDS Chat → Accent color. Or target `.gds-widget` in your theme CSS and override the CSS custom properties (`--gds-accent`, `--gds-text`, etc.)

= What data does the widget send? =

Only the text the visitor types in the diagnostic field. Nothing else. No cookies, no tracking, no personal info. See [garagedoorscience.com/privacy](https://garagedoorscience.com/privacy).

= Is this for homeowners or contractors? =

Both. A contractor can embed the widget on their own site to give visitors an AI diagnostic before they book a service call. A homeowner-facing content site can embed it to deepen their articles with interactive diagnostics.

== Changelog ==

= 0.1.0 =
* Initial release. Shortcode `[gds-diagnose]` with optional attribute overrides. Settings page for API key, accent color, and default copy.

== Source ==

Developed in the open at [github.com/sethshoultes/wp-garagedoorscience](https://github.com/sethshoultes/wp-garagedoorscience). Issues, PRs, forks welcome.
