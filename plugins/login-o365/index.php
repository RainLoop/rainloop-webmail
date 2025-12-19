<?php
/**
 * SnappyMail login-o365 plugin
 * You need to register an app in Azure portal and add
 * a secret, redirect URIs and the following API permissions:
 *     https://outlook.office.com/IMAP.AccessAsUser.All
 *     https://outlook.office.com/SMTP.Send
 *     openid offline_access email profile
 * https://learn.microsoft.com/en-us/entra/identity-platform/reply-url#query-parameter-support-in-redirect-uris
 * Azure:    redirect_uri=https://{DOMAIN}/?LoginO365
 * Personal: redirect_uri=https://{DOMAIN}/LoginO365
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
        VERSION  = '0.3',
        RELEASE  = '2025-12-18',
        REQUIRED = '2.36.1',
        CATEGORY = 'Login',
        DESCRIPTION = 'Office365/Outlook IMAP, Sieve & SMTP login using RFC 7628 OAuth2';

    // v2 endpoints
    const
        AUTH_URI  = 'https://login.microsoftonline.com/{{tenant}}/oauth2/v2.0/authorize',
        TOKEN_URI = 'https://login.microsoftonline.com/{{tenant}}/oauth2/v2.0/token';

    private static ?array $auth = null;

    public function Init() : void
    {
        $this->UseLangs(true);
        $this->addJs('LoginOAuth2.js');
        $this->addHook('imap.before-login', 'clientLogin');
        $this->addHook('smtp.before-login', 'clientLogin');
        $this->addHook('sieve.before-login', 'clientLogin');

        $this->addPartHook('LoginO365', 'ServiceLoginO365');

        // Prevent Disallowed Sec-Fetch Dest: document Mode: navigate Site: cross-site User: true
        $this->addHook('filter.http-paths', 'httpPaths');
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
            if (!isset($_GET['code']) || empty($_GET['state']) || 'o365' !== $_GET['state']) {
                $oActions->Location(\RainLoop\Utils::WebPath());
                exit;
            }

            $oO365 = $this->o365Connector();
            if (!$oO365) {
                $oActions->Location(\RainLoop\Utils::WebPath());
                exit;
            }

            $iNow = \time();

            // Build absolute base URL (works behind nginx reverse proxy)
            $scheme = (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']))
                ? $_SERVER['HTTP_X_FORWARDED_PROTO']
                : ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http');

            $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
            if (!$host) {
                throw new \RuntimeException('Cannot determine HTTP_HOST');
            }
            $base = $scheme . '://' . $host;

            // IMPORTANT: default personal=false to match the JS default behavior
            $personal = (bool)$this->Config()->Get('plugin', 'personal', false);
            $redirectUri = $personal ? ($base . '/?LoginO365') : ($base . '/LoginO365');

            $tenant = $this->Config()->Get('plugin', 'tenant', 'common');

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

            static::$auth = [
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken,
                'expires_in' => $expiresIn,
                'expires' => $iNow + $expiresIn
            ];

            // SnappyMail uses password as opaque string; plugin injects XOAUTH2 later.
            $oPassword = new \SnappyMail\SensitiveString($sub);
            $oAccount = $oActions->LoginProcess($email, $oPassword);

            if ($oAccount) {
                $oActions->StorageProvider()->Put(
                    $oAccount,
                    StorageType::SESSION,
                    \RainLoop\Utils::GetSessionToken(),
                    \SnappyMail\Crypt::EncryptToJSON(static::$auth, $oAccount->CryptKey())
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
                ->SetLabel('Use /LoginO365 redirect path')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
                ->SetDefaultValue(false)
                ->SetAllowedInJs()
        ];
    }

    public function clientLogin(\RainLoop\Model\Account $oAccount, \MailSo\Net\NetClient $oClient, \MailSo\Net\ConnectSettings $oSettings) : void
    {
        $email = \strtolower($oAccount->Email());

        if (
            $oAccount instanceof MainAccount
            && (
                \str_ends_with($email, '@hotmail.com')
                || \str_ends_with($email, '@outlook.com')
                || \str_ends_with($email, '@live.com')
            )
        ) {
            $oActions = \RainLoop\Api::Actions();

            try {
                $blob = $oActions->StorageProvider()->Get(
                    $oAccount,
                    StorageType::SESSION,
                    \RainLoop\Utils::GetSessionToken()
                );

                $aData = static::$auth ?: \SnappyMail\Crypt::DecryptFromJSON($blob, $oAccount->CryptKey());
            } catch (\Throwable $e) {
                return;
            }

            if (empty($aData['access_token']) || empty($aData['refresh_token']) || empty($aData['expires'])) {
                return;
            }

            // Refresh if expired
            if (\time() >= (int)$aData['expires']) {
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
                        }

                        $oActions->StorageProvider()->Put(
                            $oAccount,
                            StorageType::SESSION,
                            \RainLoop\Utils::GetSessionToken(),
                            \SnappyMail\Crypt::EncryptToJSON($aData, $oAccount->CryptKey())
                        );
                    }
                }
            }

            // Inject XOAUTH2/OAUTHBEARER
            $oSettings->passphrase = $aData['access_token'];
            \array_unshift($oSettings->SASLMechanisms, 'OAUTHBEARER', 'XOAUTH2');
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
}