<?php
/**
 * SnappyMail login-o365 plugin
 * You need to register an app in Azure portal and add
 * a secret, redirect URIs and the following API permissions:
 *     https://outlook.office.com/IMAP.AccessAsUser.All
 *     https://outlook.office.com/SMTP.Send
 *     openid offline_access email profile
 * https://learn.microsoft.com/en-us/entra/identity-platform/reply-url#query-parameter-support-in-redirect-uris
 * Query: redirect_uri=https://{DOMAIN}/?LoginO365
 * Path:  redirect_uri=https://{DOMAIN}/LoginO365
 * 
 * If running behind nginx reverse proxy you might
 * need to add the following to your nginx config:
 * location = /LoginO365 {
 *     return 302 /?LoginO365&$args;
 * }
 */

use RainLoop\Model\MainAccount;
use RainLoop\Providers\Storage\Enumerations\StorageType;

class LoginO365Plugin extends \RainLoop\Plugins\AbstractPlugin
{
    const
        NAME     = 'Office365/Outlook OAuth2',
        VERSION  = '0.4',
        RELEASE  = '2025-12-22',
        REQUIRED = '2.36.1',
        CATEGORY = 'Login',
        DESCRIPTION = 'Office365/Outlook IMAP, Sieve & SMTP login using RFC 7628 OAuth2';

    // v2 endpoints
    const
        AUTH_URI  = 'https://login.microsoftonline.com/{{tenant}}/oauth2/v2.0/authorize',
        TOKEN_URI = 'https://login.microsoftonline.com/{{tenant}}/oauth2/v2.0/token';

    /**
     * In-request cache of decrypted token bundles, keyed by lowercase email.
     * This avoids re-decrypting the same blob multiple times during a single request.
     *
     * Shape:
     *   [
     *     'user@outlook.com' => ['access_token'=>..., 'refresh_token'=>..., 'expires'=>..., 'expires_in'=>...],
     *     ...
     *   ]
     */
    private static array $auth = [];

    public function Init() : void
    {
        $this->UseLangs(true);
        $this->addJs('LoginOAuth2.js');
        $this->addHook('imap.before-login', 'clientLogin');
        $this->addHook('smtp.before-login', 'clientLogin');
        $this->addHook('sieve.before-login', 'clientLogin');

        $this->addPartHook('LoginO365', 'ServiceLoginO365');
        // Used by JS to obtain an auth URL with signed state (for both login + add-account flows).
        $this->addJsonHook('LoginO365AuthUrl', 'DoLoginO365AuthUrl');

        // Prevent Disallowed Sec-Fetch Dest: document Mode: navigate Site: cross-site User: true
        $this->addHook('filter.http-paths', 'httpPaths');

        // Cleanup: when an additional account is removed, also remove its encrypted refresh token bundle.
        $this->addHook('json.after-AccountDelete', 'afterAccountDelete');
    }

    public function httpPaths(array &$aPaths) : void
    {
        if (!empty($_SERVER['PATH_INFO']) && \str_ends_with($_SERVER['PATH_INFO'], 'LoginO365')) {
            $aPaths = ['LoginO365'];
        }

        if (!empty($aPaths[0]) && 'LoginO365' === $aPaths[0]) {
            $oConfig = \RainLoop\Api::Config();
            $oConfig->Set('security', 'secfetch_allow',
                \trim($oConfig->Get('security', 'secfetch_allow', '') . ';site=cross-site', ';')
            );
        }
    }

