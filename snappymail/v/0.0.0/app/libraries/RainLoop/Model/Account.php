<?php

namespace RainLoop\Model;

use RainLoop\Utils;
use RainLoop\Notifications;
use RainLoop\Exceptions\ClientException;
use SnappyMail\SensitiveString;

abstract class Account implements \JsonSerializable
{
	private string $sName = '';

	private string $sEmail = '';

	private string $sImapUser = '';

	private ?SensitiveString $oImapPass = null;

	private string $sSmtpUser = '';

	private ?SensitiveString $oSmtpPass = null;

	private ?Domain $oDomain = null;

	public function Email() : string
	{
		return $this->sEmail;
	}

	public function Name() : string
	{
		return $this->sName;
	}

	public function ImapUser() : string
	{
		return $this->sImapUser;
	}

	public function ImapPass() : string
	{
		return $this->oImapPass ? $this->oImapPass->getValue() : '';
	}

	public function SmtpUser() : string
	{
		return $this->sSmtpUser ?: ($this->oDomain ? $this->oDomain->SmtpSettings()->fixUsername($this->sEmail) : '');
//		return $this->sSmtpUser ?: $this->sEmail ?: $this->sImapUser;
	}

	public function Domain() : ?Domain
	{
		return $this->oDomain;
	}

	public function Hash() : string
	{
		return \sha1(\implode(APP_SALT, [
			$this->sEmail,
			$this->sImapUser,
//			\json_encode($this->Domain()),
//			$this->oImapPass
		]));
	}

	public function setImapUser(string $sImapUser) : void
	{
		$this->sImapUser = $sImapUser;
	}

	public function setImapPass(SensitiveString $oPassword) : void
	{
		$this->oImapPass = $oPassword;
	}

	public function setSmtpUser(string $sSmtpUser) : void
	{
		$this->sSmtpUser = $sSmtpUser;
	}

	public function setSmtpPass(SensitiveString $oPassword) : void
	{
		$this->oSmtpPass = $oPassword;
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		$result = [
			'email' => $this->sEmail,
			'login' => $this->sImapUser,
			'pass'  => $this->ImapPass(),
			'name' => $this->sName,
			'smtp' => []
		];
		if ($this->sSmtpUser) {
			$result['smtp']['user'] = $this->sSmtpUser;
		}
		if ($this->oSmtpPass) {
			$result['smtp']['pass'] = $this->oSmtpPass->getValue();
		}
		return $result;
	}

	public function setCredentials(
		Domain $oDomain,
		string $sEmail,
		string $sImapUser,
		SensitiveString $oImapPass,
		string $sSmtpUser = '',
		?SensitiveString $oSmtpPass = null
	) {
		$this->sEmail = $sEmail;
		$this->oDomain = $oDomain;
		$this->sImapUser = $sImapUser;
		$this->oImapPass = $oImapPass;
		$this->sSmtpUser = $sSmtpUser;
		$this->oSmtpPass = $oSmtpPass;
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
		return [
			'email' => $aAccount[1] ?: '',
			'login' => $aAccount[2] ?: '',
			'pass'  => $aAccount[3] ?: ''
		];
	}

	public static function NewInstanceFromTokenArray(
		\RainLoop\Actions $oActions,
		array $aAccountHash,
		bool $bThrowExceptionOnFalse = false): ?self
	{
		$oAccount = null;
		$aAccountHash = static::convertArray($aAccountHash);
		try {
/*
			if (empty($aAccountHash['email'])) {
				throw new ClientException(Notifications::InvalidToken, null, 'TokenArray missing email');
			}
			if (empty($aAccountHash['login'])) {
				throw new ClientException(Notifications::InvalidToken, null, 'TokenArray missing login');
			}
			if (empty($aAccountHash['pass'])) {
				throw new ClientException(Notifications::InvalidToken, null, 'TokenArray missing pass');
			}
*/
			if (empty($aAccountHash['email']) || empty($aAccountHash['login']) || empty($aAccountHash['pass'])) {
				throw new \RuntimeException("Invalid TokenArray");
			}
			$oDomain = $oActions->DomainProvider()->getByEmailAddress($aAccountHash['email']);
			if ($oDomain) {
//				$aAccountHash['email'] = $oDomain->ImapSettings()->fixUsername($aAccountHash['email'], false);
//				$aAccountHash['login'] = $oDomain->ImapSettings()->fixUsername($aAccountHash['login']);
				$oAccount = new static;
				$oAccount->sEmail = \SnappyMail\IDN::emailToAscii($aAccountHash['email']);
//				$oAccount->sImapUser = \SnappyMail\IDN::emailToAscii($aAccountHash['login']);
				$oAccount->sImapUser = $aAccountHash['login'];
				$oAccount->setImapPass(new SensitiveString($aAccountHash['pass']));
				$oAccount->oDomain = $oDomain;
				$oActions->Plugins()->RunHook('filter.account', array($oAccount));
				if (!$oAccount) {
					throw new ClientException(Notifications::AccountFilterError);
				}
				if (isset($aAccountHash['name'])) {
					$oAccount->sName = $aAccountHash['name'];
				}
				// init smtp user/password
				if (isset($aAccountHash['smtp']['user'])) {
					$oAccount->sSmtpUser = $aAccountHash['smtp']['user'];
				}
				if (isset($aAccountHash['smtp']['pass'])) {
					$oAccount->setSmtpPass(new SensitiveString($aAccountHash['smtp']['pass']));
				}
			}
		} catch (\Throwable $e) {
			\SnappyMail\Log::debug('ACCOUNT', $e->getMessage());
			if ($bThrowExceptionOnFalse) {
				throw $e;
			}
		}
		return $oAccount;
	}

