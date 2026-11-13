# v2rayN Web API contract

This document describes the HTTP contract consumed by Nova. The authoritative implementation is
the `v2rayN.WebAPI` backend (`Api/`, `Contracts/`, `Security/`, `Services/`); Nova never invents
fields or enumerations that the backend does not expose.

The contract is intentionally stable:

- JSON field names, operation codes, event names and state codes are identifiers.
- Human-readable text and localization belong to the client. The API returns `messageKey` values,
  not translated prose.
- User-supplied remarks, URLs, filters and log lines are data and are never interpreted as HTML.
- The API does not host a WebUI and does not serve non-API routes.

All paths below are relative to the configured API base URL (for example
`http://127.0.0.1:5080`). The base URL must not include `/api`.

## 1. Transport conventions

| Item | Contract |
| --- | --- |
| Protocol | HTTP/1.1 or HTTP/2; HTTPS is strongly recommended for anything beyond loopback |
| Media type | `application/json; charset=utf-8` for JSON requests and responses |
| Property names | `camelCase` |
| Enums | Camel-case strings; enum members that contain underscores keep them, for example `"xray"`, `"sing_box"`, `"v2fly_v5"`, `"vless"`, `"realping"` |
| Timestamps | ISO 8601 strings for `DateTimeOffset`; Unix seconds for subscription `updateTime` |
| Authentication | `Authorization: Bearer <session-token>` on every protected route |
| Cookies | Not used |
| Redirects | Not required; clients should disable automatic redirects so credentials cannot be forwarded |
| Unknown API route | `404` with `{ "success": false, "code": "route_not_found", "messageKey": "errors.routeNotFound", "data": null }` |

A request that is not JSON, or a JSON body that cannot be bound, returns `400` with
`code: "json_invalid"` or `code: "request_invalid"` and `messageKey: "errors.invalidInput"`.

### 1.1 Response envelopes

Synchronous reads use one envelope shape:

```ts
interface ApiEnvelope<T> {
  success: boolean
  code: string          // "ok" on success; a stable machine code on failure
  messageKey: string    // stable localization key, e.g. "status.loaded"
  data: T | null
}
```

State-changing routes normally return an operation view:

```ts
interface OperationView<D = unknown> {
  success: boolean
  code: string
  messageKey: string
  data?: D
}
```

Some endpoints are deliberately different and are called out in the reference below:

- `POST /api/auth/login` and `POST /api/auth/logout` return compact auth objects.
- `POST /api/setup` and `GET /api/setup/status` return their own objects, not envelopes.
- `GET /api/health` returns `{ "status": "ok" }`.
- Subscription create/update return `SubscriptionMutationResult`.
- `GET /api/backup/download` returns a binary attachment.

### 1.2 HTTP status codes

| Status | Meaning |
| --- | --- |
| `200 OK` | Read or synchronous operation completed. A check endpoint may still return `success: false` |
| `201 Created` | Subscription created; `Location` points at the new resource |
| `202 Accepted` | Background work started (subscription update, speed test, backup restore, Core/Geo update, API self-update) |
| `400 Bad Request` | Invalid input, validation failure or ordinary operation failure |
| `401 Unauthorized` | Missing/invalid session token, invalid Management Key, or consumed SSE ticket |
| `403 Forbidden` | First-run setup from a non-local request, or an Origin rejected by the CORS guard (`origin_not_allowed`) |
| `404 Not Found` | Missing resource, missing Core template/profile/DNS/routing target, or unknown `/api` route |
| `409 Conflict` | Busy runtime, wrong lifecycle state, or update already running |
| `413 Payload Too Large` | Auth/setup body above 64 KiB, or backup upload above the documented limit |
| `429 Too Many Requests` | Login/setup rate limit; see `Retry-After` |
| `500 Internal Server Error` | Unhandled backend failure (`code: "internal_error"`) |
| `503 Service Unavailable` | Request cancelled or the host is shutting down |

Operation failures use `400` by default. Endpoints that document `404` or `409` use those codes
for the corresponding conditions. Update-check endpoints always answer `200`; inspect
`success`/`code` in the envelope.

### 1.3 Request limits

- `POST /api/auth/login` and `POST /api/setup`: 64 KiB body limit; larger requests return `413`
  with `code: "payload_too_large"`.
- `POST /api/backup/restore`: 64 MiB file limit; the multipart request itself is limited to
  65 MiB. Invalid size returns an operation failure (`backup_file_empty` or
  `backup_archive_too_large`).
- Login is limited to 5 requests per minute per client IP; setup is limited to 10 per minute.
  Loopback clients share one bucket. A rejected request returns `429` and `Retry-After` seconds.

## 2. Authentication and first-run setup

The Management Key is exchanged **once** at `POST /api/auth/login`. It is never accepted as a REST
Bearer token and never used for SSE. The API stores only a hash of a locally configured key and
never returns the key.

Session behaviour:

| Property | Value |
| --- | --- |
| Token | 32 random bytes, base64url encoded (43 characters) |
| Sliding lifetime | 7 days, renewed by authenticated REST calls |
| Absolute lifetime | 30 days from creation |
| Revocation | `POST /api/auth/logout` revokes the token and closes its SSE streams |
| SSE ticket | 32 random bytes, base64url, one-time use, 45-second lifetime |

### 2.1 Setup status

`GET /api/setup/status` — public.

```ts
interface SetupStatus {
  setupRequired: boolean              // no environment key and no stored key
  environmentKeyConfigured: boolean   // V2RAYN_WEB_API_KEY is set
  setupAllowedFromThisRequest: boolean
}
```

`setupAllowedFromThisRequest` is true only for a direct loopback peer using a `localhost` /
loopback `Host`, with no forwarding headers, and a same-origin (or origin-less native) request.
`GET /api/setup/status` is public but never grants setup permission by itself.

### 2.2 Create the first key

`POST /api/setup` — public, loopback-only.

```json
{ "key": "a-strong-management-key", "confirmKey": "a-strong-management-key" }
```

| Result | Response |
| --- | --- |
| Success | `200` `{ "setupRequired": false, "token": "...", "expiresAt": "..." }` |
| Not local | `403` `{ "error": "private_network_required" }` |
| Key too short | `400` `{ "error": "key_too_short", "minimumLength": 12 }` |
| Key too long | `400` `{ "error": "key_too_long", "maximumLength": 4096 }` |
| Mismatch | `400` `{ "error": "keys_do_not_match" }` |
| Already configured | `409` `{ "error": "already_configured" }` |

