<?php

namespace RainLoop\Model;

class Account extends \RainLoop\Account // for backward compatibility
{
	/**
	 * @var string
	 */
	private $sEmail;

	/**
	 * @var string
	 */
	private $sLogin;

	/**
	 * @var int
	 */
	private $sPassword;

	/**
	 * @var string
	 */
	private $sProxyAuthUser;

	/**
	 * @var string
	 */
	private $sProxyAuthPassword;

	/**
	 * @var string
	 */
	private $sClientCert;

	/**
	 * @var string
	 */
	private $sSignMeToken;

	/**
	 * @var \RainLoop\Model\Domain
	 */
	private $oDomain;

	/**
	 * @var string
	 */
	private $sParentEmail;

	/**
	 * @param string $sEmail
	 * @param string $sLogin
	 * @param string $sPassword
	 * @param \RainLoop\Model\Domain $oDomain
	 * @param string $sSignMeToken = ''
	 * @param string $sProxyAuthUser = ''
	 * @param string $sProxyAuthPassword = ''
	 *
	 * @return void
	 */
	protected function __construct($sEmail, $sLogin, $sPassword, \RainLoop\Model\Domain $oDomain,
		$sSignMeToken = '', $sProxyAuthUser = '', $sProxyAuthPassword = '', $sClientCert = '')
	{
		$this->sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail, true);
		$this->sLogin = \MailSo\Base\Utils::IdnToAscii($sLogin);
		$this->sPassword = $sPassword;
		$this->oDomain = $oDomain;
		$this->sSignMeToken = $sSignMeToken;
		$this->sProxyAuthUser = $sProxyAuthUser;
		$this->sProxyAuthPassword = $sProxyAuthPassword;
		$this->sClientCert = $sClientCert;
		$this->sParentEmail = '';
	}

	/**
	 * @param string $sEmail
	 * @param string $sLogin
	 * @param string $sPassword
	 * @param \RainLoop\Model\Domain $oDomain
	 * @param string $sSignMeToken = ''
	 * @param string $sProxyAuthUser = ''
	 * @param string $sProxyAuthPassword = ''
	 *
	 * @return \RainLoop\Model\Account
	 */
	public static function NewInstance($sEmail, $sLogin, $sPassword, \RainLoop\Model\Domain $oDomain,
		$sSignMeToken = '', $sProxyAuthUser = '', $sProxyAuthPassword = '', $sClientCert = '')
	{
		return new self($sEmail, $sLogin, $sPassword, $oDomain, $sSignMeToken, $sProxyAuthUser, $sProxyAuthPassword, $sClientCert);
	}

	/**
	 * @return string
	 */
	public static function GenerateTokensPassword($sAccessToken, $sRefreshToken)
	{
		return APP_GOOGLE_ACCESS_TOKEN_PREFIX.\json_encode(array($sAccessToken, $sRefreshToken));
	}

	/**
	 * @return array
	 */
	public static function ParseTokensPassword($sPassword)
	{
		$iGatLen = \strlen(APP_GOOGLE_ACCESS_TOKEN_PREFIX);
		if ($sPassword && APP_GOOGLE_ACCESS_TOKEN_PREFIX === \substr($sPassword, 0, $iGatLen))
		{
			$aTokens = @\json_decode(\substr($sPassword, $iGatLen));
			$sAccessToken = !empty($aTokens[0]) ? $aTokens[0] : '';
			$sRefreshToken = !empty($aTokens[1]) ? $aTokens[1] : '';

			if ($sAccessToken && $sRefreshToken)
			{
				return array($sAccessToken, $sRefreshToken);
			}
		}

		return array('', '');
	}

	/**
	 * @return string
	 */
	public function Email()
	{
		return $this->sEmail;
	}

	/**
	 * @return string
	 */
	public function ParentEmail()
	{
		return $this->sParentEmail;
	}

	/**
	 * @return string
	 */
	public function ProxyAuthUser()
	{
		return $this->sProxyAuthUser;
	}

	/**
	 * @return string
	 */
	public function ProxyAuthPassword()
	{
		return $this->sProxyAuthPassword;
	}

	/**
	 * @return string
	 */
	public function ParentEmailHelper()
	{
		return 0 < \strlen($this->sParentEmail) ? $this->sParentEmail : $this->sEmail;
	}

	/**
	 * @return string
	 */
	public function IsAdditionalAccount()
	{
		return 0 < \strlen($this->sParentEmail);
	}

	/**
	 * @return string
	 */
	public function IncLogin()
	{
		$sLogin = $this->sLogin;
		if ($this->oDomain->IncShortLogin())
		{
			$sLogin = \MailSo\Base\Utils::GetAccountNameFromEmail($this->sLogin);
		}

		return $sLogin;
	}

	/**
	 * @return string
	 */
	public function IncPassword()
	{
		return $this->sPassword;
	}

	/**
	 * @return string
	 */
	public function OutLogin()
	{
		$sLogin = $this->sLogin;
		if ($this->oDomain->OutShortLogin())
		{
			$sLogin = \MailSo\Base\Utils::GetAccountNameFromEmail($this->sLogin);
		}

		return $sLogin;
	}

	/**
	 * @return string
	 */
	public function Login()
	{
		return $this->IncLogin();
	}

	/**
	 * @return string
	 */
	public function Password()
	{
		return $this->IncPassword();
	}

	/**
	 * @return string
	 */
	public function ClientCert()
	{
		return $this->sClientCert;
	}

	/**
	 * @return bool
	 */
	public function SignMe()
	{
		return 0 < \strlen($this->sSignMeToken);
	}

	/**
	 * @return string
	 */
	public function SignMeToken()
	{
		return $this->sSignMeToken;
	}

	/**
	 * @return \RainLoop\Model\Domain
	 */
	public function Domain()
	{
		return $this->oDomain;
	}

	/**
	 * @return string
	 */
	public function Hash()
	{
		return md5(APP_SALT.$this->Email().APP_SALT.$this->DomainIncHost().
			APP_SALT.$this->DomainIncPort().APP_SALT.$this->Password().APP_SALT.'0'.APP_SALT.$this->ParentEmail().APP_SALT);
	}

	/**
	 * @param string $sPassword
	 *
	 * @return void
	 */
	public function SetPassword($sPassword)
	{
		$this->sPassword = $sPassword;
	}

	/**
	 * @param string $sParentEmail
	 *
	 * @return void
	 */
	public function SetParentEmail($sParentEmail)
	{
		$this->sParentEmail = \trim(\MailSo\Base\Utils::IdnToAscii($sParentEmail, true));
	}

	/**
	 * @param string $sProxyAuthUser
	 *
	 * @return void
	 */
	public function SetProxyAuthUser($sProxyAuthUser)
	{
		return $this->sProxyAuthUser = $sProxyAuthUser;
	}

	/**
	 * @param string $sProxyAuthPassword
	 *
	 * @return void
	 */
	public function SetProxyAuthPassword($sProxyAuthPassword)
	{
		return $this->sProxyAuthPassword = $sProxyAuthPassword;
	}

	/**
	 * @return string
	 */
	public function DomainIncHost()
	{
		return $this->Domain()->IncHost();
	}

	/**
	 * @return int
	 */
	public function DomainIncPort()
	{
		return $this->Domain()->IncPort();
	}

	/**
	 * @return int
	 */
	public function DomainIncSecure()
	{
		return $this->Domain()->IncSecure();
	}

	/**
	 * @return string
	 */
	public function DomainOutHost()
	{
		return $this->Domain()->OutHost();
	}

	/**
	 * @return int
	 */
	public function DomainOutPort()
	{
		return $this->Domain()->OutPort();
	}

	/**
	 * @return int
	 */
	public function DomainOutSecure()
	{
		return $this->Domain()->OutSecure();
	}

	/**
	 * @return bool
	 */
	public function DomainOutAuth()
	{
		return $this->Domain()->OutAuth();
	}

	/**
	 * @return string
	 */
	public function DomainSieveHost()
	{
		return $this->Domain()->SieveHost();
	}

	/**
	 * @return int
	 */
	public function DomainSievePort()
	{
		return $this->Domain()->SievePort();
	}

	/**
	 * @return int
	 */
	public function DomainSieveSecure()
	{
		return $this->Domain()->SieveSecure();
	}

	/**
	 * @return bool
	 */
	public function DomainSieveAllowRaw()
	{
		return $this->Domain()->SieveAllowRaw();
	}

	/**
	 * @return string
	 */
	public function GetAuthToken()
	{
		return \RainLoop\Utils::EncodeKeyValues(array(
			'token',										// 0
			$this->sEmail,								// 1
			$this->sLogin,								// 2
			$this->sPassword,							// 3
			\RainLoop\Utils::Fingerprint(),		// 4
			$this->sSignMeToken,						// 5
			$this->sParentEmail,						// 6
			\RainLoop\Utils::GetShortToken(),	// 7
			$this->sProxyAuthUser,					// 8
			$this->sProxyAuthPassword,				// 9
			0,												// 10 // lifetime
			$this->sClientCert						// 11
		));
	}

	/**
	 * @return string
	 */
	public function GetAuthTokenQ()
	{
		return \RainLoop\Utils::EncodeKeyValuesQ(array(
			'token',										// 0
			$this->sEmail,								// 1
			$this->sLogin,								// 2
			$this->sPassword,							// 3
			\RainLoop\Utils::Fingerprint(),		// 4
			$this->sSignMeToken,						// 5
			$this->sParentEmail,						// 6
			\RainLoop\Utils::GetShortToken(),	// 7
			$this->sProxyAuthUser,					// 8
			$this->sProxyAuthPassword,				// 9
			0,												// 10 // lifetime
			$this->sClientCert						// 11
		));
	}

	/**
	 * @param \RainLoop\Plugins\Manager $oPlugins
	 * @param \MailSo\Mail\MailClient $oMailClient
	 * @param \RainLoop\Application $oConfig
	 * @param callback|null $refreshTokenCallback = null
	 *
	 * @return bool
	 */
	public function IncConnectAndLoginHelper($oPlugins, $oMailClient, $oConfig, $refreshTokenCallback = null)
	{
		$bLogin = false;

		$aImapCredentials = array(
			'UseConnect' => true,
			'UseAuth' => true,
			'Host' => $this->DomainIncHost(),
			'Port' => $this->DomainIncPort(),
			'Secure' => $this->DomainIncSecure(),
			'Login' => $this->IncLogin(),
			'Password' => $this->Password(),
			'ProxyAuthUser' => $this->ProxyAuthUser(),
			'ProxyAuthPassword' => $this->ProxyAuthPassword(),
			'VerifySsl' => !!$oConfig->Get('ssl', 'verify_certificate', false),
			'ClientCert' => $this->ClientCert(),
			'AllowSelfSigned' => !!$oConfig->Get('ssl', 'allow_self_signed', true),
			'UseAuthPlainIfSupported' => !!$oConfig->Get('labs', 'imap_use_auth_plain', true),
			'UseAuthCramMd5IfSupported' => !!$oConfig->Get('labs', 'imap_use_auth_cram_md5', true)
		);

		$oPlugins->RunHook('filter.imap-credentials', array($this, &$aImapCredentials));

		$oPlugins->RunHook('event.imap-pre-connect', array($this, $aImapCredentials['UseConnect'], $aImapCredentials));

		if ($aImapCredentials['UseConnect'])
		{
			$oMailClient
				->Connect($aImapCredentials['Host'], $aImapCredentials['Port'],
					$aImapCredentials['Secure'], $aImapCredentials['VerifySsl'], 
					$aImapCredentials['AllowSelfSigned'], $aImapCredentials['ClientCert']);

		}

		$oPlugins->RunHook('event.imap-pre-login', array($this, $aImapCredentials['UseAuth'], $aImapCredentials));

		if ($aImapCredentials['UseAuth'])
		{
			if (0 < \strlen($aImapCredentials['ProxyAuthUser']) &&
				0 < \strlen($aImapCredentials['ProxyAuthPassword']))
			{
				$oMailClient
					->Login($aImapCredentials['ProxyAuthUser'], $aImapCredentials['ProxyAuthPassword'],
						$aImapCredentials['Login'], $aImapCredentials['UseAuthPlainIfSupported'], $aImapCredentials['UseAuthCramMd5IfSupported']);
			}
			else
			{
				$sPassword = $aImapCredentials['Password'];
				$aTokens = self::ParseTokensPassword($sPassword);

				$sAccessToken = $aTokens[0];
				$sRefreshToken = $aTokens[1];

				if ($sAccessToken && $sRefreshToken)
				{
					if ($refreshTokenCallback && \is_callable($refreshTokenCallback))
					{
						$sAccessToken = \call_user_func($refreshTokenCallback, $sAccessToken, $sRefreshToken);
					}

					$oMailClient->LoginWithXOauth2(
						\base64_encode('user='.$aImapCredentials['Login']."\1".'auth=Bearer '.$sAccessToken."\1\1"));
				}
				else
				{
					$oMailClient->Login($aImapCredentials['Login'], $aImapCredentials['Password'], '',
						$aImapCredentials['UseAuthPlainIfSupported'], $aImapCredentials['UseAuthCramMd5IfSupported']);
				}
			}

			$bLogin = true;
		}

		$oPlugins->RunHook('event.imap-post-login', array($this, $aImapCredentials['UseAuth'], $bLogin, $aImapCredentials));

		return $bLogin;
	}

	/**
	 * @param \RainLoop\Plugins\Manager $oPlugins
	 * @param \MailSo\Smtp\SmtpClient|null $oSmtpClient
	 * @param \RainLoop\Application $oConfig
	 * @param callback|null $refreshTokenCallback = null
	 * @param bool $bUsePhpMail = false
	 *
	 * @return bool
	 */
	public function OutConnectAndLoginHelper($oPlugins, $oSmtpClient, $oConfig, $refreshTokenCallback = null, &$bUsePhpMail = false)
	{
		$bLogin = false;

		$aSmtpCredentials = array(
			'UseConnect' => true,
			'UseAuth' => $this->DomainOutAuth(),
			'UsePhpMail' => $bUsePhpMail,
			'Ehlo' => \MailSo\Smtp\SmtpClient::EhloHelper(),
			'Host' => $this->DomainOutHost(),
			'Port' => $this->DomainOutPort(),
			'Secure' => $this->DomainOutSecure(),
			'Login' => $this->OutLogin(),
			'Password' => $this->Password(),
			'ProxyAuthUser' => $this->ProxyAuthUser(),
			'ProxyAuthPassword' => $this->ProxyAuthPassword(),
			'VerifySsl' => !!$oConfig->Get('ssl', 'verify_certificate', false),
			'AllowSelfSigned' => !!$oConfig->Get('ssl', 'allow_self_signed', true),
			'UseAuthPlainIfSupported' => !!$oConfig->Get('labs', 'smtp_use_auth_plain', true),
			'UseAuthCramMd5IfSupported' => !!$oConfig->Get('labs', 'smtp_use_auth_cram_md5', true)
		);

		$oPlugins->RunHook('filter.smtp-credentials', array($this, &$aSmtpCredentials));

		$bUsePhpMail = $aSmtpCredentials['UsePhpMail'];

		$oPlugins->RunHook('event.smtp-pre-connect', array($this, $aSmtpCredentials['UseConnect'], $aSmtpCredentials));

		if ($aSmtpCredentials['UseConnect'] && !$aSmtpCredentials['UsePhpMail'] && $oSmtpClient)
		{
			$oSmtpClient->Connect($aSmtpCredentials['Host'], $aSmtpCredentials['Port'], $aSmtpCredentials['Ehlo'],
				$aSmtpCredentials['Secure'], $aSmtpCredentials['VerifySsl'], $aSmtpCredentials['AllowSelfSigned']
			);
		}

		$oPlugins->RunHook('event.smtp-post-connect', array($this, $aSmtpCredentials['UseConnect'], $aSmtpCredentials));
		$oPlugins->RunHook('event.smtp-pre-login', array($this, $aSmtpCredentials['UseAuth'], $aSmtpCredentials));

		if ($aSmtpCredentials['UseAuth'] && !$aSmtpCredentials['UsePhpMail'] && $oSmtpClient)
		{
			$sPassword = $aSmtpCredentials['Password'];
			$aTokens = self::ParseTokensPassword($sPassword);

			$sAccessToken = $aTokens[0];
			$sRefreshToken = $aTokens[1];

			if ($sAccessToken && $sRefreshToken)
			{
				if ($refreshTokenCallback && \is_callable($refreshTokenCallback))
				{
					$sAccessToken = \call_user_func($refreshTokenCallback, $sAccessToken, $sRefreshToken);
				}

				$oSmtpClient->LoginWithXOauth2(
					\base64_encode('user='.$aSmtpCredentials['Login']."\1".'auth=Bearer '.$sAccessToken."\1\1"));
			}
			else
			{
				$oSmtpClient->Login($aSmtpCredentials['Login'], $aSmtpCredentials['Password'],
					$aSmtpCredentials['UseAuthPlainIfSupported'], $aSmtpCredentials['UseAuthCramMd5IfSupported']);
			}

			$bLogin = true;
		}

		$oPlugins->RunHook('event.smtp-post-login', array($this, $aSmtpCredentials['UseAuth'], $bLogin, $aSmtpCredentials));

		return $bLogin;
	}

	/**
	 * @param \RainLoop\Plugins\Manager $oPlugins
	 * @param \MailSo\Sieve\ManageSieveClient $oSieveClient
	 * @param \RainLoop\Application $oConfig
	 */
	public function SieveConnectAndLoginHelper($oPlugins, $oSieveClient, $oConfig)
	{
		$bLogin = false;

		$aSieveCredentials = array(
			'UseConnect' => true,
			'UseAuth' => true,
			'Host' => $this->DomainSieveHost(),
			'Port' => $this->DomainSievePort(),
			'Secure' => $this->DomainSieveSecure(),
			'Login' => $this->IncLogin(),
			'Password' => $this->Password(),
			'VerifySsl' => !!$oConfig->Get('ssl', 'verify_certificate', false),
			'AllowSelfSigned' => !!$oConfig->Get('ssl', 'allow_self_signed', true),
			'InitialAuthPlain' => !!$oConfig->Get('ssl', 'sieve_auth_plain_initial', true)
		);

		$oPlugins->RunHook('filter.sieve-credentials', array($this, &$aSieveCredentials));

		$oPlugins->RunHook('event.sieve-pre-connect', array($this, $aSieveCredentials['UseConnect'], $aSieveCredentials));

		if ($oSieveClient)
		{
			$oSieveClient->__USE_INITIAL_AUTH_PLAIN_COMMAND = $aSieveCredentials['InitialAuthPlain'];

			if ($aSieveCredentials['UseConnect'])
			{
				$oSieveClient->Connect($aSieveCredentials['Host'], $aSieveCredentials['Port'],
					$aSieveCredentials['Secure'], $aSieveCredentials['VerifySsl'], $aSieveCredentials['AllowSelfSigned']
				);
			}
		}

		$oPlugins->RunHook('event.sieve-post-connect', array($this, $aSieveCredentials['UseConnect'], $aSieveCredentials));

		$oPlugins->RunHook('event.sieve-pre-login', array($this, $aSieveCredentials['UseAuth'], $aSieveCredentials));

		if ($aSieveCredentials['UseAuth'])
		{
			$oSieveClient->Login($aSieveCredentials['Login'], $aSieveCredentials['Password']);

			$bLogin = true;
		}

		$oPlugins->RunHook('event.sieve-post-login', array($this, $aSieveCredentials['UseAuth'], $bLogin, $aSieveCredentials));

		return $bLogin;
	}
}
