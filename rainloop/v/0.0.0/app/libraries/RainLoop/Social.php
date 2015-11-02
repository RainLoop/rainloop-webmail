<?php

namespace RainLoop;

class Social
{
	/**
	 * @var \MailSo\Base\Http
	 */
	private $oHttp;

	/**
	 * @var \RainLoop\Actions
	 */
	private $oActions;

	/**
	 *
	 * @param \MailSo\Base\Http $oHttp
	 * @param \RainLoop\Actions $oActions
	 */
	public function __construct($oHttp, $oActions)
	{
		$this->oHttp = $oHttp;
		$this->oActions = $oActions;
	}

	/**
	 * @return bool
	 */
	public function GoogleDisconnect($oAccount)
	{
		$oGoogle = $this->GoogleConnector();
		if ($oAccount && $oGoogle)
		{
			$oSettings = $this->oActions->SettingsProvider()->Load($oAccount);
			$sEncodedeData = $oSettings->GetConf('GoogleAccessToken', '');

			if (!empty($sEncodedeData))
			{
				$aData = \RainLoop\Utils::DecodeKeyValues($sEncodedeData);
				if (\is_array($aData) && !empty($aData['id']))
				{
					$this->oActions->StorageProvider()->Clear(null,
						\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
						$this->GoogleUserLoginStorageKey($oGoogle, $aData['id'])
					);
				}
			}

			$oSettings->SetConf('GoogleAccessToken', '');
			$oSettings->SetConf('GoogleSocialName', '');

			return $this->oActions->SettingsProvider()->Save($oAccount, $oSettings);
		}

		return false;
	}

	/**
	 * @return bool
	 */
	public function FacebookDisconnect($oAccount)
	{
		$oFacebook = $this->FacebookConnector($oAccount ? $oAccount : null);
		if ($oAccount && $oFacebook)
		{
			$oSettings = $this->oActions->SettingsProvider()->Load($oAccount);

			$sEncodedeData = $oSettings->GetConf('FacebookAccessToken', '');

			if (!empty($sEncodedeData))
			{
				$aData = \RainLoop\Utils::DecodeKeyValues($sEncodedeData);
				if (is_array($aData) && isset($aData['id']))
				{
					$this->oActions->StorageProvider()->Clear(null,
						\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
						$this->FacebookUserLoginStorageKey($oFacebook, $aData['id'])
					);
				}
			}

			$oSettings->SetConf('FacebookAccessToken', '');
			$oSettings->SetConf('FacebookSocialName', '');

			return $this->oActions->SettingsProvider()->Save($oAccount, $oSettings);
		}

		return false;
	}

	/**
	 * @return bool
	 */
	public function TwitterDisconnect($oAccount)
	{
		$oTwitter = $this->TwitterConnector();
		if ($oAccount && $oTwitter)
		{
			$oSettings = $this->oActions->SettingsProvider()->Load($oAccount);
			$sEncodedeData = $oSettings->GetConf('TwitterAccessToken', '');

			if (!empty($sEncodedeData))
			{
				$aData = \RainLoop\Utils::DecodeKeyValues($sEncodedeData);
				if (is_array($aData) && isset($aData['user_id']))
				{
					$this->oActions->StorageProvider()->Clear(null,
						\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
						$this->TwitterUserLoginStorageKey($oTwitter, $aData['user_id'])
					);
				}
			}

			$oSettings->SetConf('TwitterAccessToken', '');
			$oSettings->SetConf('TwitterSocialName', '');

			return $this->oActions->SettingsProvider()->Save($oAccount, $oSettings);
		}

		return false;
	}

