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

	private string $sSmtpLogin = '';

	private string $sSmtpPassword = '';

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
		$sSmtpLogin = $this->sSmtpLogin ?: $this->sLogin;
		return $this->oDomain->OutShortLogin() ? \MailSo\Base\Utils::GetAccountNameFromEmail($sSmtpLogin) : $sSmtpLogin;
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

	public function SetSmtpPassword(string $sPassword) : void
	{
		$this->sSmtpLogin = $sPassword;
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
		if ($this->sSmtpLogin && $this->sSmtpPassword) {
			$result['smtp'] = [
				'user' => $this->sSmtpLogin,
				'pass' => $this->sSmtpPassword
			];
		}
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
				$oActions->Logger()->AddSecret($oAccount->sPassword);
				// init smtp user/password
				if (isset($aAccountHash['smtp'])) {
					$oAccount->sSmtpLogin = $aAccountHash['smtp']['user'];
					$oAccount->sSmtpPassword = $aAccountHash['smtp']['pass'];
					$oActions->Logger()->AddSecret($oAccount->sSmtpPassword);
				}
				// init proxy user/password
				if (isset($aAccountHash['proxy'])) {
					$oAccount->sProxyAuthUser = $aAccountHash['proxy']['user'];
					$oAccount->sProxyAuthPassword = $aAccountHash['proxy']['pass'];
					$oActions->Logger()->AddSecret($oAccount->sProxyAuthPassword);
				}
			}
		}
		return $oAccount;
	}

	// Deprecated
	public function ImapConnectAndLoginHelper(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Imap\ImapClient $oImapClient, \RainLoop\Config\Application $oConfig) : bool
	{
		return $this->ImapConnectAndLogin($oPlugins, $oImapClient, $oConfig);
	}
	public function ImapConnectAndLogin(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Imap\ImapClient $oImapClient, \RainLoop\Config\Application $oConfig) : bool
	{
		$oSettings = $this->Domain()->ImapSettings();
		$oSettings->timeout = \max($oSettings->timeout, (int) $oConfig->Get('imap', 'timeout', $oSettings->timeout));
		$oSettings->Login = $this->IncLogin();

		$oSettings->expunge_all_on_delete |= !!$oConfig->Get('imap', 'use_expunge_all_on_delete', false);
		$oSettings->fast_simple_search = !(!$oSettings->fast_simple_search || !$oConfig->Get('imap', 'message_list_fast_simple_search', true));
		$oSettings->fetch_new_messages = !(!$oSettings->fetch_new_messages || !$oConfig->Get('imap', 'fetch_new_messages', true));
		$oSettings->force_select |= !!$oConfig->Get('imap', 'use_force_selection', false);
		$oSettings->message_all_headers |= !!$oConfig->Get('imap', 'message_all_headers', false);
		$oSettings->search_filter = $oSettings->search_filter ?: \trim($oConfig->Get('imap', 'message_list_permanent_filter', ''));
//		$oSettings->body_text_limit = \min($oSettings->body_text_limit, (int) $oConfig->Get('imap', 'body_text_limit', 50));
//		$oSettings->thread_limit = \min($oSettings->thread_limit, (int) $oConfig->Get('imap', 'large_thread_limit', 50));

		$oImapClient->Settings = $oSettings;

		$oPlugins->RunHook('imap.before-connect', array($this, $oImapClient, $oSettings));
		$oImapClient->Connect($oSettings);
		$oPlugins->RunHook('imap.after-connect', array($this, $oImapClient, $oSettings));

		$oSettings->Password = $this->IncPassword();
		return $this->netClientLogin($oImapClient, $oPlugins, $oSettings);
	}

	public function SmtpConnectAndLogin(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Smtp\SmtpClient $oSmtpClient) : bool
	{
		$oSettings = $this->Domain()->SmtpSettings();
		$oSettings->Login = $this->OutLogin();
		$oSettings->Ehlo = \MailSo\Smtp\SmtpClient::EhloHelper();

		$oSmtpClient->Settings = $oSettings;

		$oPlugins->RunHook('smtp.before-connect', array($this, $oSmtpClient, $oSettings));
		if ($oSettings->usePhpMail) {
			$oSettings->useAuth = false;
			return true;
		}
		$oSmtpClient->Connect($oSettings, $oSettings->Ehlo);
		$oPlugins->RunHook('smtp.after-connect', array($this, $oSmtpClient, $oSettings));
/*
		if ($this->oDomain->OutAskCredentials() && !($this->sSmtpPassword && $this->sSmtpLogin)) {
			throw new RequireCredentialsException
		}
*/
		$oSettings->Password = $this->sSmtpPassword ?: $this->sPassword;
		return $this->netClientLogin($oSmtpClient, $oPlugins, $oSettings);
	}

	public function SieveConnectAndLogin(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Sieve\SieveClient $oSieveClient, \RainLoop\Config\Application $oConfig)
	{
		$oSettings = $this->Domain()->SieveSettings();
		$oSettings->Login = $this->IncLogin();

		$oSieveClient->Settings = $oSettings;

		$oPlugins->RunHook('sieve.before-connect', array($this, $oSieveClient, $oSettings));
		$oSieveClient->Connect($oSettings);
		$oPlugins->RunHook('sieve.after-connect', array($this, $oSieveClient, $oSettings));

		$oSettings->Password = $this->IncPassword();
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
		$oSettings->ProxyAuthUser = $this->sProxyAuthUser;
		$oSettings->ProxyAuthPassword = $this->sProxyAuthPassword;

		$client_name = \strtolower($oClient->getLogName());

		$oPlugins->RunHook("{$client_name}.before-login", array($this, $oClient, $oSettings));
		$bResult = !$oSettings->useAuth || $oClient->Login($oSettings);
		$oPlugins->RunHook("{$client_name}.after-login", array($this, $oClient, $bResult, $oSettings));
		return $bResult;
	}

}
