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

	static $RSA = null;

	static $RsaKey = null;

	/**
	 * @return void
	 */
	private function __construct()
	{
	}

	/**
	 * @param string $sFileName
	 * @param string $sSignature
	 *
	 * @return bool
	 */
	static public function PgpVerifyFile($sFileName, $sSignature)
	{
		$sKeyFile = APP_VERSION_ROOT_PATH.'app/resources/RainLoop.asc';
		if (\file_exists($sKeyFile) && \file_exists($sFileName) && !empty($sSignature))
		{
			$sKeyFile = @\file_get_contents($sKeyFile);
			return !empty($sKeyFile); // TODO
		}

		return false;
	}

	/**
	 * @return \Crypt_RSA|null
	 */
	static public function CryptRSA()
	{
		if (null === \RainLoop\Utils::$RSA)
		{
			if (!\defined('_phpseclib_'))
			{
				\set_include_path(\get_include_path().PATH_SEPARATOR.APP_VERSION_ROOT_PATH.'app/libraries/phpseclib');
				define('_phpseclib_', true);
			}

			if (!\class_exists('Crypt_RSA', false))
			{
				include_once 'Crypt/RSA.php';
				\defined('CRYPT_RSA_MODE') || \define('CRYPT_RSA_MODE', CRYPT_RSA_MODE_INTERNAL);
			}

			if (\class_exists('Crypt_RSA'))
			{
				$oRsa = new \Crypt_RSA();

				$oRsa->setEncryptionMode(CRYPT_RSA_ENCRYPTION_PKCS1);
				$oRsa->setPrivateKeyFormat(CRYPT_RSA_PRIVATE_FORMAT_PKCS1);
				$oRsa->setPrivateKeyFormat(CRYPT_RSA_PUBLIC_FORMAT_PKCS1);

				$sPrivateKey = \file_exists(APP_PRIVATE_DATA.'rsa/private') ?
					\file_get_contents(APP_PRIVATE_DATA.'rsa/private') : '';

				if (!empty($sPrivateKey))
				{
					$oRsa->loadKey($sPrivateKey, CRYPT_RSA_PRIVATE_FORMAT_PKCS1);
					$oRsa->loadKey($oRsa->getPublicKey(), CRYPT_RSA_PUBLIC_FORMAT_PKCS1);

					\RainLoop\Utils::$RSA = $oRsa;
				}
			}
		}

		return \RainLoop\Utils::$RSA;
	}

	/**
	 * @return string
	 */
	static public function RsaPrivateKey()
	{
		if (!empty(\RainLoop\Utils::$RsaKey))
		{
			return \RainLoop\Utils::$RsaKey;
		}

		\RainLoop\Utils::$RsaKey = \file_exists(APP_PRIVATE_DATA.'rsa/private') ?
			\file_get_contents(APP_PRIVATE_DATA.'rsa/private') : '';

		\RainLoop\Utils::$RsaKey = \is_string(\RainLoop\Utils::$RsaKey) ? \RainLoop\Utils::$RsaKey : '';
	}

	/**
	 * @param string $sString
	 * @param string $sKey = ''
	 *
	 * @return string|false
	 */
	static public function EncryptStringRSA($sString, $sKey = '')
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

	/**
	 * @param string $sString
	 * @param string $sKey = ''
	 *
	 * @return string|false
	 */
	static public function DecryptStringRSA($sString, $sKey = '')
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

	/**
	 * @param string $sString
	 * @param string $sKey
	 *
	 * @return string
	 */
	static public function EncryptString($sString, $sKey)
	{
		return \MailSo\Base\Crypt::XxteaEncrypt($sString, $sKey);
	}

	/**
	 * @param string $sEncriptedString
	 * @param string $sKey
	 *
	 * @return string
	 */
	static public function DecryptString($sEncriptedString, $sKey)
	{
		return \MailSo\Base\Crypt::XxteaDecrypt($sEncriptedString, $sKey);
	}

	/**
	 * @param string $sString
	 * @param string $sKey
	 *
	 * @return string
	 */
	static public function EncryptStringQ($sString, $sKey)
	{
//		if (\MailSo\Base\Utils::FunctionExistsAndEnabled('openssl_pkey_get_private'))
//		{
//			return \RainLoop\Utils::EncryptStringRSA($sString,
//				$sKey.'Q'.\RainLoop\Utils::GetShortToken());
//		}

		return \MailSo\Base\Crypt::XxteaEncrypt($sString,
			$sKey.'Q'.\RainLoop\Utils::GetShortToken());
	}

	/**
	 * @param string $sEncriptedString
	 * @param string $sKey
	 *
	 * @return string
	 */
	static public function DecryptStringQ($sEncriptedString, $sKey)
	{
//		if (\MailSo\Base\Utils::FunctionExistsAndEnabled('openssl_pkey_get_private'))
//		{
//			return \RainLoop\Utils::DecryptStringRSA($sEncriptedString,
//				$sKey.'Q'.\RainLoop\Utils::GetShortToken());
//		}

		return \MailSo\Base\Crypt::XxteaDecrypt($sEncriptedString,
			$sKey.'Q'.\RainLoop\Utils::GetShortToken());
	}

	/**
	 * @param array $aValues
	 * @param string $sCustomKey = ''
	 *
	 * @return string
	 */
	static public function EncodeKeyValues(array $aValues, $sCustomKey = '')
	{
		return \MailSo\Base\Utils::UrlSafeBase64Encode(
			\RainLoop\Utils::EncryptString(@\serialize($aValues), \md5(APP_SALT.$sCustomKey)));
	}

	/**
	 * @param string $sEncodedValues
	 * @param string $sCustomKey = ''
	 *
	 * @return array
	 */
	static public function DecodeKeyValues($sEncodedValues, $sCustomKey = '')
	{
		$aResult = @\unserialize(
			\RainLoop\Utils::DecryptString(
				\MailSo\Base\Utils::UrlSafeBase64Decode($sEncodedValues), \md5(APP_SALT.$sCustomKey)));

		return \is_array($aResult) ? $aResult : array();
	}

	/**
	 * @param array $aValues
	 * @param string $sCustomKey = ''
	 *
	 * @return string
	 */
	static public function EncodeKeyValuesQ(array $aValues, $sCustomKey = '')
	{
		return \MailSo\Base\Utils::UrlSafeBase64Encode(
			\RainLoop\Utils::EncryptStringQ(
				@\serialize($aValues), \md5(APP_SALT.$sCustomKey)));
	}

	/**
	 * @param string $sEncodedValues
	 * @param string $sCustomKey = ''
	 *
	 * @return array
	 */
	static public function DecodeKeyValuesQ($sEncodedValues, $sCustomKey = '')
	{
		$aResult = @\unserialize(
			\RainLoop\Utils::DecryptStringQ(
				\MailSo\Base\Utils::UrlSafeBase64Decode($sEncodedValues), \md5(APP_SALT.$sCustomKey)));

		return \is_array($aResult) ? $aResult : array();
	}

	/**
	 * @return string
	 */
	static public function GetConnectionToken()
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

	/**
	 * @return string
	 */
	static public function Fingerprint()
	{
		return \md5(empty($_SERVER['HTTP_USER_AGENT']) ? 'RainLoopFingerprint' : $_SERVER['HTTP_USER_AGENT']);
	}

	/**
	 * @return string
	 */
	static public function GetShortToken()
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

	/**
	 * @return void
	 */
	static public function UpdateConnectionToken()
	{
		$sKey = 'rltoken';

		$sToken = \RainLoop\Utils::GetCookie($sKey, '');
		if (!empty($sToken))
		{
			\RainLoop\Utils::SetCookie($sKey, $sToken, \time() + 60 * 60 * 24 * 30);
		}
	}

	/**
	 * @return string
	 */
	static public function GetCsrfToken()
	{
		return \md5('Csrf'.APP_SALT.self::GetConnectionToken().'Token'.APP_SALT);
	}

	/**
	 * @param string $sPath
	 *
	 * @return string
	 */
	public static function PathMD5($sPath)
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

	/**
	 * @param string $sFileName
	 * @param array $aResultLang
	 *
	 * @return void
	 */
	public static function ReadAndAddLang($sFileName, &$aResultLang)
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

	/**
	 * @param string $sDir
	 * @param string $sType = ''
	 * @return array
	 */
	public static function FolderFiles($sDir, $sType = '')
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

	/**
	 * @param string $sHtml
	 *
	 * @return string
	 */
	public static function ClearHtmlOutput($sHtml)
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

	/**
	 * @param string $sKey
	 * @return bool
	 */
	public static function FastCheck($sKey)
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

	/**
	 * @param array $aList
	 * @param string $sDirName
	 * @param string $sNameSuffix = ''
	 */
	public static function CompileTemplates(&$aList, $sDirName, $sNameSuffix = '')
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
	 * @param string $sName
	 * @param mixed $mDefault = null
	 * @return mixed
	 */
	public static function GetCookie($sName, $mDefault = null)
	{
		if (null === \RainLoop\Utils::$Cookies)
		{
			\RainLoop\Utils::$Cookies = is_array($_COOKIE) ? $_COOKIE : array();
		}

		return isset(\RainLoop\Utils::$Cookies[$sName]) ? \RainLoop\Utils::$Cookies[$sName] : $mDefault;
	}

	public static function SetCookie($sName, $sValue = '', $iExpire = 0, $sPath = null, $sDomain = null, $bSecure = null, $bHttpOnly = true)
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

	public static function ClearCookie($sName)
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

	/**
	 * @return bool
	 */
	public static function IsOwnCloud()
	{
		return isset($_ENV['RAINLOOP_OWNCLOUD']) && $_ENV['RAINLOOP_OWNCLOUD'] &&
			\class_exists('OC');
	}
	/**
	 * @return bool
	 */
	public static function IsOwnCloudLoggedIn()
	{
		return self::IsOwnCloud() && \class_exists('OCP\User') && \OCP\User::isLoggedIn();
	}

	/**
	 * @param string $sV
	 * @param bool $bEncode = false
	 *
	 * @return string
	 */
	public static function UrlEncode($sV, $bEncode = false)
	{
		return $bEncode ? \urlencode($sV) : $sV;
	}

	/**
	 * @return string
	 */
	public static function WebPath()
	{
		$sAppPath = '';
		if (\RainLoop\Utils::IsOwnCloud())
		{
			if (\class_exists('OC_App'))
			{
				$sAppPath = \rtrim(\trim(\OC_App::getAppWebPath('rainloop')), '\\/').'/app/';
			}

			if (empty($sAppPath))
			{
				$sUrl = \MailSo\Base\Http::SingletonInstance()->GetUrl();
				if ($sUrl && \preg_match('/\/index\.php\/apps\/rainloop/', $sUrl))
				{
					$sAppPath = \preg_replace('/\/index\.php\/apps\/rainloop.+$/',
						'/apps/rainloop/app/', $sUrl);
				}
			}
		}

		return $sAppPath;
	}
	/**
	 * @return string
	 */
	public static function WebVersionPath()
	{
		return self::WebPath().'rainloop/v/'.APP_VERSION.'/';
	}

	/**
	 * @return string
	 */
	public static function WebStaticPath()
	{
		return self::WebVersionPath().'static/';
	}

	/**
	 * @param array $aSuggestions
	 *
	 * @return array
	 */
	public static function RemoveSuggestionDuplicates($aSuggestions)
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

	/**
	 * @param string $sFileName
	 * @param bool $bProcessSections = false
	 *
	 * @return array
	 */
	public static function CustomParseIniFile($sFileName, $bProcessSections = false)
	{
//		if (\MailSo\Base\Utils::FunctionExistsAndEnabled('parse_ini_file'))
//		{
//			return @\parse_ini_file($sFileName, !!$bProcessSections);
//		}

		$sData = @\file_get_contents($sFileName);
		return \is_string($sData) ? @\parse_ini_string($sData, !!$bProcessSections) : null;
	}

	public static function CustomBaseConvert($sNumberInput, $sFromBaseInput = '0123456789', $sToBaseInput = '0123456789')
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