The successful setup response also creates a session, so the client can continue without a
second login.

### 2.3 Login

`POST /api/auth/login` — public.

```json
{ "key": "management-key" }
```

Success:

```json
{
  "success": true,
  "data": { "token": "session-token", "expiresAt": "2026-11-18T12:00:00+00:00" }
}
```

Failure:

```json
{
  "success": false,
  "code": "management_key_invalid",
  "messageKey": "errors.unauthorized",
  "data": null
}
```

Status `401` for a missing, malformed or wrong key; `429` when rate limited. Compare errors through
`code`, not through localized text.

### 2.4 Logout

`POST /api/auth/logout` — session token required.

```json
{ "success": true }
```

Logout requires a currently valid token. A missing, expired or already revoked token receives the
standard `401` envelope (`code: "unauthorized"`), so clients should treat logout as best-effort
cleanup rather than a retryable idempotent operation.

### 2.5 SSE ticket

`POST /api/auth/sse-ticket` — session token required.

```json
{ "success": true, "data": { "ticket": "base64url-ticket", "expiresAt": "..." } }
```

The ticket is accepted once at `GET /api/events?sse_ticket=...`. It cannot be reused and does not
renew the session. Request a new ticket after every reconnect.

## 3. Endpoint reference

Endpoint path parameters are URL-encoded. `{id}` refers to a subscription or profile ID; IDs are
opaque strings generated by the backend.

### 3.1 Health and runtime

| Method | Path | Success response | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/health` | `{ "status": "ok" }` | Public. Local diagnostic callers also receive `X-v2rayn-WebAPI-*` headers |
| `GET` | `/api/status` | `Envelope<StatusView>` | Runtime, listeners, traffic, counts, build identity, capabilities |
| `GET` | `/api/operations` | `Envelope<string[]>` | Active operation IDs (see below) |
| `GET` | `/api/logs?limit=200&filter=` | `Envelope<LogView[]>` | `limit` defaults to 200 and is clamped to 1–2000; `filter` is a regex matched against `"{source} {message}"` |
| `GET` | `/api/logs/page?page=1&pageSize=100&filter=` | `Envelope<LogPageView>` | `pageSize` defaults to 100 and is clamped to 1–200; `page` is clamped to the available range |
| `DELETE` | `/api/logs` | `Envelope<{ cleared: true, generation: number }>` | Clears the in-memory log buffer |
| `GET` | `/api/editor-options` | `Envelope<WebEditorOptionsView>` | Authoritative option lists for editors |

Operation IDs returned by `GET /api/operations`:

- a subscription ID while that subscription is updating;
- `"speedtest"` while a speed/latency batch is running;
- `"core-update-<coretype>"` while a Core update is running, e.g. `"core-update-xray"`;
- `"geo-update"` while Geo files are updating;
- `"core"` while the Core runtime is not stopped.

Health headers are emitted only for a loopback peer with a local `Host`, no forwarding headers and
a same-origin request:

- `X-v2rayn-WebAPI-instance-pid`
- `X-v2rayn-WebAPI-version`
- `X-v2rayn-WebAPI-core-state`
- `X-v2rayn-WebAPI-core-process-ids`
- `X-v2rayn-WebAPI-core-profile-id`
- `X-v2rayn-WebAPI-shutdown-stage` (only during shutdown)

### 3.2 Subscriptions

| Method | Path | Success response | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/subscriptions` | `Envelope<SubscriptionView[]>` | All subscriptions |
| `POST` | `/api/subscriptions` | `201` `SubscriptionMutationResult` | Body: `SubscriptionInput` |
| `PUT` | `/api/subscriptions/{id}` | `200` `SubscriptionMutationResult` | Full update; not a patch |
| `DELETE` | `/api/subscriptions/{id}` | `OperationView` | `404` when missing |
| `GET` | `/api/subscriptions/{id}/share` | `Envelope<{ id, url }>` | `404` when missing |
| `POST` | `/api/subscriptions/update` | `202` `OperationView` | Body: `{ subscriptionId?, useProxy? }`; `409` when busy |
| `POST` | `/api/subscriptions/{id}/update?useProxy=false` | `202` `OperationView` | `409` when busy |

`SubscriptionMutationResult` is not wrapped in `ApiEnvelope`:

```ts
interface SubscriptionMutationResult {
  success: boolean
  code: string
  messageKey: string
  data: SubscriptionView | null
}
```

Validation rules:

- `remarks` must be non-empty after trimming.
- `url` may be empty; when present it must be an absolute `http` or `https` URL.
- `requestHeaders` must be empty or a valid HTTP header block.
- On update, omitted optional fields keep their existing values (see `SubscriptionInput` defaults).

Progress is delivered both through `GET /api/operations` and the SSE
`subscription-progress`/`profiles-changed` events. A finished update also publishes
`profiles-changed`.

### 3.3 Profile groups

| Method | Path | Success response | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/profile-groups` | `Envelope<ProfileGroupView[]>` | First row is the synthetic `all` group with `id: ""` |
| `PUT` | `/api/profile-groups/current` | `OperationView` | Body: `{ subscriptionId: string \| null }`; `404` when unknown |
| `POST` | `/api/profile-groups/generate/all?subscriptionId=` | `OperationView` | Creates an all-nodes group |
| `POST` | `/api/profile-groups/generate/regions?subscriptionId=` | `OperationView` | Creates regional groups |

Omitting `subscriptionId` uses the current group. Passing an empty value targets all profiles.

### 3.4 Profiles

| Method | Path | Success response | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/profiles?subscriptionId=&filter=` | `Envelope<ProfileView[]>` | Omitted `subscriptionId` uses the current group; `filter` is a regex over remarks/address |
| `GET` | `/api/profiles/{id}` | `Envelope<ProfileItem>` | Full editable profile, including `protoExtra`/`transportExtra` JSON strings |
| `POST` | `/api/profiles/import` | `OperationView<{ imported: number }>` | Body: `ProfileImportRequest` |
| `POST` | `/api/profiles` | `OperationView<{ profileId: string; coreRestarted?: boolean }>` | Body: `ProfileItem`; `indexId` is generated |
| `PUT` | `/api/profiles/{id}` | `OperationView` | Body: `ProfileItem`; `404` when missing |
| `DELETE` | `/api/profiles` | `OperationView<{ deleted: number; coreRestarted?: boolean }>` | JSON body (DELETE with body): `{ profileIds: string[] }` |
| `POST` | `/api/profiles/copy` | `OperationView<{ copied: number }>` | Body: `{ profileIds: string[] }` |
| `POST` | `/api/profiles/move-to-group` | `OperationView` | Body: `{ profileIds, subscriptionId }` |
| `POST` | `/api/profiles/move` | `OperationView` | Body: `{ profileId, direction, position? }` |
| `POST` | `/api/profiles/sort` | `OperationView` | Body: `{ subscriptionId?, column, ascending }` |
| `POST` | `/api/profiles/deduplicate?subscriptionId=` | `OperationView` | Removes duplicate servers |
| `DELETE` | `/api/profiles/invalid-test-results?subscriptionId=` | `OperationView` | Removes failed test results |
| `POST` | `/api/profiles/export` | `Envelope<ProfileExportItem[]>` | Body: `ProfileExportRequest` |
| `POST` | `/api/profiles/{id}/select` | `OperationView<{ profileId: string; processIds: number[] }>` or `OperationView<{ profileId: string; alreadyRunning: true }>` | Selects and starts the Core; all failures return `409` |
| `POST` | `/api/profiles/{id}/latency` | `202` `OperationView<{ action: "Tcping"; profileCount: 1 }>` | Starts a latency test for one profile |
| `POST` | `/api/speedtests` | `202` `OperationView<{ action: string; profileCount: number }>` | Body: `SpeedTestRequest`; `action` in the result uses the PascalCase enum member |
| `DELETE` | `/api/speedtests` | `OperationView` | Stops running speed tests |
| `POST` | `/api/latency/stop` | `OperationView` | Stops running latency tests |

