<?php

/**
 * https://developers.google.com/gmail/imap/imap-smtp
 * https://developers.google.com/gmail/imap/xoauth2-protocol
 * https://console.cloud.google.com/apis/dashboard
 */

use RainLoop\Model\MainAccount;
use RainLoop\Providers\Storage\Enumerations\StorageType;

class LoginGMailPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'GMail OAuth2',
		VERSION  = '2.36',
		RELEASE  = '2024-03-27',
		REQUIRED = '2.36.0',
		CATEGORY = 'Login',
		DESCRIPTION = 'GMail IMAP, Sieve & SMTP login using RFC 7628 OAuth2';

	const
		LOGIN_URI = 'https://accounts.google.com/o/oauth2/auth',
		TOKEN_URI = 'https://accounts.google.com/o/oauth2/token';

	private static ?array $auth = null;

	public function Init() : void
	{
		$this->UseLangs(true);
		$this->addJs('LoginOAuth2.js');
		$this->addHook('imap.before-login', 'clientLogin');
		$this->addHook('smtp.before-login', 'clientLogin');
		$this->addHook('sieve.before-login', 'clientLogin');

//		set_include_path(get_include_path() . PATH_SEPARATOR . __DIR__);
		spl_autoload_register(function($classname){
			if (str_starts_with($classname, 'OAuth2\\')) {
				include_once __DIR__ . strtr("\\{$classname}", '\\', DIRECTORY_SEPARATOR) . '.php';
			}
		});

		$this->addPartHook('LoginGMail', 'ServiceLoginGMail');

		// Prevent Disallowed Sec-Fetch Dest: document Mode: navigate Site: cross-site User: true
		$this->addHook('filter.http-paths', 'httpPaths');
	}

	public function httpPaths(array $aPaths) : void
	{
		if (!empty($aPaths[0]) && 'LoginGMail' === $aPaths[0]) {
			$oConfig = \RainLoop\Api::Config();
			$oConfig->Set('security', 'secfetch_allow',
				\trim($oConfig->Get('security', 'secfetch_allow', '') . ';site=cross-site', ';')
			);
		}
	}

	public function ServiceLoginGMail() : string
	{
		$oActions = \RainLoop\Api::Actions();
		$oHttp = $oActions->Http();
		$oHttp->ServerNoCache();

		try
		{
			if (isset($_GET['error'])) {
				throw new \RuntimeException($_GET['error']);
			}
			if (!isset($_GET['code']) || empty($_GET['state']) || 'gmail' !== $_GET['state']) {
				$oActions->Location(\RainLoop\Utils::WebPath());
				exit;
			}
			$oGMail = $this->gmailConnector();
			if (!$oGMail) {
				$oActions->Location(\RainLoop\Utils::WebPath());
				exit;
			}

			$iExpires = \time();
			$aResponse = $oGMail->getAccessToken(
				static::TOKEN_URI,
				'authorization_code',
				array(
					'code' => $_GET['code'],
					'redirect_uri' => $oHttp->GetFullUrl().'?LoginGMail'
				)
			);
			if (200 != $aResponse['code']) {
				if (isset($aResponse['result']['error'])) {
					throw new \RuntimeException(
						$aResponse['code']
						. ': '
						. $aResponse['result']['error']
						. ' / '
						. $aResponse['result']['error_description']
					);
				}
				throw new \RuntimeException("HTTP: {$aResponse['code']}");
			}
			$aResponse = $aResponse['result'];
			if (empty($aResponse['access_token'])) {
				throw new \RuntimeException('access_token missing');
			}
			if (empty($aResponse['refresh_token'])) {
				throw new \RuntimeException('refresh_token missing');
			}

			$sAccessToken = $aResponse['access_token'];
			$iExpires += $aResponse['expires_in'];

			$oGMail->setAccessToken($sAccessToken);
			$aUserInfo = $oGMail->fetch('https://www.googleapis.com/oauth2/v2/userinfo');
			if (200 != $aUserInfo['code']) {
				throw new \RuntimeException("HTTP: {$aResponse['code']}");
			}
			$aUserInfo = $aUserInfo['result'];
			if (empty($aUserInfo['id'])) {
				throw new \RuntimeException('unknown id');
			}
			if (empty($aUserInfo['email'])) {
				throw new \RuntimeException('unknown email address');
			}

			static::$auth = [
				'access_token' => $sAccessToken,
				'refresh_token' => $aResponse['refresh_token'],
				'expires_in' => $aResponse['expires_in'],
				'expires' => $iExpires
			];

			$oPassword = new \SnappyMail\SensitiveString($aUserInfo['id']);
			$oAccount = $oActions->LoginProcess($aUserInfo['email'], $oPassword);
//			$oAccount = MainAccount::NewInstanceFromCredentials($oActions, $aUserInfo['email'], $aUserInfo['email'], $oPassword, true);
			if ($oAccount) {
//				$oActions->SetMainAuthAccount($oAccount);
//				$oActions->SetAuthToken($oAccount);
				$oActions->StorageProvider()->Put($oAccount, StorageType::SESSION, \RainLoop\Utils::GetSessionToken(),
					\SnappyMail\Crypt::EncryptToJSON(static::$auth, $oAccount->CryptKey())
				);
			}
		}
		catch (\Exception $oException)
		{
			$oActions->Logger()->WriteException($oException, \LOG_ERR);
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
				->SetEncrypted()
		];
	}

	public function clientLogin(\RainLoop\Model\Account $oAccount, \MailSo\Net\NetClient $oClient, \MailSo\Net\ConnectSettings $oSettings) : void
	{
		if ($oAccount instanceof MainAccount && \str_ends_with($oAccount->Email(), '@gmail.com')) {
			$oActions = \RainLoop\Api::Actions();
			try {
				$aData = static::$auth ?: \SnappyMail\Crypt::DecryptFromJSON(
					$oActions->StorageProvider()->Get($oAccount, StorageType::SESSION, \RainLoop\Utils::GetSessionToken()),
					$oAccount->CryptKey()
				);
			} catch (\Throwable $oException) {
//				$oActions->Logger()->WriteException($oException, \LOG_ERR);
				return;
			}
			if (!empty($aData['expires']) && !empty($aData['access_token']) && !empty($aData['refresh_token'])) {
				if (\time() >= $aData['expires']) {
					$iExpires = \time();
					$oGMail = $this->gmailConnector();
					if ($oGMail) {
						$aRefreshTokenResponse = $oGMail->getAccessToken(
							static::TOKEN_URI,
							'refresh_token',
							array('refresh_token' => $aData['refresh_token'])
						);
						if (!empty($aRefreshTokenResponse['result']['access_token'])) {
							$aData['access_token'] = $aRefreshTokenResponse['result']['access_token'];
							$aResponse['expires'] = $iExpires + $aResponse['expires_in'];
							$oActions->StorageProvider()->Put($oAccount, StorageType::SESSION, \RainLoop\Utils::GetSessionToken(),
								\SnappyMail\Crypt::EncryptToJSON($aData, $oAccount->CryptKey())
							);
						}
					}
				}
				$oSettings->passphrase = $aData['access_token'];
				\array_unshift($oSettings->SASLMechanisms, 'OAUTHBEARER', 'XOAUTH2');
			}
		}
	}

	protected function gmailConnector() : ?\OAuth2\Client
	{
		$client_id = \trim($this->Config()->Get('plugin', 'client_id', ''));
		$client_secret = \trim($this->Config()->getDecrypted('plugin', 'client_secret', ''));
		if ($client_id && $client_secret) {
			try
			{
				$oGMail = new \OAuth2\Client($client_id, $client_secret);
				$oActions = \RainLoop\Api::Actions();
				$sProxy = $oActions->Config()->Get('labs', 'curl_proxy', '');
				if (\strlen($sProxy)) {
					$oGMail->setCurlOption(CURLOPT_PROXY, $sProxy);
					$sProxyAuth = $oActions->Config()->Get('labs', 'curl_proxy_auth', '');
					if (\strlen($sProxyAuth)) {
						$oGMail->setCurlOption(CURLOPT_PROXYUSERPWD, $sProxyAuth);
					}
				}
				return $oGMail;
			}
			catch (\Exception $oException)
			{
				$oActions->Logger()->WriteException($oException, \LOG_ERR);
			}
		}
		return null;
	}
}