	/**
	 * @return string
	 */
	public function GooglePopupService($bGmail = false)
	{
		$sResult = '';
		$sLoginUrl = '';
		$oAccount = null;

		$bLogin = false;
		$iErrorCode = \RainLoop\Notifications::UnknownError;

		try
		{
			$oGoogle = $this->GoogleConnector();
			if ($this->oHttp->HasQuery('error'))
			{
				$iErrorCode = ('access_denied' === $this->oHttp->GetQuery('error')) ?
					\RainLoop\Notifications::SocialGoogleLoginAccessDisable : \RainLoop\Notifications::UnknownError;
			}
			else if ($oGoogle)
			{
				$oAccount = $this->oActions->GetAccount();
				$bLogin = !$oAccount;

				$sCheckToken = '';
				$sCheckAuth = '';
				$sState = $this->oHttp->GetQuery('state');
				if (!empty($sState))
				{
					$aParts = explode('|', $sState, 3);

					if (!$bGmail)
					{
						$bGmail = !empty($aParts[0]) ? '1' === (string) $aParts[0] : false;
					}

					$sCheckToken = !empty($aParts[1]) ? $aParts[1] : '';
					$sCheckAuth = !empty($aParts[2]) ? $aParts[2] : '';
				}

				$sRedirectUrl = $this->oHttp->GetFullUrl().'?SocialGoogle';
				if (!$this->oHttp->HasQuery('code'))
				{
					$aParams = array(
						'scope' => \trim(\implode(' ', array(
							'https://www.googleapis.com/auth/userinfo.email',
							'https://www.googleapis.com/auth/userinfo.profile',
							$bGmail ? 'https://mail.google.com/' : ''
						))),
						'state' => ($bGmail ? '1' : '0').'|'.\RainLoop\Utils::GetConnectionToken().'|'.$this->oActions->GetSpecAuthToken(),
						'response_type' => 'code'
					);

//					if ($bGmail)
//					{
//						$aParams['access_type'] = 'offline';
//						$aParams['approval_prompt'] = 'force';
//					}

					$sLoginUrl = $oGoogle->getAuthenticationUrl('https://accounts.google.com/o/oauth2/auth', $sRedirectUrl, $aParams);
				}
				else if (!empty($sState) && $sCheckToken === \RainLoop\Utils::GetConnectionToken())
				{
					if (!empty($sCheckAuth))
					{
						$this->oActions->SetSpecAuthToken($sCheckAuth);
						$oAccount = $this->oActions->GetAccount();
						$bLogin = !$oAccount;
					}

					$aParams = array('code' => $this->oHttp->GetQuery('code'), 'redirect_uri' => $sRedirectUrl);
					$aAuthorizationResponse = $oGoogle->getAccessToken('https://accounts.google.com/o/oauth2/token', 'authorization_code', $aParams);

					if (!empty($aAuthorizationResponse['result']['access_token']))
					{
						$oGoogle->setAccessToken($aAuthorizationResponse['result']['access_token']);
						$aUserInfoResponse = $oGoogle->fetch('https://www.googleapis.com/oauth2/v2/userinfo');

						if (!empty($aUserInfoResponse['result']['id']))
						{
							if ($bLogin)
							{
								$aUserData = null;
								if ($bGmail)
								{
									if (!empty($aUserInfoResponse['result']['email']))
									{
										$aUserData = array(
											'Email' => $aUserInfoResponse['result']['email'],
											'Password' => APP_GOOGLE_ACCESS_TOKEN_PREFIX.$aAuthorizationResponse['result']['access_token']
										);
									}
								}
								else
								{
									$sUserData = $this->oActions->StorageProvider()->Get(null,
										\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
										$this->GoogleUserLoginStorageKey($oGoogle, $aUserInfoResponse['result']['id'])
									);

									$aUserData = \RainLoop\Utils::DecodeKeyValues($sUserData);
								}

								if ($aUserData && \is_array($aUserData) &&
									!empty($aUserData['Email']) && isset($aUserData['Password']))
								{
									$iErrorCode = $this->loginProcess($oAccount, $aUserData['Email'], $aUserData['Password']);
								}
								else
								{
									$iErrorCode = \RainLoop\Notifications::SocialGoogleLoginAccessDisable;
								}
							}

							if ($oAccount && !$bGmail)
							{
								$aUserData = array(
									'ID' => $aUserInfoResponse['result']['id'],
									'Email' => $oAccount->Email(),
									'Password' => $oAccount->Password()
								);

								$sSocialName = !empty($aUserInfoResponse['result']['name']) ? $aUserInfoResponse['result']['name'] : '';
								$sSocialName .= !empty($aUserInfoResponse['result']['email']) ? ' ('.$aUserInfoResponse['result']['email'].')' : '';
								$sSocialName = \trim($sSocialName);

								$oSettings = $this->oActions->SettingsProvider()->Load($oAccount);

								$oSettings->SetConf('GoogleAccessToken', \RainLoop\Utils::EncodeKeyValues(array(
									'id' => $aUserInfoResponse['result']['id']
								)));

								$oSettings->SetConf('GoogleSocialName', $sSocialName);

								$this->oActions->SettingsProvider()->Save($oAccount, $oSettings);

								$this->oActions->StorageProvider()->Put(null,
									\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
									$this->GoogleUserLoginStorageKey($oGoogle, $aUserInfoResponse['result']['id']),
									\RainLoop\Utils::EncodeKeyValues($aUserData));

								$iErrorCode = 0;
							}
						}
					}
				}
			}
		}
		catch (\Exception $oException)
		{
			$this->oActions->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
		}

		if ($sLoginUrl)
		{
			$this->oActions->Location($sLoginUrl);
		}
		else
		{
			@\header('Content-Type: text/html; charset=utf-8');
			$sCallBackType = $bLogin ? '_login' : '';
			$sConnectionFunc = 'rl_'.\md5(\RainLoop\Utils::GetConnectionToken()).'_google'.$sCallBackType.'_service';
			$sResult = '<script data-cfasync="false">opener && opener.'.$sConnectionFunc.' && opener.'.
				$sConnectionFunc.'('.$iErrorCode.'); self && self.close && self.close();</script>';
		}

		return $sResult;
	}

