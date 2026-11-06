// PHP server SDK content. The version comes from sdk-versions.json, refreshed
// from Packagist on every build (scripts/sync-sdk-versions.mjs).

import versions from "../sdk-versions.json";

export const SDK_VERSION = versions.php;
export const PACKAGE = "pixlpush/pixlpush-php";

export const code = {
  install: `composer require ${PACKAGE}`,

  env: `PIXLPUSH_SDK_KEY=pp_sk_your_server_key
# Only when identity verification is on (Project settings → SDK keys)
PIXLPUSH_IDENTITY_SECRET=...`,

  plain: `<?php
require __DIR__ . '/vendor/autoload.php';

$pixlpush = new PixlPush\\Client([
    'sdkKey' => getenv('PIXLPUSH_SDK_KEY'),
    'identitySecret' => getenv('PIXLPUSH_IDENTITY_SECRET') ?: null,
    'environment' => 'production',
]);`,

  laravel: `# .env (the package is auto-discovered: nothing to register)
PIXLPUSH_SDK_KEY=pp_sk_your_server_key
PIXLPUSH_IDENTITY_SECRET=...

// Anywhere in your app
use PixlPush\\Laravel\\PixlPush;

PixlPush::track($user->pixlpush_id, 'plan_upgraded', ['plan' => 'pro']);`,

  laravelInstall: `composer require ${PACKAGE}
php artisan vendor:publish --tag=pixlpush-config   # optional: config/pixlpush.php`,

  laravelEnv: `PIXLPUSH_SDK_KEY=pp_sk_your_server_key
PIXLPUSH_IDENTITY_SECRET=          # only with identity verification
PIXLPUSH_ENVIRONMENT=              # empty: follows APP_ENV
PIXLPUSH_TIMEOUT=5
PIXLPUSH_DEBUG=false`,

  laravelUsage: `use PixlPush\\Laravel\\PixlPush;   // the facade (also aliased as \\PixlPush)

PixlPush::identify($user->pixlpush_id, ['email' => $user->email, 'name' => $user->name]);
PixlPush::track($user->pixlpush_id, 'plan_upgraded', ['plan' => 'pro']);

// Or inject the client
public function __construct(private \\PixlPush\\Client $pixlpush) {}`,

  laravelListener: `// app/Listeners/SendUserToPixlPush.php — register for Registered, Login and Verified
use Illuminate\\Auth\\Events\\Login;
use Illuminate\\Auth\\Events\\Registered;
use PixlPush\\Laravel\\PixlPush;

class SendUserToPixlPush
{
    public function handle(Registered|Login $event): void
    {
        $user = $event->user;
        PixlPush::identify($user->pixlpush_id, [
            'email' => $user->email,
            'name' => $user->name,
        ], ['clientIp' => request()->ip()]);

        // Logins show on the profile by themselves (the browser's identify): only signups are an event.
        if ($event instanceof Registered) {
            PixlPush::track($user->pixlpush_id, 'signed_up');
        }
    }
}`,

  laravelWebhook: `// A Cashier / Stripe webhook may arrive twice: the eventId makes it count once.
PixlPush::track($user->pixlpush_id, 'subscription_started', [
    'plan' => $subscription->stripe_price,
], ['eventId' => $subscription->pixlpush_event_id, 'source' => 'stripe']); // a cuid saved with the subscription`,

  laravelIds: `// A migration: one stable PixlPush id (a cuid) per user, never reused.
$table->string('pixlpush_id', 25)->nullable()->unique();

// app/Models/User.php
use PixlPush\Client;
use PixlPush\Laravel\PixlPush;

protected static function booted(): void
{
    static::creating(fn (User $user) => $user->pixlpush_id ??= Client::cuid());
    // Account deleted: PixlPush shows the user as Deleted and stops messaging them.
    static::deleted(fn (User $user) => PixlPush::deleteUser($user->pixlpush_id));
}`,

  laravelBlade: `{{-- resources/views/layouts/app.blade.php, before </body> --}}
<script src="https://cdn.jsdelivr.net/npm/@pixlpush/web@${versions.web}/dist/pixlpush.min.js"></script>
<script>
  PixlPush.init({ sdkKey: @json(config('pixlpush.sdk_key')) }).then(function () {
    var signedIn = PixlPush.getStatus().externalUserId;
  @auth
    // Once per login ("Logged in" on the profile); repeat identifies change nothing.
    if (signedIn !== @json(auth()->user()->pixlpush_id)) PixlPush.identify({!! json_encode([
      'externalUserId' => auth()->user()->pixlpush_id,
      'email' => auth()->user()->email,
      'userHash' => config('pixlpush.identity_secret') ? \\PixlPush::userHash(auth()->user()->pixlpush_id) : null,
    ]) !!});
  @else
    if (signedIn) PixlPush.reset(); // logged out since the last page: "Logged out"
  @endauth
  });
</script>`,

  laravelTesting: `<!-- phpunit.xml: an empty key disables PixlPush, so tests send nothing -->
<env name="PIXLPUSH_SDK_KEY" value=""/>`,

  codeigniter: `// app/Config/Services.php
public static function pixlpush(bool $getShared = true): \\PixlPush\\Client
{
    if ($getShared) {
        return static::getSharedInstance('pixlpush');
    }
    return new \\PixlPush\\Client([
        'sdkKey' => env('PIXLPUSH_SDK_KEY'),
        'identitySecret' => env('PIXLPUSH_IDENTITY_SECRET'),
        'environment' => ENVIRONMENT === 'production' ? 'production' : 'development',
        'onError' => fn ($e) => log_message('warning', 'PixlPush: ' . $e->getMessage()),
    ]);
}

// In a controller: service('pixlpush')->track((string) $userId, 'plan_upgraded');`,

  slim: `// Slim 4 with PHP-DI
$container->set(PixlPush\\Client::class, fn () => new PixlPush\\Client([
    'sdkKey' => $_ENV['PIXLPUSH_SDK_KEY'] ?? '',
    'identitySecret' => $_ENV['PIXLPUSH_IDENTITY_SECRET'] ?? null,
]));

$app->post('/upgrade', function ($request, $response) {
    $this->get(PixlPush\\Client::class)->track($request->getAttribute('userId'), 'plan_upgraded');
    return $response;
});`,

  yii: `// config/web.php (Yii 2)
'container' => [
    'singletons' => [
        PixlPush\\Client::class => fn () => new PixlPush\\Client([
            'sdkKey' => getenv('PIXLPUSH_SDK_KEY'),
            'environment' => YII_ENV_PROD ? 'production' : 'development',
        ]),
    ],
],

// Anywhere: Yii::$container->get(PixlPush\\Client::class)->track((string) $id, 'plan_upgraded');`,

  drupal: `# mymodule.services.yml (Drupal 9/10/11)
services:
  mymodule.pixlpush:
    class: PixlPush\\Client
    arguments:
      - sdkKey: '%env(PIXLPUSH_SDK_KEY)%'

# \\Drupal::service('mymodule.pixlpush')->track((string) $account->id(), 'course_completed');`,

  symfonyTerminate: `// Long-running Symfony (RoadRunner, FrankenPHP worker, Messenger): flush per request / message
use PixlPush\\Client;
use Symfony\\Component\\EventDispatcher\\Attribute\\AsEventListener;
use Symfony\\Component\\HttpKernel\\Event\\TerminateEvent;
use Symfony\\Component\\Messenger\\Event\\WorkerMessageHandledEvent;

final class FlushPixlPush
{
    public function __construct(private Client $pixlpush) {}

    #[AsEventListener(TerminateEvent::class)]
    #[AsEventListener(WorkerMessageHandledEvent::class)]
    public function __invoke(): void
    {
        $this->pixlpush->flush();
    }
}`,

  longRunning: `// Swoole / ReactPHP / any loop that serves many requests in one process
$server->on('request', function ($req, $res) use ($pixlpush) {
    handle($req, $res);    // your code calls $pixlpush->track(...)
    $pixlpush->flush();    // after the response is sent
});`,

  noComposer: `// No Composer (legacy apps, small sites): copy src/ and require two files
require __DIR__ . '/pixlpush/PixlPushException.php';
require __DIR__ . '/pixlpush/Client.php';`,

  symfony: `# config/services.yaml
services:
  PixlPush\\Client:
    arguments:
      - sdkKey: '%env(PIXLPUSH_SDK_KEY)%'
        identitySecret: '%env(default::PIXLPUSH_IDENTITY_SECRET)%'
        environment: production # development | staging | production (not "dev"/"prod")

# Then inject PixlPush\\Client into a controller or service.`,

  identify: `// After signup or login, and when the profile changes.
$pixlpush->identify($user->pixlpush_id, [
    'email' => $user->email,
    'name' => $user->name,
    'emailConsent' => $user->accepts_marketing,
    'userType' => $user->plan,             // e.g. "free", "pro"
    'preferredLanguage' => $user->locale,
    'properties' => ['company' => $user->company, 'seats' => $user->seats],
]);`,

  update: `$pixlpush->updateUser($user->pixlpush_id, ['properties' => ['seats' => 6]]);
$pixlpush->setConsent($user->pixlpush_id, ['email' => false]);`,

  clientIp: `// Only in the user's own request (not in a webhook, job or admin action).
$pixlpush->identify($user->pixlpush_id, ['email' => $user->email], [
    'clientIp' => $request->ip(),
]);`,

  track: `$pixlpush->track($user->pixlpush_id, 'purchase_completed', [
    'plan' => 'pro',
    'amount' => 49.0,
    'currency' => 'USD',
]);`,

  idempotent: `// A webhook may arrive twice: the same eventId is recorded once.
$pixlpush->track($order->user->pixlpush_id, 'purchase_completed', ['amount' => $order->total], [
    'eventId' => $order->pixlpush_event_id,   // a cuid saved with the order (Client::cuid()); 8–200 characters
    'timestamp' => $order->paid_at,           // DateTimeInterface or ISO-8601 string
    'source' => 'stripe_webhook',
]);`,

  batch: `$pixlpush->trackBatch([
    ['userId' => 'cmw4tzovh05ivbpm0nt3r26vp', 'name' => 'lesson_completed', 'properties' => ['lesson' => 3]],
    ['userId' => 'cmw4u0b2k07jvbpm0q8xd1h3a', 'name' => 'lesson_completed', 'properties' => ['lesson' => 1]],
]);`,

  flush: `// Long-running workers, queues and CLI scripts: send now.
$result = $pixlpush->flush(); // ['processed' => 2, 'failed' => 0, 'remaining' => 0]`,

  deleteUser: `// After you deleted the account. Needs identitySecret: the request is signed.
$pixlpush->deleteUser($user->pixlpush_id); // true when a user was deleted`,

  cuid: `use PixlPush\Client;

// At sign-up: a stable id that is never reused. Store it with the user.
$user->pixlpush_id = Client::cuid(); // e.g. "cmw4tzovh05ivbpm0nt3r26vp"`,

  userHash: `// Server: compute the hash for the browser SDK. The secret never leaves PHP.
$hash = $pixlpush->userHash($user->pixlpush_id);`,

  browser: `<!-- In your layout, before </body> -->
<script src="https://cdn.jsdelivr.net/npm/@pixlpush/web@${versions.web}/dist/pixlpush.min.js"></script>
<script>
  PixlPush.init({ sdkKey: <?= json_encode(getenv('PIXLPUSH_SDK_KEY')) ?> }).then(function () {
    var signedIn = PixlPush.getStatus().externalUserId;
<?php if ($user): ?>
    // Once per login ("Logged in" on the profile); repeat identifies change nothing.
    if (signedIn !== <?= json_encode($user->pixlpush_id) ?>) PixlPush.identify(<?= json_encode([
      'externalUserId' => $user->pixlpush_id,
      'email' => $user->email,
      'userHash' => $pixlpush->userHash($user->pixlpush_id),
    ]) ?>);
<?php else: ?>
    if (signedIn) PixlPush.reset(); // logged out since the last page: "Logged out"
<?php endif; ?>
  });
</script>`,

  worker: `curl -o public/pixlpush-sw.js https://cdn.jsdelivr.net/npm/@pixlpush/web@${versions.web}/dist/pixlpush-sw.js`,

  button: `<button type="button" onclick="PixlPush.requestPushPermission()">Turn on notifications</button>`,

  errors: `$pixlpush = new PixlPush\\Client([
    'sdkKey' => getenv('PIXLPUSH_SDK_KEY'),
    'onError' => function (PixlPush\\PixlPushException $e) {
        error_log("PixlPush {$e->errorCode} ({$e->statusCode}): {$e->getMessage()}");
    },
]);

// Or throw instead (tests, scripts):
$strict = new PixlPush\\Client(['sdkKey' => '...', 'strict' => true]);`,

  verify: `php -r '
require "vendor/autoload.php";
$p = new PixlPush\\Client(["sdkKey" => getenv("PIXLPUSH_SDK_KEY"), "strict" => true]);
$p->identify("test-user-1", ["email" => "you@example.com"]);
$p->track("test-user-1", "sdk_test");
var_dump($p->flush());'`,
};

