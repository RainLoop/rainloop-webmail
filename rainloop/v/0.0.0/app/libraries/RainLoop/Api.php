<?php

namespace RainLoop;

class Api
{
	/**
	 * @return void
	 */
	private function __construct()
	{
	}

	/**
	 * @return \RainLoop\Actions
	 */
	private static function Actions()
	{
		static $oActions = null;
		if (null === $oActions)
		{
			$oActions = \RainLoop\Actions::NewInstance();
		}

		return $oActions;
	}

	/**
	 * @return \RainLoop\Application
	 */
	public static function Config()
	{
		return self::Actions()->Config();
	}

	/**
	 * @return bool
	 */
	public static function Handle()
	{
		static $bOne = null;
		if ($bOne)
		{
			return true;
		}

		if (!\class_exists('MailSo\Version'))
		{
			return false;
		}

		if (self::Config()->Get('labs', 'disable_iconv_if_mbstring_supported', false) &&
			\class_exists('MailSo\Capa') && \MailSo\Base\Utils::IsMbStringSupported())
		{
			\MailSo\Capa::$ICONV = false;
		}

		$bOne = true;
		return true;
	}

	/**
	 * @return string
	 */
	public static function Version()
	{
		return APP_VERSION;
	}

	/**
	 * @param string $sEmail
	 * @param string $sPassword
	 * @param bool $bUseTimeout = true
	 *
	 * @return string
	 */
	public static function GetUserSsoHash($sEmail, $sPassword, $bUseTimeout = true)
	{
		$sSsoHash = \sha1(\rand(10000, 99999).$sEmail.$sPassword.\microtime(true));

		return self::Actions()->Cacher()->Set(\RainLoop\KeyPathHelper::SsoCacherKey($sSsoHash), \RainLoop\Utils::EncodeKeyValues(array(
			'Email' => $sEmail,
			'Password' => $sPassword,
			'Time' => $bUseTimeout ? \time() : 0
		))) ? $sSsoHash : '';
	}

	/**
	 * @param string $sSsoHash
	 *
	 * @return bool
	 */
	public static function ClearUserSsoHash($sSsoHash)
	{
		return self::Actions()->Cacher()->Delete(\RainLoop\KeyPathHelper::SsoCacherKey($sSsoHash));
	}

	/**
	 * @todo
	 * @param string $sEmail
	 *
	 * @return bool
	 */
	public static function ClearUserDateStorage($sEmail)
	{
		$sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail);
		
		// TwoFactor Auth User Data
		self::Actions()->StorageProvider()->Clear(null,
			\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
			\RainLoop\KeyPathHelper::TwoFactorAuthUserData($sEmail)
		);
	}
}
