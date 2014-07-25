<?php

class OC_RainLoop_Helper
{
	/**
	 * @param string $sPath
	 * @param string $sEmail
	 * @param string $sPassword
	 * 
	 * @return string
	 */
	public static function getSsoHash($sPath, $sEmail, $sPassword)
	{
		$SsoHash = '';
		
		$sPath = rtrim(trim($sPath), '\\/').'/index.php';
		if (file_exists($sPath))
		{
			$_ENV['RAINLOOP_INCLUDE_AS_API'] = false;
			include $sPath;
			
			if (class_exists($sPath))
			{
				
				$SsoHash = \RainLoop\Api::GetUserSsoHash($sEmail, $sPassword);
			}
		}
		
		return $SsoHash;
	}
	
	/**
	 * @param string $sUrl
	 *
	 * @return string
	 */
	public static function normalizeUrl($sUrl)
	{
		$sUrl = \rtrim($sUrl, '/\\');
		if ('.php' !== \strtolower(\substr($sUrl), -4))
		{
			$sUrl .= '/';
		}

		return $sUrl;
	}

	public static function encodePassword($sPassword, $sSalt)
	{
		if (function_exists('mcrypt_encrypt') && function_exists('mcrypt_create_iv') && function_exists('mcrypt_get_iv_size') &&
			defined('MCRYPT_RIJNDAEL_256') && defined('MCRYPT_MODE_ECB') && defined('MCRYPT_RAND'))
		{
			return @trim(base64_encode(mcrypt_encrypt(MCRYPT_RIJNDAEL_256, md5($sSalt), $sPassword,
				MCRYPT_MODE_ECB, mcrypt_create_iv(mcrypt_get_iv_size(MCRYPT_RIJNDAEL_256, MCRYPT_MODE_ECB), MCRYPT_RAND))));
		}

		return @trim(base64_encode($sPassword));
	}

	public static function decodePassword($sPassword, $sSalt)
	{
		if (function_exists('mcrypt_encrypt') && function_exists('mcrypt_create_iv') && function_exists('mcrypt_get_iv_size') &&
			defined('MCRYPT_RIJNDAEL_256') && defined('MCRYPT_MODE_ECB') && defined('MCRYPT_RAND'))
		{
			return @mcrypt_decrypt(MCRYPT_RIJNDAEL_256, md5($sSalt), base64_decode(trim($sPassword)),
				MCRYPT_MODE_ECB, mcrypt_create_iv(mcrypt_get_iv_size(MCRYPT_RIJNDAEL_256, MCRYPT_MODE_ECB), MCRYPT_RAND));
		}

		return @base64_decode(trim($sPassword));
	}
}
