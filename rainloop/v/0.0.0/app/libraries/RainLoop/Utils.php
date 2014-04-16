<?php

namespace RainLoop;

class Utils
{
	static $Cookies = null;
	
	/**
	 * @return void
	 */
	private function __construct()
	{
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
	 * @param array $aValues
	 * @param string $sCustomKey = ''
	 *
	 * @return string
	 */
	static public function EncodeKeyValues(array $aValues, $sCustomKey = '')
	{
		return \MailSo\Base\Utils::UrlSafeBase64Encode(
			\RainLoop\Utils::EncryptString(\serialize($aValues), \md5(APP_SALT.$sCustomKey)));
	}

	/**
	 * @param string $sEncodedValues
	 * @param string $sCustomKey = ''
	 *
	 * @return array
	 */
	static public function DecodeKeyValues($sEncodedValues, $sCustomKey = '')
	{
		$aResult = \unserialize(
			\RainLoop\Utils::DecryptString(
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
			$sToken = \md5(\rand(10000, 99999).\microtime(true).APP_SALT);
			\RainLoop\Utils::SetCookie($sKey, $sToken, \time() + 60 * 60 * 24 * 30, '/', null, null, true);
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
			$sToken = \md5(\rand(10000, 99999).\microtime(true).APP_SALT);
			\RainLoop\Utils::SetCookie($sKey, $sToken, 0, '/', null, null, true);
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
			\RainLoop\Utils::SetCookie($sKey, $sToken, \time() + 60 * 60 * 24 * 30, '/', null, null, true);
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
	 * @param string $FileName
	 * @param array $aResultLang
	 *
	 * @return void
	 */
	public static function ReadAndAddLang($FileName, &$aResultLang)
	{
		if (\file_exists($FileName))
		{
			$aLang = @\parse_ini_file($FileName, true);
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
		return \str_replace('> <', '><',
			\preg_replace('/[\s]+&nbsp;/i', '&nbsp;',
			\preg_replace('/&nbsp;[\s]+/i', '&nbsp;',
			\preg_replace('/[\r\n\t]+/', ' ',
			$sHtml
		))));
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
	 * @param string $sDirName
	 *
	 * @return string
	 */
	public static function CompileTemplates($sDirName, $oAction)
	{
		$sResult = '';
		if (\file_exists($sDirName))
		{
			$aList = \RainLoop\Utils::FolderFiles($sDirName, '.html');

			foreach ($aList as $sName)
			{
				$sTemplateName = \substr($sName, 0, -5);
				$sResult .= '<script id="'.\preg_replace('/[^a-zA-Z0-9]/', '', $sTemplateName).'" type="text/html">'.
					$oAction->ProcessTemplate($sTemplateName, \file_get_contents($sDirName.'/'.$sName)).'</script>';
			}

			$sResult = \trim($sResult);
		}

		return $sResult;
	}

	/**
	 * @param string $sName
	 * @param mixed $mDefault = null
	 * @return mixed
	 */
	public static function GetCookie($sName, $mDefault = null)
	{
		if (null === self::$Cookies)
		{
			self::$Cookies = is_array($_COOKIE) ? $_COOKIE : array();
		}

		return isset(self::$Cookies[$sName]) ? self::$Cookies[$sName] : $mDefault;
	}

	public static function SetCookie($sName, $sValue = '', $iExpire = 0, $sPath = '/', $sDomain = '', $sSecure = false, $bHttpOnly = false)
	{
		if (null === self::$Cookies)
		{
			self::$Cookies = is_array($_COOKIE) ? $_COOKIE : array();
		}

		self::$Cookies[$sName] = $sValue;
		@\setcookie($sName, $sValue, $iExpire, $sPath, $sDomain, $sSecure, $bHttpOnly);
	}

	public static function ClearCookie($sName)
	{
		if (null === self::$Cookies)
		{
			self::$Cookies = is_array($_COOKIE) ? $_COOKIE : array();
		}

		unset(self::$Cookies[$sName]);
		@\setcookie($sName, '', \time() - 3600 * 24 * 30, '/');
	}

	/**
	 * @return array
	 */
	public static function ServicesPics()
	{
		return array(
			'ebay.com'				=> 'ebay.jpg',
			'reply.ebay.com'		=> 'ebay.jpg',
			'reply1.ebay.com'		=> 'ebay.jpg',
			'reply2.ebay.com'		=> 'ebay.jpg',
			'reply3.ebay.com'		=> 'ebay.jpg',

			'facebook.com'			=> 'facebook.png',
			'facebookmail.com'		=> 'facebook.png',

			'cnet.online.com'			=> 'cnet.jpg',
			'github.com'			=> 'github.png',
			'steampowered.com'		=> 'steam.png',
			'myspace.com'			=> 'myspace.png',
			'new.myspace.com'		=> 'myspace.png',
			'youtube.com'			=> 'youtube.gif',
			'amazon.com'			=> 'amazon.png',
			'ted.com'				=> 'ted.png',
			'icloud.com'			=> 'icloud.jpg',
			'google.com'			=> 'google.png',
			'plus.google.com'		=> 'google-plus.png',

			'email.microsoft.com'	=> 'microsoft.jpg',
			'microsoftonline.com'	=> 'microsoft.jpg',
			'microsoft.com'			=> 'microsoft.jpg',

			'paypal.com'			=> 'paypal.jpg',
			'intl.paypal.com'		=> 'paypal.jpg',
			'e.paypal.com'			=> 'paypal.jpg',

			'ea.com'					=> 'ea.png',
			'em.ea.com'					=> 'ea.png',
			'battlefieldheroes.com'		=> 'ea.png',

			'battle.net'				=> 'battle.net.png',
			'blizzard.com'				=> 'battle.net.png',
			'email.blizzard.com'		=> 'battle.net.png',
			'battlefieldheroes.com'		=> 'battle.net.png',

			'twitter.com'				=> 'twitter.jpg',
			'postmaster.twitter.com'	=> 'twitter.jpg',

			'skype.com'			=> 'skype.png',
			'email.skype.com'	=> 'skype.png',

			'apple.com'			=> 'apple.jpg',
			'id.apple.com'		=> 'apple.jpg',

			'onlive.com'		=> 'onlive.png',
			'news.onlive.com'	=> 'onlive.png',

			'asana.com'			=> 'asana.png',
			'connect.asana.com'	=> 'asana.png',
		);
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