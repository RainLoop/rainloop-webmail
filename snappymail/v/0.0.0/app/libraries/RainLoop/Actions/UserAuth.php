<?php

namespace RainLoop\Actions;

use RainLoop\Notifications;
use RainLoop\Utils;
use RainLoop\Model\Account;
use RainLoop\Model\AdditionalAccount;
use RainLoop\Providers\Storage\Enumerations\StorageType;
use RainLoop\Exceptions\ClientException;

trait UserAuth
{
	/**
	 * @var string
	 */
	private $oAdditionalAuthAccount = null;
	private $oMainAuthAccount = null;

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function LoginProcess(string &$sEmail, string &$sPassword, bool $bSignMe = false, Account $oMainAccount = null): Account
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
			if ($oMainAccount) {
				$oAccount = AdditionalAccount::NewInstanceByLogin($this, $sEmail, $sLogin, $sPassword, $sClientCert, true);
				if ($oAccount) {
					$oAccount->SetParentEmail($oMainAccount->Email());
				}
			} else {
				$oAccount = Account::NewInstanceByLogin($this, $sEmail, $sLogin, $sPassword, $sClientCert, true);
			}

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
			$bSignMe && $this->SetSignMeToken($oAccount);
		} catch (\Throwable $oException) {
			$this->loginErrorDelay();

			throw $oException;
		}

		return $oAccount;
	}

	/**
	 * Returns RainLoop\Model\AdditionalAccount when it exists,
	 * else returns RainLoop\Model\Account when it exists,
	 * else null
	 *
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function getAccountFromToken(bool $bThrowExceptionOnFalse = true): ?Account
	{
		if (\is_null($this->oAdditionalAuthAccount) && isset($_COOKIE[self::AUTH_ADDITIONAL_TOKEN_KEY])) {
			$aData = Utils::GetSecureCookie(self::AUTH_ADDITIONAL_TOKEN_KEY);
			if ($aData) {
				$this->oAdditionalAuthAccount = AdditionalAccount::NewInstanceFromTokenArray(
					$this,
					$aData,
					$bThrowExceptionOnFalse
				);
			}
			if (!$this->oAdditionalAuthAccount) {
				$this->oAdditionalAuthAccount = false;
				Utils::ClearCookie(self::AUTH_ADDITIONAL_TOKEN_KEY);
			}
		}
		return $this->oAdditionalAuthAccount ?: $this->getMainAccountFromToken($bThrowExceptionOnFalse);
	}

	/**
	 * Returns RainLoop\Model\Account when it exists, else null
	 *
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function getMainAccountFromToken(bool $bThrowExceptionOnFalse = true): ?Account
	{
		if (!$this->oMainAuthAccount) {
			if (isset($_COOKIE[self::AUTH_SPEC_LOGOUT_TOKEN_KEY])) {
				Utils::ClearCookie(self::AUTH_SPEC_LOGOUT_TOKEN_KEY);
				Utils::ClearCookie(self::AUTH_SIGN_ME_TOKEN_KEY);
//				Utils::ClearCookie(self::AUTH_SPEC_TOKEN_KEY);
//				Utils::ClearCookie(self::AUTH_ADDITIONAL_TOKEN_KEY);
			}

			$aData = Utils::GetSecureCookie(self::AUTH_SPEC_TOKEN_KEY);
			if ($aData) {
				$this->oMainAuthAccount = Account::NewInstanceFromTokenArray(
					$this,
					$aData,
					$bThrowExceptionOnFalse
				);
			} else {
				$oAccount = $this->GetAccountFromSignMeToken();
				if ($oAccount) {
					$this->SetAuthToken($oAccount);
				}
			}

			if ($bThrowExceptionOnFalse && !$this->oMainAuthAccount) {
				throw new ClientException(\RainLoop\Notifications::AuthError);
			}
		}

		return $this->oMainAuthAccount;
	}

	public function SetAuthToken(Account $oAccount): void
	{
		if (\is_subclass_of($oAccount, 'RainLoop\\Model\\Account')) {
			throw new \LogicException('Only main Account can be set as AuthToken');
		}
		$this->oAdditionalAuthAccount = false;
		$this->oMainAuthAccount = $oAccount;
		Utils::SetSecureCookie(self::AUTH_SPEC_TOKEN_KEY, $oAccount);
	}

	public function SetAdditionalAuthToken(?AdditionalAccount $oAccount): void
	{
		$this->oAdditionalAuthAccount = $oAccount ?: false;
		if ($oAccount) {
			Utils::SetSecureCookie(self::AUTH_ADDITIONAL_TOKEN_KEY, $oAccount);
		} else {
			Utils::ClearCookie(self::AUTH_ADDITIONAL_TOKEN_KEY);
		}
	}

	/**
	 * SignMe methods used for the "remember me" cookie
	 */

	private static function GetSignMeToken(): ?array
	{
		$sSignMeToken = Utils::GetCookie(self::AUTH_SIGN_ME_TOKEN_KEY);
		if ($sSignMeToken) {
			$aResult = \SnappyMail\Crypt::DecryptUrlSafe($sSignMeToken);
			if (isset($aResult['e'], $aResult['u']) && \SnappyMail\UUID::isValid($aResult['u'])) {
				return $aResult;
			}
			Utils::ClearCookie(self::AUTH_SIGN_ME_TOKEN_KEY);
		}
		return null;
	}

	private function SetSignMeToken(Account $oAccount): void
	{
		$this->ClearSignMeData();

		$uuid = \SnappyMail\UUID::generate();
		$data = \SnappyMail\Crypt::Encrypt($oAccount);

		Utils::SetCookie(
			self::AUTH_SIGN_ME_TOKEN_KEY,
			\SnappyMail\Crypt::EncryptUrlSafe([
				'e' => $oAccount->Email(),
				'u' => $uuid,
				$data[0] => \base64_encode($data[1])
			]),
			\time() + 3600 * 24 * 30 // 30 days
		);

		$this->StorageProvider()->Put(
			$oAccount,
			StorageType::SIGN_ME,
			$uuid,
			$data[2]
		);
	}

	public function GetAccountFromSignMeToken(): ?Account
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
				if ($sAuthToken) {
					$aAccountHash = \SnappyMail\Crypt::Decrypt([
						\array_key_last($aTokenData),
						\base64_decode(\end($aTokenData)),
						$sAuthToken
					]);

					$oAccount = \is_array($aAccountHash)
						? Account::NewInstanceFromTokenArray($this, $aAccountHash) : null;
					if ($oAccount) {
						$this->CheckMailConnection($oAccount);
						// Update lifetime
						$this->SetSignMeToken($oAccount);

						return $oAccount;
					}
				}
			}
			catch (\Throwable $oException)
			{
			}

			$this->ClearSignMeData();
		}

		return null;
	}

	protected function ClearSignMeData() : void
	{
		$aTokenData = static::GetSignMeToken();
		if ($aTokenData) {
			$this->StorageProvider()->Clear($aTokenData['e'], StorageType::SIGN_ME, $aTokenData['u']);
			Utils::ClearCookie(self::AUTH_SIGN_ME_TOKEN_KEY);
		}
	}

	/**
	 * Logout methods
	 */

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
