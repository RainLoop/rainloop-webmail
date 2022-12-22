<?php

namespace RainLoop;

abstract class Api
{

	public static function Handle() : bool
	{
		static $bOne = false;
		if (!$bOne) {
			static::SetupDefaultConfig();
			$bOne = true;
		}
		return $bOne;
	}

	public static function Actions() : Actions
	{
		static $oActions = null;
		if (null === $oActions) {
			$oActions = new Actions();
		}

		return $oActions;
	}

	public static function Config() : Config\Application
	{
		static $oConfig = null;
		if (!$oConfig) {
			$oConfig = new Config\Application();
			if (!$oConfig->Load()) {
				\usleep(10000);
				$oConfig->Load();
			}
//			\ini_set('display_errors', 0);
			if ($oConfig->Get('debug', 'enable', false)) {
				\error_reporting(E_ALL);
//				\ini_set('display_errors', 1);
				\ini_set('log_errors', 1);
			}
		}
		return $oConfig;
	}

	public static function getCSP(string $sScriptNonce = null) : \SnappyMail\HTTP\CSP
	{
		$oConfig = static::Config();
		$CSP = new \SnappyMail\HTTP\CSP(\trim($oConfig->Get('security', 'content_security_policy', '')));
		$CSP->report = $oConfig->Get('security', 'csp_report', false);
		$CSP->report_only = $oConfig->Get('debug', 'enable', false); // '0.0.0' === APP_VERSION
//		$CSP->frame = \explode(' ', $oConfig->Get('security', 'csp_frame', ''));

		// Allow https: due to remote images in e-mails or use proxy
		if (!$oConfig->Get('security', 'use_local_proxy_for_external_images', '')) {
			$CSP->img[] = 'https:';
			$CSP->img[] = 'http:';
		}
		if ($sScriptNonce) {
			$CSP->script[] = "'nonce-{$sScriptNonce}'";
		}

		static::Actions()->Plugins()->RunHook('main.content-security-policy', array($CSP));

		return $CSP;
	}

	public static function Logger() : \MailSo\Log\Logger
	{
		static $oLogger = null;
		if (!$oLogger) {
			$oConfig = static::Config();
			$oLogger = new \MailSo\Log\Logger(true);
			$oLogger->SetShowSecrets(!$oConfig->Get('logs', 'hide_passwords', true));
			if ($oConfig->Get('debug', 'enable', false)) {
				$oLogger->SetLevel(\LOG_DEBUG);
			} else if ($oConfig->Get('logs', 'enable', false)) {
				$oLogger->SetLevel(\max(3, \RainLoop\Api::Config()->Get('logs', 'level', \LOG_WARNING)));
			}
		}
		return $oLogger;
	}

	protected static function SetupDefaultConfig() : void
	{
		\MailSo\Config::$BoundaryPrefix = \trim(static::Config()->Get('labs', 'boundary_prefix', ''));

		Utils::$CookieDefaultPath = static::Config()->Get('labs', 'cookie_default_path', '');
		Utils::$CookieSameSite = static::Config()->Get('security', 'cookie_samesite', 'Strict');
		Utils::$CookieSecure = isset($_SERVER['HTTPS'])
			|| 'None' == Utils::$CookieSameSite
			|| !!static::Config()->Get('labs', 'cookie_default_secure', false);
	}

	public static function Version() : string
	{
		return APP_VERSION;
	}

	public static function CreateUserSsoHash(string $sEmail, string $sPassword, array $aAdditionalOptions = array(), bool $bUseTimeout = true) : ?string
	{
		$sSsoHash = \MailSo\Base\Utils::Sha1Rand(\sha1($sPassword.$sEmail));

		return static::Actions()->Cacher()->Set(
			KeyPathHelper::SsoCacherKey($sSsoHash),
			\SnappyMail\Crypt::EncryptToJSON(array(
				'Email' => $sEmail,
				'Password' => $sPassword,
				'AdditionalOptions' => $aAdditionalOptions,
				'Time' => $bUseTimeout ? \time() : 0
			), $sSsoHash)
		) ? $sSsoHash : null;
	}

	public static function ClearUserSsoHash(string $sSsoHash) : bool
	{
		return static::Actions()->Cacher()->Delete(KeyPathHelper::SsoCacherKey($sSsoHash));
	}

	public static function ClearUserData(string $sEmail) : bool
	{
		if (\strlen($sEmail)) {
			$sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail);

			$oStorageProvider = static::Actions()->StorageProvider();
			if ($oStorageProvider && $oStorageProvider->IsActive()) {
				$oStorageProvider->DeleteStorage($sEmail);
			}

			$oAddressBookProvider = static::Actions()->AddressBookProvider();
			if ($oAddressBookProvider) {
				$oAddressBookProvider->DeleteAllContacts($sEmail);
			}

			return true;
		}

		return false;
	}

	public static function LogoutCurrentLogginedUser() : bool
	{
		static::Actions()->Logout(true);
		return true;
	}
}
