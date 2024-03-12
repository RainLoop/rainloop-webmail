<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\Capa;
use RainLoop\Notifications;
use RainLoop\Utils;
use RainLoop\Model\Account;
use RainLoop\Model\MainAccount;
use RainLoop\Model\AdditionalAccount;
use RainLoop\Providers\Storage\Enumerations\StorageType;
use RainLoop\Exceptions\ClientException;
use SnappyMail\Cookies;

trait UserAuth
{
	/**
	 * @var bool | null | Account
	 */
	private $oAdditionalAuthAccount = false;
	private $oMainAuthAccount = false;

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function resolveLoginCredentials(string &$sEmail, \SnappyMail\SensitiveString $oPassword, string &$sLogin): void
	{
		$sEmail = \SnappyMail\IDN::emailToAscii(\MailSo\Base\Utils::Trim($sEmail));
		if ($this->Config()->Get('login', 'login_lowercase', true)) {
			$sEmail = \mb_strtolower($sEmail);
		}

		$this->Plugins()->RunHook('login.credentials.step-1', array(&$sEmail));

		if (!\str_contains($sEmail, '@')) {
			$this->logWrite("The email address '{$sEmail}' is incomplete", \LOG_INFO, 'LOGIN');
			$oDomain = null;
			if ($this->Config()->Get('login', 'determine_user_domain', false)) {
//				$sUserHost = \SnappyMail\IDN::toAscii($this->Http()->GetHost(false, true));
				$sUserHost = \strtolower(\idn_to_ascii($this->Http()->GetHost(false, true)));
				$this->logWrite("Determined user domain: {$sUserHost}", \LOG_INFO, 'LOGIN');

				$aDomainParts = \explode('.', $sUserHost);
				$iLimit = \min(\count($aDomainParts), 14);
				$oDomainProvider = $this->DomainProvider();
				while (0 < $iLimit--) {
					$sLine = \implode('.', $aDomainParts);
					$oDomain = $oDomainProvider->Load($sLine, false);
					if ($oDomain) {
						$sEmail .= '@' . $sLine;
						$this->logWrite("Check '{$sLine}': OK", \LOG_INFO, 'LOGIN');
						break;
					} else {
						$this->logWrite("Check '{$sLine}': NO", \LOG_INFO, 'LOGIN');
					}
					\array_shift($aDomainParts);
				}

				if (!$oDomain) {
					$oDomain = $oDomainProvider->Load($sUserHost, true);
					if ($oDomain) {
						$sEmail .= '@' . $sUserHost;
						$this->logWrite("Check '{$sUserHost}' with wildcard: OK", \LOG_INFO, 'LOGIN');
					} else {
						$this->logWrite("Check '{$sUserHost}' with wildcard: NO", \LOG_INFO, 'LOGIN');
					}
				}

				if (!$oDomain) {
					$this->logWrite("Domain '{$sUserHost}' was not determined!", \LOG_INFO, 'LOGIN');
				}
			}

			if (!$oDomain) {
				$sDefDomain = \trim($this->Config()->Get('login', 'default_domain', ''));
				if (\strlen($sDefDomain)) {
					if ('HTTP_HOST' === $sDefDomain || 'SERVER_NAME' === $sDefDomain) {
						$sDefDomain = \preg_replace('/:[0-9]+$/D', '', $_SERVER[$sDefDomain]);
					} else if ('gethostname' === $sDefDomain) {
						$sDefDomain = \gethostname();
					}
					$sEmail .= '@' . $sDefDomain;
					$this->logWrite("Default domain '{$sDefDomain}' will be used.", \LOG_INFO, 'LOGIN');
				} else {
					$this->logWrite('Default domain not configured.', \LOG_INFO, 'LOGIN');
				}
			}
		}

		$sPassword = (string) $oPassword;
		$this->Plugins()->RunHook('login.credentials.step-2', array(&$sEmail, &$sPassword));
		$this->logMask($sPassword);

		$sLogin = $sEmail;
		if ($this->Config()->Get('login', 'login_lowercase', true)) {
			$sLogin = \mb_strtolower($sLogin);
		}

		$this->Plugins()->RunHook('login.credentials', array(&$sEmail, &$sLogin, &$sPassword));
		$this->logMask($sPassword);

		$oPassword->setValue($sPassword);
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function LoginProcess(string &$sEmail, \SnappyMail\SensitiveString $oPassword, bool $bMainAccount = true): Account
	{
		$sInputEmail = $sEmail;

		$sLogin = '';
		$this->resolveLoginCredentials($sEmail, $oPassword, $sLogin);

		if (!\str_contains($sEmail, '@') || !\strlen($oPassword)) {
			throw new ClientException(Notifications::InvalidInputArgument);
		}

		$oAccount = null;
		try {
			$oAccount = $bMainAccount
				? MainAccount::NewInstanceFromCredentials($this, $sEmail, $sLogin, $oPassword, true)
				: AdditionalAccount::NewInstanceFromCredentials($this, $sEmail, $sLogin, $oPassword, true);
			if (!$oAccount) {
				throw new ClientException(Notifications::AuthError);
			}
		} catch (\Throwable $oException) {
			$this->LoggerAuthHelper($oAccount, $sInputEmail);
			throw $oException;
		}

		$this->imapConnect($oAccount, true);
		if ($bMainAccount) {
			$this->StorageProvider()->Put($oAccount, StorageType::SESSION, Utils::GetSessionToken(), 'true');
		}

		return $oAccount;
	}

	private static function SetAccountCookie(string $sName, ?Account $oAccount)
	{
		if ($oAccount) {
			Cookies::set(
				$sName,
				\MailSo\Base\Utils::UrlSafeBase64Encode(\SnappyMail\Crypt::EncryptToJSON($oAccount))
			);
		} else {
			Cookies::clear($sName);
		}
	}

	public function switchAccount(string $sEmail) : bool
	{
		$this->Http()->ServerNoCache();
		$oMainAccount = $this->getMainAccountFromToken(false);
		if ($sEmail && $oMainAccount && $this->GetCapa(Capa::ADDITIONAL_ACCOUNTS)) {
			$oAccount = null;
			if ($oMainAccount->Email() !== $sEmail) {
				$sEmail = \SnappyMail\IDN::emailToAscii($sEmail);
				$aAccounts = $this->GetAccounts($oMainAccount);
				if (!isset($aAccounts[$sEmail])) {
					throw new ClientException(Notifications::AccountDoesNotExist);
				}
				$oAccount = AdditionalAccount::NewInstanceFromTokenArray(
					$this, $aAccounts[$sEmail]
				);
				if (!$oAccount) {
					throw new ClientException(Notifications::AccountSwitchFailed);
				}

				// Test the login
				$oImapClient = new \MailSo\Imap\ImapClient;
				$this->imapConnect($oAccount, false, $oImapClient);
			}
			$this->SetAdditionalAuthToken($oAccount);
			return true;
		}
		return false;
	}

	/**
	 * Returns RainLoop\Model\AdditionalAccount when it exists,
	 * else returns RainLoop\Model\MainAccount when it exists,
	 * else null
	 *
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function getAccountFromToken(bool $bThrowExceptionOnFalse = true): ?Account
	{
		$this->getMainAccountFromToken($bThrowExceptionOnFalse);

		if (false === $this->oAdditionalAuthAccount && isset($_COOKIE[self::AUTH_ADDITIONAL_TOKEN_KEY])) {
			$aData = Cookies::getSecure(self::AUTH_ADDITIONAL_TOKEN_KEY);
			if ($aData) {
				$this->oAdditionalAuthAccount = AdditionalAccount::NewInstanceFromTokenArray(
					$this,
					$aData,
					$bThrowExceptionOnFalse
				);
			}
			if (!$this->oAdditionalAuthAccount) {
				$this->oAdditionalAuthAccount = null;
				Cookies::clear(self::AUTH_ADDITIONAL_TOKEN_KEY);
			}
		}

		return $this->oAdditionalAuthAccount ?: $this->oMainAuthAccount;
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function getMainAccountFromToken(bool $bThrowExceptionOnFalse = true): ?MainAccount
	{
		if (false === $this->oMainAuthAccount) try {
			$this->oMainAuthAccount = null;

			$aData = Cookies::getSecure(self::AUTH_SPEC_TOKEN_KEY);
			if ($aData) {
				/**
				 * Server side control/kickout of logged in sessions
				 * https://github.com/the-djmaze/snappymail/issues/151
				 */
				$sToken = Utils::GetSessionToken(false);
				if (!$sToken) {
//					\MailSo\Base\Http::StatusHeader(401);
					if (isset($_COOKIE[Utils::SESSION_TOKEN])) {
						\SnappyMail\Log::notice('TOKENS', 'SESSION_TOKEN invalid');
					} else {
						\SnappyMail\Log::notice('TOKENS', 'SESSION_TOKEN not set');
					}
				} else {
					$oMainAuthAccount = MainAccount::NewInstanceFromTokenArray(
						$this,
						$aData,
						$bThrowExceptionOnFalse
					);
					if ($oMainAuthAccount) {
						$sTokenValue = $this->StorageProvider()->Get($oMainAuthAccount, StorageType::SESSION, $sToken);
						if ($sTokenValue) {
							$this->oMainAuthAccount = $oMainAuthAccount;
						} else {
							$this->StorageProvider()->Clear($oMainAuthAccount, StorageType::SESSION, $sToken);
							\SnappyMail\Log::notice('TOKENS', 'SESSION_TOKEN value invalid: ' . \get_debug_type($sTokenValue));
						}
					} else {
						\SnappyMail\Log::notice('TOKENS', 'AUTH_SPEC_TOKEN_KEY invalid');
					}
				}
				if (!$this->oMainAuthAccount) {
					Cookies::clear(Utils::SESSION_TOKEN);
//					\MailSo\Base\Http::StatusHeader(401);
					$this->Logout(true);
//					$sAdditionalMessage = $this->StaticI18N('SESSION_GONE');
					throw new ClientException(Notifications::InvalidToken, null, 'Session gone');
				}
			} else {
				$oAccount = $this->GetAccountFromSignMeToken();
				if ($oAccount) {
					$this->StorageProvider()->Put(
						$oAccount,
						StorageType::SESSION,
						Utils::GetSessionToken(),
						'true'
					);
					$this->SetAuthToken($oAccount);
				}
			}