	/**
	 * @return string
	 */
	public function FacebookPopupService()
	{
		$sResult = '';
		$sLoginUrl = '';
		$sSocialName = '';

		$mData = false;
		$sUserData = '';
		$aUserData = false;
		$oAccount = null;

		$bLogin = false;
		$iErrorCode = \RainLoop\Notifications::UnknownError;

		if (0 === \strlen($this->oActions->GetSpecAuthToken()) && $this->oHttp->HasQuery('rlah'))
		{
			$this->oActions->SetSpecAuthToken($this->oHttp->GetQuery('rlah', ''));
		}

		$oAccount = $this->oActions->GetAccount();

		$oFacebook = $this->FacebookConnector($oAccount);
		if ($oFacebook)
		{
			try
			{
				$oSession = $oFacebook->getSessionFromRedirect();
				if (!$oSession && !$this->oHttp->HasQuery('state'))
				{
					$sLoginUrl = $oFacebook->getLoginUrl().'&display=popup';
				}
				else if ($oSession)
				{
					$oRequest = new \Facebook\FacebookRequest($oSession, 'GET', '/me');
					$oResponse = $oRequest->execute();
					$oGraphObject = $oResponse->getGraphObject();

					$mData = $oGraphObject->getProperty('id');
					$sSocialName = $oGraphObject->getProperty('name');

					if ($oAccount)
					{
						if ($mData && 0 < \strlen($mData))
						{
							$aUserData = array(
								'Email' => $oAccount->Email(),
								'Password' => $oAccount->Password()
							);

							$oSettings = $this->oActions->SettingsProvider()->Load($oAccount);
							$oSettings->SetConf('FacebookSocialName', $sSocialName);
							$oSettings->SetConf('FacebookAccessToken', \RainLoop\Utils::EncodeKeyValues(array('id' => $mData)));


							$this->oActions->SettingsProvider()->Save($oAccount, $oSettings);

							$this->oActions->StorageProvider()->Put(null,
								\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
								$this->FacebookUserLoginStorageKey($oFacebook, $mData),
								\RainLoop\Utils::EncodeKeyValues($aUserData));

							$iErrorCode = 0;
						}
					}
					else
					{
						$bLogin = true;

						if ($mData && 0 < \strlen($mData))
						{
							$sUserData = $this->oActions->StorageProvider()->Get(null,
								\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
								$this->FacebookUserLoginStorageKey($oFacebook, $mData));

							if ($sUserData)
							{
								$aUserData = \RainLoop\Utils::DecodeKeyValues($sUserData);
							}
						}

						if ($aUserData && \is_array($aUserData) &&
							!empty($aUserData['Email']) && isset($aUserData['Password']))
						{
							$iErrorCode = $this->loginProcess($oAccount, $aUserData['Email'], $aUserData['Password']);
						}
						else
						{
							$iErrorCode = \RainLoop\Notifications::SocialFacebookLoginAccessDisable;
						}
					}
				}
			}
			catch (\Exception $oException)
			{
				$this->oActions->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
			}
		}

		if ($sLoginUrl)
		{
			$this->oActions->Location($sLoginUrl);
		}
		else
		{
			$this->oHttp->ServerNoCache();

			@\header('Content-Type: text/html; charset=utf-8');

			$sCallBackType = $bLogin ? '_login' : '';
			$sConnectionFunc = 'rl_'.\md5(\RainLoop\Utils::GetConnectionToken()).'_facebook'.$sCallBackType.'_service';
			$sResult = '<script data-cfasync="false">opener && opener.'.$sConnectionFunc.' && opener.'.
				$sConnectionFunc.'('.$iErrorCode.'); self && self.close && self.close();</script>';
		}

		return $sResult;
	}