    public function ServiceLoginO365() : string
    {
        $oActions = \RainLoop\Api::Actions();
        $oHttp = $oActions->Http();
        $oHttp->ServerNoCache();

        try
		{
            if (isset($_GET['error'])) {
                $desc = $_GET['error_description'] ?? '';
                throw new \RuntimeException("{$_GET['error']}: {$desc}");
            }

            // Must have code + state
            if (!isset($_GET['code']) || empty($_GET['state'])) {
                $oActions->Location(\RainLoop\Utils::WebPath());
                exit;
            }

            $oO365 = $this->o365Connector();
            if (!$oO365) {
                $oActions->Location(\RainLoop\Utils::WebPath());
                exit;
            }

            $iNow = \time();

            $redirectUri = $this->redirectUri();

            $tenant = $this->Config()->Get('plugin', 'tenant', 'common');

            $state = (string) $_GET['state'];
            $statePayload = $this->verifyAndConsumeState($state);
            if (!$statePayload) {
                $oActions->Location(\RainLoop\Utils::WebPath());
                exit;
            }

            $aTokenWrap = $oO365->getAccessToken(
                \str_replace('{{tenant}}', $tenant, static::TOKEN_URI),
                'authorization_code',
                [
                    'code' => $_GET['code'],
                    'redirect_uri' => $redirectUri
                ]
            );

            if (!\is_array($aTokenWrap) || !isset($aTokenWrap['code'])) {
                throw new \RuntimeException('Token request failed: ' . \json_encode($aTokenWrap));
            }
            if (200 !== (int)$aTokenWrap['code']) {
                $err = $aTokenWrap['result']['error'] ?? '';
                $desc = $aTokenWrap['result']['error_description'] ?? '';
                throw new \RuntimeException("Token HTTP {$aTokenWrap['code']}: {$err} / {$desc}");
            }

            $aToken = $aTokenWrap['result'] ?? [];
            $accessToken = $aToken['access_token'] ?? '';
            $refreshToken = $aToken['refresh_token'] ?? '';
            $expiresIn = (int)($aToken['expires_in'] ?? 0);
            $idToken = $aToken['id_token'] ?? '';

            if ($accessToken === '') {
                throw new \RuntimeException('access_token missing');
            }

            if ($refreshToken === '') {
                throw new \RuntimeException('refresh_token missing');
            }
            if ($idToken === '') {
                // We rely on id_token to get email/sub without Graph.
                throw new \RuntimeException('id_token missing (add openid email profile scopes)');
            }

            // Parse id_token (JWT) to get identity (sub + email)
            $claims = $this->decodeJwtPayload($idToken);
            if (!\is_array($claims)) {
                throw new \RuntimeException('Cannot decode id_token payload');
            }

            $email = $claims['email'] ?? ($claims['preferred_username'] ?? ($claims['upn'] ?? ''));
            $sub = $claims['sub'] ?? '';

            if ($sub === '') {
                throw new \RuntimeException('unknown id from id_token');
            }
            if ($email === '') {
                throw new \RuntimeException('unknown email address from id_token');
            }

            if (!$this->isSupportedEmail(\strtolower($email))) {
                throw new \RuntimeException('Unsupported email domain for this plugin');
            }

            $tokenBundle = [
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken,
                'expires_in' => $expiresIn,
                'expires' => $iNow + $expiresIn
            ];

            $op = $statePayload['op'] ?? 'login';
            if ('add' === $op) {
                $oMainAccount = $oActions->getMainAccountFromToken(false);
                if (!$oMainAccount) {
                    throw new \RuntimeException('Add-account flow requires logged in main account');
                }
                if (!empty($statePayload['main']) && $statePayload['main'] !== $oMainAccount->Email()) {
                    throw new \RuntimeException('Add-account state does not match current main account');
                }

                // Store token bundle encrypted with MAIN account crypt key (never store refresh_token unencrypted).
                // This is later used by imap/smtp/sieve.before-login for *additional* accounts.
                $this->storeAccountTokens($oMainAccount, $email, $tokenBundle);

                // Create/validate an AdditionalAccount entry exactly like SnappyMail expects in "additionalaccounts".
                // We set the "password" to the OAuth subject (sub) as an opaque secret; the plugin will inject XOAUTH2.
                $oPassword = new \SnappyMail\SensitiveString($sub);
                $oAdditional = $oActions->LoginProcess($email, $oPassword, false);
                if (!$oAdditional instanceof \RainLoop\Model\AdditionalAccount) {
                    throw new \RuntimeException('Failed to create additional account');
                }

                $asciiEmail = \SnappyMail\IDN::emailToAscii($oAdditional->Email());
                if ($asciiEmail === $oMainAccount->Email()) {
                    throw new \RuntimeException('Cannot add main account as additional');
                }

                $aAccounts = $oActions->GetAccounts($oMainAccount);
                $aEntry = $oAdditional->asTokenArray($oMainAccount);
                if (!empty($statePayload['name']) && \is_string($statePayload['name'])) {
                    $aEntry['name'] = \trim($statePayload['name']);
                } else if (isset($aAccounts[$asciiEmail]['name'])) {
                    // Preserve previous custom label if re-adding/updating.
                    $aEntry['name'] = (string) $aAccounts[$asciiEmail]['name'];
                }
                $aAccounts[$asciiEmail] = $aEntry;
                $oActions->SetAccounts($oMainAccount, $aAccounts);

                // Cache for this request (used during LoginProcess() above and any subsequent logins).
                static::$auth[\strtolower($asciiEmail)] = $tokenBundle;

                $returnHash = '';
                if (!empty($statePayload['return']) && \is_string($statePayload['return']) && \str_starts_with($statePayload['return'], '#')) {
                    $returnHash = $statePayload['return'];
                }
                $oActions->Location(\RainLoop\Utils::WebPath() . $returnHash);
                exit;
            }

            // Default: "login" flow (preserve existing behavior)
            static::$auth[\strtolower($email)] = $tokenBundle;

            // SnappyMail uses password as opaque string; plugin injects XOAUTH2 later.
            $oPassword = new \SnappyMail\SensitiveString($sub);
            $oAccount = $oActions->LoginProcess($email, $oPassword);

            if ($oAccount) {
                $oActions->StorageProvider()->Put(
                    $oAccount,
                    StorageType::SESSION,
                    \RainLoop\Utils::GetSessionToken(),
                    \SnappyMail\Crypt::EncryptToJSON($tokenBundle, $oAccount->CryptKey())
                );
            }
        }
        catch (\Throwable $e) {
            $oActions->Logger()->WriteException($e, \LOG_ERR);
        }

        $oActions->Location(\RainLoop\Utils::WebPath());
        exit;
    }