`GET /api/profiles` and all mutations operate on the current profile group unless an explicit
`subscriptionId` is supplied. Selection persists the current profile and may start the Core.
Latency and speed-test progress arrive through SSE (`speedtest-started`, `speedtest-result`).

`column` accepts the `EServerColName` names, case-insensitively:
`Def`, `ConfigType`, `Remarks`, `Address`, `Port`, `Network`, `StreamSecurity`, `SubRemarks`,
`DelayVal`, `SpeedVal`, `IpInfo`, `TodayDown`, `TodayUp`, `TotalDown`, `TotalUp`.

### 3.5 Settings

| Method | Path | Success response | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/settings` | `Envelope<WebSettingsView>` | All editable sections plus authoritative option lists |
| `PUT` | `/api/settings/apply` | `OperationView` | Atomic save of all sections; body: `SettingsApplyInput` |
| `PUT` | `/api/settings/inbound` | `OperationView` | Body: `InboundSettingsInput` |
| `PUT` | `/api/settings/core` | `OperationView` | Body: `CoreSettingsInput` |
| `PUT` | `/api/settings/application` | `OperationView` | Body: `AppSettingsInput` |
| `PUT` | `/api/settings/speedtest` | `OperationView` | Body: `SpeedTestSettingsInput` |
| `PUT` | `/api/settings/core-types` | `OperationView` | Body: `{ mappings: CoreTypeMapping[] }` |
| `PUT` | `/api/settings/routing` | `OperationView` | Body: `{ domainStrategy?, domainStrategy4Singbox? }` |
| `DELETE` | `/api/statistics` | `OperationView` | Clears traffic statistics and publishes `traffic: null` |

`PUT /api/settings/apply` is transactional. If a running Core must be restarted to apply the new
configuration, the operation result reports it and `settings-changed` carries
`restartRequired`/restart outcome flags.

### 3.6 Routing

| Method | Path | Success response | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/settings/routing-profiles` | `Envelope<RoutingItem[]>` | All routing profiles |
| `POST` | `/api/settings/routing-profiles` | `OperationView<{ routingId: string }>` | Body: `RoutingItem` |
| `PUT` | `/api/settings/routing-profiles/{id}` | `OperationView<{ routingId: string }>` | `404` when missing |
| `DELETE` | `/api/settings/routing-profiles/{id}` | `OperationView` | `404` when missing |
| `POST` | `/api/settings/routing-profiles/{id}/activate` | `OperationView` | Makes the profile current |
| `GET` | `/api/settings/routing-profiles/{id}/rules` | `Envelope<RulesItem[]>` | Rules of one profile |
| `PUT` | `/api/settings/routing-profiles/{id}/rules` | `OperationView<{ routingId: string }>` | Replaces the full rule list |
| `POST` | `/api/settings/routing-profiles/{id}/rules/import` | `OperationView` | Body: `{ content, append? }` |
| `POST` | `/api/settings/routing-profiles/{id}/rules/import-url` | `OperationView` | Body: `{ append? }`; downloads the profile URL |
| `DELETE` | `/api/settings/routing-profiles/{id}/rules/{ruleId}` | `OperationView` | `404` when missing |
| `POST` | `/api/settings/routing-profiles/{id}/rules/move` | `OperationView` | Body: `{ ruleId, direction, position? }` |
| `POST` | `/api/settings/routing-profiles/import` | `OperationView` | Imports built-in routing profiles |

`GET .../routing-profiles/{id}/rules` returns `200` with an empty array when the profile does not
exist; the mutating rule routes return `404` in that case.

### 3.7 DNS

| Method | Path | Success response | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/settings/dns/simple` | `Envelope<SimpleDNSItem>` | Shared simple DNS configuration |
| `PUT` | `/api/settings/dns/simple` | `OperationView` | Body: `SimpleDNSItem` |
| `GET` | `/api/settings/dns/profiles` | `Envelope<DnsProfileView[]>` | Per-Core DNS profiles |
| `PUT` | `/api/settings/dns/profiles/{coreType}` | `OperationView` | Body: `DnsProfileInput`; `404` for unknown target |
| `GET` | `/api/settings/dns/editor-options` | `Envelope<DnsEditorOptionsView>` | Authoritative DNS option lists |
| `GET` | `/api/settings/dns/defaults` | `Envelope<DnsDefaultProfileView[]>` | Default DNS templates per Core |

### 3.8 Core templates and regional presets

| Method | Path | Success response | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/settings/core-templates` | `Envelope<CoreConfigTemplateView[]>` | Stored full-config templates |
| `PUT` | `/api/settings/core-templates/{coreType}` | `OperationView<{ coreType: string }>` | Body: `CoreConfigTemplateInput`; `404` for unknown target |
| `POST` | `/api/settings/regional-presets/{preset}` | `OperationView` | `preset` is `default`, `russia` or `iran` |

### 3.9 WebDAV and backup