	/**
	 * @return string
	 */
	public function TwitterPopupService()
	{
		$sResult = '';
		$sLoginUrl = '';

		$sSocialName = '';
		$oAccount = null;

		$bLogin = false;
		$iErrorCode = \RainLoop\Notifications::UnknownError;

		$sRedirectUrl = $this->oHttp->GetFullUrl().'?SocialTwitter';
		if (0 < strlen($this->oActions->GetSpecAuthToken()))
		{
			$sRedirectUrl .= '&rlah='.$this->oActions->GetSpecAuthToken();
		}
		else if ($this->oHttp->HasQuery('rlah'))
		{
			$this->oActions->SetSpecAuthToken($this->oHttp->GetQuery('rlah', ''));
			$sRedirectUrl .= '&rlah='.$this->oActions->GetSpecAuthToken();
		}

		try
		{
			$oTwitter = $this->TwitterConnector();
			if ($oTwitter)
			{
				$sSessionKey = \implode('_', array('twitter',
					\md5($oTwitter->config['consumer_secret']), \md5(\RainLoop\Utils::GetConnectionToken()), 'AuthSessionData'));

				$oAccount = $this->oActions->GetAccount();
				if ($oAccount)
				{
					if (isset($_REQUEST['oauth_verifier']))
					{
						$sAuth = $this->oActions->Cacher()->Get($sSessionKey);
						$oAuth = $sAuth ? \json_decode($sAuth, true) : null;

						if ($oAuth && !empty($oAuth['oauth_token']) && !empty($oAuth['oauth_token_secret']))
						{
							$oTwitter->config['user_token'] = $oAuth['oauth_token'];
							$oTwitter->config['user_secret'] = $oAuth['oauth_token_secret'];

							$iCode = $oTwitter->request('POST', $oTwitter->url('oauth/access_token', ''), array(
								'oauth_callback' => $sRedirectUrl,
								'oauth_verifier' => $_REQUEST['oauth_verifier']
							));

							if (200 === $iCode && isset($oTwitter->response['response']))
							{
								$aAccessToken = $oTwitter->extract_params($oTwitter->response['response']);
								if ($aAccessToken && isset($aAccessToken['oauth_token']) && !empty($aAccessToken['user_id']))
								{
									$oTwitter->config['user_token'] = $aAccessToken['oauth_token'];
									$oTwitter->config['user_secret'] = $aAccessToken['oauth_token_secret'];

									$sSocialName = !empty($aAccessToken['screen_name']) ? '@'.$aAccessToken['screen_name'] : $aAccessToken['user_id'];
									$sSocialName = \trim($sSocialName);

									$aUserData = array(
										'Email' => $oAccount->Email(),
										'Password' => $oAccount->Password()
									);

									$oSettings = $this->oActions->SettingsProvider()->Load($oAccount);
									$oSettings->SetConf('TwitterAccessToken', \RainLoop\Utils::EncodeKeyValues($aAccessToken));
									$oSettings->SetConf('TwitterSocialName', $sSocialName);
									$this->oActions->SettingsProvider()->Save($oAccount, $oSettings);

									$this->oActions->StorageProvider()->Put(null,
										\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
										$this->TwitterUserLoginStorageKey($oTwitter, $aAccessToken['user_id']),
										\RainLoop\Utils::EncodeKeyValues($aUserData));

									$iErrorCode = 0;
								}
							}
						}
					}
					else
					{
						$aParams = array(
							'oauth_callback' => $sRedirectUrl,
							'x_auth_access_type' => 'read'
						);

						$iCode = $oTwitter->request('POST', $oTwitter->url('oauth/request_token', ''), $aParams);
						if (200 === $iCode && isset($oTwitter->response['response']))
						{
							$oAuth = $oTwitter->extract_params($oTwitter->response['response']);
							if (!empty($oAuth['oauth_token']))
							{
								$this->oActions->Cacher()->Set($sSessionKey, \json_encode($oAuth));
								$sLoginUrl = $oTwitter->url('oauth/authenticate', '').'?oauth_token='.$oAuth['oauth_token'];
							}
						}
					}
				}
				else
				{
					$bLogin = true;

					if (isset($_REQUEST['oauth_verifier']))
					{
						$sAuth = $this->oActions->Cacher()->Get($sSessionKey);
						$oAuth = $sAuth ? \json_decode($sAuth, true) : null;
						if ($oAuth && !empty($oAuth['oauth_token']) && !empty($oAuth['oauth_token_secret']))
						{
							$oTwitter->config['user_token'] = $oAuth['oauth_token'];
							$oTwitter->config['user_secret'] = $oAuth['oauth_token_secret'];

							$iCode = $oTwitter->request('POST', $oTwitter->url('oauth/access_token', ''), array(
								'oauth_callback' => $sRedirectUrl,
								'oauth_verifier' => $_REQUEST['oauth_verifier']
							));

							if (200 === $iCode && isset($oTwitter->response['response']))
							{
								$aAccessToken = $oTwitter->extract_params($oTwitter->response['response']);
								if ($aAccessToken && isset($aAccessToken['oauth_token']) && !empty($aAccessToken['user_id']))
								{
									$sUserData = $this->oActions->StorageProvider()->Get(null,
										\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
										$this->TwitterUserLoginStorageKey($oTwitter, $aAccessToken['user_id'])
									);

									$aUserData = \RainLoop\Utils::DecodeKeyValues($sUserData);

									if ($aUserData && \is_array($aUserData) &&
										!empty($aUserData['Email']) &&
										isset($aUserData['Password']))
									{
										$iErrorCode = $this->loginProcess($oAccount, $aUserData['Email'], $aUserData['Password']);
									}
									else
									{
										$iErrorCode = \RainLoop\Notifications::SocialTwitterLoginAccessDisable;
									}

									$this->oActions->Cacher()->Delete($sSessionKey);
								}
							}
						}
					}
					else
					{
						$aParams = array(
							'oauth_callback' => $sRedirectUrl,
							'x_auth_access_type' => 'read'
						);

						$iCode = $oTwitter->request('POST', $oTwitter->url('oauth/request_token', ''), $aParams);
						if (200 === $iCode && isset($oTwitter->response['response']))
						{
							$oAuth = $oTwitter->extract_params($oTwitter->response['response']);
							if (!empty($oAuth['oauth_token']))
							{
								$this->oActions->Cacher()->Set($sSessionKey, \json_encode($oAuth));
								$sLoginUrl = $oTwitter->url('oauth/authenticate', '').'?oauth_token='.$oAuth['oauth_token'];
							}
						}
					}
				}
			}
		}
		catch (\Exception $oException)
		{
			$this->oActions->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
		}

		if ($sLoginUrl)
		{
			$this->oActions->Location($sLoginUrl);
		}
		else
		{
			@\header('Content-Type: text/html; charset=utf-8');
			$sCallBackType = $bLogin ? '_login' : '';
			$sConnectionFunc = 'rl_'.\md5(\RainLoop\Utils::GetConnectionToken()).'_twitter'.$sCallBackType.'_service';
			$sResult = '<script data-cfasync="false">opener && opener.'.$sConnectionFunc.' && opener.'.
				$sConnectionFunc.'('.$iErrorCode.'); self && self.close && self.close();</script>';
		}

		return $sResult;
	}

