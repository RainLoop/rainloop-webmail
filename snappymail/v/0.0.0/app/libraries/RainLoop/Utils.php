<?php

namespace RainLoop;

class Utils
{
	static $CookieDefaultPath = '';

	static $CookieSecure = null;

	static $CookieSameSite = 'Strict';

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

	/**
	 * @param mixed $value
	 * @param int $flags Bitmask
	 */
	public static function jsonEncode($value, int $flags = \JSON_INVALID_UTF8_SUBSTITUTE) : string
	{
		try {
			/* Issue with \SnappyMail\HTTP\Stream
			if (Api::Config()->Get('debug', 'enable', false)) {
				$flags |= \JSON_PRETTY_PRINT;
			}
			*/
			return \json_encode($value, $flags | \JSON_UNESCAPED_UNICODE | \JSON_THROW_ON_ERROR);
		} catch (\Throwable $e) {
			Api::Logger()->WriteException($e, \LOG_ERR, 'JSON');
		}
		return '';
	}

	public static function EncodeKeyValuesQ(array $aValues, string $sCustomKey = '') : string
	{
		return \SnappyMail\Crypt::EncryptUrlSafe(
			$aValues,
			\sha1(APP_SALT.$sCustomKey.'Q'.static::GetSessionToken())
		);
	}

	public static function DecodeKeyValuesQ(string $sEncodedValues, string $sCustomKey = '') : array
	{
		return \SnappyMail\Crypt::DecryptUrlSafe(
			$sEncodedValues,
			\sha1(APP_SALT.$sCustomKey.'Q'.static::GetSessionToken(false))
		) ?: array();
	}

	public static function GetSessionToken(bool $generate = true) : ?string
	{
		$sToken = static::GetCookie(self::SESSION_TOKEN);
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
		return \preg_replace('/>\\s+</', '><', \preg_replace(
			['@\\s*/>@', '/\\s*&nbsp;/i', '/&nbsp;\\s*/i', '/[\\r\\n\\t]+/'],
			['>', "\xC2\xA0", "\xC2\xA0", ' '],
			\trim($sHtml)
		));
	}

	/**
	 * @param mixed $mDefault = null
	 */
	public static function GetCookie(string $sName) : ?string
	{
		if (isset($_COOKIE[$sName])) {
			$aParts = [];
			foreach (\array_keys($_COOKIE) as $sCookieName) {
				if (\strtok($sCookieName, '~') === $sName) {
					$aParts[$sCookieName] = $_COOKIE[$sCookieName];
				}
			}
			\ksort($aParts);
			return \implode('', $aParts);
		}
		return null;
	}

	public static function GetSecureCookie(string $sName)
	{
		return isset($_COOKIE[$sName])
			? \SnappyMail\Crypt::DecryptFromJSON(\MailSo\Base\Utils::UrlSafeBase64Decode(static::GetCookie($sName)))
			: null;
	}

	private static function _SetCookie(string $sName, string $sValue, int $iExpire)
	{
		$sPath = static::$CookieDefaultPath;
		$sPath = $sPath && \strlen($sPath) ? $sPath : '/';
/*
		if (\strlen($sValue) > 4000 - \strlen($sPath . $sName)) {
			throw new \Exception("Cookie '{$sName}' value too long");
		}
*/
		if (\strlen($sValue)) {
			$_COOKIE[$sName] = $sValue;
		}

		// Cookie "$sName" has been rejected because it is already expired.
		// Happens when \setcookie() sends multiple with the same name (and one is deleted)
		// So when previously set, we must delete all 'Set-Cookie' headers and start over
		$cookies = [];
		$cookie_remove = false;
		foreach (\headers_list() as $header) {
			if (\preg_match("/Set-Cookie:([^=]+)=/i", $header, $match)) {
				if (\trim($match[1]) == $sName) {
					$cookie_remove = true;
				} else {
					$cookies[] = $header;
				}
			}
		}
		if ($cookie_remove) {
			\header_remove('Set-Cookie');
			foreach ($cookies as $cookie) {
				\header($cookie);
			}
		}

		\setcookie($sName, $sValue, array(
			'expires' => $iExpire,
			'path' => $sPath,
//			'domain' => null,
			'secure' => static::$CookieSecure,
			'httponly' => true,
			'samesite' => static::$CookieSameSite
		));
	}

	/**
	 * Firefox: Cookie "$sName" has been rejected because it is already expired.
	 * \header_remove("set-cookie: {$sName}");
	 */
	public static function SetCookie(string $sName, string $sValue, int $iExpire = 0)
	{
		$sPath = static::$CookieDefaultPath;
		$sPath = $sPath && \strlen($sPath) ? $sPath : '/';
		// https://github.com/the-djmaze/snappymail/issues/451
		// The 4K browser limit is for the entire cookie, including name, value, expiry date etc.
		$iMaxSize = 4000 - \strlen($sPath . $sName);
/*
		if ($iMaxSize < \strlen($sValue)) {
			throw new \Exception("Cookie '{$sName}' value too long");
		}
*/
		// Set the new 4K split cookie
		foreach (\str_split($sValue, $iMaxSize) as $i => $sPart) {
			static::_SetCookie($i ? "{$sName}~{$i}" : $sName, $sPart, $iExpire);
		}
		// Delete unused old 4K split cookie parts
		while (($sCookieName = "{$sName}~" . ++$i) && isset($_COOKIE[$sCookieName])) {
			unset($_COOKIE[$sCookieName]);
			static::_SetCookie($sCookieName, '', \time() - 3600 * 24 * 30);
		}
	}

	public static function ClearCookie(string $sName)
	{
		if (isset($_COOKIE[$sName])) {
			$sPath = static::$CookieDefaultPath;
			foreach (\array_keys($_COOKIE) as $sCookieName) {
				if (\strtok($sCookieName, '~') === $sName) {
					unset($_COOKIE[$sCookieName]);
					static::_SetCookie($sCookieName, '', \time() - 3600 * 24 * 30);
				}
			}
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
			$sAppPath = \rtrim(Api::Config()->Get('webmail', 'app_path', '')
				?: \preg_replace('#index\\.php.*$#D', '', $_SERVER['SCRIPT_NAME']),
			'/') . '/';
		}
		return $sAppPath;
	}

	public static function WebVersionPath() : string
	{
		return self::WebPath() . 'snappymail/v/' . APP_VERSION . '/';
		/**
		 * TODO: solve this to support other paths.
		 * https://github.com/the-djmaze/snappymail/issues/685
		 */
//		return self::WebPath() . \str_replace(APP_INDEX_ROOT_PATH, '', APP_VERSION_ROOT_PATH);
	}

	public static function WebStaticPath(string $path = '') : string
	{
		return self::WebVersionPath() . 'static/' . $path;
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
			throw new \RuntimeException('Failed to create directory "'.$dir.'"');
		}
		if (false === \file_put_contents($filename, $data)) {
			throw new \RuntimeException('Failed to save file "'.$filename.'"');
		}
		\clearstatcache();
		\chmod($filename, 0600);
/*
		try {
		} catch (\Throwable $oException) {
			throw new \RuntimeException($oException->getMessage() . ': ' . \error_get_last()['message']);
		}
*/
	}
}