export const configOptions = [
  ["sdkKey", "string", "required", "The project's SDK key (pp_sk_…). Create one in Project settings → SDK keys."],
  ["projectId", "string", "—", "Project ID or slug. If set, the API checks that the key belongs to it."],
  ["identitySecret", "string", "—", "Identity verification secret. Adds userHash to identify() and enables userHash()."],
  ["environment", "string", "\"production\"", "development, staging or production. Stored on users and events."],
  ["platform", "string", "\"web\"", "Recorded as the user's signup source and on events."],
  ["timeout", "float", "10", "Seconds per request."],
  ["autoFlush", "bool", "true", "Send the queue when the PHP process ends (the Laravel integration flushes at terminate instead)."],
  ["apiBaseUrl", "string", "PixlPush API", "Only for a local backend, e.g. http://localhost:4000."],
  ["onError", "callable", "—", "Receives every PixlPushException."],
  ["strict", "bool", "false", "Throw PixlPushException instead of reporting to onError."],
  ["debug", "bool", "false", "error_log every request and failure."],
];

/** Where each PHP stack sends the queue. */
export const runtimes = [
  ["php-fpm, Apache mod_php, CGI", "Automatically, when the request ends (after the response for php-fpm)."],
  ["CLI scripts, cron", "Automatically, when the script ends."],
  ["Laravel (php-fpm, Octane, Horizon, queue:work, Artisan)", "Automatically: after the response, after each job and after each command."],
  ["Symfony Messenger, RoadRunner, FrankenPHP worker mode", "Call flush() at kernel.terminate and after each message."],
  ["Swoole, ReactPHP, Amp, custom daemons", "Call flush() after each request or unit of work."],
];

