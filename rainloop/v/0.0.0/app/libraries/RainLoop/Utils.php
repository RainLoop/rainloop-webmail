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

	static $RsaKey = null;

	private function __construct()
	{
	}

	static public function PgpVerifyFile(string $sFileName, string $sSignature) : bool
	{
		$sKeyFile = APP_VERSION_ROOT_PATH.'app/resources/RainLoop.asc';
		if (\file_exists($sKeyFile) && \file_exists($sFileName) && !empty($sSignature))
		{
			$sKeyFile = @\file_get_contents($sKeyFile);
			return !empty($sKeyFile); // TODO
		}

		return false;
	}

	static public function RsaPrivateKey() : string
	{
		if (!empty(\RainLoop\Utils::$RsaKey))
		{
			return \RainLoop\Utils::$RsaKey;
		}

		\RainLoop\Utils::$RsaKey = \file_exists(APP_PRIVATE_DATA.'rsa/private') ?
			\file_get_contents(APP_PRIVATE_DATA.'rsa/private') : '';

		\RainLoop\Utils::$RsaKey = \is_string(\RainLoop\Utils::$RsaKey) ? \RainLoop\Utils::$RsaKey : '';
	}

	static public function EncryptStringRSA(string $sString, string $sKey = '') : string
	{
		$sResult = '';
		$sKey = \md5($sKey);

		$sPrivateKey = \RainLoop\Utils::RsaPrivateKey();
		if (!empty($sPrivateKey))
		{
			$oPrivKey  = \openssl_pkey_get_private($sPrivateKey);
			$oKeyDetails = \openssl_pkey_get_details($oPrivKey);

			if (!empty($oKeyDetails['key']) && !empty($oKeyDetails['bits']))
			{
				$oPubKey = \openssl_pkey_get_public($oKeyDetails['key']);

				$iC = (($oKeyDetails['bits'] / 8) - 15);
				$aString = \str_split($sString, $iC);

				foreach ($aString as $iIndex => $sLine)
				{
					$sEncrypted = '';
					\openssl_public_encrypt($sLine, $sEncrypted, $oPubKey);
					$aString[$iIndex] = $sEncrypted;
				}

				$aString[] = $sKey;
				$sResult = @\serialize($aString);

				\openssl_free_key($oPubKey);
			}

			\openssl_free_key($oPrivKey);
		}

		return $sResult;
	}

	static public function DecryptStringRSA(string $sString, string $sKey = '') : string
	{
		$sResult = '';
		$sKey = \md5($sKey);

		$sPrivateKey = \RainLoop\Utils::RsaPrivateKey();
		if (!empty($sPrivateKey) && !empty($sString))
		{
			$oPrivKey  = \openssl_pkey_get_private($sPrivateKey);

			$aString = @\unserialize($sString);
			if (\is_array($aString))
			{
				if ($sKey === \array_pop($aString))
				{
					foreach ($aString as $iIndex => $sLine)
					{
						$sDecrypted = '';
						\openssl_private_decrypt($sLine, $sDecrypted, $oPrivKey);
						$aString[$iIndex] = $sDecrypted;
					}

					$sResult = \implode('', $aString);
				}
			}

			\openssl_free_key($oPrivKey);
		}

		return $sResult;
	}

	static public function EncryptString(string $sString, string $sKey) : string
	{
		return \MailSo\Base\Crypt::XxteaEncrypt($sString, $sKey);
	}

	static public function DecryptString(string $sEncriptedString, string $sKey) : string
	{
		return \MailSo\Base\Crypt::XxteaDecrypt($sEncriptedString, $sKey);
	}

	static public function EncryptStringQ(string $sString, string $sKey) : string
	{
//		if (\MailSo\Base\Utils::FunctionExistsAndEnabled('openssl_pkey_get_private'))
//		{
//			return \RainLoop\Utils::EncryptStringRSA($sString,
//				$sKey.'Q'.\RainLoop\Utils::GetShortToken());
//		}

		return \MailSo\Base\Crypt::XxteaEncrypt($sString,
			$sKey.'Q'.\RainLoop\Utils::GetShortToken());
	}

	static public function DecryptStringQ(string $sEncriptedString, string $sKey) : string
	{
//		if (\MailSo\Base\Utils::FunctionExistsAndEnabled('openssl_pkey_get_private'))
//		{
//			return \RainLoop\Utils::DecryptStringRSA($sEncriptedString,
//				$sKey.'Q'.\RainLoop\Utils::GetShortToken());
//		}

		return \MailSo\Base\Crypt::XxteaDecrypt($sEncriptedString,
			$sKey.'Q'.\RainLoop\Utils::GetShortToken());
	}

	static public function EncodeKeyValues(array $aValues, string $sCustomKey = '') : string
	{
		return \MailSo\Base\Utils::UrlSafeBase64Encode(
			\RainLoop\Utils::EncryptString(@\serialize($aValues), \md5(APP_SALT.$sCustomKey)));
	}

	static public function DecodeKeyValues(string $sEncodedValues, string $sCustomKey = '') : array
	{
		$aResult = @\unserialize(
			\RainLoop\Utils::DecryptString(
				\MailSo\Base\Utils::UrlSafeBase64Decode($sEncodedValues), \md5(APP_SALT.$sCustomKey)));

		return \is_array($aResult) ? $aResult : array();
	}

	static public function EncodeKeyValuesQ(array $aValues, string $sCustomKey = '') : string
	{
		return \MailSo\Base\Utils::UrlSafeBase64Encode(
			\RainLoop\Utils::EncryptStringQ(
				@\serialize($aValues), \md5(APP_SALT.$sCustomKey)));
	}

	static public function DecodeKeyValuesQ(string $sEncodedValues, string $sCustomKey = '') : array
	{
		$aResult = @\unserialize(
			\RainLoop\Utils::DecryptStringQ(
				\MailSo\Base\Utils::UrlSafeBase64Decode($sEncodedValues), \md5(APP_SALT.$sCustomKey)));

		return \is_array($aResult) ? $aResult : array();
	}

	static public function GetConnectionToken() : string
	{
		$sKey = 'rltoken';

		$sToken = \RainLoop\Utils::GetCookie($sKey, null);
		if (null === $sToken)
		{
			$sToken = \MailSo\Base\Utils::Md5Rand(APP_SALT);
			\RainLoop\Utils::SetCookie($sKey, $sToken, \time() + 60 * 60 * 24 * 30);
		}

		return \md5('Connection'.APP_SALT.$sToken.'Token'.APP_SALT);
	}

	static public function Fingerprint() : string
	{
		return \md5(empty($_SERVER['HTTP_USER_AGENT']) ? 'RainLoopFingerprint' : $_SERVER['HTTP_USER_AGENT']);
	}

	static public function GetShortToken() : string
	{
		$sKey = 'rlsession';

		$sToken = \RainLoop\Utils::GetCookie($sKey, null);
		if (null === $sToken)
		{
			$sToken = \MailSo\Base\Utils::Md5Rand(APP_SALT);
			\RainLoop\Utils::SetCookie($sKey, $sToken, 0);
		}

		return \md5('Session'.APP_SALT.$sToken.'Token'.APP_SALT);
	}

	static public function UpdateConnectionToken() : void
	{
		$sKey = 'rltoken';

		$sToken = \RainLoop\Utils::GetCookie($sKey, '');
		if (!empty($sToken))
		{
			\RainLoop\Utils::SetCookie($sKey, $sToken, \time() + 60 * 60 * 24 * 30);
		}
	}

	static public function GetCsrfToken() : string
	{
		return \md5('Csrf'.APP_SALT.self::GetConnectionToken().'Token'.APP_SALT);
	}

	public static function PathMD5(string $sPath) : string
	{
		$sResult = '';
		if (@\is_dir($sPath))
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
			$isYml = '.yml' === substr($sFileName, -4);
			if ($isYml)
			{
				$aLang = \spyc_load(\str_replace(array(': >-', ': |-', ': |+'), array(': >', ': |', ': |'), \file_get_contents($sFileName)));
				if (\is_array($aLang))
				{
					\reset($aLang);
					$sLangKey = key($aLang);
					if (isset($aLang[$sLangKey]) && is_array($aLang[$sLangKey]))
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
				$aLang = \RainLoop\Utils::CustomParseIniFile($sFileName, true);
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
		if (@\is_dir($sDir))
		{
			if (false !== ($rDirHandle = @\opendir($sDir)))
			{
				while (false !== ($sFile = @\readdir($rDirHandle)))
				{
					if (empty($sType) || $sType === \substr($sFile, -\strlen($sType)))
					{
						if (\is_file($sDir.'/'.$sFile))
						{
							$aResult[] = $sFile;
						}
					}
				}

				@\closedir($rDirHandle);
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

	public static function FastCheck(string $sKey) : bool
	{
		$bResult = false;

		$aMatches = array();
		if (!empty($sKey) && 0 < \strlen($sKey) && \preg_match('/^(RL[\d]+)\-(.+)\-([^\-]+)$/', $sKey, $aMatches) && 3 === \count($aMatches))
		{
			$bResult = $aMatches[3] === \strtoupper(\base_convert(\crc32(\md5(
				$aMatches[1].'-'.$aMatches[2].'-')), 10, 32));
		}

		return $bResult;
	}

	public static function CompileTemplates(array &$aList, string $sDirName, string $sNameSuffix = '')
	{
		if (\file_exists($sDirName))
		{
			$aFileList = \RainLoop\Utils::FolderFiles($sDirName, '.html');

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
		if (null === \RainLoop\Utils::$Cookies)
		{
			\RainLoop\Utils::$Cookies = is_array($_COOKIE) ? $_COOKIE : array();
		}

		return isset(\RainLoop\Utils::$Cookies[$sName]) ? \RainLoop\Utils::$Cookies[$sName] : $mDefault;
	}

	public static function SetCookie(string $sName, string $sValue = '', int $iExpire = 0, ?string $sPath = null, ?string $sDomain = null, ?bool $bSecure = null, bool $bHttpOnly = true)
	{
		if (null === \RainLoop\Utils::$Cookies)
		{
			\RainLoop\Utils::$Cookies = is_array($_COOKIE) ? $_COOKIE : array();
		}

		if (null === $sPath)
		{
			$sPath = \RainLoop\Utils::$CookieDefaultPath;
			$sPath = $sPath && 0 < \strlen($sPath) ? $sPath : null;
		}

		if (null === $bSecure)
		{
			$bSecure = \RainLoop\Utils::$CookieDefaultSecure;
		}

		\RainLoop\Utils::$Cookies[$sName] = $sValue;
		@\setcookie($sName, $sValue, $iExpire, $sPath, $sDomain, $bSecure, $bHttpOnly);
	}

	public static function ClearCookie(string $sName)
	{
		if (null === \RainLoop\Utils::$Cookies)
		{
			\RainLoop\Utils::$Cookies = is_array($_COOKIE) ? $_COOKIE : array();
		}

		$sPath = \RainLoop\Utils::$CookieDefaultPath;
		$sPath = $sPath && 0 < \strlen($sPath) ? $sPath : null;

		unset(\RainLoop\Utils::$Cookies[$sName]);
		@\setcookie($sName, '', \time() - 3600 * 24 * 30, $sPath);
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
		return self::WebPath().'rainloop/v/'.APP_VERSION.'/';
	}

	public static function WebStaticPath() : string
	{
		return self::WebVersionPath().'static/';
	}

	public static function RemoveSuggestionDuplicates(array $aSuggestions) : array
	{
		$aResult = array();

		if (is_array($aSuggestions))
		{
			$aCache = array();
			foreach ($aSuggestions as $aItem)
			{
				$sLine = \implode('~~', $aItem);
				if (!isset($aCache[$sLine]))
				{
					$aCache[$sLine] = true;
					$aResult[] = $aItem;
				}
			}
		}

		return $aResult;
	}

	public static function CustomParseIniFile(string $sFileName, bool $bProcessSections = false) : array
	{
//		if (\MailSo\Base\Utils::FunctionExistsAndEnabled('parse_ini_file'))
//		{
//			return @\parse_ini_file($sFileName, !!$bProcessSections);
//		}

		$sData = @\file_get_contents($sFileName);
		return \is_string($sData) ? @\parse_ini_string($sData, !!$bProcessSections) : null;
	}

	public static function CustomBaseConvert(string $sNumberInput, string $sFromBaseInput = '0123456789', string $sToBaseInput = '0123456789')
	{
		if ($sFromBaseInput === $sToBaseInput)
		{
			return $sNumberInput;
		}

		$mFromBase = \str_split($sFromBaseInput, 1);
		$mToBase = \str_split($sToBaseInput, 1);
		$aNumber = \str_split($sNumberInput, 1);
		$iFromLen = \strlen($sFromBaseInput);
		$iToLen = \strlen($sToBaseInput);
		$numberLen = \strlen($sNumberInput);
		$mRetVal = '';

		if ($sToBaseInput === '0123456789')
		{
			$mRetVal = 0;
			for ($iIndex = 1; $iIndex <= $numberLen; $iIndex++)
			{
				$mRetVal = \bcadd($mRetVal, \bcmul(\array_search($aNumber[$iIndex - 1], $mFromBase), \bcpow($iFromLen, $numberLen - $iIndex)));
			}

			return $mRetVal;
		}

		if ($sFromBaseInput != '0123456789')
		{
			$sBase10 = \RainLoop\Utils::CustomBaseConvert($sNumberInput, $sFromBaseInput, '0123456789');
		}
		else
		{
			$sBase10 = $sNumberInput;
		}

		if ($sBase10 < \strlen($sToBaseInput))
		{
			return $mToBase[$sBase10];
		}

		while ($sBase10 !== '0')
		{
			$mRetVal = $mToBase[\bcmod($sBase10, $iToLen)].$mRetVal;
			$sBase10 = \bcdiv($sBase10, $iToLen, 0);
		}

		return $mRetVal;
	}
}
