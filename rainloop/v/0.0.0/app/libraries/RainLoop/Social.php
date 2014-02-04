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
	 * @param array $oItem
	 * @param array $aPics
	 *
	 * @return array|null
	 */
	private function convertGoogleJsonContactToResponseContact($oItem, &$aPics)
	{
		$mResult = null;
		if (!empty($oItem['gd$email'][0]['address']))
		{
			$mEmail = \strtolower($oItem['gd$email'][0]['address']);
			if (\is_array($oItem['gd$email']) && 1 <\count($oItem['gd$email']))
			{
				$mEmail = array();
				foreach ($oItem['gd$email'] as $oEmail)
				{
					if (!empty($oEmail['address']))
					{
						$mEmail[] = \strtolower($oEmail['address']);
					}
				}
			}

			$sImg = '';
			if (!empty($oItem['link']) && is_array($oItem['link']))
			{
				foreach ($oItem['link'] as $oLink)
				{
					if ($oLink && isset($oLink['type'], $oLink['href'], $oLink['rel']) &&
						'image/*' === $oLink['type'] && '#photo' === \substr($oLink['rel'], -6))
					{
						$sImg = $oLink['href'];
						break;
					}
				}
			}

			$mResult = array(
				'email' => $mEmail,
				'name' => !empty($oItem['title']['$t']) ? $oItem['title']['$t'] : ''
			);

			if (0 < \strlen($sImg))
			{
				$sHash = \RainLoop\Utils::EncodeKeyValues(array(
					'url' => $sImg,
					'type' => 'google_access_token'
				));

				$mData = array();
				if (isset($aPics[$sHash]))
				{
					$mData = $aPics[$sHash];
					if (!is_array($mData))
					{
						$mData = array($mData);
					}
				}

				if (is_array($mEmail))
				{
					$mData = array_merge($mData, $mEmail);
					$mData = array_unique($mData);
				}
				else if (0 < strlen($mEmail))
				{
					$mData[] = $mEmail;
				}

				if (is_array($mData))
				{
					if (1 === count($mData) && !empty($mData[0]))
					{
						$aPics[$sHash] = $mData[0];
					}
					else if (1 < count($mData))
					{
						$aPics[$sHash] = $mData;
					}
				}
			}
		}

		return $mResult;
	}

	/**
	 * @return array
	 */
	public function GoogleUserContacts($oAccount)
	{
		$mResult = false;
		$oGoogle = $this->GoogleConnector();
		$aPics = array();

		if ($oAccount && $oGoogle)
		{
			$sAccessToken = $this->GoogleAccessToken($oAccount, $oGoogle);
			if (!empty($sAccessToken))
			{
				$oGoogle->setAccessToken($sAccessToken);

				$aResponse = $oGoogle->fetch('https://www.google.com/m8/feeds/contacts/default/full', array(
					'alt' => 'json'
				));

				if (!empty($aResponse['result']['feed']['entry']) && is_array($aResponse['result']['feed']['entry']))
				{
					$mResult = array();
					foreach ($aResponse['result']['feed']['entry'] as $oItem)
					{
						$aItem = $this->convertGoogleJsonContactToResponseContact($oItem, $aPics);
						if ($aItem)
						{
							if (is_array($aItem['email']))
							{
								$aNewItem = $aItem;
								unset($aNewItem['email']);

								foreach ($aItem['email'] as $sEmail)
								{
									$aNewItem['email'] = $sEmail;
									$mResult[] = $aNewItem;
								}
							}
							else
							{
								$mResult[] = $aItem;
							}
						}
					}
				}
			}
			else
			{
				$this->oActions->Logger()->Write('Empty Google Access Token', \MailSo\Log\Enumerations\Type::ERROR);
			}
		}

		return false !== $mResult ? array(
			'List' => $mResult,
			'Pics' => $aPics
		) : false;
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
				if (is_array($aData) && isset($aData['access_token'], $aData['id']))
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
			$oUser = $oFacebook->getUser();
			if ($oUser)
			{
				$mData = false;
				try
				{
					$aData = $oFacebook->api(array(
						'method' => 'fql.query',
						'query' => 'SELECT uid FROM user WHERE uid = me()'
					));

					$mData = isset($aData[0], $aData[0]['uid']) ? $aData[0]['uid'] : false;
				}
				catch (\Exception $oException)
				{
					$this->oActions->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
				}

				if (false !== $mData && 0 < \strlen($mData))
				{
					$this->oActions->StorageProvider()->Clear(null,
						\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
						$this->FacebookUserLoginStorageKey($oFacebook, $mData));
				}
			}

			$oFacebook->UserLogout();

			$oSettings = $this->oActions->SettingsProvider()->Load($oAccount);
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
	public function GooglePopupService()
	{
		$sResult = '';
		$sLoginUrl = '';

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
					$aParts = explode('|', $sState, 2);
					$sCheckToken = !empty($aParts[0]) ? $aParts[0] : '';
					$sCheckAuth = !empty($aParts[1]) ? $aParts[1] : '';
				}
				
				$sRedirectUrl = $this->oHttp->GetFullUrl().'?SocialGoogle';
				if (!$this->oHttp->HasQuery('code'))
				{
//					https://www.google.com/m8/feeds/
					$aParams = array(
						'scope' => 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
						'state' => \RainLoop\Utils::GetConnectionToken().'|'.$this->oActions->GetSpecAuthToken(),
//						'access_type' => 'offline',
//						'approval_prompt' => 'force',
						'response_type' => 'code'
					);

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
						$aUserinfoResponse = $oGoogle->fetch('https://www.googleapis.com/oauth2/v2/userinfo');

						if (!empty($aUserinfoResponse['result']['id']))
						{
							if ($bLogin)
							{
								$sUserData = $this->oActions->StorageProvider()->Get(null,
									\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
									$this->GoogleUserLoginStorageKey($oGoogle, $aUserinfoResponse['result']['id'])
								);

								$aUserData = \RainLoop\Utils::DecodeKeyValues($sUserData);

								if ($aUserData && \is_array($aUserData) &&
									!empty($aUserData['Email']) &&
									!empty($aUserData['Login']) &&
									isset($aUserData['Password']))
								{
									$oAccount = $this->oActions->LoginProcess($aUserData['Email'], $aUserData['Login'], $aUserData['Password']);
									if ($oAccount instanceof \RainLoop\Account)
									{
										$this->oActions->AuthProcess($oAccount);

										$iErrorCode = 0;
									}
								}
								else
								{
									$iErrorCode = \RainLoop\Notifications::SocialGoogleLoginAccessDisable;
								}
							}

							if ($oAccount)
							{
								$aUserData = array(
									'Email' => $oAccount->Email(),
									'Login' => $oAccount->IncLogin(),
									'Password' => $oAccount->Password()
								);

								$sSocialName = !empty($aUserinfoResponse['result']['name']) ? $aUserinfoResponse['result']['name'] : '';
								$sSocialName .= !empty($aUserinfoResponse['result']['email']) ? ' ('.$aUserinfoResponse['result']['email'].')' : '';
								$sSocialName = \trim($sSocialName);

								$oSettings = $this->oActions->SettingsProvider()->Load($oAccount);
								$oSettings->SetConf('GoogleSocialName', $sSocialName);
								$this->oActions->SettingsProvider()->Save($oAccount, $oSettings);

								$this->oActions->StorageProvider()->Put(null,
									\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
									$this->GoogleUserLoginStorageKey($oGoogle, $aUserinfoResponse['result']['id']),
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
			$sResult = '<script>opener && opener.'.$sConnectionFunc.' && opener.'.
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
		$aUserData = false;

		$bLogin = false;
		$iErrorCode = \RainLoop\Notifications::UnknownError;

		$sRedirectUrl = $this->oHttp->GetFullUrl().'?SocialFacebook';
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
			$oAccount = $this->oActions->GetAccount();
			
			$oFacebook = $this->FacebookConnector($oAccount ? $oAccount : null);
			if ($oFacebook)
			{
				if ($oAccount)
				{
					$oUser = $oFacebook->getUser();
					if (!$oUser && !$this->oHttp->HasQuery('state'))
					{
						$sLoginUrl = $oFacebook->getLoginUrl(array(
							'display' => 'popup',
							'redirect_uri' => $sRedirectUrl
						));
					}
					else
					{
						try
						{
							$aData = $oFacebook->api(array(
								'method' => 'fql.query',
								'query' => 'SELECT uid, name, username FROM user WHERE uid = me()'
							));

							$mData = isset($aData[0], $aData[0]['uid']) ? $aData[0]['uid'] : false;

							$sSocialName = !empty($aData[0]['name']) ? $aData[0]['name'] : '';
							$sSocialName .= !empty($aData[0]['username']) ? ' ('.$aData[0]['username'].')' : '';
							$sSocialName = \trim($sSocialName);
						}
						catch (\FacebookApiException $oException)
						{
							$this->oActions->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
						}

						if (false !== $mData && 0 < \strlen($mData))
						{
							$aUserData = array(
								'Email' => $oAccount->Email(),
								'Login' => $oAccount->IncLogin(),
								'Password' => $oAccount->Password()
							);

							$oSettings = $this->oActions->SettingsProvider()->Load($oAccount);
							$oSettings->SetConf('FacebookSocialName', $sSocialName);
							$this->oActions->SettingsProvider()->Save($oAccount, $oSettings);

							$this->oActions->StorageProvider()->Put(null,
								\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
								$this->FacebookUserLoginStorageKey($oFacebook, $mData),
								\RainLoop\Utils::EncodeKeyValues($aUserData));

							$iErrorCode = 0;
						}
					}
				}
				else
				{
					$bLogin = true;

					$oUser = $oFacebook->getUser();
					if ($oUser)
					{
						try
						{
							$aData = $oFacebook->api(array(
								'method' => 'fql.query',
								'query' => 'SELECT uid FROM user WHERE uid = me()'
							));

							$mData = isset($aData[0], $aData[0]['uid']) ? $aData[0]['uid'] : false;
						}
						catch (\FacebookApiException $oException)
						{
						}

						if (false !== $mData && 0 < \strlen($mData))
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
							!empty($aUserData['Email']) &&
							!empty($aUserData['Login']) &&
							isset($aUserData['Password']))
						{
							$oAccount = $this->oActions->LoginProcess($aUserData['Email'], $aUserData['Login'], $aUserData['Password']);
							if ($oAccount instanceof \RainLoop\Account)
							{
								$this->oActions->AuthProcess($oAccount);
								
								$iErrorCode = 0;
							}
						}
						else
						{
							$iErrorCode = \RainLoop\Notifications::SocialFacebookLoginAccessDisable;
						}
					}
					else
					{
						$sLoginUrl = $oFacebook->getLoginUrl(array(
							'display' => 'popup',
							'redirect_uri' => $sRedirectUrl
						));
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
			$sConnectionFunc = 'rl_'.\md5(\RainLoop\Utils::GetConnectionToken()).'_facebook'.$sCallBackType.'_service';
			$sResult = '<script>opener && opener.'.$sConnectionFunc.' && opener.'.
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
								$this->oActions->Logger()->WriteDump($oTwitter->response['response']);
								$aAccessToken = $oTwitter->extract_params($oTwitter->response['response']);
								$this->oActions->Logger()->WriteDump($aAccessToken);
								if ($aAccessToken && isset($aAccessToken['oauth_token']) && !empty($aAccessToken['user_id']))
								{
									$oTwitter->config['user_token'] = $aAccessToken['oauth_token'];
									$oTwitter->config['user_secret'] = $aAccessToken['oauth_token_secret'];

									$sSocialName = !empty($aAccessToken['screen_name']) ? '@'.$aAccessToken['screen_name'] : $aAccessToken['user_id'];
									$sSocialName = \trim($sSocialName);

									$aUserData = array(
										'Email' => $oAccount->Email(),
										'Login' => $oAccount->IncLogin(),
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
										!empty($aUserData['Login']) &&
										isset($aUserData['Password']))
									{
										$oAccount = $this->oActions->LoginProcess($aUserData['Email'], $aUserData['Login'], $aUserData['Password']);
										if ($oAccount instanceof \RainLoop\Account)
										{
											$this->oActions->AuthProcess($oAccount);
											
											$iErrorCode = 0;
										}
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
			$sResult = '<script>opener && opener.'.$sConnectionFunc.' && opener.'.
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
	 * @param \RainLoop\Account|null $oAccount = null
	 *
	 * @return \Facebook|null
	 */
	public function FacebookConnector($oAccount = null)
	{
		$oFacebook = false;
		$oConfig = $this->oActions->Config();
		if ($oConfig->Get('social', 'fb_enable', false) &&
			'' !== \trim($oConfig->Get('social', 'fb_app_id', '')) &&
			'' !== \trim($oConfig->Get('social', 'fb_app_secret', '')))
		{
			include_once APP_VERSION_ROOT_PATH.'app/libraries/facebook/facebook.php';

			if (isset(\RainLoopFacebook::$CURL_OPTS) && \is_array(\RainLoopFacebook::$CURL_OPTS))
			{
				$sProxy = $this->oActions->Config()->Get('labs', 'curl_proxy', '');
				if (0 < \strlen($sProxy))
				{
					\RainLoopFacebook::$CURL_OPTS[CURLOPT_PROXY] = $sProxy;

					$sProxyAuth = $this->oActions->Config()->Get('labs', 'curl_proxy_auth', '');
					if (0 < \strlen($sProxyAuth))
					{
						\RainLoopFacebook::$CURL_OPTS[CURLOPT_PROXYUSERPWD] = $sProxyAuth;
					}
				}
			}

			$oFacebook = new \RainLoopFacebook(array(
				'rlAccount' => $oAccount,
				'rlUserHash' => \RainLoop\Utils::GetConnectionToken(),
				'rlStorageProvaider' => $this->oActions->StorageProvider(),
				'appId'  => \trim($oConfig->Get('social', 'fb_app_id', '')),
				'secret' => \trim($oConfig->Get('social', 'fb_app_secret', '')),
				'fileUpload' => false,
				'cookie' => true
			));
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
		return \implode('_', array('facebook', \md5($oFacebook->getAppId()), $sFacebookUserId, APP_SALT));
	}

	/**
	 * @return string
	 */
	public function TwitterUserLoginStorageKey($oTwitter, $sTwitterUserId)
	{
		return \implode('_', array('twitter', \md5($oTwitter->config['consumer_secret']), $sTwitterUserId, APP_SALT));
	}
}