| Method | Path | Success response | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/settings/webdav` | `Envelope<WebDavSettingsView>` | Never returns the password; reports `hasPassword` |
| `PUT` | `/api/settings/webdav` | `OperationView` | Body: `WebDavSettingsInput`; `password: null` keeps the stored password |
| `POST` | `/api/backup/webdav/check` | `OperationView` | Validates connection and target directory |
| `POST` | `/api/backup/webdav` | `OperationView<{ fileName: string }>` | Uploads a backup |
| `POST` | `/api/backup/webdav/restore` | `202` `OperationView<{ restartRequired: boolean; safetyBackup: string }>` | Downloads and restores; Core may restart |
| `GET` | `/api/backup/download` | `application/zip` attachment | `Content-Disposition: attachment` on success |
| `POST` | `/api/backup/restore` | `202` `OperationView` | Multipart field `file`; 64 MiB limit |

Backup archives use the existing v2rayN `guiConfigs/` ZIP format. Restore validates the archive,
database compatibility and executable safety before replacing data.

### 3.10 Core lifecycle

| Method | Path | Success response | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/core/start` | `OperationView` | Starts the selected/default profile; `409` on failure |
| `POST` | `/api/core/stop` | `OperationView` | Stops the tracked Core process |
| `POST` | `/api/core/restart` | `OperationView` | Restarts the current runtime; `409` when not running |

Lifecycle responses include `{ profileId, processIds }` on success. Generated TUN configurations
are rejected because TUN control is outside the headless API scope
(`code: "tun_not_supported"`).

### 3.11 Core and API updates

| Method | Path | Success response | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/core-updates` | `Envelope<CoreUpdateSettingsView>` | Targets, selection, proxy/prerelease preferences |
| `PUT` | `/api/core-updates/settings` | `OperationView` | Body: `CoreUpdateSettingsInput` |
| `GET` | `/api/core-updates/progress` | `Envelope<CoreUpdateProgressView[]>` | Latest progress per target |
| `POST` | `/api/core-updates/batch` | `202` `OperationView<{ apply: boolean; targets: string[] }>` | Body: `{ apply: boolean }`; all failures return `409` (busy or empty selection) |
| `GET` | `/api/core-updates/{coreType}/check?preRelease=&useProxy=` | `Envelope<CoreUpdateCheckView>` | Always `200`; inspect `success` |
| `POST` | `/api/core-updates/{coreType}/update?preRelease=&useProxy=` | `202` `OperationView` | All failures return `409` (busy, unsupported or not selected) |
| `POST` | `/api/core/geo/update?useProxy=` | `202` `OperationView` | Geo files; all failures return `409` (busy or GeoFiles not selected) |
| `GET` | `/api/web-updates` | `Envelope<WebUpdateTargetView>` | API self-update target and deployment capability |
| `GET` | `/api/web-updates/check?preRelease=&useProxy=` | `Envelope<WebUpdateCheckView>` | Always `200` |
| `POST` | `/api/web-updates/update?preRelease=&useProxy=` | `202` `OperationView` | All failures return `409` (unsupported, busy, runtime unavailable or not selected) |
| `GET` | `/api/core/xray/check-update?preRelease=false&useProxy=true` | `Envelope<CoreUpdateCheckView>` | Legacy Xray shortcut; those are the query defaults |
| `POST` | `/api/core/xray/update?preRelease=false&useProxy=true` | `202` `OperationView` | Legacy Xray shortcut; those are the query defaults |

`{coreType}` is bound as an `ECoreType` member name, case-insensitively: `Xray`/`xray`, `v2fly`,
`v2fly_v5`, `mihomo`, `hysteria`, `naiveproxy`, `tuic`, `sing_box`, `juicity`, `hysteria2`,
`brook`, `overtls`, `shadowquic`, `mieru`, `v2rayN`. JSON enum fields serialize with camel-case
naming and keep underscores, so the same values appear as `xray`, `v2fly_v5`, `sing_box`, and so
on. Supported targets depend on the platform and the installed Core bundle; use
`isSupported`/`canInstall` from `/api/core-updates`.

Update selection values use the raw `ECoreType` member names (`Xray`, `sing_box`, `v2fly_v5`) plus
the synthetic targets `GeoFiles` and `WebAPI.self-update`; comparisons are ordinal. The
`coreType` field in `core-update-progress` uses those same names (for example `Xray`, `GeoFiles`,
`WebAPI.self-update`). Common progress phases are `checking`, `downloading`, `verifying`,
`waiting`, `stopping-core`, `installing`, `completed` and `failed`.

The API self-update target is **`WebAPI.self-update`**. On systemd/container deployments it is
check-only; installable native deployments replace the executable transactionally and roll back
on a failed health probe. Update progress is also published over SSE.

### 3.12 Events

`GET /api/events?sse_ticket=<ticket>&include_logs=<bool>` — no Bearer header.

The ticket must come from `POST /api/auth/sse-ticket` and is consumed on connect. `include_logs`
defaults to `false`; when true, `log` events are delivered. The stream uses
`Content-Type: text/event-stream`, disables proxy buffering with `X-Accel-Buffering: no`, and emits
a `: keep-alive` comment every minute.

The connection ends when the session is revoked, the ticket/session expires, the host stops, or
the client disconnects. Reconnect with a fresh ticket.

## 4. Data models

### 4.1 Health and status

```ts
interface StatusView {
  coreRunning: boolean
  coreType: string | null
  currentProfileId: string | null
  currentProfileName: string | null
  coreStartedAt: string | null
  listeners: ListenerView[]
  xrayAvailable: boolean
  runtime: string                    // service description; the first "|" segment is the app version
  profileCount: number
  subscriptionCount: number
  checkedAt: string
  statisticsEnabled: boolean
  traffic: TrafficView | null
  runtimeState: 'stopped' | 'starting' | 'running' | 'stopping' | 'restarting' | 'faulted'
  configuredProxyPort: number | null
  runningProxyPort: number | null
  runningProfileId: string | null
  runningProfileName: string | null
  apiPort: number | null
  coreProcessIds: number[] | null
  runtimeFailure: string | null
  webVersion: string | null
  gitCommit: string | null
  runtimeIdentifier: string | null
  webBuildDate: string | null
  sniffingEnabled: boolean
  destOverride: string[] | null
  capabilities: string[] | null
}

interface ListenerView {
  name: string
  protocols: string[]
  listenAddress: string
  port: number
  listening: boolean
}

interface TrafficView {
  proxyUp: number
  proxyDown: number
  directUp: number
  directDown: number
}
```

`coreRunning` is true only when the tracked process is alive and the expected proxy listener is
accepting connections. A runtime that loses its listener is reported as `faulted` with
`runtimeFailure` populated.

### 4.2 Logs

```ts
interface LogView {
  timestamp: string
  source: string
  message: string
  generation: number
}