    public function configMapping() : array
    {
        return [
            \RainLoop\Plugins\Property::NewInstance('client_id')
                ->SetLabel('Client ID')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING)
                ->SetAllowedInJs(),
            \RainLoop\Plugins\Property::NewInstance('client_secret')
                ->SetLabel('Client Secret')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING)
                ->SetEncrypted(),
            \RainLoop\Plugins\Property::NewInstance('tenant')
                ->SetLabel('Tenant')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::SELECTION)
                ->SetDefaultValue(['common','consumers','organizations'])
                ->SetAllowedInJs(),
            \RainLoop\Plugins\Property::NewInstance('personal')
                // When true: redirect URI uses query parameter form "/?LoginO365" (Azure supports it).
                // When false: redirect URI uses path form "/LoginO365" (useful behind reverse proxies).
                ->SetLabel('Use "/?LoginO365" redirect URI')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
                ->SetDefaultValue(false)
                ->SetAllowedInJs(),
            \RainLoop\Plugins\Property::NewInstance('allow_any_domain')
                ->SetLabel('Allow any domain (not only outlook.com/hotmail.com/live.com)')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
                ->SetDefaultValue(false)
                ->SetAllowedInJs()
        ];
    }

    public function clientLogin(\RainLoop\Model\Account $oAccount, \MailSo\Net\NetClient $oClient, \MailSo\Net\ConnectSettings $oSettings) : void
    {
        $email = \strtolower($oAccount->Email());

        if (!$this->isSupportedEmail($email)) {
            return;
        }

        $oActions = \RainLoop\Api::Actions();

        $aData = static::$auth[$email] ?? null;
        if (!$aData) {
            try {
                if ($oAccount instanceof MainAccount) {
                    $blob = $oActions->StorageProvider()->Get(
                        $oAccount,
                        StorageType::SESSION,
                        \RainLoop\Utils::GetSessionToken()
                    );
                    $aData = \SnappyMail\Crypt::DecryptFromJSON($blob, $oAccount->CryptKey());
                } else if ($oAccount instanceof \RainLoop\Model\AdditionalAccount) {
                    $oMain = $oActions->getMainAccountFromToken(false);
                    if (!$oMain) {
                        return;
                    }
                    $blob = $oActions->StorageProvider()->Get(
                        $oMain,
                        StorageType::CONFIG,
                        $this->tokenStorageKey($email)
                    );
                    $aData = \SnappyMail\Crypt::DecryptFromJSON($blob, $oMain->CryptKey());
                }
            } catch (\Throwable $e) {
                return;
            }
        }

        if (empty($aData['access_token']) || empty($aData['refresh_token']) || empty($aData['expires'])) {
            return;
        }

        // Refresh if expired (or close to expiry)
        if (\time() >= ((int)$aData['expires'] - 30)) {
            $oO365 = $this->o365Connector();
            if ($oO365) {
                $tenant = $this->Config()->Get('plugin', 'tenant', 'common');
                $aRefreshWrap = $oO365->getAccessToken(
                    \str_replace('{{tenant}}', $tenant, static::TOKEN_URI),
                    'refresh_token',
                    ['refresh_token' => $aData['refresh_token']]
                );

                if (\is_array($aRefreshWrap) && isset($aRefreshWrap['code']) && 200 === (int)$aRefreshWrap['code']) {
                    $r = $aRefreshWrap['result'] ?? [];
                    if (!empty($r['access_token'])) {
                        $aData['access_token'] = $r['access_token'];
                    }
                    if (!empty($r['refresh_token'])) {
                        $aData['refresh_token'] = $r['refresh_token'];
                    }
                    $expiresIn = (int)($r['expires_in'] ?? 0);
                    if ($expiresIn > 0) {
                        $aData['expires'] = \time() + $expiresIn;
                        $aData['expires_in'] = $expiresIn;
                    }

                    // Persist updated bundle (encrypted).
                    if ($oAccount instanceof MainAccount) {
                        $oActions->StorageProvider()->Put(
                            $oAccount,
                            StorageType::SESSION,
                            \RainLoop\Utils::GetSessionToken(),
                            \SnappyMail\Crypt::EncryptToJSON($aData, $oAccount->CryptKey())
                        );
                    } else if ($oAccount instanceof \RainLoop\Model\AdditionalAccount) {
                        $oMain = $oActions->getMainAccountFromToken(false);
                        if ($oMain) {
                            $oActions->StorageProvider()->Put(
                                $oMain,
                                StorageType::CONFIG,
                                $this->tokenStorageKey($email),
                                \SnappyMail\Crypt::EncryptToJSON($aData, $oMain->CryptKey())
                            );
                        }
                    }
                }
            }
        }

        static::$auth[$email] = $aData;

        // Inject XOAUTH2/OAUTHBEARER
        $oSettings->passphrase = $aData['access_token'];
        \array_unshift($oSettings->SASLMechanisms, 'OAUTHBEARER', 'XOAUTH2');
    }

    /**
     * Server-side cleanup hook: after a successful AccountDelete, remove stored token bundle for that email.
     * This prevents leaving encrypted refresh tokens behind when an additional account is removed.
     */
    public function afterAccountDelete(array &$aResponse) : void
    {
        if (empty($aResponse['Result'])) {
            return;
        }
        $oActions = \RainLoop\Api::Actions();
        $oMain = $oActions->getMainAccountFromToken(false);
        if (!$oMain) {
            return;
        }
        $email = \strtolower(\SnappyMail\IDN::emailToAscii(\trim((string) $oActions->GetActionParam('emailToDelete', ''))));
        if ($email && $this->isSupportedEmail($email)) {
            $oActions->StorageProvider()->Clear($oMain, StorageType::CONFIG, $this->tokenStorageKey($email));
        }
    }

    protected function o365Connector() : ?\OAuth2\Client
    {
        $client_id = \trim($this->Config()->Get('plugin', 'client_id', ''));
        $client_secret = \trim($this->Config()->getDecrypted('plugin', 'client_secret', ''));

        if ($client_id && $client_secret) {
            try {
                $oO365 = new \OAuth2\Client($client_id, $client_secret);

                $oActions = \RainLoop\Api::Actions();
                $sProxy = $oActions->Config()->Get('labs', 'curl_proxy', '');
                if (\strlen($sProxy)) {
                    $oO365->setCurlOption(CURLOPT_PROXY, $sProxy);
                    $sProxyAuth = $oActions->Config()->Get('labs', 'curl_proxy_auth', '');
                    if (\strlen($sProxyAuth)) {
                        $oO365->setCurlOption(CURLOPT_PROXYUSERPWD, $sProxyAuth);
                    }
                }

                return $oO365;
            } catch (\Throwable $e) {
                \RainLoop\Api::Actions()->Logger()->WriteException($e, \LOG_ERR);
            }
        }

        return null;
    }

    private function decodeJwtPayload(string $jwt) : ?array
    {
        $parts = \explode('.', $jwt);
        if (\count($parts) < 2) {
            return null;
        }
        $payload = $parts[1];
        $payload .= \str_repeat('=', (4 - (\strlen($payload) % 4)) % 4);
        $json = \base64_decode(\strtr($payload, '-_', '+/'));
        if ($json === false) {
            return null;
        }
        $data = \json_decode($json, true);
        return \is_array($data) ? $data : null;
    }

    /**
     * JSON action called by JS to obtain an MS authorize URL with signed state.
     * This avoids exposing any signing secret to JS and keeps redirect_uri consistent with server logic.
     */
    public function DoLoginO365AuthUrl() : array
    {
        $oActions = \RainLoop\Api::Actions();

        $op = (string) $this->jsonParam('op', 'login');
        if (!\in_array($op, ['login', 'add'], true)) {
            return $this->jsonResponse(__FUNCTION__, false);
        }

        $email = \strtolower(\trim((string) $this->jsonParam('email', '')));
        $name = \trim((string) $this->jsonParam('name', ''));
        $returnHash = (string) $this->jsonParam('return', '');

        if ($returnHash && !\str_starts_with($returnHash, '#')) {
            $returnHash = '';
        }

        // For add-account flow, require a logged-in main account (we must write to its additionalaccounts storage).
        $oMainAccount = null;
        if ('add' === $op) {
            $oMainAccount = $oActions->getMainAccountFromToken(false);
            if (!$oMainAccount) {
                return $this->jsonResponse(__FUNCTION__, false);
            }
        }

        // Optional server-side guard: only permit supported consumer domains unless configured otherwise.
        if ($email && !$this->isSupportedEmail($email)) {
            return $this->jsonResponse(__FUNCTION__, false);
        }

        $oConfig = $this->Config();
        $client_id = \trim($oConfig->Get('plugin', 'client_id', ''));
        if (!$client_id) {
            return $this->jsonResponse(__FUNCTION__, false);
        }

        $nonce = $this->b64url(\random_bytes(16));
        // Store nonce server-side to prevent replay; consumed on callback.
        $oActions->StorageProvider()->Put(
            null,
            StorageType::NOBODY,
            $this->stateNonceKey($nonce),
            (string) \time()
        );

        $payload = [
            'v' => 1,
            'op' => $op,
            'csrf' => \RainLoop\Utils::GetCsrfToken(),
            'nonce' => $nonce,
            'ts' => \time()
        ];
        if ('add' === $op && $oMainAccount) {
            $payload['main'] = $oMainAccount->Email();
            if ($name) {
                $payload['name'] = \substr($name, 0, 100);
            }
            if ($returnHash) {
                $payload['return'] = \substr($returnHash, 0, 200);
            }
        }

        $state = $this->signState($payload);
        $tenant = $oConfig->Get('plugin', 'tenant', 'common');
        $redirectUri = $this->redirectUri();

        $params = [
                'response_type' => 'code',
                'client_id' => $client_id,
                'redirect_uri' => $redirectUri,
                'scope' => \implode(' ', [
                    'openid',
                    'offline_access',
                    'email',
                    'profile',
                    'https://outlook.office.com/IMAP.AccessAsUser.All',
                    'https://outlook.office.com/SMTP.Send',
                ]),
                'state' => $state,
                // Helps MS UI prefill, but does not change server-side validation.
        ];
        if ($email) {
            $params['login_hint'] = $email;
        }
        $authUrl = \str_replace('{{tenant}}', $tenant, static::AUTH_URI)
            . '?'
            . \http_build_query($params, '', '&', PHP_QUERY_RFC3986);

        return $this->jsonResponse(__FUNCTION__, [
            'authUrl' => $authUrl
        ]);
    }

    private function isSupportedEmail(string $email) : bool
    {
        if ((bool)$this->Config()->Get('plugin', 'allow_any_domain', false)) {
            return \str_contains($email, '@');
        }
        return \str_ends_with($email, '@hotmail.com')
            || \str_ends_with($email, '@outlook.com')
            || \str_ends_with($email, '@live.com');
    }

    /**
     * Build absolute base URL (works behind nginx reverse proxy).
     */
    private function baseUrl() : string
    {
        $scheme = (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']))
            ? $_SERVER['HTTP_X_FORWARDED_PROTO']
            : ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http');

        $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
        if (!$host) {
            throw new \RuntimeException('Cannot determine HTTP_HOST');
        }
        return $scheme . '://' . $host;
    }

    /**
     * Redirect URI used for the Azure app registration.
     * When plugin.personal=true -> "/?LoginO365"
     * When plugin.personal=false -> "/LoginO365"
     */
    private function redirectUri() : string
    {
        $base = \rtrim($this->baseUrl(), '/');
        $useQuery = (bool)$this->Config()->Get('plugin', 'personal', false);
        return $useQuery ? ($base . '/?LoginO365') : ($base . '/LoginO365');
    }

    private function tokenStorageKey(string $emailLower) : string
    {
        // Stored under MAIN account StorageType::CONFIG (encrypted with main CryptKey).
        // Email is hashed to avoid path/encoding issues across storage backends.
        return 'login-o365.tokens.' . \sha1($emailLower);
    }

    private function storeAccountTokens(MainAccount $oMainAccount, string $email, array $tokenBundle) : void
    {
        $emailLower = \strtolower(\SnappyMail\IDN::emailToAscii($email));
        \RainLoop\Api::Actions()->StorageProvider()->Put(
            $oMainAccount,
            StorageType::CONFIG,
            $this->tokenStorageKey($emailLower),
            \SnappyMail\Crypt::EncryptToJSON($tokenBundle, $oMainAccount->CryptKey())
        );
    }

    private function stateNonceKey(string $nonce) : string
    {
        return 'login-o365.state.' . $nonce;
    }

    private function b64url(string $bin) : string
    {
        return \rtrim(\strtr(\base64_encode($bin), '+/', '-_'), '=');
    }

    private function b64urlDecode(string $b64url) /*: string|false*/
    {
        $pad = (4 - (\strlen($b64url) % 4)) % 4;
        return \base64_decode(\strtr($b64url . \str_repeat('=', $pad), '-_', '+/'), true);
    }

    private function stateHmacKey() : string
    {
        // Uses the plugin client_secret (server-side only) as HMAC key.
        // This prevents any user-controlled tampering of the state payload.
        $key = \trim($this->Config()->getDecrypted('plugin', 'client_secret', ''));
        if (!$key) {
            // Fallback for misconfiguration; keeps behavior deterministic.
            $key = 'login-o365';
        }
        return $key;
    }

    private function signState(array $payload) : string
    {
        $json = \json_encode($payload);
        if (!$json) {
            $json = '{}';
        }
        $payloadB64 = $this->b64url($json);
        $sig = \hash_hmac('sha256', $payloadB64, $this->stateHmacKey(), true);
        return $payloadB64 . '.' . $this->b64url($sig);
    }

    /**
     * Verify signature + CSRF + nonce, then consumes nonce to prevent replay.
     * Returns decoded payload on success, null on failure.
     */
    private function verifyAndConsumeState(string $state) : ?array
    {
        $parts = \explode('.', $state, 2);
        if (2 !== \count($parts)) {
            return null;
        }
        [$payloadB64, $sigB64] = $parts;
        $sig = $this->b64urlDecode($sigB64);
        if ($sig === false) {
            return null;
        }

        $expected = \hash_hmac('sha256', $payloadB64, $this->stateHmacKey(), true);
        if (!\hash_equals($expected, $sig)) {
            return null;
        }

        $payloadJson = $this->b64urlDecode($payloadB64);
        if ($payloadJson === false) {
            return null;
        }
        $payload = \json_decode($payloadJson, true);
        if (!\is_array($payload) || empty($payload['csrf']) || empty($payload['nonce']) || empty($payload['op'])) {
            return null;
        }

        // Must match the current browser session.
        if ($payload['csrf'] !== \RainLoop\Utils::GetCsrfToken()) {
            return null;
        }

        // Replay protection: nonce must exist server-side and is consumed once.
        $oActions = \RainLoop\Api::Actions();
        $key = $this->stateNonceKey((string) $payload['nonce']);
        $seen = $oActions->StorageProvider()->Get(null, StorageType::NOBODY, $key);
        if (!$seen) {
            return null;
        }

        $ts = (int) ($payload['ts'] ?? 0);
        if ($ts && \abs(\time() - $ts) > 900) { // 15 minutes
            // Expired: clear nonce to avoid accumulating stale entries.
            $oActions->StorageProvider()->Clear(null, StorageType::NOBODY, $key);
            return null;
        }

        $oActions->StorageProvider()->Clear(null, StorageType::NOBODY, $key);

        return $payload;
    }
}