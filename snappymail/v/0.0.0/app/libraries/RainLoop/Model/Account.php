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

	public function Domain() : Domain
	{
		return $this->oDomain;
	}

	public function Hash() : string
	{
		return \sha1(\implode(APP_SALT, [
			$this->sEmail,
			APP_VERSION
//			\json_encode($this->Domain()),
//			$this->sPassword
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

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return array(
			'account',                // 0
			$this->sEmail,            // 1
			$this->sLogin,            // 2
			$this->sPassword,         // 3
			'',                       // 4 sClientCert
			$this->sProxyAuthUser,    // 5
			$this->sProxyAuthPassword // 6
		);
	}

	public static function NewInstanceFromCredentials(\RainLoop\Actions $oActions,
		string $sEmail, string $sLogin, string $sPassword, bool $bThrowException = false): ?self
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

					$oActions->Plugins()->RunHook('filter.account', array($oAccount));

					if ($bThrowException && !$oAccount) {
						throw new ClientException(Notifications::AccountFilterError);
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
			$oAccount = static::NewInstanceFromCredentials(
				$oActions,
				$aAccountHash[1] ?: '',
				$aAccountHash[2] ?: '',
				$aAccountHash[3] ?: '',
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

	public function ImapConnectAndLoginHelper(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Mail\MailClient $oMailClient, \RainLoop\Config\Application $oConfig) : bool
	{
		$oImapClient = $oMailClient->ImapClient();
		$oImapClient->__FORCE_SELECT_ON_EXAMINE__ = !!$oConfig->Get('imap', 'use_force_selection');
		$oImapClient->__DISABLE_METADATA = !!$oConfig->Get('imap', 'disable_metadata');

		$aCredentials = \array_merge(
			$this->Domain()->ImapSettings(),
			array(
				'Login' => $this->IncLogin(),
				'VerifySsl' => !!$oConfig->Get('ssl', 'verify_certificate', false),
				'AllowSelfSigned' => !!$oConfig->Get('ssl', 'allow_self_signed', true),
				'ClientCert' => \trim($oConfig->Get('ssl', 'client_cert', ''))
			)
		);

		$oPlugins->RunHook('imap.before-connect', array($this, $oImapClient, &$aCredentials));
		if ($aCredentials['UseConnect']) {
			$oSettings = \MailSo\Net\ConnectSettings::fromArray($aCredentials);
			$oImapClient->Connect($oSettings);
		}
		$oPlugins->RunHook('imap.after-connect', array($this, $oImapClient, $aCredentials));

		return $this->netClientLogin($oImapClient, $oConfig, $oPlugins, $aCredentials);
	}

	public function SmtpConnectAndLoginHelper(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Smtp\SmtpClient $oSmtpClient, \RainLoop\Config\Application $oConfig, bool &$bUsePhpMail = false) : bool
	{
		$aCredentials = \array_merge(
			$this->Domain()->SmtpSettings(),
			array(
				'UseConnect' => !$bUsePhpMail,
				'UsePhpMail' => $bUsePhpMail,
				'Login' => $this->OutLogin(),
				'VerifySsl' => !!$oConfig->Get('ssl', 'verify_certificate', false),
				'AllowSelfSigned' => !!$oConfig->Get('ssl', 'allow_self_signed', true)
			)
		);

		$oPlugins->RunHook('smtp.before-connect', array($this, $oSmtpClient, &$aCredentials));
		$bUsePhpMail = $aCredentials['UsePhpMail'];
		$aCredentials['UseAuth'] = $aCredentials['UseAuth'] && !$aCredentials['UsePhpMail'];

		if ($aCredentials['UseConnect'] && !$aCredentials['UsePhpMail']) {
			$oSettings = \MailSo\Net\ConnectSettings::fromArray($aCredentials);
			$oSmtpClient->Connect($oSettings, $aCredentials['Ehlo']);
		}
		$oPlugins->RunHook('smtp.after-connect', array($this, $oSmtpClient, $aCredentials));

		return $this->netClientLogin($oSmtpClient, $oConfig, $oPlugins, $aCredentials);
	}

	public function SieveConnectAndLoginHelper(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Sieve\ManageSieveClient $oSieveClient, \RainLoop\Config\Application $oConfig)
	{
		$aCredentials = \array_merge(
			$this->Domain()->SieveSettings(),
			array(
				'Login' => $this->IncLogin(),
				'VerifySsl' => !!$oConfig->Get('ssl', 'verify_certificate', false),
				'AllowSelfSigned' => !!$oConfig->Get('ssl', 'allow_self_signed', true),
				'InitialAuthPlain' => !!$oConfig->Get('labs', 'sieve_auth_plain_initial', true)
			)
		);

		$oPlugins->RunHook('sieve.before-connect', array($this, $oSieveClient, &$aCredentials));
		if ($aCredentials['UseConnect']) {
			$oSettings = \MailSo\Net\ConnectSettings::fromArray($aCredentials);
			$oSieveClient->Connect($oSettings);
		}
		$oPlugins->RunHook('sieve.after-connect', array($this, $oSieveClient, $aCredentials));

		return $this->netClientLogin($oSieveClient, $oConfig, $oPlugins, $aCredentials);
	}

	private function netClientLogin(\MailSo\Net\NetClient $oClient, \RainLoop\Config\Application $oConfig, \RainLoop\Plugins\Manager $oPlugins, array $aCredentials) : bool
	{
/*
		$encrypted = !empty(\stream_get_meta_data($oClient->ConnectionResource())['crypto']);
		[crypto] => Array(
			[protocol] => TLSv1.3
			[cipher_name] => TLS_AES_256_GCM_SHA384
			[cipher_bits] => 256
			[cipher_version] => TLSv1.3
		)
*/
		/**
		 * TODO: move these to Admin -> Domains -> per Domain management?
		 */
		$aSASLMechanisms = [];
		if ($oConfig->Get('labs', 'sasl_allow_scram_sha', false)) {
			// https://github.com/the-djmaze/snappymail/issues/182
			\array_push($aSASLMechanisms, 'SCRAM-SHA3-512', 'SCRAM-SHA-512', 'SCRAM-SHA-256', 'SCRAM-SHA-1');
		}
		if ($oConfig->Get('labs', 'sasl_allow_cram_md5', false)) {
			$aSASLMechanisms[] = 'CRAM-MD5';
		}
		if ($oConfig->Get('labs', 'sasl_allow_plain', true)) {
			$aSASLMechanisms[] = 'PLAIN';
		}
		$aCredentials = \array_merge(
			$aCredentials,
			array(
				'Password' => $this->Password(),
				'ProxyAuthUser' => $this->ProxyAuthUser(),
				'ProxyAuthPassword' => $this->ProxyAuthPassword(),
				'SASLMechanisms' => $aSASLMechanisms
			)
		);

		$client_name = \strtolower($oClient->getLogName());

		$oPlugins->RunHook("{$client_name}.before-login", array($this, $oClient, &$aCredentials));
		$bResult = $aCredentials['UseAuth'] && $oClient->Login($aCredentials);
		$oPlugins->RunHook("{$client_name}.after-login", array($this, $oClient, $bResult, $aCredentials));
		return $bResult;
	}

}
