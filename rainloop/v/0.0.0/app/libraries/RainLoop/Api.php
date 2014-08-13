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
	public static function Actions()
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
	 * @return \MailSo\Log\Logger
	 */
	public static function Logger()
	{
		return self::Actions()->Logger();
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

		\RainLoop\Api::SetupDefaultMailSoConfig();

		$bOne = true;
		return true;
	}

	/**
	 * @return string
	 */
	public static function SetupDefaultMailSoConfig()
	{
		if (\class_exists('MailSo\Config'))
		{
			if (\RainLoop\Api::Config()->Get('labs', 'disable_iconv_if_mbstring_supported', false) &&
				 \MailSo\Base\Utils::IsMbStringSupported() && \MailSo\Config::$MBSTRING)
			{
				\MailSo\Config::$ICONV = false;
			}
			
			\MailSo\Config::$MessageListCountLimitTrigger = 
				(int) \RainLoop\Api::Config()->Get('labs', 'imap_message_list_count_limit_trigger', 0);
			
			\MailSo\Config::$MessageListDateFilter =
				(int) \RainLoop\Api::Config()->Get('labs', 'imap_message_list_date_filter', 0);
			
			\MailSo\Config::$MessageListUndeletedFilter = 
				!!\RainLoop\Api::Config()->Get('labs', 'imap_message_list_hide_deleted_messages', true);
			
			\MailSo\Config::$SystemLogger = \RainLoop\Api::Logger();
		}
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
