<?php

namespace RainLoop;

class Utils
{
	/**
	 * @var string
	 */
	static $CookieDefaultPath = '';

	/**
	 * @var bool|null
	 */
	static $CookieDefaultSecure = null;

	const
		/**
		 * 30 days cookie
		 * Used by: ServiceProxyExternal, compileLogParams, GetCsrfToken
		 */
		CONNECTION_TOKEN = 'smtoken',

		/**
		 * Session cookie
		 * Used by: EncodeKeyValuesQ, DecodeKeyValuesQ
		 */
		SESSION_TOKEN = 'smsession';

	public static function EncodeKeyValuesQ(array $aValues, string $sCustomKey = '') : string
	{
		return \SnappyMail\Crypt::EncryptUrlSafe(
			$aValues,
			\sha1(APP_SALT.$sCustomKey.'Q'.static::GetSessionToken())
		);
	}

	public static function DecodeKeyValuesQ(string $sEncodedValues, string $sCustomKey = '') : ?array
	{
		return \SnappyMail\Crypt::DecryptUrlSafe(
			$sEncodedValues,
			\sha1(APP_SALT.$sCustomKey.'Q'.static::GetSessionToken(false))
		) ?: null;
	}

	public static function GetSessionToken(bool $generate = true) : ?string
	{
		$sToken = static::GetCookie(self::SESSION_TOKEN, null);
		if (!$sToken) {
			if (!$generate) {
				return null;
			}
			\SnappyMail\Log::debug('TOKENS', 'New SESSION_TOKEN');
			$sToken = \MailSo\Base\Utils::Sha1Rand(APP_SALT);
			static::SetCookie(self::SESSION_TOKEN, $sToken);
		}
		return \sha1('Session'.APP_SALT.$sToken.'Token'.APP_SALT);
	}

	public static function GetConnectionToken() : string
	{
		$sToken = static::GetCookie(self::CONNECTION_TOKEN);
		if (!$sToken)
		{
			$sToken = \MailSo\Base\Utils::Sha1Rand(APP_SALT);
			static::SetCookie(self::CONNECTION_TOKEN, $sToken, \time() + 3600 * 24 * 30);
		}

		return \sha1('Connection'.APP_SALT.$sToken.'Token'.APP_SALT);
	}

	public static function GetCsrfToken() : string
	{
		return \sha1('Csrf'.APP_SALT.self::GetConnectionToken().'Token'.APP_SALT);
	}

	public static function UpdateConnectionToken() : void
	{
		$sToken = static::GetCookie(self::CONNECTION_TOKEN);
		if ($sToken)
		{
			static::SetCookie(self::CONNECTION_TOKEN, $sToken, \time() + 3600 * 24 * 30);
		}
	}

	public static function ClearHtmlOutput(string $sHtml) : string
	{
//		return $sHtml;
		return \preg_replace(
			['@\\s*/>@', '/\\s*&nbsp;/i', '/&nbsp;\\s*/i', '/[\\r\\n\\t]+/', '/>\\s+</'],
			['>', "\xC2\xA0", "\xC2\xA0", ' ', '><'],
			\trim($sHtml)
		);
	}

	/**
	 * @param mixed $mDefault = null
	 * @return mixed
	 */
	public static function GetCookie(string $sName, $mDefault = null)
	{
		return isset($_COOKIE[$sName]) ? $_COOKIE[$sName] : $mDefault;
	}

	public static function GetSecureCookie(string $sName)
	{
		return isset($_COOKIE[$sName]) && 1024 > \strlen($_COOKIE[$sName])
			? \SnappyMail\Crypt::DecryptFromJSON(\MailSo\Base\Utils::UrlSafeBase64Decode($_COOKIE[$sName]))
			: null;
	}