export const laravelConfig = [
  ["PIXLPUSH_SDK_KEY", "sdk_key", "The project's SDK key. Empty: PixlPush is off."],
  ["PIXLPUSH_PROJECT_ID", "project_id", "Optional project check."],
  ["PIXLPUSH_IDENTITY_SECRET", "identity_secret", "Identity verification secret."],
  ["PIXLPUSH_ENVIRONMENT", "environment", "Empty: production when APP_ENV=production, staging when staging, else development."],
  ["PIXLPUSH_API_URL", "api_url", "Only for a local backend."],
  ["PIXLPUSH_TIMEOUT", "timeout", "Seconds per request (default 5)."],
  ["PIXLPUSH_DEBUG", "debug", "Log every request."],
  ["PIXLPUSH_STRICT", "strict", "Throw instead of logging."],
];

export const methods = [
  ["identify($userId, $fields, $options)", "bool", "Create or update a user: email, name, accountStatus, userType, country, region, timezone, preferredLanguage, emailConsent, properties. $options['clientIp'] locates the user."],
  ["updateUser($userId, $fields)", "bool", "Same as identify()."],
  ["setConsent($userId, ['email' => bool])", "bool", "Email consent. Analytics and push consent belong to the browser SDK."],
  ["track($userId, $name, $properties, $options)", "?string", "Queue an event. Returns the eventId, or null if it was rejected. Options: eventId, timestamp, source, sessionId."],
  ["trackBatch($events)", "array", "Up to 100 events: each userId, name, properties, options. Returns their eventIds."],
  ["flush()", "array", "Send the queue now: processed, failed, remaining."],
  ["queueSize()", "int", "Calls waiting to be sent."],
  ["isEnabled()", "bool", "False when no sdkKey was given: every call is dropped."],
  ["userHash($userId)", "string", "HMAC-SHA256 of the user id with identitySecret, for the browser SDK."],
  ["deleteUser($userId)", "bool", "The user deleted their account: shown as Deleted, devices unlinked, push and email stop, history kept; logging in again restores them. Sent at once; needs identitySecret. True when a user was deleted."],
  ["Client::cuid()", "string", "A new cuid, the id format of every PixlPush SDK: use it for your users' stable PixlPush id or an event id."],
];