interface LogPageView {
  items: LogView[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
```

`generation` increases when the log buffer is cleared. Clients use it to discard queued log
events from before the clear.

### 4.3 Subscriptions

```ts
interface SubscriptionInput {
  remarks: string
  url: string
  moreUrl?: string | null
  enabled?: boolean | null      // default true
  userAgent?: string | null
  requestHeaders?: string | null
  filter?: string | null
  autoUpdateInterval?: number | null   // minutes; clamped to >= 0
  convertTarget?: string | null
  memo?: string | null
  sort?: number | null
  prevProfile?: string | null
  nextProfile?: string | null
  preSocksPort?: number | null
  customCoreType?: string | null
}

interface SubscriptionView {
  id: string
  remarks: string
  url: string
  enabled: boolean
  moreUrl: string | null
  filter: string | null
  autoUpdateInterval: number
  updateTime: number            // Unix seconds; 0 = never
  userAgent: string
  requestHeaders: string | null
  convertTarget: string | null
  memo: string | null
  sort: number
  prevProfile: string | null
  nextProfile: string | null
  preSocksPort: number | null
  customCoreType: string | null
}
```

On update, omitted optional fields preserve the stored value. `updateTime` is maintained by the
backend and is not accepted in `SubscriptionInput`.

### 4.4 Profile views

```ts
interface ProfileView {
  indexId: string
  remarks: string
  protocol: string              // EConfigType, e.g. "vMess", "vless", "shadowsocks"
  address: string
  port: number
  network: string
  streamSecurity: string
  subscriptionId: string | null
  subscriptionName: string | null
  coreType: string              // effective ECoreType, camelCase
  sort: number
  delay: number                 // ms; 0 = untested
  speed: number
  ipInfo: string | null
  todayUp: number
  todayDown: number
  totalUp: number
  totalDown: number
  isCurrent: boolean
  canTest: boolean              // non-complex profile with a port
}
```

### 4.5 Full profile object

`GET /api/profiles/{id}` and the profile create/update routes exchange the ServiceLib profile
object. Only the stable fields are listed here; protocol-specific extras are stored in
`protoExtra` and `transportExtra` as JSON-encoded strings.

```ts
interface ProfileItem {
  indexId: string               // ignored on create; the URL id wins on update
  configType: string            // EConfigType, e.g. "vMess", "vless", "shadowsocks"; immutable on update
  coreType: string | null       // ECoreType override, e.g. "xray", "sing_box"
  configVersion: number
  subid: string
  isSub: boolean
  preSocksPort: number | null
  displayLog: boolean
  remarks: string
  address: string
  port: number
  password: string
  username: string
  network: string
  streamSecurity: string
  allowInsecure: string         // "true" / "false" string, not boolean
  sni: string
  alpn: string
  fingerprint: string
  publicKey: string
  shortId: string
  spiderX: string
  mldsa65Verify: string
  muxEnabled: boolean | null
  cert: string
  certSha: string
  echConfigList: string
  verifyPeerCertByName: string
  finalmask: string
  protoExtra: string            // JSON string
  transportExtra: string        // JSON string
}
```

`protoExtra` decodes to `ProtocolExtraItem` (all fields optional):

```ts
interface ProtocolExtraItem {
  uot?: boolean
  congestionControl?: string
  httpHeaders?: string
  alterId?: string
  vmessSecurity?: string
  flow?: string
  vlessEncryption?: string
  ssMethod?: string
  wgPublicKey?: string
  wgPresharedKey?: string
  wgInterfaceAddress?: string
  wgReserved?: string
  wgMtu?: number
  wgDns?: string
  salamanderPass?: string
  upMbps?: number
  downMbps?: number
  ports?: string
  hopInterval?: string
  hy2RealmUrl?: string
  geckoMinPacketSize?: string
  geckoMaxPacketSize?: string
  insecureConcurrency?: number
  naiveQuic?: boolean
  masquePath?: string
  masqueHeaders?: string
  groupType?: string
  childItems?: string
  subChildItems?: string
  filter?: string
  multipleLoad?: string
  isSingboxEndpoint?: boolean
}
```

`transportExtra` decodes to `TransportExtraItem`:

```ts
interface TransportExtraItem {
  rawHeaderType?: string
  host?: string
  path?: string
  xhttpMode?: string
  xhttpExtra?: string
  grpcAuthority?: string
  grpcServiceName?: string
  grpcMode?: string
  kcpHeaderType?: string
  kcpSeed?: string
  kcpMtu?: number
}
```

Top-level legacy fields such as `headerType`, `requestHost`, `path`, `extra`, `ports`, `alterId`,
`flow`, `id` and `security` are obsolete. New clients must read and write
`protoExtra`/`transportExtra`; `/api/editor-options` exposes the allowed values.

### 4.6 Profile groups

```ts
interface ProfileGroupView {
  id: string                    // "" for the synthetic all-profiles group
  code: 'all' | 'subscription'
  name: string | null           // subscription remarks, null for "all"
  messageKey: string | null     // "profiles.allGroup" for the synthetic group
  profileCount: number
  isCurrent: boolean
}
```

### 4.7 Profile import and export

```ts
interface ProfileImportRequest {
  content: string
  subscriptionId?: string | null
  isSubscription?: boolean      // default false
}

interface ProfileExportRequest {
  profileIds: string[]
  includeShareUris?: boolean    // default true
  base64ShareUris?: boolean     // default false
  includeInnerUri?: boolean     // default false
  includeClientConfig?: boolean // default true
}

interface ProfileExportItem {
  indexId: string
  remarks: string
  format: 'share-uri' | 'share-uri-base64' | 'inner-uri' | 'client-config'
  content: string
}
```

### 4.8 Profile movement and speed tests

```ts
type MoveDirection = 'top' | 'up' | 'down' | 'bottom' | 'position'

interface MoveProfileRequest {
  profileId: string
  direction: MoveDirection
  position?: number             // used with "position"; -1/omitted means append
}

type SpeedAction = 'tcping' | 'realping' | 'udpTest' | 'speedtest' | 'mixedtest' | 'fastRealping'

interface SpeedTestRequest {
  action: SpeedAction
  profileIds?: string[] | null  // omitted/empty = current group
}
```

`fastRealping` is normalized to `realping` by the backend. Starting a test while another is
running returns `409` with `code: "speedtest_busy"`.

### 4.9 Settings

```ts
interface WebSettingsView {
  inbound: InboundSettingsView
  core: CoreSettingsView
  app: AppSettingsView
  speedTest: SpeedTestSettingsView
  domainStrategy: string | null
  domainStrategy4Singbox: string | null
  coreTypes: CoreTypeMapping[]
  options: WebSettingsOptionsView
  showIpInfoColumn: boolean
}

interface InboundSettingsView {
  localPort: number
  secondLocalPortEnabled: boolean
  udpEnabled: boolean
  sniffingEnabled: boolean
  destOverride: string[]
  routeOnly: boolean
  allowLANConn: boolean
  newPort4LAN: boolean
  user: string | null
  pass: string | null
}

interface CoreSettingsView {
  logEnabled: boolean
  loglevel: string | null
  defFingerprint: string | null
  defUserAgent: string | null
  sendThrough: string | null
  bindInterface: string | null
  mux4RayConcurrency: number | null
  mux4RayXudpConcurrency: number | null
  mux4RayXudpProxyUDP443: string | null
  mux4SboxProtocol: string | null
  mux4SboxPadding: boolean | null
  enableCacheFile4Sbox: boolean
  hy2UpMbps: number
  hy2DownMbps: number
  enableFragment: boolean
  enableFinalFragment: boolean
  fragmentPackets: string | null
  fragmentLengths: string[]
  fragmentDelays: string[]
  fragmentMaxSplit: string | null
}

interface AppSettingsView {
  enableStatistics: boolean
  displayRealTimeSpeed: boolean
  keepOlderDedupl: boolean
  geoAutoUpdateInterval: number
  rootCertProvider: string | null
  geoSourceUrl: string | null
  srsSourceUrl: string | null
  routeRulesTemplateSourceUrl: string | null
  subConvertUrl: string | null
}

interface SpeedTestSettingsView {
  speedTestTimeout: number
  speedTestUrl: string | null
  speedPingTestUrl: string | null
  mixedConcurrencyCount: number
  ipapiUrl: string | null
  udpTestTarget: string | null
}

interface CoreTypeMapping {
  configType: string            // EConfigType
  coreType: string              // ECoreType
}
```

`WebSettingsOptionsView` contains authoritative arrays for log levels, fingerprints, user agents,
Mux protocols, fragment packet options, destination-override protocols, routing strategies,
concurrency counts, speed-test URLs/timeouts, UDP targets, IP-API URLs, subscription converters,
Geo/SRS sources, routing-rule sources, and the per-Core Shadowsocks methods exposed by the profile
editor. Clients must not hard-code these lists.

`SettingsApplyInput` has the same shape as `WebSettingsView` minus `options` and
`showIpInfoColumn`: `{ inbound, core, application, speedTest, coreTypes, domainStrategy,
domainStrategy4Singbox }`. The nested input records match their view counterparts, with these
differences: `destOverride`, `fragmentLengths` and `fragmentDelays` may be `null`; the
`SpeedTestSettingsInput` URL and target fields are declared as non-null strings, so send `""`
rather than `null`.

### 4.10 Routing

```ts
interface RoutingItem {
  id: string
  remarks: string
  url: string
  ruleSet: string
  ruleNum: number
  enabled: boolean
  locked: boolean
  customIcon: string
  customRulesetPath4Singbox: string
  domainStrategy: string
  domainStrategy4Singbox: string
  sort: number
  isActive: boolean
}

interface RulesItem {
  id: string
  type: string | null
  port: string | null
  network: string | null
  inboundTag: string[] | null
  outboundTag: string | null
  ip: string[] | null
  domain: string[] | null
  protocol: string[] | null
  process: string[] | null
  enabled: boolean
  remarks: string | null
  ruleType: 'all' | 'routing' | 'dns' | null
}
```

`PUT .../rules` replaces the complete list. `DELETE .../rules/{ruleId}` removes one rule;
`.../rules/move` uses `{ ruleId, direction, position? }` with the same direction values as profile
movement.

### 4.11 DNS

```ts
interface SimpleDNSItem {
  useSystemHosts?: boolean | null
  addCommonHosts?: boolean | null
  fakeIP?: boolean | null
  globalFakeIp?: boolean | null
  fakeIPRange?: string | null
  blockBindingQuery?: boolean | null
  blockAAAAQuery?: boolean | null
  directDNS?: string | null
  remoteDNS?: string | null
  bootstrapDNS?: string | null
  strategy4Freedom?: string | null
  strategy4Proxy?: string | null
  strategy4ProxyDial?: string | null
  serveStale?: boolean | null
  parallelQuery?: boolean | null
  hosts?: string | null
  directExpectedIPs?: string | null
  enableHappyEyeballs?: boolean | null
}

interface DnsProfileView {
  id: string
  remarks: string
  enabled: boolean
  coreType: string
  useSystemHosts: boolean
  normalDNS: string | null
  tunDNS: string | null
  domainStrategy4Freedom: string | null
  domainDNSAddress: string | null
}

interface DnsProfileInput {
  remarks?: string | null
  enabled: boolean
  useSystemHosts: boolean
  normalDNS?: string | null
  tunDNS?: string | null
  domainStrategy4Freedom?: string | null
  domainDNSAddress?: string | null
}
```

`DnsEditorOptionsView` provides `coreTypes`, freedom/sing-box domain strategies, and address
lists (`domainDnsAddresses`, `directDnsAddresses`, `remoteDnsAddresses`,
`bootstrapDnsAddresses`, fake-IP ranges and expected IPs).

### 4.12 Core templates

```ts
interface CoreConfigTemplateView {
  id: string
  remarks: string
  enabled: boolean
  coreType: string
  config: string | null
  tunConfig: string | null       // preserved but not editable through the API
  addProxyOnly: boolean | null
  proxyDetour: string | null
}

interface CoreConfigTemplateInput {
  remarks?: string | null
  enabled: boolean
  config?: string | null
  tunConfig?: string | null
  addProxyOnly?: boolean | null
  proxyDetour?: string | null
}
```

### 4.13 WebDAV

```ts
interface WebDavSettingsView {
  url: string | null
  userName: string | null
  dirName: string | null
  hasPassword: boolean
}

interface WebDavSettingsInput {
  url?: string | null
  userName?: string | null
  password?: string | null     // write-only; never returned
  dirName?: string | null
}
```

### 4.14 Core updates

```ts
interface CoreUpdateSettingsView {
  targets: CoreUpdateTargetView[]
  geoFilesSelected: boolean
  preRelease: boolean
  useProxy: boolean
  checkPreReleaseCoreTypes: string[] | null
}

interface CoreUpdateTargetView {
  coreType: string              // ECoreType member name, e.g. "Xray", "sing_box"
  nameKey: string
  isSupported: boolean
  canInstall: boolean
  supportsPreRelease: boolean
  selected: boolean
  unsupportedReasonKey: string | null
}

interface CoreUpdateSettingsInput {
  selectedCoreTypes: string[]   // ECoreType member names plus "GeoFiles"/"WebAPI.self-update"
  preRelease: boolean
  useProxy: boolean
  checkPreReleaseCoreTypes?: string[] | null
}

interface CoreUpdateCheckView {
  updateAvailable: boolean
  version: string | null
  isUpToDate: boolean
  detail: string | null
}

interface CoreUpdateProgressView {
  coreType: string               // ECoreType name, or "GeoFiles"/"WebAPI.self-update"
  phase: string
  isComplete: boolean
  success: boolean
  coreWasRunning: boolean
  version: string | null
  detail: string | null
  batch: boolean
  rollbackSucceeded: boolean | null
}
```

`checkPreReleaseCoreTypes` is the per-target prerelease opt-in list. An empty list disables
prereleases. If omitted by an older client, the legacy `preRelease` flag applies to all exposed
prerelease-capable targets. `WebAPI.self-update` participates in this list and is reported through
`/api/web-updates`, not through the Core target list.

### 4.15 API self-update

```ts
interface WebUpdateTargetView {
  name: string                  // "v2rayN.WebAPI"
  version: string
  commit: string
  buildDate: string
  rid: string
  deployment: string            // native-writable | native-read-only | systemd-managed | container | unsupported
  isSupported: boolean
  canCheck: boolean
  canInstall: boolean
  selected: boolean
  installReasonKey: string | null
  latestVersion: string | null
}

interface WebUpdateCheckView {
  updateAvailable: boolean
  currentVersion: string
  currentCommit: string
  rid: string
  latestVersion: string | null
  latestCommit: string | null
  canInstall: boolean
  installReasonKey: string | null
  detail: string | null
}
```

### 4.16 Editor options

`GET /api/editor-options` returns the authoritative lists used by profile, subscription and DNS
editors. Clients must consume these values instead of copying enum definitions.

```ts
interface WebEditorOptionsView {
  subscriptions: {
    convertTargets: string[]
    customCoreTypes: string[]
  }
  profiles: {
    coreTypes: string[]
    configTypes: string[]
    singboxOnlyConfigTypes: string[]
    networks: string[]
    defaultNetwork: string
    defaultStreamSecurity: string
    defaultSecurity: string
    defaultVlessEncryption: string
    defaultXhttpMode: string
    defaultGrpcMode: string
    defaultWireGuardMtu: number
    rawHeaderTypes: string[]
    xhttpModes: string[]
    kcpHeaderTypes: string[]
    grpcModes: string[]
    vmessSecurities: string[]
    flows: string[]
    tuicCongestionControls: string[]
    naiveCongestionControls: string[]
    fingerprints: string[]
    alpns: string[]
    shadowsocksSecurities: Record<string, string[]>
    streamSecurityTypes: string[]
    multipleLoadStrategies: string[]
  }
  dns: DnsEditorOptionsView
}
```

Option lists use `ToString()` enum member names, for example `VMess`, `Xray`, `sing_box` and
`PolicyGroup`. Response fields that carry an enum through the JSON converter use camel-case names
instead, for example `vMess`, `xray` and `sing_box`. Match them case-insensitively and write the
canonical spelling from the option list back into request bodies.

`DnsEditorOptionsView` supplies `coreTypes`, `domainStrategies4Freedom`,
`domainStrategies4Singbox`, `domainDnsAddresses`, `directDnsAddresses`, `remoteDnsAddresses`,
`bootstrapDnsAddresses`, `fakeIpRanges` and `expectedIps`.

## 5. SSE event catalogue

Each SSE message is:

```text
event: <type>
data: <JSON payload>

```

`data` is the payload itself, never wrapped in `ApiEnvelope`. The stream buffer holds 256 events
and drops the oldest under backpressure; clients must treat SSE as a change notification, not as a
durable event log, and reconcile through REST after reconnect.

| Event | Payload | Meaning |
| --- | --- | --- |
| `status` | `StatusView` | Core/runtime status changed |
| `core-state` | `{ state, profileId, coreType, startedAt, proxyPort, apiPort, processIds, lastFailure }` | Low-level Core transition |
| `traffic` | `ServerSpeedItem \| null` | Live traffic counters; `null` means cleared |
| `log` | `LogView` | One log entry; only when `include_logs=true` |
| `logs-cleared` | `{ generation }` | Log buffer cleared; discard earlier queued entries |
| `profiles-changed` | `{ subscriptionId }` | Profiles or groups changed; re-read affected lists |
| `subscription-progress` | `{ subscriptionId, success, code, messageKey, rawLog }` | Subscription download/update progress |
| `speedtest-started` | `{ code, messageKey, action, profileIds }` | A latency/speed batch started |
| `speedtest-result` | `{ code, messageKey, indexId, delay, speed, ipInfo, rawResult }` | One profile result; `indexId` may be empty for batch completion/stop |
| `settings-changed` | `{ section, restartRequired, ... }` | A settings section was saved or a Core restart was attempted |
| `core-update-progress` | `CoreUpdateProgressView` | Core/Geo/API update phase or completion |
| `core-update-batch-completed` | `{ success, apply }` | A selected-Core update batch finished |
| `geo-update-progress` | `{ success, code, messageKey, rawLog }` | Scheduled Geo update progress |
| `geo-update-completed` | `OperationView` (`data: { batch }` or `null`) | Geo update finished; scheduled runs publish `data: null` |
| `xray-update-completed` | `OperationView` (`data: { version, coreRestarted }` or failure detail) | Legacy Xray update finished |

`ServerSpeedItem` has `indexId`, `totalUp`, `totalDown`, `todayUp`, `todayDown`, `dateNow`,
`proxyUp`, `proxyDown`, `directUp`, `directDown`.

## 6. Capabilities

`GET /api/status` returns the capabilities implemented by the running backend:

| Capability | Covers |
| --- | --- |
| `auth.sessions` | Login, logout, session lifetime, SSE tickets |
| `events.sse` | Authenticated event stream |
| `editor.options` | `/api/editor-options` and DNS editor options |
| `profiles` | Profile listing, editing, groups, import/export, tests |
| `subscriptions` | Subscription CRUD, share URL, updates |
| `routing` | Routing profiles and rules |
| `dns` | Simple and per-Core DNS profiles |
| `settings` | Section settings and atomic apply |
| `backup.restore` | Local download/upload and WebDAV backup/restore |
| `core.runtime` | Status, start/stop/restart, listeners |
| `core.updates` | Core, Geo and batch updates |
| `WebAPI.self-update` | API executable self-update (check-only where the deployment forbids replacement) |

Capabilities are additive. Clients should check for the ones they depend on instead of assuming a
fixed backend build.

## 7. Security model

- **Management Key**: supplied through `V2RAYN_WEB_API_KEY` or first-run setup. It is only sent to
  `POST /api/auth/login`; the backend stores a hash and never exposes it.
- **Sessions**: bearer tokens are held in memory by the backend and expire/revoke as described
  above. Nova scopes a stored session to the normalized API origin and never persists the
  Management Key.
- **SSE**: EventSource cannot set headers, so the short-lived one-time ticket exists specifically
  to keep the bearer token out of URLs and proxy logs.
- **CORS**: disabled by default for cross-origin requests. Configure exact HTTP(S) origins with
  `V2RAYN_WEB_ALLOWED_ORIGINS`. Wildcards, credentials, paths, queries, fragments and invalid
  origins are rejected at startup. The allowlist grants browser access, not authentication.
- **Setup**: only direct loopback + loopback `Host` + no forwarding headers + same-origin. A
  cross-origin/deployed WebUI cannot claim first-run setup.
- **Origin guard**: disallowed `Origin` requests are rejected before rate limiting, session
  authorization, SSE-ticket consumption or mutations.
- **Headers**: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `X-Frame-Options: DENY`, and a restrictive CSP are applied to API responses.
- **No HTML**: the API never renders or templates client content.

For remote access, terminate TLS in a reverse proxy or VPN and keep the API off the public
Internet. Browser access from an HTTPS dashboard to an HTTP loopback/LAN API remains subject to
mixed-content and Local Network Access rules, which CORS cannot override.

## 8. Failure codes

Every failure carries a stable `code` and a `messageKey`. The HTTP status depends on the endpoint
(see the reference tables); the same code may be returned with `400`, `404` or `409`. Treat
`code` as the machine-readable branch key and use `messageKey` only for localized text.

| Area | Codes |
| --- | --- |
| Transport/auth | `unauthorized`, `management_key_invalid`, `payload_too_large`, `json_invalid`, `request_invalid`, `origin_not_allowed`, `route_not_found`, `internal_error` |
| First-run setup (raw `{ error }`) | `private_network_required`, `key_too_short`, `key_too_long`, `keys_do_not_match`, `already_configured` |
| Core runtime | `core_binary_missing`, `core_not_running`, `core_restart_failed`, `core_runtime_busy`, `core_runtime_faulted`, `core_start_failed`, `core_stop_failed`, `proxy_port_in_use`, `tun_not_supported`, `profile_not_selected` |
| Profiles/groups | `profile_complex_type_requires_import`, `profile_config_type_immutable`, `profile_content_required`, `profile_copy_failed`, `profile_data_required`, `profile_group_children_invalid`, `profile_group_empty`, `profile_group_invalid`, `profile_http_headers_invalid`, `profile_import_empty`, `profile_move_failed`, `profile_not_found`, `profile_not_in_group`, `profile_order_failed`, `profile_persistence_failed`, `profile_saved_core_restart_failed`, `profiles_deleted_core_restart_failed`, `profile_save_rejected`, `profile_selection_required`, `profile_sort_column_invalid`, `profile_sort_failed`, `profile_validation_failed` |
| Subscriptions | `subscription_headers_invalid`, `subscription_name_required`, `subscription_not_found`, `subscription_save_failed`, `subscription_update_busy`, `subscription_url_invalid` |
| Speed/latency tests | `speedtest_busy`, `speedtest_core_unsupported`, `speedtest_invalid_profile`, `speedtest_profile_selection_required`, `speedtest_settings_invalid` |
| Settings | `app_setting_invalid`, `core_log_level_invalid`, `core_setting_invalid`, `core_setting_option_invalid`, `core_setting_out_of_range`, `core_type_mapping_invalid`, `fragment_setting_invalid`, `inbound_dest_override_invalid`, `inbound_port_invalid`, `settings_apply_invalid`, `settings_core_apply_failed`, `settings_transaction_failed` |
| Routing | `routing_import_failed`, `routing_name_required`, `routing_profile_activate_failed`, `routing_profile_not_found`, `routing_profile_save_failed`, `routing_rule_move_failed`, `routing_rule_not_found`, `routing_rules_json_invalid`, `routing_rules_save_failed`, `routing_strategy_invalid`, `routing_url_download_failed`, `routing_url_invalid` |
| DNS/templates/presets | `dns_profile_invalid`, `dns_profile_not_found`, `dns_profile_save_failed`, `core_template_not_found`, `core_template_save_failed`, `regional_preset_config_apply_failed`, `regional_preset_config_cancelled`, `regional_preset_failed`, `regional_preset_geofiles_failed`, `regional_preset_invalid` |
| Updates | `core_update_batch_empty`, `core_update_busy`, `core_update_check_failed`, `core_update_not_selected`, `core_update_settings_invalid`, `core_update_unsupported`, `geo_update_busy`, `geo_update_failed`, `geo_update_not_selected`, `web_update_check_failed`, `web_update_install_unsupported`, `web_update_not_selected`, `web_update_runtime_unavailable`, `xray_update_failed` |
| Backup/WebDAV | `backup_archive_invalid`, `backup_archive_too_large`, `backup_create_failed`, `backup_database_incompatible`, `backup_file_empty`, `backup_restore_failed`, `backup_safety_copy_failed`, `webdav_backup_failed`, `webdav_check_failed`, `webdav_restore_download_failed` |

`subscription_update_progress` and `geo_update_progress` are informational SSE event codes, not
failure codes. A client should not translate or persist these codes; it should map them through
the backend/UI localization table and always have a fallback for unknown values.

## 9. Change policy

- Additive fields and capabilities are backward compatible.
- Enum values, event names, operation codes and JSON field names are part of the contract; removing
  or renaming them is a breaking change.
- Check endpoints can return `success: false` with HTTP `200`; always branch on `success`/`code`.
- Nova targets the contract documented here. When pairing with an older backend, verify the
  required capabilities in `GET /api/status` before enabling dependent screens.
