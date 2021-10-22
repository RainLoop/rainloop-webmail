<?php

namespace RainLoop\Model;

class Account
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

	function __construct(string $sEmail, string $sLogin, string $sPassword, Domain $oDomain,
		string $sSignMeToken = '', string $sProxyAuthUser = '', string $sProxyAuthPassword = '', string $sClientCert = '')
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

	public function Email() : string
	{
		return $this->sEmail;
	}

	public function ParentEmail() : string
	{
		return $this->sParentEmail;
	}

	public function ProxyAuthUser() : string
	{
		return $this->sProxyAuthUser;
	}

	public function ProxyAuthPassword() : string
	{
		return $this->sProxyAuthPassword;
	}

	public function ParentEmailHelper() : string
	{
		return \strlen($this->sParentEmail) ? $this->sParentEmail : $this->sEmail;
	}

	public function IsAdditionalAccount() : string
	{
		return \strlen($this->sParentEmail);
	}

	public function IncLogin() : string
	{
		$sLogin = $this->sLogin;
		if ($this->oDomain->IncShortLogin())
		{
			$sLogin = \MailSo\Base\Utils::GetAccountNameFromEmail($this->sLogin);
		}

		return $sLogin;
	}

	public function IncPassword() : string
	{
		return $this->sPassword;
	}

	public function OutLogin() : string
	{
		$sLogin = $this->sLogin;
		if ($this->oDomain->OutShortLogin())
		{
			$sLogin = \MailSo\Base\Utils::GetAccountNameFromEmail($this->sLogin);
		}

		return $sLogin;
	}

	public function Login() : string
	{
		return $this->IncLogin();
	}

	public function Password() : string
	{
		return $this->IncPassword();
	}

	public function ClientCert() : string
	{
		return $this->sClientCert;
	}

	public function SignMe() : bool
	{
		return \strlen($this->sSignMeToken);
	}

	public function SignMeToken() : string
	{
		return $this->sSignMeToken;
	}

	public function Domain() : Domain
	{
		return $this->oDomain;
	}

	public function Hash() : string
	{
		return md5(APP_SALT.$this->Email().APP_SALT.$this->DomainIncHost().
			APP_SALT.$this->DomainIncPort().APP_SALT.$this->Password().APP_SALT.'0'.APP_SALT.$this->ParentEmail().APP_SALT);
	}

	public function SetPassword(string $sPassword) : void
	{
		$this->sPassword = $sPassword;
	}

	public function SetParentEmail(string $sParentEmail) : void
	{
		$this->sParentEmail = \trim(\MailSo\Base\Utils::IdnToAscii($sParentEmail, true));
	}

	public function SetProxyAuthUser(string $sProxyAuthUser) : void
	{
		$this->sProxyAuthUser = $sProxyAuthUser;
	}

	public function SetProxyAuthPassword(string $sProxyAuthPassword) : void
	{
		$this->sProxyAuthPassword = $sProxyAuthPassword;
	}

	public function DomainIncHost() : string
	{
		return $this->Domain()->IncHost();
	}

	public function DomainIncPort() : int
	{
		return $this->Domain()->IncPort();
	}

	public function DomainIncSecure() : int
	{
		return $this->Domain()->IncSecure();
	}

	public function DomainOutHost() : string
	{
		return $this->Domain()->OutHost();
	}

	public function DomainOutPort() : int
	{
		return $this->Domain()->OutPort();
	}

	public function DomainOutSecure() : int
	{
		return $this->Domain()->OutSecure();
	}

	public function DomainOutAuth() : bool
	{
		return $this->Domain()->OutAuth();
	}

	public function DomainSieveHost() : string
	{
		return $this->Domain()->SieveHost();
	}

	public function DomainSievePort() : int
	{
		return $this->Domain()->SievePort();
	}

	public function DomainSieveSecure() : int
	{
		return $this->Domain()->SieveSecure();
	}

	public function GetAuthToken() : string
	{
		return \RainLoop\Utils::EncodeKeyValues(array(
			'token',                          // 0
			$this->sEmail,                    // 1
			$this->sLogin,                    // 2
			$this->sPassword,                 // 3
			\RainLoop\Utils::Fingerprint(),   // 4
			$this->sSignMeToken,              // 5
			$this->sParentEmail,              // 6
			\RainLoop\Utils::GetShortToken(), // 7
			$this->sProxyAuthUser,            // 8
			$this->sProxyAuthPassword,        // 9
			0,                                // 10 // lifetime
			$this->sClientCert                // 11
		));
	}

	public function GetAuthTokenQ() : string
	{
		return \RainLoop\Utils::EncodeKeyValuesQ(array(
			'token',                          // 0
			$this->sEmail,                    // 1
			$this->sLogin,                    // 2
			$this->sPassword,                 // 3
			\RainLoop\Utils::Fingerprint(),   // 4
			$this->sSignMeToken,              // 5
			$this->sParentEmail,              // 6
			\RainLoop\Utils::GetShortToken(), // 7
			$this->sProxyAuthUser,            // 8
			$this->sProxyAuthPassword,        // 9
			0,                                // 10 // lifetime
			$this->sClientCert                // 11
		));
	}

	public function IncConnectAndLoginHelper(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Mail\MailClient $oMailClient, \RainLoop\Config\Application $oConfig) : bool
	{
		$oImapClient = $oMailClient->ImapClient();

		$aImapCredentials = array(
			'UseConnect' => true,
			'UseAuth' => true,
			'Host' => $this->DomainIncHost(),
			'Port' => $this->DomainIncPort(),
			'Secure' => $this->DomainIncSecure(),
			'Login' => $this->IncLogin(),
			'VerifySsl' => !!$oConfig->Get('ssl', 'verify_certificate', false),
			'ClientCert' => $this->ClientCert(),
			'AllowSelfSigned' => !!$oConfig->Get('ssl', 'allow_self_signed', true)
		);

		$oPlugins->RunHook('imap.before-connect', array($this, $oImapClient, &$aImapCredentials));
		if ($aImapCredentials['UseConnect']) {
			$oImapClient->Connect($aImapCredentials['Host'], $aImapCredentials['Port'],
					$aImapCredentials['Secure'], $aImapCredentials['VerifySsl'],
					$aImapCredentials['AllowSelfSigned'], $aImapCredentials['ClientCert']);

		}
		$oPlugins->RunHook('imap.after-connect', array($this, $oImapClient, $aImapCredentials));

		return $this->netClientLogin($oImapClient, $oConfig, $oPlugins, $aImapCredentials);
	}

	public function OutConnectAndLoginHelper(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Smtp\SmtpClient $oSmtpClient, \RainLoop\Config\Application $oConfig, bool &$bUsePhpMail = false) : bool
	{
		$aSmtpCredentials = array(
			'UseConnect' => !$bUsePhpMail,
			'UseAuth' => $this->DomainOutAuth(),
			'UsePhpMail' => $bUsePhpMail,
			'Ehlo' => \MailSo\Smtp\SmtpClient::EhloHelper(),
			'Host' => $this->DomainOutHost(),
			'Port' => $this->DomainOutPort(),
			'Secure' => $this->DomainOutSecure(),
			'Login' => $this->OutLogin(),
			'VerifySsl' => !!$oConfig->Get('ssl', 'verify_certificate', false),
			'AllowSelfSigned' => !!$oConfig->Get('ssl', 'allow_self_signed', true)
		);

		$oPlugins->RunHook('smtp.before-connect', array($this, $oSmtpClient, &$aSmtpCredentials));
		$bUsePhpMail = $aSmtpCredentials['UsePhpMail'];
		$aSmtpCredentials['UseAuth'] = $aSmtpCredentials['UseAuth'] && !$aSmtpCredentials['UsePhpMail'];
		if ($aSmtpCredentials['UseConnect'] && !$aSmtpCredentials['UsePhpMail']) {
			$oSmtpClient->Connect($aSmtpCredentials['Host'], $aSmtpCredentials['Port'],
				$aSmtpCredentials['Secure'], $aSmtpCredentials['VerifySsl'], $aSmtpCredentials['AllowSelfSigned'],
				'', $aSmtpCredentials['Ehlo']
			);
		}
		$oPlugins->RunHook('smtp.after-connect', array($this, $oSmtpClient, $aSmtpCredentials));

		return $this->netClientLogin($oSmtpClient, $oConfig, $oPlugins, $aSmtpCredentials);
	}

	public function SieveConnectAndLoginHelper(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Sieve\ManageSieveClient $oSieveClient, \RainLoop\Config\Application $oConfig)
	{
		$aSieveCredentials = array(
			'UseConnect' => true,
			'UseAuth' => true,
			'Host' => $this->DomainSieveHost(),
			'Port' => $this->DomainSievePort(),
			'Secure' => $this->DomainSieveSecure(),
			'Login' => $this->IncLogin(),
			'VerifySsl' => !!$oConfig->Get('ssl', 'verify_certificate', false),
			'AllowSelfSigned' => !!$oConfig->Get('ssl', 'allow_self_signed', true),
			'InitialAuthPlain' => !!$oConfig->Get('ssl', 'sieve_auth_plain_initial', true)
		);

		$oPlugins->RunHook('sieve.before-connect', array($this, $oSieveClient, &$aSieveCredentials));
		if ($aSieveCredentials['UseConnect']) {
			$oSieveClient->Connect($aSieveCredentials['Host'], $aSieveCredentials['Port'],
				$aSieveCredentials['Secure'], $aSieveCredentials['VerifySsl'], $aSieveCredentials['AllowSelfSigned']
			);
		}
		$oPlugins->RunHook('sieve.after-connect', array($this, $oSieveClient, $aSieveCredentials));

		return $this->netClientLogin($oSieveClient, $oConfig, $oPlugins, $aSieveCredentials);
	}

	private function netClientLogin(\MailSo\Net\NetClient $oClient, \RainLoop\Config\Application $oConfig, \RainLoop\Plugins\Manager $oPlugins, array $aCredentials) : bool
	{
		$aCredentials = \array_merge(
			$aCredentials,
			array(
				'Password' => $this->Password(),
				'ProxyAuthUser' => $this->ProxyAuthUser(),
				'ProxyAuthPassword' => $this->ProxyAuthPassword(),
				'UseAuthPlainIfSupported' => !!$oConfig->Get('labs', 'imap_use_auth_plain', true),
				'UseAuthCramMd5IfSupported' => !!$oConfig->Get('labs', 'imap_use_auth_cram_md5', true),
				'UseAuthOAuth2IfSupported' => false
			)
		);

		$client_name = \strtolower($oClient->getLogName());

		$oPlugins->RunHook("{$client_name}.before-login", array($this, $oClient, &$aCredentials));
		$bResult = $aCredentials['UseAuth'] && $oClient->Login($aCredentials);
		$oPlugins->RunHook("{$client_name}.after-login", array($this, $oClient, $bResult, $aCredentials));
		return $bResult;
	}

}
