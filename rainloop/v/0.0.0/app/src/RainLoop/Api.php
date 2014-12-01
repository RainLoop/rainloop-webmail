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

			\MailSo\Config::$LargeThreadLimit =
				(int) \RainLoop\Api::Config()->Get('labs', 'imap_large_thread_limit', 100);

			\MailSo\Config::$SystemLogger = \RainLoop\Api::Logger();

			$sSslCafile = \RainLoop\Api::Config()->Get('ssl', 'cafile', '');
			$sSslCapath = \RainLoop\Api::Config()->Get('ssl', 'capath', '');

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
	 * @param bool $bUseTimeout = true
	 *
	 * @return string
	 */
	public static function GetUserSsoHash($sEmail, $sPassword, $bUseTimeout = true)
	{
		$sSsoHash = \sha1(\rand(10000, 99999).$sEmail.$sPassword.\microtime(true));

		return \RainLoop\Api::Actions()->Cacher()->Set(\RainLoop\KeyPathHelper::SsoCacherKey($sSsoHash), \RainLoop\Utils::EncodeKeyValues(array(
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
				// TwoFactor Auth User Data
				$oStorageProvider->Clear(null,
					\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
					\RainLoop\KeyPathHelper::TwoFactorAuthUserData($sEmail)
				);

				// Accounts list
				$oStorageProvider->Clear(null,
					\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
					\RainLoop\KeyPathHelper::WebmailAccounts($sEmail)
				);

				// Contact sync data
				$oStorageProvider->Clear($sEmail,
					\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
					'contacts_sync'
				);
			}

			\RainLoop\Api::Actions()->SettingsProvider()->ClearByEmail($sEmail);

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
