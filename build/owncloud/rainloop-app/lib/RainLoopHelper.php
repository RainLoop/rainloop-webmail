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
			$_ENV['RAINLOOP_INCLUDE_AS_API'] = true;
			include $sPath;

			if (class_exists('\\RainLoop\\Api'))
			{
				$SsoHash = \RainLoop\Api::GetUserSsoHash($sEmail, $sPassword);
			}
		}

		return $SsoHash;
	}

	/**
	 * @param string $sSsoHash
	 *
	 * @return boolean
	 */
	public static function clearUserSsoHash($sSsoHash)
	{
		$result = false;

		$sPath = rtrim(trim($sPath), '\\/').'/index.php';
		if (file_exists($sPath))
		{
			$_ENV['RAINLOOP_INCLUDE_AS_API'] = true;
			include $sPath;

			if (class_exists('\\RainLoop\\Api'))
			{
				$result = \RainLoop\Api::ClearUserSsoHash($sSsoHash);
			}
		}

		return $result;
	}

	/**
	 * @param string $sUrl
	 *
	 * @return string
	 */
	public static function normalizeUrl($sUrl)
	{
		$sUrl = \rtrim(\trim($sUrl), '/\\');
		if ('.php' !== \strtolower(\substr($sUrl, -4)))
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

	public static function login($params)
	{
		$sUser = $params['uid'];
		$sEmail = $sUser;
		$sPassword = $params['password'];

		$sUrl = trim(OCP\Config::getAppValue('rainloop', 'rainloop-url', ''));
		$sPath = trim(OCP\Config::getAppValue('rainloop', 'rainloop-path', ''));

		if ('' !== $sUrl && '' !== $sPath)
		{
			$sPassword = self::encodePassword($sPassword, md5($sEmail));
			return OCP\Config::setUserValue($sUser, 'rainloop', 'rainloop-password', $sPassword);
		}

		return false;
	}

	public static function logout($params)
	{
		$sUser = OCP\User::getUser();
		$sSsoHash = OCP\Config::getUserValue($sUser, 'rainloop', 'rainloop-ssohash', '');

		$a = OCP\Config::setUserValue($sUser, 'rainloop', 'rainloop-password', null);
		$b = OCP\Config::setUserValue($sUser, 'rainloop', 'rainloop-ssohash', null);

		if('' !== $sSsoHash) {
			self::clearUserSsoHash($sSsoHash);
		}

		return $a && $b;
	}

	public static function changePassword($params)
	{
		$sUser = $params['uid'];
		$sEmail = $sUser;
		$sPassword = $params['password'];

		OCP\Util::writeLog('rainloop', 'rainloop|login: Setting new RainLoop password for '. $sEmail, OCP\Util::DEBUG);

		$sUrl = trim(OCP\Config::getAppValue('rainloop', 'rainloop-url', ''));
		$sPath = trim(OCP\Config::getAppValue('rainloop', 'rainloop-path', ''));

		if ('' !== $sUrl && '' !== $sPath)
		{
			$sPassword = self::encodePassword($sPassword, md5($sEmail));
			return OCP\Config::setUserValue($sUser, 'rainloop', 'rainloop-password', $sPassword);
		}

		return false;
	}
}