	/**
	 * @return \OAuth2\Client|null
	 */
	public function GoogleConnector()
	{
		$oGoogle = false;
		$oConfig = $this->oActions->Config();
		if ($oConfig->Get('social', 'google_enable', false) &&
			'' !== \trim($oConfig->Get('social', 'google_client_id', '')) &&
			'' !== \trim($oConfig->Get('social', 'google_client_secret', '')))
		{
			include_once APP_VERSION_ROOT_PATH.'app/libraries/PHP-OAuth2/Client.php';
			include_once APP_VERSION_ROOT_PATH.'app/libraries/PHP-OAuth2/GrantType/IGrantType.php';
			include_once APP_VERSION_ROOT_PATH.'app/libraries/PHP-OAuth2/GrantType/AuthorizationCode.php';
			include_once APP_VERSION_ROOT_PATH.'app/libraries/PHP-OAuth2/GrantType/RefreshToken.php';

			try
			{
				$oGoogle = new \OAuth2\Client(
					\trim($oConfig->Get('social', 'google_client_id', '')),
					\trim($oConfig->Get('social', 'google_client_secret', '')));

				$sProxy = $this->oActions->Config()->Get('labs', 'curl_proxy', '');
				if (0 < \strlen($sProxy))
				{
					$oGoogle->setCurlOption(CURLOPT_PROXY, $sProxy);

					$sProxyAuth = $this->oActions->Config()->Get('labs', 'curl_proxy_auth', '');
					if (0 < \strlen($sProxyAuth))
					{
						$oGoogle->setCurlOption(CURLOPT_PROXYUSERPWD, $sProxyAuth);
					}
				}
			}
			catch (\Exception $oException)
			{
				$this->oActions->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
			}
		}

		return false === $oGoogle ? null : $oGoogle;
	}

