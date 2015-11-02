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
	 * @return bool
	 */
	public static function RunResult()
	{
		return true;
	}

	/**
	 * @staticvar bool $bOne
	 * @return bool
	 */
	public static function Handle()
	{
		static $bOne = null;
		if (null === $bOne)
		{
			$bOne = \class_exists('MailSo\Version');
			if ($bOne)
			{
				\RainLoop\Api::SetupDefaultMailSoConfig();

				$bOne = \RainLoop\Api::RunResult();
			}
		}

		return $bOne;
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
		return \RainLoop\Api::Actions()->Config();
	}

	/**
	 * @return \MailSo\Log\Logger
	 */
	public static function Logger()
	{
		return \RainLoop\Api::Actions()->Logger();
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

			\MailSo\Config::$MessageListFastSimpleSearch =
				!!\RainLoop\Api::Config()->Get('labs', 'imap_message_list_fast_simple_search', true);

			\MailSo\Config::$MessageListCountLimitTrigger =
				(int) \RainLoop\Api::Config()->Get('labs', 'imap_message_list_count_limit_trigger', 0);

			\MailSo\Config::$MessageListDateFilter =
				(int) \RainLoop\Api::Config()->Get('labs', 'imap_message_list_date_filter', 0);

			\MailSo\Config::$MessageListPermanentFilter =
				\trim(\RainLoop\Api::Config()->Get('labs', 'imap_message_list_permanent_filter', ''));

			\MailSo\Config::$MessageAllHeaders =
				!!\RainLoop\Api::Config()->Get('labs', 'imap_message_all_headers', false);

			\MailSo\Config::$LargeThreadLimit =
				(int) \RainLoop\Api::Config()->Get('labs', 'imap_large_thread_limit', 50);

			\MailSo\Config::$BoundaryPrefix = '_RainLoop_';

			\MailSo\Config::$SystemLogger = \RainLoop\Api::Logger();

			$sSslCafile = \RainLoop\Api::Config()->Get('ssl', 'cafile', '');
			$sSslCapath = \RainLoop\Api::Config()->Get('ssl', 'capath', '');

			\RainLoop\Utils::$CookieDefaultPath = \RainLoop\Api::Config()->Get('labs', 'cookie_default_path', '');

			if (!empty($sSslCafile) || !empty($sSslCapath))
			{
				\MailSo\Hooks::Add('Net.NetClient.StreamContextSettings/Filter', function (&$aStreamContextSettings) use ($sSslCafile, $sSslCapath) {
					if (isset($aStreamContextSettings['ssl']) && \is_array($aStreamContextSettings['ssl']))
					{
						if (empty($aStreamContextSettings['ssl']['cafile']) && !empty($sSslCafile))
						{
							$aStreamContextSettings['ssl']['cafile'] = $sSslCafile;
						}

						if (empty($aStreamContextSettings['ssl']['capath']) && !empty($sSslCapath))
						{
							$aStreamContextSettings['ssl']['capath'] = $sSslCapath;
						}
					}
				});
			}
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
	 * @param array $aAdditionalOptions = array()
	 * @param bool $bUseTimeout = true
	 *
	 * @return string
	 */
	public static function GetUserSsoHash($sEmail, $sPassword, $aAdditionalOptions = array(), $bUseTimeout = true)
	{
		$sSsoHash = \MailSo\Base\Utils::Sha1Rand($sEmail.$sPassword);

		return \RainLoop\Api::Actions()->Cacher()->Set(\RainLoop\KeyPathHelper::SsoCacherKey($sSsoHash),
			\RainLoop\Utils::EncodeKeyValuesQ(array(
				'Email' => $sEmail,
				'Password' => $sPassword,
				'AdditionalOptions' => $aAdditionalOptions,
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
		return \RainLoop\Api::Actions()->Cacher()->Delete(\RainLoop\KeyPathHelper::SsoCacherKey($sSsoHash));
	}

	/**
	 * @param string $sEmail
	 *
	 * @return bool
	 */
	public static function ClearUserData($sEmail)
	{
		if (0 < \strlen($sEmail))
		{
			$sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail);

			$oStorageProvider = \RainLoop\Api::Actions()->StorageProvider();
			if ($oStorageProvider && $oStorageProvider->IsActive())
			{
				$oStorageProvider->DeleteStorage($sEmail);
			}

			if (\RainLoop\Api::Actions()->AddressBookProvider() &&
				\RainLoop\Api::Actions()->AddressBookProvider()->IsActive())
			{
				\RainLoop\Api::Actions()->AddressBookProvider()->DeleteAllContacts($sEmail);
			}

			return true;
		}

		return false;
	}

	/**
	 * @return bool
	 */
	public static function LogoutCurrentLogginedUser()
	{
		\RainLoop\Utils::ClearCookie('rlsession');
		return true;
	}

	/**
	 * @return void
	 */
	public static function ExitOnEnd()
	{
		if (!\defined('RAINLOOP_EXIT_ON_END'))
		{
			\define('RAINLOOP_EXIT_ON_END', true);
		}
	}
}
