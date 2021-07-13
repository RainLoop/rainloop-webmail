<?php

namespace RainLoop;

class Api
{

	function __construct()
	{
	}

	public static function RunResult() : bool
	{
		return true;
	}

	/**
	 * @staticvar bool $bOne
	 */
	public static function Handle() : bool
	{
		static $bOne = null;
		if (null === $bOne)
		{
			static::SetupDefaultMailSoConfig();
			$bOne = static::RunResult();
		}
		return $bOne;
	}

	public static function Actions() : Actions
	{
		static $oActions = null;
		if (null === $oActions)
		{
			$oActions = new Actions();
		}

		return $oActions;
	}

	public static function Config() : Config\Application
	{
		return static::Actions()->Config();
	}

	public static function Logger() : \MailSo\Log\Logger
	{
		return static::Actions()->Logger();
	}

	protected static function SetupDefaultMailSoConfig() : void
	{
		if (\class_exists('MailSo\Config'))
		{
			\MailSo\Config::$MessageListFastSimpleSearch =
				!!static::Config()->Get('labs', 'imap_message_list_fast_simple_search', true);

			\MailSo\Config::$MessageListCountLimitTrigger =
				(int) static::Config()->Get('labs', 'imap_message_list_count_limit_trigger', 0);

			\MailSo\Config::$MessageListDateFilter =
				(int) static::Config()->Get('labs', 'imap_message_list_date_filter', 0);

			\MailSo\Config::$MessageListPermanentFilter =
				\trim(static::Config()->Get('labs', 'imap_message_list_permanent_filter', ''));

			\MailSo\Config::$MessageAllHeaders =
				!!static::Config()->Get('labs', 'imap_message_all_headers', false);

			\MailSo\Config::$LargeThreadLimit =
				(int) static::Config()->Get('labs', 'imap_large_thread_limit', 50);

			\MailSo\Config::$ImapTimeout =
				(int) static::Config()->Get('labs', 'imap_timeout', 300);

			\MailSo\Config::$BoundaryPrefix =
				\trim(static::Config()->Get('labs', 'boundary_prefix', ''));

			\MailSo\Config::$SystemLogger = static::Logger();

			$sSslCafile = static::Config()->Get('ssl', 'cafile', '');
			$sSslCapath = static::Config()->Get('ssl', 'capath', '');

			Utils::$CookieDefaultPath = static::Config()->Get('labs', 'cookie_default_path', '');
			if (static::Config()->Get('labs', 'cookie_default_secure', false))
			{
				Utils::$CookieDefaultSecure = true;
			}

			if (!empty($sSslCafile) || !empty($sSslCapath))
			{
				\MailSo\Hooks::Add('Net.NetClient.StreamContextSettings/Filter', function ($aStreamContextSettings) use ($sSslCafile, $sSslCapath) {
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

			\MailSo\Config::$HtmlStrictDebug = !!static::Config()->Get('debug', 'enable', false);

			\MailSo\Config::$CheckNewMessages = !!static::Config()->Get('labs', 'check_new_messages', true);

			if (static::Config()->Get('labs', 'strict_html_parser', true))
			{
				\MailSo\Config::$HtmlStrictAllowedAttributes = array(
					// defaults
					'name',
					'dir', 'lang', 'style', 'title',
					'background', 'bgcolor', 'alt', 'height', 'width', 'src', 'href',
					'border', 'bordercolor', 'charset', 'direction', 'language',
					// a
					'coords', 'download', 'hreflang', 'shape',
					// body
					'alink', 'bgproperties', 'bottommargin', 'leftmargin', 'link', 'rightmargin', 'text', 'topmargin', 'vlink',
					'marginwidth', 'marginheight', 'offset',
					// button,
					'disabled', 'type', 'value',
					// col
					'align', 'valign',
					// font
					'color', 'face', 'size',
					// form
					'novalidate',
					// hr
					'noshade',
					// img
					'hspace', 'sizes', 'srcset', 'vspace', 'usemap',
					// input, textarea
					'checked', 'max', 'min', 'maxlength', 'multiple', 'pattern', 'placeholder', 'readonly', 'required', 'step', 'wrap',
					// label
					'for',
					// meter
					'low', 'high', 'optimum',
					// ol
					'reversed', 'start',
					// option
					'selected', 'label',
					// table
					'cols', 'rows', 'frame', 'rules', 'summary', 'cellpadding', 'cellspacing',
					// th
					'abbr', 'scope',
					// td
					'axis', 'colspan', 'rowspan', 'headers', 'nowrap'
				);
			}
		}
	}

	public static function Version() : string
	{
		return APP_VERSION;
	}

	public static function GetUserSsoHash(string $sEmail, string $sPassword, array $aAdditionalOptions = array(), bool $bUseTimeout = true) : string
	{
		$sSsoHash = \MailSo\Base\Utils::Sha1Rand(\md5($sEmail).\md5($sPassword));

		return static::Actions()->Cacher()->Set(KeyPathHelper::SsoCacherKey($sSsoHash),
			Utils::EncodeKeyValuesQ(array(
				'Email' => $sEmail,
				'Password' => $sPassword,
				'AdditionalOptions' => $aAdditionalOptions,
				'Time' => $bUseTimeout ? \time() : 0
			))) ? $sSsoHash : '';
	}

	public static function ClearUserSsoHash(string $sSsoHash) : bool
	{
		return static::Actions()->Cacher()->Delete(KeyPathHelper::SsoCacherKey($sSsoHash));
	}

	public static function ClearUserData(string $sEmail) : bool
	{
		if (0 < \strlen($sEmail))
		{
			$sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail);

			$oStorageProvider = static::Actions()->StorageProvider();
			if ($oStorageProvider && $oStorageProvider->IsActive())
			{
				$oStorageProvider->DeleteStorage($sEmail);
			}

			if (static::Actions()->AddressBookProvider() &&
				static::Actions()->AddressBookProvider()->IsActive())
			{
				static::Actions()->AddressBookProvider()->DeleteAllContacts($sEmail);
			}

			return true;
		}

		return false;
	}

	public static function LogoutCurrentLogginedUser() : bool
	{
		Utils::ClearCookie('rlsession');
		return true;
	}

	public static function ExitOnEnd() : void
	{
		if (!\defined('SNAPPYMAIL_EXIT_ON_END'))
		{
			\define('SNAPPYMAIL_EXIT_ON_END', true);
		}
	}
}
