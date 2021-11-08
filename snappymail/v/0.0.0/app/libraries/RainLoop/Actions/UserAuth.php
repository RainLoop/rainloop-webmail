<?php

namespace RainLoop\Actions;

use \RainLoop\Notifications;
use \RainLoop\Utils;
use \RainLoop\Model\Account;
use \RainLoop\Providers\Storage\Enumerations\StorageType;
use \RainLoop\Exceptions\ClientException;

trait UserAuth
{
/*
	const AUTH_SIGN_ME_TOKEN_KEY = 'smremember';
	const AUTH_SPEC_TOKEN_KEY = 'smspecauth';
	const AUTH_SPEC_LOGOUT_TOKEN_KEY = 'smspeclogout';
	const AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY = 'smspeclogoutcmk';
*/
	/**
	 * @var string
	 */
	private $sSpecAuthToken;

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function LoginProcess(string &$sEmail, string &$sPassword, string $sSignMeToken = ''): Account
	{
		$sInputEmail = $sEmail;

		$this->Plugins()->RunHook('login.credentials.step-1', array(&$sEmail));

		$sEmail = \MailSo\Base\Utils::Trim($sEmail);
		if ($this->Config()->Get('login', 'login_lowercase', true)) {
			$sEmail = \MailSo\Base\Utils::StrToLowerIfAscii($sEmail);
		}

		if (false === \strpos($sEmail, '@')) {
			$this->Logger()->Write('The email address "' . $sEmail . '" is not complete', \MailSo\Log\Enumerations\Type::INFO, 'LOGIN');

			if (false === \strpos($sEmail, '@') && !!$this->Config()->Get('login', 'determine_user_domain', false)) {
				$sUserHost = \trim($this->Http()->GetHost(false, true, true));
				$this->Logger()->Write('Determined user domain: ' . $sUserHost, \MailSo\Log\Enumerations\Type::INFO, 'LOGIN');

				$bAdded = false;

				$iLimit = 14;
				$aDomainParts = \explode('.', $sUserHost);

				$oDomainProvider = $this->DomainProvider();
				while (\count($aDomainParts) && 0 < $iLimit) {
					$sLine = \trim(\implode('.', $aDomainParts), '. ');

					$oDomain = $oDomainProvider->Load($sLine, false);
					if ($oDomain) {
						$bAdded = true;
						$this->Logger()->Write('Check "' . $sLine . '": OK (' . $sEmail . ' > ' . $sEmail . '@' . $sLine . ')',
							\MailSo\Log\Enumerations\Type::INFO, 'LOGIN');

						$sEmail = $sEmail . '@' . $sLine;
						break;
					} else {
						$this->Logger()->Write('Check "' . $sLine . '": NO', \MailSo\Log\Enumerations\Type::INFO, 'LOGIN');
					}

					\array_shift($aDomainParts);
					$iLimit--;
				}

				if (!$bAdded) {
					$sLine = $sUserHost;
					$oDomain = $oDomainProvider->Load($sLine, true);
					if ($oDomain && $oDomain) {
						$bAdded = true;
						$this->Logger()->Write('Check "' . $sLine . '" with wildcard: OK (' . $sEmail . ' > ' . $sEmail . '@' . $sLine . ')',
							\MailSo\Log\Enumerations\Type::INFO, 'LOGIN');

						$sEmail = $sEmail . '@' . $sLine;
					} else {
						$this->Logger()->Write('Check "' . $sLine . '" with wildcard: NO', \MailSo\Log\Enumerations\Type::INFO, 'LOGIN');
					}
				}

				if (!$bAdded) {
					$this->Logger()->Write('Domain was not found!', \MailSo\Log\Enumerations\Type::INFO, 'LOGIN');
				}
			}

			$sDefDomain = \trim($this->Config()->Get('login', 'default_domain', ''));
			if (false === \strpos($sEmail, '@') && \strlen($sDefDomain)) {
				$this->Logger()->Write('Default domain "' . $sDefDomain . '" was used. (' . $sEmail . ' > ' . $sEmail . '@' . $sDefDomain . ')',
					\MailSo\Log\Enumerations\Type::INFO, 'LOGIN');

				$sEmail = $sEmail . '@' . $sDefDomain;
			}
		}

		$this->Plugins()->RunHook('login.credentials.step-2', array(&$sEmail, &$sPassword));

		if (false === \strpos($sEmail, '@') || !\strlen($sPassword)) {
			$this->loginErrorDelay();

			throw new ClientException(Notifications::InvalidInputArgument);
		}

		$this->Logger()->AddSecret($sPassword);

		$sLogin = $sEmail;
		if ($this->Config()->Get('login', 'login_lowercase', true)) {
			$sLogin = \MailSo\Base\Utils::StrToLowerIfAscii($sLogin);
		}

		$this->Plugins()->RunHook('login.credentials', array(&$sEmail, &$sLogin, &$sPassword));

		$this->Logger()->AddSecret($sPassword);

		$oAccount = null;
		$sClientCert = \trim($this->Config()->Get('ssl', 'client_cert', ''));
		try {
			$oAccount = $this->LoginProvide($sEmail, $sLogin, $sPassword, $sSignMeToken, $sClientCert, true);

			if (!$oAccount) {
				throw new ClientException(Notifications::AuthError);
			}
		} catch (\Throwable $oException) {
			$this->loginErrorDelay();
			$this->LoggerAuthHelper($oAccount, $this->getAdditionalLogParamsByUserLogin($sInputEmail));
			throw $oException;
		}

		try {
			$this->CheckMailConnection($oAccount, true);
		} catch (\Throwable $oException) {
			$this->loginErrorDelay();

			throw $oException;
		}

		return $oAccount;
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function GetAccountFromCustomToken(string $sToken, bool $bThrowExceptionOnFalse = true, bool $bValidateShortToken = true, bool $bQ = false): ?Account
	{
		$oResult = null;
		if (!empty($sToken)) {
			$aAccountHash = $bQ ? Utils::DecodeKeyValuesQ($sToken) : Utils::DecodeKeyValues($sToken);
			if (!empty($aAccountHash[0]) && 'token' === $aAccountHash[0] && // simple token validation
				8 <= \count($aAccountHash) && // length checking
				!empty($aAccountHash[7]) && // does short token exist
				(!$bValidateShortToken || Utils::GetShortToken() === $aAccountHash[7] ||  // check short token if needed
					(isset($aAccountHash[10]) && 0 < $aAccountHash[10] && \time() < $aAccountHash[10]))
			) {
				$oAccount = $this->LoginProvide($aAccountHash[1], $aAccountHash[2], $aAccountHash[3],
					empty($aAccountHash[5]) ? '' : $aAccountHash[5], empty($aAccountHash[11]) ? '' : $aAccountHash[11], $bThrowExceptionOnFalse);

				if ($oAccount) {
					// init proxy user/password
					if (!empty($aAccountHash[8]) && !empty($aAccountHash[9])) {
						$oAccount->SetProxyAuthUser($aAccountHash[8]);
						$oAccount->SetProxyAuthPassword($aAccountHash[9]);
					}

					$this->Logger()->AddSecret($oAccount->Password());
					$this->Logger()->AddSecret($oAccount->ProxyAuthPassword());

					$oAccount->SetParentEmail($aAccountHash[6]);
					$oResult = $oAccount;
				}
			} else if ($bThrowExceptionOnFalse) {
				throw new ClientException(Notifications::AuthError);
			}
		}

		if ($bThrowExceptionOnFalse && !$oResult) {
			throw new ClientException(Notifications::AuthError);
		}

		return $oResult;
	}

	protected function LoginProvide(string $sEmail, string $sLogin, string $sPassword, string $sSignMeToken = '', string $sClientCert = '', bool $bThrowProvideException = false): ?Account
	{
		$oAccount = null;
		if (\strlen($sEmail) && \strlen($sLogin) && \strlen($sPassword)) {
			$oDomain = $this->DomainProvider()->Load(\MailSo\Base\Utils::GetDomainFromEmail($sEmail), true);
			if ($oDomain) {
				if ($oDomain->ValidateWhiteList($sEmail, $sLogin)) {
					$oAccount = new Account($sEmail, $sLogin, $sPassword, $oDomain, $sSignMeToken, '', '', $sClientCert);
					$this->Plugins()->RunHook('filter.account', array($oAccount));

					if ($bThrowProvideException && !$oAccount) {
						throw new ClientException(Notifications::AuthError);
					}
				} else if ($bThrowProvideException) {
					throw new ClientException(Notifications::AccountNotAllowed);
				}
			} else if ($bThrowProvideException) {
				throw new ClientException(Notifications::DomainNotAllowed);
			}
		}

		return $oAccount;
	}

	public function GetSpecAuthTokenCookie(): string
	{
		return Utils::GetCookie(self::AUTH_SPEC_TOKEN_KEY, '');
	}

	// rlspecauth / AuthAccountHash
	public function getAuthAccountHash() : string
	{
		if ('' === $this->sSpecAuthToken && !\strlen($this->GetSpecAuthLogoutTokenWithDeletion())) {
			$sAuthAccountHash = $this->GetSpecAuthTokenCookie() ?: $this->GetSpecAuthToken();
			if (empty($sAuthAccountHash)) {
				$oAccount = $this->GetAccountFromSignMeToken();
				if ($oAccount) try
				{
					$this->CheckMailConnection($oAccount);
					$this->AuthToken($oAccount);
					$sAuthAccountHash = $this->GetSpecAuthToken();
				}
				catch (\Throwable $oException)
				{
					$oException = null;
					$this->ClearSignMeData($oAccount);
				}
			}
			$this->SetSpecAuthToken($sAuthAccountHash);
		}
		return $this->GetSpecAuthToken();
	}

	private function getLocalAuthToken(): string
	{
		$sToken = $this->GetSpecAuthToken();
		return !empty($sToken) && '_' === \substr($sToken, 0, 1) ? \substr($sToken, 1) : '';
	}

	public function GetShortLifeSpecAuthToken(int $iLife = 60): string
	{
		$aAccountHash = Utils::DecodeKeyValues($this->getLocalAuthToken());
		if (!empty($aAccountHash[0]) && 'token' === $aAccountHash[0]) {
			$aAccountHash[10] = \time() + $iLife;
			return Utils::EncodeKeyValues($aAccountHash);
		}

		return '';
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function getAccountFromToken(bool $bThrowExceptionOnFalse = true): ?Account
	{
		return $this->GetAccountFromCustomToken($this->getLocalAuthToken(), $bThrowExceptionOnFalse, true, true);
	}

	public function GetSpecAuthToken(): string
	{
		return $this->sSpecAuthToken;
	}

	public function SetSpecAuthToken(string $sSpecAuthToken): self
	{
		$this->sSpecAuthToken = $sSpecAuthToken;

		return $this;
	}

	public function SetAuthToken(Account $oAccount): void
	{
		$sSpecAuthToken = '_' . $oAccount->GetAuthTokenQ();

		$this->SetSpecAuthToken($sSpecAuthToken);
		Utils::SetCookie(self::AUTH_SPEC_TOKEN_KEY, $sSpecAuthToken);

		if ($oAccount->SignMe()) {
			$this->SetSignMeToken($oAccount);
		}
	}

	private static function GetSignMeToken(): ?array
	{
		$sSignMeToken = Utils::GetCookie(self::AUTH_SIGN_ME_TOKEN_KEY, '');
		return empty($sSignMeToken) ? null : Utils::DecodeKeyValuesQ($sSignMeToken);
	}

	private function SetSignMeToken(Account $oAccount): void
	{
		$this->ClearSignMeData($oAccount);

		$uuid = \SnappyMail\UUID::generate();
		$salt = \sha1(\random_bytes(16));
		Utils::SetCookie(self::AUTH_SIGN_ME_TOKEN_KEY,
			Utils::EncodeKeyValuesQ(array(
				'e' => $oAccount->Email(),
				'u' => $uuid,
				's' => $salt
			)),
			\time() + 3600 * 24 * 30); // 30 days

		$this->StorageProvider()->Put($oAccount,
			StorageType::SIGN_ME,
			$uuid,
			Utils::EncryptString($oAccount->GetAuthToken(), $salt)
		);
	}

	public function GetAccountFromSignMeToken(): ?Account
	{
		$oAccount = null;

		$aTokenData = static::GetSignMeToken();
		if (!empty($aTokenData)) {
			if (!empty($aTokenData['e']) && !empty($aTokenData['u']) && !empty($aTokenData['s']) && \SnappyMail\UUID::isValid($aTokenData['u'])) {
				$sAuthToken = $this->StorageProvider()->Get($aTokenData['e'],
					StorageType::SIGN_ME,
					$aTokenData['u']
				);
				if (empty($sAuthToken)) {
					return null;
				}
				$sAuthToken = Utils::DecryptString($sAuthToken, $aTokenData['s']);
				if (!empty($sAuthToken)) {
					$oAccount = $this->GetAccountFromCustomToken($sAuthToken, false, false, true);
				}
			} else if (!empty($aTokenData['e']) && !empty($aTokenData['t'])) {
				// This is old, see https://github.com/the-djmaze/snappymail/issues/126
				$sTokenSettings = $this->StorageProvider()->Get($aTokenData['e'],
					StorageType::CONFIG,
					'sign_me'
				);
				if (!empty($sTokenSettings)) {
					$aSignMeData = Utils::DecodeKeyValuesQ($sTokenSettings);
					if (!empty($aSignMeData['AuthToken']) &&
						!empty($aSignMeData['SignMeToken']) &&
						$aSignMeData['SignMeToken'] === $aTokenData['t']) {
						$oAccount = $this->GetAccountFromCustomToken($aSignMeData['AuthToken'], false, false, true);
					}
				}
			}
			if ($oAccount) {
				// Update lifetime
				$this->SetSignMeToken($oAccount);
			}
		} else {
			Utils::ClearCookie(self::AUTH_SIGN_ME_TOKEN_KEY);
		}

		return $oAccount;
	}

	protected function ClearSignMeData(Account $oAccount) : void
	{
		if ($oAccount) {
			$aTokenData = static::GetSignMeToken();
			if (!empty($aTokenData['u']) && \SnappyMail\UUID::isValid($aTokenData['u'])) {
				$this->StorageProvider()->Clear($oAccount, StorageType::SIGN_ME, $aTokenData['u']);
			}
			Utils::ClearCookie(self::AUTH_SIGN_ME_TOKEN_KEY);
			$this->StorageProvider()->Clear($oAccount, StorageType::CONFIG, 'sign_me');
		}
	}

	public function GetSpecAuthLogoutTokenWithDeletion(): string
	{
		$sResult = Utils::GetCookie(self::AUTH_SPEC_LOGOUT_TOKEN_KEY, '');
		if (\strlen($sResult)) {
			Utils::ClearCookie(self::AUTH_SPEC_LOGOUT_TOKEN_KEY);
		}

		return $sResult;
	}

	public function SetAuthLogoutToken(): void
	{
		\header('X-RainLoop-Action: Logout');
		Utils::SetCookie(self::AUTH_SPEC_LOGOUT_TOKEN_KEY, \md5($_SERVER['REQUEST_TIME_FLOAT']));
	}

	public function GetSpecLogoutCustomMgsWithDeletion(): string
	{
		$sResult = Utils::GetCookie(self::AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY, '');
		if (\strlen($sResult)) {
			Utils::ClearCookie(self::AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY);
		}

		return $sResult;
	}

	public function SetSpecLogoutCustomMgsWithDeletion(string $sMessage): string
	{
		Utils::SetCookie(self::AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY, $sMessage);
	}

}
