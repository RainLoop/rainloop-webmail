<?php

namespace RainLoop\Model;

use RainLoop\Utils;
use RainLoop\Notifications;
use RainLoop\Exceptions\ClientException;

abstract class Account implements \JsonSerializable
{
	private string $sName = '';

	private string $sEmail = '';

	private string $sLogin = '';

	private string $sPassword = '';

	private string $sProxyAuthUser = '';

	private string $sProxyAuthPassword = '';

	private Domain $oDomain;

	public function Email() : string
	{
		return $this->sEmail;
	}

	public function Name() : string
	{
		return $this->sName;
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
		return $this->oDomain->IncShortLogin()
			? \MailSo\Base\Utils::GetAccountNameFromEmail($this->sLogin)
			: $this->sLogin;
	}

	public function IncPassword() : string
	{
		return $this->sPassword;
	}

	public function OutLogin() : string
	{
		return $this->oDomain->OutShortLogin()
			? \MailSo\Base\Utils::GetAccountNameFromEmail($this->sLogin)
			: $this->sLogin;
	}

	// Deprecated
	public function Login() : string
	{
		\trigger_error('Use \RainLoop\Model\Account->IncLogin()', \E_USER_DEPRECATED);
		return $this->IncLogin();
	}

	// Deprecated
	public function Password() : string
	{
		\trigger_error('Use \RainLoop\Model\Account->IncPassword()', \E_USER_DEPRECATED);
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
		$result = [
//			'account',                   // 0
			'email' => $this->sEmail,    // 1
			'login' => $this->sLogin,    // 2
			'pass'  => $this->sPassword, // 3
//			'',                          // 4 sClientCert
			'name' => $this->sName
		];
		if ($this->sProxyAuthUser && $this->sProxyAuthPassword) {
			$result['proxy'] = [
				'user' => $this->sProxyAuthUser,    // 5
				'pass' => $this->sProxyAuthPassword // 6
			];
		}
		return $result;
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

	/**
	 * Converts old numeric array to new associative array
	 */
	public static function convertArray(array $aAccount) : array
	{
		if (isset($aAccount['email'])) {
			return $aAccount;
		}
		if (empty($aAccount[0]) || 'account' != $aAccount[0] || 7 > \count($aAccount)) {
			return [];
		}
		$aResult = [
			'email' => $aAccount[1] ?: '',
			'login' => $aAccount[2] ?: '',
			'pass'  => $aAccount[3] ?: ''
		];
		if ($aAccount[5] && $aAccount[6]) {
			$aResult['proxy'] = [
				'user' => $aAccount[5],
				'pass' => $aAccount[6]
			];
		}
		return $aResult;
	}

	public static function NewInstanceFromTokenArray(
		\RainLoop\Actions $oActions,
		array $aAccountHash,
		bool $bThrowExceptionOnFalse = false): ?self
	{
		$oAccount = null;
		$aAccountHash = static::convertArray($aAccountHash);
		if (!empty($aAccountHash['email']) && 3 <= \count($aAccountHash)) {
			$oAccount = static::NewInstanceFromCredentials(
				$oActions,
				$aAccountHash['email'],
				$aAccountHash['login'],
				$aAccountHash['pass'],
				$bThrowExceptionOnFalse
			);
			if ($oAccount) {
				if (isset($aAccountHash['name'])) {
					$oAccount->sName = $aAccountHash['name'];
				}
				// init proxy user/password
				if (isset($aAccountHash['proxy'])) {
					$oAccount->sProxyAuthUser = $aAccountHash['proxy']['user'];
					$oAccount->sProxyAuthPassword = $aAccountHash['proxy']['pass'];
				}
				$oActions->Logger()->AddSecret($oAccount->IncPassword());
				$oActions->Logger()->AddSecret($oAccount->ProxyAuthPassword());
			}
		}
		return $oAccount;
	}

	public function ImapConnectAndLoginHelper(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Imap\ImapClient $oImapClient, \RainLoop\Config\Application $oConfig) : bool
	{
		$oImapClient->__FORCE_SELECT_ON_EXAMINE__ = !!$oConfig->Get('imap', 'use_force_selection');
		$oImapClient->__DISABLE_METADATA = !!$oConfig->Get('imap', 'disable_metadata');

		$oSettings = $this->Domain()->ImapSettings();
		$oSettings->Login = $this->IncLogin();

		$oPlugins->RunHook('imap.before-connect', array($this, $oImapClient, $oSettings));
		$oImapClient->Connect($oSettings);
		$oPlugins->RunHook('imap.after-connect', array($this, $oImapClient, $oSettings));

		return $this->netClientLogin($oImapClient, $oPlugins, $oSettings);
	}

	public function SmtpConnectAndLoginHelper(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Smtp\SmtpClient $oSmtpClient, \RainLoop\Config\Application $oConfig, bool &$bUsePhpMail = false) : bool
	{
		$oSettings = $this->Domain()->SmtpSettings();
		$oSettings->Login = $this->OutLogin();
		$oSettings->usePhpMail = $bUsePhpMail;
		$oSettings->Ehlo = \MailSo\Smtp\SmtpClient::EhloHelper();

		$oPlugins->RunHook('smtp.before-connect', array($this, $oSmtpClient, $oSettings));
		$bUsePhpMail = $oSettings->usePhpMail;
		$oSettings->useAuth = $oSettings->useAuth && !$oSettings->usePhpMail;

		if (!$oSettings->usePhpMail) {
			$oSmtpClient->Connect($oSettings, $oSettings->Ehlo);
		}
		$oPlugins->RunHook('smtp.after-connect', array($this, $oSmtpClient, $oSettings));

		return $this->netClientLogin($oSmtpClient, $oPlugins, $oSettings);
	}

	public function SieveConnectAndLoginHelper(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Sieve\SieveClient $oSieveClient, \RainLoop\Config\Application $oConfig)
	{
		$oSettings = $this->Domain()->SieveSettings();
		$oSettings->Login = $this->IncLogin();

		$oPlugins->RunHook('sieve.before-connect', array($this, $oSieveClient, $oSettings));
		$oSieveClient->Connect($oSettings);
		$oPlugins->RunHook('sieve.after-connect', array($this, $oSieveClient, $oSettings));

		return $this->netClientLogin($oSieveClient, $oPlugins, $oSettings);
	}

	private function netClientLogin(\MailSo\Net\NetClient $oClient, \RainLoop\Plugins\Manager $oPlugins, \MailSo\Net\ConnectSettings $oSettings) : bool
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
		$oSettings->Password = $this->IncPassword();
		$oSettings->ProxyAuthUser = $this->ProxyAuthUser();
		$oSettings->ProxyAuthPassword = $this->ProxyAuthPassword();

		$client_name = \strtolower($oClient->getLogName());

		$oPlugins->RunHook("{$client_name}.before-login", array($this, $oClient, $oSettings));
		$bResult = !$oSettings->useAuth || $oClient->Login($oSettings);
		$oPlugins->RunHook("{$client_name}.after-login", array($this, $oClient, $bResult, $oSettings));
		return $bResult;
	}

}
