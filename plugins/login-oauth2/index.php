<?php

class LoginOAuth2Plugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'OAuth2',
		VERSION  = '1.1',
		RELEASE  = '2022-11-11',
		REQUIRED = '2.21.0',
		CATEGORY = 'Login',
		DESCRIPTION = 'IMAP, Sieve & SMTP login using RFC 7628 OAuth2';

	const
		LOGIN_URI = 'https://accounts.google.com/o/oauth2/auth',
		TOKEN_URI = 'https://accounts.google.com/o/oauth2/token',
		GMAIL_TOKENS_PREFIX = ':GAT:';

	public function Init() : void
	{
		$this->UseLangs(true);
		$this->addJs('LoginOAuth2.js');
//		$this->addHook('imap.before-connect', array($this, $oImapClient, $oSettings));
//		$this->addHook('imap.after-connect', array($this, $oImapClient, $oSettings));
		$this->addHook('imap.before-login', 'clientLogin');
//		$this->addHook('imap.after-login', array($this, $oImapClient, $oSettings));
//		$this->addHook('smtp.before-connect', array($this, $oSmtpClient, $oSettings));
//		$this->addHook('smtp.after-connect', array($this, $oSmtpClient, $oSettings));
		$this->addHook('smtp.before-login', 'clientLogin');
//		$this->addHook('smtp.after-login', array($this, $oSmtpClient, $oSettings));
//		$this->addHook('sieve.before-connect', array($this, $oSieveClient, $oSettings));
//		$this->addHook('sieve.after-connect', array($this, $oSieveClient, $oSettings));
		$this->addHook('sieve.before-login', 'clientLogin');
//		$this->addHook('sieve.after-login', array($this, $oSieveClient, $oSettings));
		$this->addHook('filter.account', 'filterAccount');

//		set_include_path(get_include_path() . PATH_SEPARATOR . __DIR__);
		spl_autoload_register(function($classname){
			if (str_starts_with($classname, 'OAuth2\\')) {
				include_once __DIR__ . strtr("\\{$sClassName}", '\\', DIRECTORY_SEPARATOR) . '.php';
			}
		});
	}

	public function configMapping() : array
	{
		return [
			\RainLoop\Plugins\Property::NewInstance('client_id')
				->SetLabel('Client ID')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING),
			\RainLoop\Plugins\Property::NewInstance('client_secret')
				->SetLabel('Client Secret')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING),
		];
	}

	public function clientLogin(\RainLoop\Model\Account $oAccount, \MailSo\Net\NetClient $oClient, \MailSo\Net\ConnectSettings $oSettings) : void
	{
		$sPassword = $oSettings->Password;
		$iGatLen = \strlen(static::GMAIL_TOKENS_PREFIX);
		if ($sPassword && static::GMAIL_TOKENS_PREFIX === \substr($sPassword, 0, $iGatLen)) {
			$aTokens = \json_decode(\substr($sPassword, $iGatLen));
			$sAccessToken = !empty($aTokens[0]) ? $aTokens[0] : '';
			$sRefreshToken = !empty($aTokens[1]) ? $aTokens[1] : '';
		}
		if ($sAccessToken && $sRefreshToken) {
			$oSettings->Password = $this->gmailRefreshToken($sAccessToken, $sRefreshToken);
			\array_unshift($oSettings->SASLMechanisms, 'OAUTHBEARER', 'XOAUTH2');
		}
	}

	public function filterAccount(\RainLoop\Model\Account $oAccount) : void
	{
		if ($oAccount instanceof \RainLoop\Model\MainAccount) {
			/**
			 * TODO
			 * Because password rotates, so does the CryptKey.
			 * So we need to securely save a cryptkey.
			 * Encrypted using the old/new refresh token is an option:
			 *   1. decrypt cryptkey with the old refresh token
			 *   2. $oAccount->SetCryptKey('cryptkey')
			 *   3. encrypt cryptkey with the new refresh token
			 */
		}
	}

	protected function loginProcess(&$oAccount, $sEmail, $sPassword) : int
	{
		$oActions = \RainLoop::Actions();
		$iErrorCode = \RainLoop\Notifications::UnknownError;
		try
		{
			$oAccount = $oActions->LoginProcess($sEmail, $sPassword);
			if ($oAccount instanceof \RainLoop\Model\Account) {
				$oActions->AuthToken($oAccount);
				$iErrorCode = 0;
			} else {
				$oAccount = null;
				$iErrorCode = \RainLoop\Notifications::AuthError;
			}
		}
		catch (\RainLoop\Exceptions\ClientException $oException)
		{
			$iErrorCode = $oException->getCode();
		}
		catch (\Exception $oException)
		{
			unset($oException);
			$iErrorCode = \RainLoop\Notifications::UnknownError;
		}

		return $iErrorCode;
	}

	/**
	 * GMail
	 */

	protected static function gmailTokensPassword($sAccessToken, $sRefreshToken) : string
	{
		return static::GMAIL_TOKENS_PREFIX . \json_encode(array($sAccessToken, $sRefreshToken));
	}

	protected function gmailStoreTokens($oCache, $sAccessToken, $sRefreshToken) : void
	{
		$sCacheKey = 'tokens='.\sha1($sRefreshToken);
		$oCache->Set($sCacheKey, $sAccessToken);
		$oCache->SetTimer($sCacheKey);
	}

	protected function gmailRefreshToken($sAccessToken, $sRefreshToken) : string
	{
		$oActions = \RainLoop::Actions();
		$oAccount = $oActions->getAccountFromToken(false);
		$oDomain  = $oAccount->Domain();
		$oLogger  = $oImapClient->Logger();
		if ($oAccount && $oActions->GetIsJson()) {
			$oCache = $oActions->Cacher($oAccount);
			$sCacheKey = 'tokens='.\sha1($sRefreshToken);

			$sCachedAccessToken = $oCache->Get($sCacheKey);
			$iTime = $oCache->GetTimer($sCacheKey);

			if (!$sCachedAccessToken || !$iTime) {
				$this->gmailStoreTokens($oCache, $sAccessToken, $sRefreshToken);
			} else if (\time() - 1200 > $iTime) { // 20min
				$oGMail = $this->gmailConnector();
				if ($oGMail) {
					$aRefreshTokenResponse = $oGMail->getAccessToken(
						static::TOKEN_URI,
						'refresh_token',
						array('refresh_token' => $sRefreshToken)
					);
					if (!empty($aRefreshTokenResponse['result']['access_token'])) {
						$sCachedAccessToken = $aRefreshTokenResponse['result']['access_token'];
						$this->gmailStoreTokens($oCache, $sCachedAccessToken, $sRefreshToken);
/*
						$oAccount->SetPassword(static::gmailTokensPassword($sCachedAccessToken, $sRefreshToken));
						$oActions->AuthToken($oAccount);
//						$oActions->SetUpdateAuthToken($oActions->GetSpecAuthToken());
							$oActions->sUpdateAuthToken = $oActions->GetSpecAuthToken();
							$sUpdateToken = $oActions->GetUpdateAuthToken();
							if ($sUpdateToken) {
								$aResponseItem['UpdateToken'] = $sUpdateToken;
							}
*/
					}
				}
			}

			if ($sCachedAccessToken) {
				return $sCachedAccessToken;
			}
		}

		return $sAccessToken;
	}

	protected function gmailConnector() : ?\OAuth2\Client
	{
		$oGMail = null;
		$oActions = \RainLoop::Actions();
		$client_id = \trim($this->Config()->Get('plugin', 'client_id', ''));
		$client_secret = \trim($this->Config()->Get('plugin', 'client_secret', ''));
		if ($client_id && $client_secret) {
//			include_once __DIR__ . '/OAuth2/Client.php';
//			include_once __DIR__ . '/OAuth2/GrantType/IGrantType.php';
//			include_once __DIR__ . '/OAuth2/GrantType/AuthorizationCode.php';
//			include_once __DIR__ . '/OAuth2/GrantType/RefreshToken.php';

			try
			{
				$oGMail = new \OAuth2\Client($client_id, $client_secret);
				$sProxy = $oActions->Config()->Get('labs', 'curl_proxy', '');
				if (\strlen($sProxy)) {
					$oGMail->setCurlOption(CURLOPT_PROXY, $sProxy);
					$sProxyAuth = $oActions->Config()->Get('labs', 'curl_proxy_auth', '');
					if (\strlen($sProxyAuth)) {
						$oGMail->setCurlOption(CURLOPT_PROXYUSERPWD, $sProxyAuth);
					}
				}
			}
			catch (\Exception $oException)
			{
				$oActions->Logger()->WriteException($oException, \LOG_ERR);
			}
		}

		return $oGMail;
	}

	protected function gmailPopupService() : string
	{
		$sLoginUrl = '';
		$oAccount = null;
		$oActions = \RainLoop::Actions();
		$oHttp    = $oActions->Http();

		$bLogin = false;
		$iErrorCode = \RainLoop\Notifications::UnknownError;

		try
		{
			$oGMail = $this->gmailConnector();
			if ($oHttp->HasQuery('error')) {
				$iErrorCode = ('access_denied' === $oHttp->GetQuery('error')) ?
					\RainLoop\Notifications::SocialGMailLoginAccessDisable : \RainLoop\Notifications::UnknownError;
			} else if ($oGMail) {
				$oAccount = $oActions->GetAccount();
				$bLogin = !$oAccount;

				$sCheckToken = '';
				$sCheckAuth = '';
				$sState = $oHttp->GetQuery('state');
				if (!empty($sState)) {
					$aParts = explode('|', $sState, 3);
					$sCheckToken = !empty($aParts[1]) ? $aParts[1] : '';
					$sCheckAuth = !empty($aParts[2]) ? $aParts[2] : '';
				}

				$sRedirectUrl = $oHttp->GetFullUrl().'?SocialGMail';
				if (!$oHttp->HasQuery('code')) {
					$aParams = array(
						'scope' => \trim(\implode(' ', array(
							'https://www.googleapis.com/auth/userinfo.email',
							'https://www.googleapis.com/auth/userinfo.profile',
							'https://mail.google.com/'
						))),
						'state' => '1|'.\RainLoop\Utils::GetConnectionToken().'|'.$oActions->GetSpecAuthToken(),
						'response_type' => 'code'
					);

					$aParams['access_type'] = 'offline';
					// $aParams['prompt'] = 'consent';

					$sLoginUrl = $oGMail->getAuthenticationUrl(static::LOGIN_URI, $sRedirectUrl, $aParams);
				} else if (!empty($sState) && $sCheckToken === \RainLoop\Utils::GetConnectionToken()) {
					if (!empty($sCheckAuth)) {
						$oActions->SetSpecAuthToken($sCheckAuth);
						$oAccount = $oActions->GetAccount();
						$bLogin = !$oAccount;
					}

					$aAuthorizationCodeResponse = $oGMail->getAccessToken(
						static::TOKEN_URI,
						'authorization_code',
						array(
							'code' => $oHttp->GetQuery('code'),
							'redirect_uri' => $sRedirectUrl
						)
					);

					$sAccessToken = !empty($aAuthorizationCodeResponse['result']['access_token']) ? $aAuthorizationCodeResponse['result']['access_token'] : '';
					$sRefreshToken = !empty($aAuthorizationCodeResponse['result']['refresh_token']) ? $aAuthorizationCodeResponse['result']['refresh_token'] : '';

					if (!empty($sAccessToken)) {
						$oGMail->setAccessToken($sAccessToken);
						$aUserInfoResponse = $oGMail->fetch('https://www.googleapis.com/oauth2/v2/userinfo');

						if (!empty($aUserInfoResponse['result']['id'])) {
							if ($bLogin) {
								$aUserData = null;
								if (!empty($aUserInfoResponse['result']['email'])) {
									$aUserData = array(
										'Email' => $aUserInfoResponse['result']['email'],
										'Password' => static::gmailTokensPassword($sAccessToken, $sRefreshToken)
									);
								}

								if ($aUserData && \is_array($aUserData) && !empty($aUserData['Email']) && isset($aUserData['Password'])) {
									$iErrorCode = $this->loginProcess($oAccount, $aUserData['Email'], $aUserData['Password']);
								} else {
									$iErrorCode = \RainLoop\Notifications::SocialGMailLoginAccessDisable;
								}
							}
						}
					}
				}
			}
		}
		catch (\Exception $oException)
		{
			$oActions->Logger()->WriteException($oException, \LOG_ERR);
		}

		$oActions = \RainLoop::Actions();
		$oActions->Http()->ServerNoCache();
		\header('Content-Type: text/html; charset=utf-8');
		$sHtml = \file_get_contents(APP_VERSION_ROOT_PATH.'app/templates/Social.html');
		if ($sLoginUrl) {
			$sHtml = \strtr($sHtml, array(
				'{{RefreshMeta}}' => '<meta http-equiv="refresh" content="0; URL='.$sLoginUrl.'" />',
				'{{Script}}' => ''
			));
		} else {
			$sCallBackType = $bLogin ? '_login' : '';
			$sConnectionFunc = 'rl_'.\md5(\RainLoop\Utils::GetConnectionToken()).'_gmail'.$sCallBackType.'_service';
			$sHtml = \strtr($sHtml, array(
				'{{RefreshMeta}}' => '',
				'{{Script}}' => '<script data-cfasync="false">opener && opener.'.$sConnectionFunc.' && opener.'.
					$sConnectionFunc.'('.$iErrorCode.'); self && self.close && self.close();</script>'
			));
		}

		$bAppCssDebug = $oActions->Config()->Get('labs', 'use_app_debug_css', false);
		return \strtr($sHtml, array(
			'{{Stylesheet}}' => $oActions->StaticPath('css/social'.($bAppCssDebug ? '' : '.min').'.css'),
			'{{Icon}}' => 'gmail'
		));
	}
}