	/**
	 * @return \tmhOAuth|null
	 */
	public function TwitterConnector()
	{
		$oTwitter = false;
		$oConfig = $this->oActions->Config();
		if ($oConfig->Get('social', 'twitter_enable', false) &&
			'' !== \trim($oConfig->Get('social', 'twitter_consumer_key', '')) &&
			'' !== \trim($oConfig->Get('social', 'twitter_consumer_secret', '')))
		{
			include_once APP_VERSION_ROOT_PATH.'app/libraries/tmhOAuth/tmhOAuth.php';
			include_once APP_VERSION_ROOT_PATH.'app/libraries/tmhOAuth/tmhUtilities.php';

			$sProxy = $this->oActions->Config()->Get('labs', 'curl_proxy', '');
			$sProxyAuth = $this->oActions->Config()->Get('labs', 'curl_proxy_auth', '');

			$oTwitter = new \tmhOAuth(array(
				'consumer_key' => \trim($oConfig->Get('social', 'twitter_consumer_key', '')),
				'consumer_secret' => \trim($oConfig->Get('social', 'twitter_consumer_secret', '')),
				'curl_proxy' => 0 < \strlen($sProxy) ? $sProxy : false,
				'curl_proxyuserpwd' => 0 < \strlen($sProxyAuth) ? $sProxyAuth : false
			));
		}

		return false === $oTwitter ? null : $oTwitter;
	}

