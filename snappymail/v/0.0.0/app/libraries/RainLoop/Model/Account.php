<?php

namespace RainLoop\Model;

use RainLoop\Utils;
use RainLoop\Notifications;
use RainLoop\Exceptions\ClientException;

abstract class Account implements \JsonSerializable
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
	 * @var string
	 */
	private $sPassword;

	/**
	 * @var string
	 */
	private $sProxyAuthUser = '';

	/**
	 * @var string
	 */
	private $sProxyAuthPassword = '';

	/**
	 * @var string
	 */
	private $sClientCert;

	/**
	 * @var \RainLoop\Model\Domain
	 */
	private $oDomain;

	public function Email() : string
	{
		return $this->sEmail;
	}

	public function ProxyAuthUser() : string
	{
		return $this->sProxyAuthUser;
	}

	public function ProxyAuthPassword() : string
	{
		return $this->sProxyAuthPassword;
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

	public function Domain() : Domain
	{
		return $this->oDomain;
	}

	public function Hash() : string
	{
		return \md5(\implode(APP_SALT, [
			$this->sEmail,
			$this->Domain()->IncHost(),
			$this->Domain()->IncPort(),
			$this->sPassword
		]));
	}

	public function SetPassword(string $sPassword) : void
	{
		$this->sPassword = $sPassword;
	}

	public function SetProxyAuthUser(string $sProxyAuthUser) : void
	{
		$this->sProxyAuthUser = $sProxyAuthUser;
	}

	public function SetProxyAuthPassword(string $sProxyAuthPassword) : void
	{
		$this->sProxyAuthPassword = $sProxyAuthPassword;
	}

	public function jsonSerialize()
	{
		return array(
			'account',                // 0
			$this->sEmail,            // 1
			$this->sLogin,            // 2
			$this->sPassword,         // 3
			$this->sClientCert,       // 4
			$this->sProxyAuthUser,    // 5
			$this->sProxyAuthPassword // 6
		);
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public static function NewInstanceFromAuthToken(\RainLoop\Actions $oActions, string $sToken): ?self
	{
		return empty($sToken) ? null
			: static::NewInstanceFromTokenArray(
				$oActions,
				Utils::DecodeKeyValues($sToken),
				false
			);
	}

	public static function NewInstanceByLogin(\RainLoop\Actions $oActions,
		string $sEmail, string $sLogin, string $sPassword, string $sClientCert = '',
		bool $bThrowException = false): ?self
	{
		$oAccount = null;
		if ($sEmail && $sLogin && $sPassword) {
			$oDomain = $oActions->DomainProvider()->Load(\MailSo\Base\Utils::GetDomainFromEmail($sEmail), true);
			if ($oDomain) {
				if ($oDomain->ValidateWhiteList($sEmail, $sLogin)) {
					$oAccount = new static;

					$oAccount->sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail, true);
					$oAccount->sLogin = \MailSo\Base\Utils::IdnToAscii($sLogin);
					$oAccount->sPassword = $sPassword;
					$oAccount->oDomain = $oDomain;
					$oAccount->sClientCert = $sClientCert;

					$oActions->Plugins()->RunHook('filter.account', array($oAccount));

					if ($bThrowException && !$oAccount) {
						throw new ClientException(Notifications::AuthError);
					}
				} else if ($bThrowException) {
					throw new ClientException(Notifications::AccountNotAllowed);
				}
			} else if ($bThrowException) {
				throw new ClientException(Notifications::DomainNotAllowed);
			}
		}

		return $oAccount;
	}

	public static function NewInstanceFromTokenArray(
		\RainLoop\Actions $oActions,
		array $aAccountHash,
		bool $bThrowExceptionOnFalse = false): ?self
	{
		if (!empty($aAccountHash[0]) && 'account' === $aAccountHash[0] && 7 <= \count($aAccountHash)) {
			$oAccount = static::NewInstanceByLogin(
				$oActions,
				$aAccountHash[1] ?: '',
				$aAccountHash[2] ?: '',
				$aAccountHash[3] ?: '',
				$aAccountHash[4] ?: '',
				$bThrowExceptionOnFalse
			);

			if ($oAccount) {
				// init proxy user/password
				if (!empty($aAccountHash[5]) && !empty($aAccountHash[6])) {
					$oAccount->SetProxyAuthUser($aAccountHash[5]);
					$oAccount->SetProxyAuthPassword($aAccountHash[6]);
				}

				$oActions->Logger()->AddSecret($oAccount->Password());
				$oActions->Logger()->AddSecret($oAccount->ProxyAuthPassword());

				return $oAccount;
			}
		}
		return null;
	}

	public function IncConnectAndLoginHelper(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Mail\MailClient $oMailClient, \RainLoop\Config\Application $oConfig) : bool
	{
		$oImapClient = $oMailClient->ImapClient();

		$aImapCredentials = \array_merge(
			$this->Domain()->ImapSettings(),
			array(
				'Login' => $this->IncLogin(),
				'VerifySsl' => !!$oConfig->Get('ssl', 'verify_certificate', false),
				'ClientCert' => $this->ClientCert(),
				'AllowSelfSigned' => !!$oConfig->Get('ssl', 'allow_self_signed', true)
			)
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
		$aSmtpCredentials = \array_merge(
			$this->Domain()->SmtpSettings(),
			array(
				'UseConnect' => !$bUsePhpMail,
				'UsePhpMail' => $bUsePhpMail,
				'Login' => $this->OutLogin(),
				'VerifySsl' => !!$oConfig->Get('ssl', 'verify_certificate', false),
				'AllowSelfSigned' => !!$oConfig->Get('ssl', 'allow_self_signed', true)
			)
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
		$aSieveCredentials = \array_merge(
			$this->Domain()->SieveSettings(),
			array(
				'Login' => $this->IncLogin(),
				'VerifySsl' => !!$oConfig->Get('ssl', 'verify_certificate', false),
				'AllowSelfSigned' => !!$oConfig->Get('ssl', 'allow_self_signed', true),
				'InitialAuthPlain' => !!$oConfig->Get('ssl', 'sieve_auth_plain_initial', true)
			)
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
				'UseAuthPlainIfSupported' => !!$oConfig->Get('labs', 'sasl_allow_plain', true),
				'UseAuthCramMd5IfSupported' => !!$oConfig->Get('labs', 'sasl_allow_cram_md5', false),
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
