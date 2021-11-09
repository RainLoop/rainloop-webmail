<?php

namespace RainLoop\Actions;

use \RainLoop\Notifications;
use \RainLoop\Utils;
use \RainLoop\Model\Account;
use \RainLoop\Providers\Storage\Enumerations\StorageType;
use \RainLoop\Exceptions\ClientException;

trait UserAuth
{
	/**
	 * @var string
	 */
	private $sSpecAuthToken = null;

	/**
	 * Or use 'aes-256-xts' ?
	 */
	private static $sCipher = 'aes-256-cbc-hmac-sha1';

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function LoginProcess(string &$sEmail, string &$sPassword, bool $bSignMe = false): Account
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
			$oAccount = Account::NewInstanceByLogin($this, $sEmail, $sLogin, $sPassword, $sClientCert, true);

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
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function GetAccountFromCustomToken(string $sToken, bool $bValidateShortToken = true, bool $bQ = false, bool $bThrowExceptionOnFalse = false): ?Account
	{
		if (!empty($sToken)) {
			$aToken = $bQ ? Utils::DecodeKeyValuesQ($sToken) : Utils::DecodeKeyValues($sToken);
			return Account::NewInstanceFromTokenArray(
				$this,
				$bQ ? Utils::DecodeKeyValuesQ($sToken) : Utils::DecodeKeyValues($sToken),
				$bThrowExceptionOnFalse
			);
		}

		if ($bThrowExceptionOnFalse) {
			throw new ClientException(\RainLoop\Notifications::AuthError);
		}

		return null;
	}

	public function GetShortLifeSpecAuthToken(int $iLife = 60): string
	{
		$aAccountHash = Utils::DecodeKeyValues($this->sSpecAuthToken);
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
		if (!\is_string($this->sSpecAuthToken)) {
			$this->sSpecAuthToken = '';
			if (isset($_COOKIE[self::AUTH_SPEC_LOGOUT_TOKEN_KEY])) {
				Utils::ClearCookie(self::AUTH_SPEC_LOGOUT_TOKEN_KEY);
				Utils::ClearCookie(self::AUTH_SIGN_ME_TOKEN_KEY);
//				Utils::ClearCookie(self::AUTH_SPEC_TOKEN_KEY);
			} else {
				$sAuthAccountHash = Utils::GetCookie(self::AUTH_SPEC_TOKEN_KEY);
				if (empty($sAuthAccountHash)) {
					$oAccount = $this->GetAccountFromSignMeToken();
					if ($oAccount) {
						$this->SetAuthToken($oAccount);
						$sAuthAccountHash = $this->sSpecAuthToken;
					}
				}
				$this->sSpecAuthToken = $sAuthAccountHash ?: '';
			}
		}
		return $this->GetAccountFromCustomToken($this->sSpecAuthToken, true, true, $bThrowExceptionOnFalse);
	}

	public function SetAuthToken(Account $oAccount): void
	{
		$sSpecAuthToken = $oAccount->GetAuthTokenQ();

		$this->sSpecAuthToken = $sSpecAuthToken;
		Utils::SetCookie(self::AUTH_SPEC_TOKEN_KEY, $sSpecAuthToken);

		if (isset($aAccounts[$oAccount->Email()])) {
			$aAccounts[$oAccount->Email()] = $oAccount->GetAuthToken();
			$this->SetAccounts($oAccount, $aAccounts);
		}
	}

	private static function GetSignMeToken(): ?array
	{
		$sSignMeToken = Utils::GetCookie(self::AUTH_SIGN_ME_TOKEN_KEY);
		if (empty($sSignMeToken)) {
			return null;
		}
		$aResult = \SnappyMail\Crypt::DecryptCookie($sSignMeToken);
		return \is_array($aResult) ? $aResult : null;
	}

	private static function SetSignMeTokenCookie(array $aData): void
	{
		Utils::SetCookie(
			self::AUTH_SIGN_ME_TOKEN_KEY,
			\SnappyMail\Crypt::EncryptCookie($aData),
			\time() + 3600 * 24 * 30 // 30 days
		);
	}

	private function SetSignMeToken(Account $oAccount): void
	{
		$this->ClearSignMeData();

		$uuid = \SnappyMail\UUID::generate();
		$data = \SnappyMail\Crypt::EncryptRaw($oAccount);

		if ($data['xxtea']) {
			static::SetSignMeTokenCookie(array(
				'e' => $oAccount->Email(),
				'u' => $uuid,
				's' => \base64_encode($data[1])
			));
		} else {
			static::SetSignMeTokenCookie(array(
				'e' => $oAccount->Email(),
				'u' => $uuid,
				'i' => \base64_encode($data[1])
			));
		}

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
		if (!empty($aTokenData)) {
			$oAccount = null;
			if (!empty($aTokenData['e']) && !empty($aTokenData['u']) && \SnappyMail\UUID::isValid($aTokenData['u'])) {
				$sAuthToken = $this->StorageProvider()->Get(
					$aTokenData['e'],
					StorageType::SIGN_ME,
					$aTokenData['u']
				);
				if (empty($sAuthToken)) {
					return null;
				}
				if (!empty($aTokenData['s'])) {
					$aAccountHash = \SnappyMail\Crypt::XxteaDecrypt($sAuthToken, \base64_decode($aTokenData['s']));
				} else if (!empty($aTokenData['i'])) {
					$aAccountHash = \SnappyMail\Crypt::OpenSSLDecrypt($sAuthToken, \base64_decode($aTokenData['i']));
				}
				if (!empty($aAccountHash) && \is_array($aAccountHash)) {
					$oAccount = Account::NewInstanceFromTokenArray($this, $aAccountHash);
					if ($oAccount) {
						try
						{
							$this->CheckMailConnection($oAccount);
							// Update lifetime
							$this->SetSignMeToken($oAccount);

							return $oAccount;
						}
						catch (\Throwable $oException)
						{
						}
					}
				}
			}
		}

		$this->ClearSignMeData();
		return null;
	}

	protected function ClearSignMeData() : void
	{
		if (isset($_COOKIE[self::AUTH_SIGN_ME_TOKEN_KEY])) {
			$aTokenData = static::GetSignMeToken();
			if (!empty($aTokenData['e']) && !empty($aTokenData['u']) && \SnappyMail\UUID::isValid($aTokenData['u'])) {
				$this->StorageProvider()->Clear($aTokenData['e'], StorageType::SIGN_ME, $aTokenData['u']);
			}
			Utils::ClearCookie(self::AUTH_SIGN_ME_TOKEN_KEY);
		}
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