			if (!$this->oMainAuthAccount) {
				throw new ClientException(Notifications::InvalidToken, null, 'Account undefined');
			}
		} catch (\Throwable $e) {
			if ($bThrowExceptionOnFalse) {
				throw $e;
			}
		}

		return $this->oMainAuthAccount;
	}

	public function SetMainAuthAccount(MainAccount $oAccount): void
	{
		$this->oAdditionalAuthAccount = false;
		$this->oMainAuthAccount = $oAccount;
	}

	public function SetAuthToken(MainAccount $oAccount): void
	{
		$this->SetMainAuthAccount($oAccount);
		static::SetAccountCookie(self::AUTH_SPEC_TOKEN_KEY, $oAccount);
	}

	public function SetAdditionalAuthToken(?AdditionalAccount $oAccount): void
	{
		$this->oAdditionalAuthAccount = $oAccount ?: false;
		static::SetAccountCookie(self::AUTH_ADDITIONAL_TOKEN_KEY, $oAccount);
	}

	/**
	 * SignMe methods used for the "remember me" cookie
	 */

	private static function GetSignMeToken(): ?array
	{
		$sSignMeToken = Cookies::get(self::AUTH_SIGN_ME_TOKEN_KEY);
		if ($sSignMeToken) {
			\SnappyMail\Log::notice(self::AUTH_SIGN_ME_TOKEN_KEY, 'decrypt');
			$aResult = \SnappyMail\Crypt::DecryptUrlSafe($sSignMeToken, 'signme');
			if (isset($aResult['e'], $aResult['u']) && \SnappyMail\UUID::isValid($aResult['u'])) {
				return $aResult;
			}
			\SnappyMail\Log::notice(self::AUTH_SIGN_ME_TOKEN_KEY, 'invalid');
			// Don't clear due to login checkbox
//			Cookies::clear(self::AUTH_SIGN_ME_TOKEN_KEY);
		}
		return null;
	}

	public function SetSignMeToken(MainAccount $oAccount): void
	{
		$this->ClearSignMeData();
		$uuid = \SnappyMail\UUID::generate();
		$data = \SnappyMail\Crypt::Encrypt($oAccount, 'signme');
		Cookies::set(
			self::AUTH_SIGN_ME_TOKEN_KEY,
			\SnappyMail\Crypt::EncryptUrlSafe([
				'e' => $oAccount->Email(),
				'u' => $uuid,
				$data[0] => \base64_encode($data[1])
			], 'signme'),
			\time() + 3600 * 24 * 30 // 30 days
		);
		$this->StorageProvider()->Put($oAccount, StorageType::SIGN_ME, $uuid, $data[2]);
	}

	public function GetAccountFromSignMeToken(): ?MainAccount
	{
		$aTokenData = static::GetSignMeToken();
		if ($aTokenData) {
			try
			{
				$sAuthToken = $this->StorageProvider()->Get(
					$aTokenData['e'],
					StorageType::SIGN_ME,
					$aTokenData['u']
				);
				if (!$sAuthToken) {
					throw new \RuntimeException("server token not found for {$aTokenData['e']}/.sign_me/{$aTokenData['u']}");
				}
				$aAccountHash = \SnappyMail\Crypt::Decrypt([
					\array_key_last($aTokenData),
					\base64_decode(\end($aTokenData)),
					$sAuthToken
				], 'signme');
				if (!\is_array($aAccountHash)) {
					throw new \RuntimeException('token decrypt failed');
				}
				$oAccount = MainAccount::NewInstanceFromTokenArray($this, $aAccountHash);
				if (!$oAccount) {
					throw new \RuntimeException('token has no account');
				}
				$this->imapConnect($oAccount);
				// Update lifetime
				$this->SetSignMeToken($oAccount);
				return $oAccount;
			}
			catch (\Throwable $oException)
			{
				\SnappyMail\Log::warning(self::AUTH_SIGN_ME_TOKEN_KEY, $oException->getMessage());
				// Don't clear due to smctoken cookie missing at initialization and login checkbox
//				$this->ClearSignMeData();
			}
		}
		return null;
	}

	protected function ClearSignMeData() : void
	{
		$aTokenData = static::GetSignMeToken();
		if ($aTokenData) {
			$this->StorageProvider()->Clear($aTokenData['e'], StorageType::SIGN_ME, $aTokenData['u']);
		}
		Cookies::clear(self::AUTH_SIGN_ME_TOKEN_KEY);
	}

	/**
	 * Logout methods
	 */

	public function Logout(bool $bMain) : void
	{
//		Cookies::clear(Utils::SESSION_TOKEN);
		Cookies::clear(self::AUTH_ADDITIONAL_TOKEN_KEY);
		$bMain && Cookies::clear(self::AUTH_SPEC_TOKEN_KEY);
		// TODO: kill SignMe data to prevent automatic login?
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	protected function imapConnect(Account $oAccount, bool $bAuthLog = false, \MailSo\Imap\ImapClient $oImapClient = null): void
	{
		try {
			if (!$oImapClient) {
				$oImapClient = $this->ImapClient();
			}
			$oAccount->ImapConnectAndLogin($this->Plugins(), $oImapClient, $this->Config());
		} catch (ClientException $oException) {
			throw $oException;
		} catch (\MailSo\Net\Exceptions\ConnectionException $oException) {
			throw new ClientException(Notifications::ConnectionError, $oException);
		} catch (\MailSo\Imap\Exceptions\LoginBadCredentialsException $oException) {
			if ($bAuthLog) {
				$this->LoggerAuthHelper($oAccount);
			}

			if ($this->Config()->Get('imap', 'show_login_alert', true)) {
				throw new ClientException(Notifications::AuthError, $oException, $oException->getAlertFromStatus());
			} else {
				throw new ClientException(Notifications::AuthError, $oException);
			}
		} catch (\Throwable $oException) {
			throw new ClientException(Notifications::AuthError, $oException);
		}
	}

}