	public static function SetCookie(string $sName, string $sValue = '', int $iExpire = 0, bool $bHttpOnly = true)
	{
		$sPath = static::$CookieDefaultPath;
		$_COOKIE[$sName] = $sValue;
		\setcookie($sName, $sValue, array(
			'expires' => $iExpire,
			'path' => $sPath && \strlen($sPath) ? $sPath : '/',
//			'domain' => $sDomain,
			'secure' => isset($_SERVER['HTTPS']) || static::$CookieDefaultSecure,
			'httponly' => $bHttpOnly,
			'samesite' => 'Strict'
		));
	}

	public static function ClearCookie(string $sName)
	{
		if (isset($_COOKIE[$sName])) {
			$sPath = static::$CookieDefaultPath;
			unset($_COOKIE[$sName]);
			\setcookie($sName, '', array(
				'expires' => \time() - 3600 * 24 * 30,
				'path' => $sPath && \strlen($sPath) ? $sPath : '/',
//				'domain' => null,
				'secure' => isset($_SERVER['HTTPS']) || static::$CookieDefaultSecure,
				'httponly' => true,
				'samesite' => 'Strict'
			));
		}
	}

	public static function UrlEncode(string $sV, bool $bEncode = false) : string
	{
		return $bEncode ? \urlencode($sV) : $sV;
	}

	public static function WebPath() : string
	{
		static $sAppPath;
		if (!$sAppPath) {
			$sAppPath = Api::Config()->Get('webmail', 'app_path', '')
				?: \preg_replace('#index\\.php.*$#D', '', $_SERVER['SCRIPT_NAME']);
		}
		return $sAppPath;
	}

	public static function WebVersionPath() : string
	{
		return self::WebPath().'snappymail/v/'.APP_VERSION.'/';
	}

	public static function WebStaticPath() : string
	{
		return self::WebVersionPath().'static/';
	}

	public static function RemoveSuggestionDuplicates(array $aSuggestions) : array
	{
		$aResult = array();

		foreach ($aSuggestions as $aItem)
		{
			$sLine = \implode('~~', $aItem);
			if (!isset($aResult[$sLine]))
			{
				$aResult[$sLine] = $aItem;
			}
		}

		return array_values($aResult);
	}

	public static function CustomParseIniFile(string $sFileName, bool $bProcessSections = false) : array
	{
		return @\parse_ini_file($sFileName, !!$bProcessSections) ?: array();
//		return @\parse_ini_string(\file_get_contents($sFileName), $bProcessSections) ?: array();
	}

	public static function inOpenBasedir(string $name) : string
	{
		static $open_basedir;
		if (null === $open_basedir) {
			$open_basedir = \array_filter(\explode(PATH_SEPARATOR, \ini_get('open_basedir')));
		}
		if ($open_basedir) {
			foreach ($open_basedir as $dir) {
				if (\str_starts_with($name, $dir)) {
					return true;
				}
			}
			\SnappyMail\Log::warning('OpenBasedir', "open_basedir restriction in effect. {$name} is not within the allowed path(s): " . \ini_get('open_basedir'));
			return false;
		}
		return true;
	}

	/**
	 * Replace control characters, ampersand, spaces and reserved characters (based on Win95 VFAT)
	 * en.wikipedia.org/wiki/Filename#Reserved_characters_and_words
	 */
	public static function fixName(string $filename) : string
	{
		return \preg_replace('#[|\\\\?*<":>+\\[\\]/&\\s\\pC]#su', '-', $filename);
	}

	public static function saveFile(string $filename, string $data) : void
	{
		$dir = \dirname($filename);
		if (!\is_dir($dir) && !\mkdir($dir, 0700, true)) {
			throw new Exceptions\Exception('Failed to create directory "'.$dir.'"');
		}
		if (false === \file_put_contents($filename, $data)) {
			throw new Exceptions\Exception('Failed to save file "'.$filename.'"');
		}
		\clearstatcache();
		\chmod($filename, 0600);
/*
		try {
		} catch (\Throwable $oException) {
			throw new Exceptions\Exception($oException->getMessage() . ': ' . \error_get_last()['message']);
		}
*/
	}
}
