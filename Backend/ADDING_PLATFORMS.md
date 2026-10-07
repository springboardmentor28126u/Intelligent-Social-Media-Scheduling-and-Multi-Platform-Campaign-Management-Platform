# Provider extension guide

Facebook, Instagram, LinkedIn, X and YouTube are already implemented. Current setup is documented in PLATFORM_SETUP.md and OAUTH_CALLBACK_CHECKLIST.md. Supply configuration through the process environment; protected dotenv files are not loaded.

To add another provider such as Pinterest, implement its OAuth entry/profile lookup, encrypted credential handling, publishing adapter, validation/media rules, metrics/audience adapter, frontend labels/account controls/previews, and regression tests. Test callback binding, refresh/reconnect, ownership, rate limits and uncertain publishing outcomes before enabling it. Reuse campaign/report aggregation where applicable.

LinkedIn/X support text and single images; YouTube supports video URL uploads. Do not describe these as live-verified based only on mocked tests. Provider approvals and paid API access may still be necessary.