export const errorCodes = [
  ["SDK_KEY_MISSING", "No sdkKey: the client is disabled and drops every call (thrown only in strict mode).", "Set the key; isEnabled() tells you whether it is on."],
  ["SDK_KEY_INVALID", "The key is unknown or revoked. The rest of the queue is dropped.", "Create a new key in Project settings → SDK keys."],
  ["SDK_KEY_PROJECT_MISMATCH", "projectId doesn't match the key's project.", "Fix projectId or remove it."],
  ["PROJECT_INACTIVE", "The project is deactivated.", "Restore the project or its subscription."],
  ["VALIDATION_ERROR", "A name, property or field breaks the rules, or the API rejected it (422).", "Read the message; see Events → Names and properties."],
  ["PAYLOAD_TOO_LARGE", "The request body is too big.", "Send fewer or smaller properties."],
  ["RATE_LIMITED", "Too many requests from your server's IP.", "Batch events; avoid one request per event in loops."],
  ["TIMEOUT", "The API didn't answer within timeout (retried once).", "Raise timeout, or track from a queued job."],
  ["NETWORK_ERROR", "Connection failure or a 5xx (retried once).", "Check outbound HTTPS from your server."],
];

export const troubleshooting = [
  ["Nothing arrives, no error", "The script exits through a fatal error before shutdown, or autoFlush is off.", "Call flush() yourself; turn on debug and check the PHP error log."],
  ["Events show under a different user than the browser", "The browser and the server use different user ids.", "Pass the same id, as a string, to the browser's identify() and the server's track()."],
  ["IDENTITY_VERIFICATION_FAILED (422)", "Identity verification is on, but the userHash is missing or wrong.", "Set identitySecret on the server client; pass userHash to the browser's identify()."],
  ["Requests are slow at the end of a page", "The queue is sent when the request ends.", "Lower timeout, call fastcgi_finish_request() first, or track from a queued job."],
  ["NETWORK_ERROR: Neither the curl extension nor allow_url_fopen", "The host allows no outbound HTTP from PHP.", "Install php-curl, or enable allow_url_fopen in php.ini."],
  ["Nothing sent from a queue worker or Octane", "Long-running processes never end the request.", "Laravel flushes for you; elsewhere call flush() after each job or request."],
  ["Nothing sent, isEnabled() is false", "The sdkKey is empty (env var not loaded, config cached before it was set).", "Set PIXLPUSH_SDK_KEY; in Laravel run php artisan config:clear."],
];