	/**
	 * @param \RainLoop\Model\Account|null $oAccount = null
	 *
	 * @return \RainLoop\Common\RainLoopFacebookRedirectLoginHelper|null
	 */
	public function FacebookConnector($oAccount = null)
	{
		$oFacebook = false;
		$oConfig = $this->oActions->Config();
		$sAppID = \trim($oConfig->Get('social', 'fb_app_id', ''));

		if (\version_compare(PHP_VERSION, '5.4.0', '>=') &&
			$oConfig->Get('social', 'fb_enable', false) && '' !== $sAppID &&
			'' !== \trim($oConfig->Get('social', 'fb_app_secret', '')) &&
			\class_exists('Facebook\FacebookSession')
		)
		{
			\Facebook\FacebookSession::setDefaultApplication($sAppID,
				\trim($oConfig->Get('social', 'fb_app_secret', '')));

			$sRedirectUrl = $this->oHttp->GetFullUrl().'?SocialFacebook';
			if (0 < \strlen($this->oActions->GetSpecAuthToken()))
			{
				$sRedirectUrl .= '&rlah='.$this->oActions->GetSpecAuthToken();
			}
			else if ($this->oHttp->HasQuery('rlah'))
			{
				$this->oActions->SetSpecAuthToken($this->oHttp->GetQuery('rlah', ''));
				$sRedirectUrl .= '&rlah='.$this->oActions->GetSpecAuthToken();
			}

			try
			{
				$oAccount = $this->oActions->GetAccount();

				$oFacebook = new \RainLoop\Common\RainLoopFacebookRedirectLoginHelper($sRedirectUrl);
				$oFacebook->initRainLoopData(array(
					'rlAppId' => $sAppID,
					'rlAccount' => $oAccount,
					'rlUserHash' => \RainLoop\Utils::GetConnectionToken(),
					'rlStorageProvaider' => $this->oActions->StorageProvider()
				));
			}
			catch (\Exception $oException)
			{
				$this->oActions->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
			}
		}

		return false === $oFacebook ? null : $oFacebook;
	}

	/**
	 * @return string
	 */
	public function GoogleUserLoginStorageKey($oGoogle, $sGoogleUserId)
	{
		return \implode('_', array('google', \md5($oGoogle->getClientId()), $sGoogleUserId, APP_SALT));
	}

	/**
	 * @return string
	 */
	public function FacebookUserLoginStorageKey($oFacebook, $sFacebookUserId)
	{
		return \implode('_', array('facebookNew', \md5($oFacebook->GetRLAppId()), $sFacebookUserId, APP_SALT));
	}

	/**
	 * @return string
	 */
	public function TwitterUserLoginStorageKey($oTwitter, $sTwitterUserId)
	{
		return \implode('_', array('twitter', \md5($oTwitter->config['consumer_secret']), $sTwitterUserId, APP_SALT));
	}

	/**
	 * @param \RainLoop\Model\Account|null $oAccount
	 * @param string $sEmail
	 * @param string $sPassword
	 *
	 * @return int
	 */
	private function loginProcess(&$oAccount, $sEmail, $sPassword)
	{
		$iErrorCode = \RainLoop\Notifications::UnknownError;

		try
		{
			$oAccount = $this->oActions->LoginProcess($sEmail, $sPassword);
			if ($oAccount instanceof \RainLoop\Model\Account)
			{
				$this->oActions->AuthToken($oAccount);
				$iErrorCode = 0;
			}
			else
			{
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
}