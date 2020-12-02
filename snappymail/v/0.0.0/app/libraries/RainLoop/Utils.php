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

	static $Cookies = null;

	public static function EncryptString(string $sString, string $sKey) : string
	{
		return \MailSo\Base\Crypt::Encrypt($sString, $sKey);
	}

	public static function DecryptString(string $sEncryptedString, string $sKey) : string
	{
		return \MailSo\Base\Crypt::Decrypt($sEncryptedString, $sKey);
	}

	public static function EncryptStringQ(string $sString, string $sKey) : string
	{
		return \MailSo\Base\Crypt::Encrypt($sString, $sKey.'Q'.static::GetShortToken());
	}

	public static function DecryptStringQ(string $sEncryptedString, string $sKey) : string
	{
		return \MailSo\Base\Crypt::Decrypt($sEncryptedString, $sKey.'Q'.static::GetShortToken());
	}

	public static function EncodeKeyValues(array $aValues, string $sCustomKey = '') : string
	{
		return \MailSo\Base\Utils::UrlSafeBase64Encode(
			static::EncryptString(\serialize($aValues), \md5(APP_SALT.$sCustomKey)));
	}

	public static function DecodeKeyValues(string $sEncodedValues, string $sCustomKey = '') : array
	{
		$aResult = \unserialize(
			static::DecryptString(
				\MailSo\Base\Utils::UrlSafeBase64Decode($sEncodedValues), \md5(APP_SALT.$sCustomKey)));

		return \is_array($aResult) ? $aResult : array();
	}

	public static function EncodeKeyValuesQ(array $aValues, string $sCustomKey = '') : string
	{
		return \MailSo\Base\Utils::UrlSafeBase64Encode(
			static::EncryptStringQ(
				\serialize($aValues), \md5(APP_SALT.$sCustomKey)));
	}

	public static function DecodeKeyValuesQ(string $sEncodedValues, string $sCustomKey = '') : array
	{
		$aResult = \unserialize(
			static::DecryptStringQ(
				\MailSo\Base\Utils::UrlSafeBase64Decode($sEncodedValues), \md5(APP_SALT.$sCustomKey)));

		return \is_array($aResult) ? $aResult : array();
	}

	public static function GetConnectionToken() : string
	{
		$sKey = 'rltoken';

		$sToken = static::GetCookie($sKey, null);
		if (null === $sToken)
		{
			$sToken = \MailSo\Base\Utils::Md5Rand(APP_SALT);
			static::SetCookie($sKey, $sToken, \time() + 60 * 60 * 24 * 30);
		}

		return \md5('Connection'.APP_SALT.$sToken.'Token'.APP_SALT);
	}

	public static function Fingerprint() : string
	{
		return \md5(empty($_SERVER['HTTP_USER_AGENT']) ? 'RainLoopFingerprint' : $_SERVER['HTTP_USER_AGENT']);
	}

	public static function GetShortToken() : string
	{
		$sKey = 'rlsession';

		$sToken = static::GetCookie($sKey, null);
		if (null === $sToken)
		{
			$sToken = \MailSo\Base\Utils::Md5Rand(APP_SALT);
			static::SetCookie($sKey, $sToken, 0);
		}

		return \md5('Session'.APP_SALT.$sToken.'Token'.APP_SALT);
	}

	public static function UpdateConnectionToken() : void
	{
		$sKey = 'rltoken';

		$sToken = static::GetCookie($sKey, '');
		if (!empty($sToken))
		{
			static::SetCookie($sKey, $sToken, \time() + 60 * 60 * 24 * 30);
		}
	}

	public static function GetCsrfToken() : string
	{
		return \md5('Csrf'.APP_SALT.self::GetConnectionToken().'Token'.APP_SALT);
	}

	public static function PathMD5(string $sPath) : string
	{
		$sResult = '';
		if (\is_dir($sPath))
		{
			$oDirIterator = new \RecursiveDirectoryIterator($sPath);
			$oIterator = new \RecursiveIteratorIterator($oDirIterator, \RecursiveIteratorIterator::SELF_FIRST);

			foreach ($oIterator as $oFile)
			{
				$sResult = \md5($sResult.($oFile->isFile() ? \md5_file($oFile) : $oFile));
			}
		}

		return $sResult;
	}

	public static function ReadAndAddLang(string $sFileName, array &$aResultLang) : void
	{
		if (\file_exists($sFileName))
		{
			if ('.yml' === \substr($sFileName, -4))
			{
				$aLang = \yaml_parse_file($sFileName);
				if (\is_array($aLang))
				{
					\reset($aLang);
					$sLangKey = \key($aLang);
					if (isset($aLang[$sLangKey]) && \is_array($aLang[$sLangKey]))
					{
						$aLang = $aLang[$sLangKey];
					}
					else
					{
						$aLang = null;
					}
				}
			}
			else
			{
				$aLang = static::CustomParseIniFile($sFileName, true);
			}

			if (\is_array($aLang))
			{
				foreach ($aLang as $sKey => $mValue)
				{
					if (\is_array($mValue))
					{
						foreach ($mValue as $sSecKey => $mSecValue)
						{
							$aResultLang[$sKey.'/'.$sSecKey] = $mSecValue;
						}
					}
					else
					{
						$aResultLang[$sKey] = $mValue;
					}
				}
			}
		}
	}

	public static function FolderFiles(string $sDir, string $sType = '') : array
	{
		$aResult = array();
		if (\is_dir($sDir))
		{
			if (false !== ($rDirHandle = \opendir($sDir)))
			{
				while (false !== ($sFile = \readdir($rDirHandle)))
				{
					if (empty($sType) || $sType === \substr($sFile, -\strlen($sType)))
					{
						if (\is_file($sDir.'/'.$sFile))
						{
							$aResult[] = $sFile;
						}
					}
				}

				\closedir($rDirHandle);
			}
		}

		return $aResult;
	}

	public static function ClearHtmlOutput(string $sHtml) : string
	{
//		return $sHtml;
		return \trim(\str_replace('> <', '><',
			\str_replace('" />', '"/>',
			\preg_replace('/[\s]+&nbsp;/i', '&nbsp;',
			\preg_replace('/&nbsp;[\s]+/i', '&nbsp;',
			\preg_replace('/[\r\n\t]+/', ' ',
			$sHtml
		))))));
	}

	public static function CompileTemplates(array &$aList, string $sDirName, string $sNameSuffix = '')
	{
		if (\file_exists($sDirName))
		{
			$aFileList = static::FolderFiles($sDirName, '.html');

			foreach ($aFileList as $sName)
			{
				$sTemplateName = \substr($sName, 0, -5).$sNameSuffix;
				$aList[$sTemplateName] = $sDirName.'/'.$sName;
			}
		}
	}

	/**
	 * @param mixed $mDefault = null
	 * @return mixed
	 */
	public static function GetCookie(string $sName, $mDefault = null)
	{
		if (null === static::$Cookies)
		{
			static::$Cookies = \is_array($_COOKIE) ? $_COOKIE : array();
		}

		return isset(static::$Cookies[$sName]) ? static::$Cookies[$sName] : $mDefault;
	}

	public static function SetCookie(string $sName, string $sValue = '', int $iExpire = 0, ?string $sPath = null, ?string $sDomain = null, ?bool $bSecure = null, bool $bHttpOnly = true)
	{
		if (null === static::$Cookies)
		{
			static::$Cookies = \is_array($_COOKIE) ? $_COOKIE : array();
		}

		if (null === $sPath)
		{
			$sPath = static::$CookieDefaultPath;
			$sPath = $sPath && 0 < \strlen($sPath) ? $sPath : '/';
		}

		if (null === $bSecure)
		{
			$bSecure = static::$CookieDefaultSecure;
		}

		static::$Cookies[$sName] = $sValue;
		\setcookie($sName, $sValue, array(
			'expires' => $iExpire,
			'path' => $sPath,
//			'domain' => $sDomain,
			'secure' => $bSecure,
			'httponly' => $bHttpOnly,
			'samesite' => 'Strict'
		));
	}

	public static function ClearCookie(string $sName)
	{
		if (null === static::$Cookies)
		{
			static::$Cookies = \is_array($_COOKIE) ? $_COOKIE : array();
		}

		$sPath = static::$CookieDefaultPath;

		unset(static::$Cookies[$sName]);
		\setcookie($sName, '', array(
			'expires' => \time() - 3600 * 24 * 30,
			'path' => $sPath && 0 < \strlen($sPath) ? $sPath : '/',
//			'domain' => null,
			'secure' => static::$CookieDefaultSecure,
			'httponly' => true,
			'samesite' => 'Strict'
		));
	}

	public static function UrlEncode(string $sV, bool $bEncode = false) : string
	{
		return $bEncode ? \urlencode($sV) : $sV;
	}

	public static function WebPath() : string
	{
		$sAppPath = '';
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
}