	public function ImapConnectAndLogin(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Imap\ImapClient $oImapClient, \RainLoop\Config\Application $oConfig) : bool
	{
		$oSettings = $this->Domain()->ImapSettings();
		$oSettings->timeout = \max($oSettings->timeout, (int) $oConfig->Get('imap', 'timeout', $oSettings->timeout));
		$oSettings->username = $this->ImapUser();

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

		$oSettings->passphrase = $this->oImapPass;
		return $this->netClientLogin($oImapClient, $oPlugins);
	}

	public function SmtpConnectAndLogin(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Smtp\SmtpClient $oSmtpClient) : bool
	{
		$oSettings = $this->Domain()->SmtpSettings();
		$oSettings->username = $this->SmtpUser();
		$oSettings->Ehlo = \MailSo\Smtp\SmtpClient::EhloHelper();

		$oSmtpClient->Settings = $oSettings;

		$oPlugins->RunHook('smtp.before-connect', array($this, $oSmtpClient, $oSettings));
		if ($oSettings->usePhpMail) {
			$oSettings->useAuth = false;
			return true;
		}
		$oSmtpClient->Connect($oSettings);
		$oPlugins->RunHook('smtp.after-connect', array($this, $oSmtpClient, $oSettings));
/*
		if ($this->oDomain->OutAskCredentials() && !($this->oSmtpPass && $this->sSmtpUser)) {
			throw new RequireCredentialsException
		}
*/
		$oSettings->passphrase = $this->oSmtpPass ?: $this->oImapPass;
		return $this->netClientLogin($oSmtpClient, $oPlugins);
	}

	public function SieveConnectAndLogin(\RainLoop\Plugins\Manager $oPlugins, \MailSo\Sieve\SieveClient $oSieveClient, \RainLoop\Config\Application $oConfig)
	{
		$oSettings = $this->Domain()->SieveSettings();
		$oSettings->username = $this->ImapUser();

		$oSieveClient->Settings = $oSettings;

		$oPlugins->RunHook('sieve.before-connect', array($this, $oSieveClient, $oSettings));
		$oSieveClient->Connect($oSettings);
		$oPlugins->RunHook('sieve.after-connect', array($this, $oSieveClient, $oSettings));

		$oSettings->passphrase = $this->oImapPass;
		return $this->netClientLogin($oSieveClient, $oPlugins);
	}

	private function netClientLogin(\MailSo\Net\NetClient $oClient, \RainLoop\Plugins\Manager $oPlugins) : bool
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
		$oSettings = $oClient->Settings;

		$client_name = \strtolower($oClient->getLogName());

		$oPlugins->RunHook("{$client_name}.before-login", array($this, $oClient, $oSettings));
		$bResult = !$oSettings->useAuth || $oClient->Login($oSettings);
		$oPlugins->RunHook("{$client_name}.after-login", array($this, $oClient, $bResult, $oSettings));
		return $bResult;
	}

/*
	// Stores settings in AdditionalAccount else MainAccount
	public function settingsLocal() : \RainLoop\Settings
	{
		return \RainLoop\Api::Actions()->SettingsProvider(true)->Load($this);
	}
*/

	/**
	 * @deprecated since v2.36.1
	 */
	public function IncLogin() : string
	{
		return $this->ImapUser();
	}
	public function IncPassword() : string
	{
		return $this->ImapPass();
	}
	public function OutLogin() : string
	{
		return $this->SmtpUser();
	}
	public function SetPassword(SensitiveString $oPassword) : void
	{
		$this->oImapPass = $oPassword;
	}
}
