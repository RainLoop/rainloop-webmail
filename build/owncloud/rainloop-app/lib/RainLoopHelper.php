<?php

class OC_RainLoop_Helper
{
	public static function getSsoHash($sUrl, $sSsoKey, $sEmail, $sPassword, $sLogin = '')
	{
		if (!function_exists('curl_init'))
		{
			return '';
		}

		$oCurl = curl_init();
		curl_setopt_array($oCurl, array(
			CURLOPT_URL => $sUrl.'?ExternalSso',
			CURLOPT_HEADER => false,
			CURLOPT_FAILONERROR => true,
			CURLOPT_SSL_VERIFYPEER => false,
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_POST => true,
			CURLOPT_USERAGENT => 'RainLoop SSO User Agent (ownCloud)',
			CURLOPT_POSTFIELDS => http_build_query(array(
				'SsoKey' => $sSsoKey,
				'Email' => $sEmail,
				'Password' => $sPassword,
				'Login' => $sLogin
			), '', '&'),
			CURLOPT_TIMEOUT => 5
		));

		$mResult = curl_exec($oCurl);
		if (is_resource($oCurl))
		{
			curl_close($oCurl);
		}

		return is_string($mResult) ? $mResult : '';
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
