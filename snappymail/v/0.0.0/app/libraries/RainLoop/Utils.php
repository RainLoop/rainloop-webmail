<?php

namespace RainLoop;

class Utils
{
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
		$sToken = \SnappyMail\Cookies::get(self::SESSION_TOKEN);
		if (!$sToken) {
			if (!$generate) {
				return null;
			}
			\SnappyMail\Log::debug('TOKENS', 'New SESSION_TOKEN');
			$sToken = \MailSo\Base\Utils::Sha1Rand(APP_SALT);
			\SnappyMail\Cookies::set(self::SESSION_TOKEN, $sToken);
		}
		return \sha1('Session'.APP_SALT.$sToken.'Token'.APP_SALT);
	}

	public static function GetConnectionToken() : string
	{
		$oActions = \RainLoop\Api::Actions();
		$oAccount = $oActions->getAccountFromToken(false) ?: $oActions->getMainAccountFromToken(false);
		if ($oAccount) {
			return $oAccount->Hash();
		}
		$sToken = \SnappyMail\Cookies::get(self::CONNECTION_TOKEN);
		if (!$sToken) {
			$sToken = \MailSo\Base\Utils::Sha1Rand(APP_SALT);
			\SnappyMail\Cookies::set(self::CONNECTION_TOKEN, $sToken, \time() + 3600 * 24 * 30);
		}
		return \sha1('Connection'.APP_SALT.$sToken.'Token'.APP_SALT);
	}

	public static function GetCsrfToken() : string
	{
		return \sha1('Csrf'.APP_SALT.self::GetConnectionToken().'Token'.APP_SALT);
	}

	public static function UpdateConnectionToken() : void
	{
		$sToken = \SnappyMail\Cookies::get(self::CONNECTION_TOKEN);
		if ($sToken) {
			\SnappyMail\Cookies::set(self::CONNECTION_TOKEN, $sToken, \time() + 3600 * 24 * 30);
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

	public static function inOpenBasedir(string $name) : string
	{
		static $open_basedir;
		if (null === $open_basedir) {
			$open_basedir = \ini_get('open_basedir');
			if ($open_basedir) {
				\SnappyMail\Log::warning('OpenBasedir', "open_basedir restriction in effect. Allowed path(s): {$open_basedir}");
			}
			$open_basedir = \array_filter(\explode(PATH_SEPARATOR, $open_basedir));
		}
		if ($open_basedir) {
			foreach ($open_basedir as $dir) {
				if (\str_starts_with($name, $dir)) {
					return true;
				}
			}
//			\SnappyMail\Log::warning('OpenBasedir', "open_basedir restriction in effect. {$name} is not within the allowed path(s): " . \ini_get('open_basedir'));
			return false;
		}
		return true;
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
