<?php

namespace SnappyMail;

class Cookies
{
	static $DefaultPath = '';

	static $Secure = null;

	static $SameSite = 'Strict';

	private static function init() : bool
	{
		static $bOne = false;
		if (!$bOne) {
			$oConfig = \RainLoop\Api::Config();
			static::$DefaultPath = $oConfig->Get('labs', 'cookie_default_path', '');
			static::$SameSite = $oConfig->Get('security', 'cookie_samesite', 'Strict');
			static::$Secure = isset($_SERVER['HTTPS'])
				|| 'None' == static::$SameSite
				|| !!$oConfig->Get('labs', 'cookie_default_secure', false);
			$bOne = true;
		}
		return $bOne;
	}

	public static function get(string $sName) : ?string
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

	public static function getSecure(string $sName)
	{
		return isset($_COOKIE[$sName])
			? Crypt::DecryptFromJSON(\MailSo\Base\Utils::UrlSafeBase64Decode(static::get($sName)))
			: null;
	}

	private static function _set(string $sName, string $sValue, int $iExpire, bool $httponly = true) : bool
	{
		$sPath = static::$DefaultPath;
		$sPath = $sPath && \strlen($sPath) ? $sPath : '/';
/*
		if (\strlen($sValue) > 4000 - \strlen($sPath . $sName)) {
			throw new \Exception("Cookie '{$sName}' value too long");
		}
*/
		if (\strlen($sValue)) {
			$_COOKIE[$sName] = $sValue;
		} else {
			if (!isset($_COOKIE[$sName])) {
				return true;
			}
			unset($_COOKIE[$sName]);
			$iExpire = \time() - 3600 * 24 * 30;
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
				\header($cookie,false);
			}
		}

		return \setcookie($sName, $sValue, array(
			'expires' => $iExpire,
			'path' => $sPath,
//			'domain' => null,
			'secure' => static::$Secure,
			'httponly' => $httponly,
			'samesite' => static::$SameSite
		));
	}

	/**
	 * Firefox: Cookie "$sName" has been rejected because it is already expired.
	 * \header_remove("set-cookie: {$sName}");
	 */
	public static function set(string $sName, string $sValue, int $iExpire = 0, bool $httponly = true) : void
	{
		static::init();
		$sPath = static::$DefaultPath;
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
			$sCookieName = $i ? "{$sName}~{$i}" : $sName;
			Log::debug('COOKIE', "set {$sCookieName}");
			static::_set($sCookieName, $sPart, $iExpire, $httponly);
		}
		// Delete unused old 4K split cookie parts
		foreach (\array_keys($_COOKIE) as $sCookieName) {
			$aSplit = \explode('~', $sCookieName);
			if (isset($aSplit[1]) && $aSplit[0] == $sName && $aSplit[1] > $i) {
				Log::debug('COOKIE', "unset {$sCookieName}");
				static::_set($sCookieName, '', 0, $httponly);
			}
		}
	}

	public static function clear(string $sName) : void
	{
		static::init();
		static::_set($sName, '', 0);
	}
}
