<?php

class OC_RainLoop_Helper
{
	/**
	 * @return string
	 */
	public static function getAppUrl()
	{
		if (class_exists('\\OCP\\Util'))
		{
			return OCP\Util::linkToRoute('rainloop_app');
		}

		$sRequestUri = empty($_SERVER['REQUEST_URI']) ? '': trim($_SERVER['REQUEST_URI']);
		$sRequestUri = preg_replace('/index.php\/.+$/', 'index.php/', $sRequestUri);
		$sRequestUri = $sRequestUri.'apps/rainloop/app/';

		return '/'.ltrim($sRequestUri, '/\\');
	}

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
			self::regRainLoopDataFunction();

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
	 * @param string $sUrl
	 *
	 * @return string
	 */
	public static function normalizeUrl($sUrl)
	{
		$sUrl = rtrim(trim($sUrl), '/\\');
		if ('.php' !== strtolower(substr($sUrl, -4)))
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
			return @trim(base64_encode(mcrypt_encrypt(MCRYPT_RIJNDAEL_256, md5($sSalt), base64_encode($sPassword),
				MCRYPT_MODE_ECB, mcrypt_create_iv(mcrypt_get_iv_size(MCRYPT_RIJNDAEL_256, MCRYPT_MODE_ECB), MCRYPT_RAND))));
		}

		return @trim(base64_encode($sPassword));
	}

	public static function decodePassword($sPassword, $sSalt)
	{
		if (function_exists('mcrypt_encrypt') && function_exists('mcrypt_create_iv') && function_exists('mcrypt_get_iv_size') &&
			defined('MCRYPT_RIJNDAEL_256') && defined('MCRYPT_MODE_ECB') && defined('MCRYPT_RAND'))
		{
			return @base64_decode(trim(@mcrypt_decrypt(MCRYPT_RIJNDAEL_256, md5($sSalt), base64_decode(trim($sPassword)),
				MCRYPT_MODE_ECB, mcrypt_create_iv(mcrypt_get_iv_size(MCRYPT_RIJNDAEL_256, MCRYPT_MODE_ECB), MCRYPT_RAND))));
		}

		return @base64_decode(trim($sPassword));
	}

	/**
	 * @param array $aParams
	 *
	 * @return boolean
	 */
	public static function login($aParams)
	{
		if (isset($aParams['uid'], $aParams['password']))
		{
			$sUser = $aParams['uid'];

			$sEmail = $sUser;
			$sPassword = $aParams['password'];

			return OCP\Config::setUserValue($sUser, 'rainloop', 'rainloop-autologin-password',
				self::encodePassword($sPassword, md5($sEmail)));
		}

		return false;
	}

	public static function logout()
	{
		OCP\Config::setUserValue(
			OCP\User::getUser(), 'rainloop', 'rainloop-autologin-password', '');

		$sApiPath = __DIR__.'/../app/index.php';
		if (file_exists($sApiPath))
		{
			self::regRainLoopDataFunction();

			$_ENV['RAINLOOP_INCLUDE_AS_API'] = true;
			include $sApiPath;

			if (class_exists('\\RainLoop\\Api'))
			{
				\RainLoop\Api::LogoutCurrentLogginedUser();
			}
		}

		return true;
	}

	public static function changePassword($aParams)
	{
		if (isset($aParams['uid'], $aParams['password']))
		{
			$sUser = $aParams['uid'];

			$sEmail = $sUser;
			$sPassword = $aParams['password'];

			OCP\Util::writeLog('rainloop', 'rainloop|login: Setting new RainLoop password for '.$sEmail, OCP\Util::DEBUG);

			OCP\Config::setUserValue($sUser, 'rainloop', 'rainloop-autologin-password',
				self::encodePassword($sPassword, md5($sEmail)));

			OCP\Config::setUserValue($sUser, 'rainloop', 'rainloop-password',
				self::encodePassword($sPassword, md5($sEmail)));

			return true;
		}

		return false;
	}

	public static function regRainLoopDataFunction()
	{
		if (!@function_exists('__get_custom_data_full_path'))
		{
			$_ENV['RAINLOOP_OWNCLOUD'] = true;

			function __get_custom_data_full_path()
			{
				$sData = __DIR__.'/../../data/';
				if (class_exists('OC_Config'))
				{
					$sData = rtrim(trim(OC_Config::getValue('datadirectory', '')), '\\/').'/';
				}
				else if (class_exists('OC'))
				{
					$sData = rtrim(trim(OC::$server->getSystemConfig()->getValue('datadirectory', '')), '\\/').'/';
				}

				return @is_dir($sData) ? $sData.'rainloop-storage' : '';
			}
		}
	}

	public static function mimeContentType($filename) {

        $mime_types = array(

            'woff' => 'application/font-woff',

            'txt' => 'text/plain',
            'htm' => 'text/html',
            'html' => 'text/html',
            'php' => 'text/html',
            'css' => 'text/css',
            'js' => 'application/javascript',
            'json' => 'application/json',
            'xml' => 'application/xml',
            'swf' => 'application/x-shockwave-flash',
            'flv' => 'video/x-flv',

            // images
            'png' => 'image/png',
            'jpe' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'jpg' => 'image/jpeg',
            'gif' => 'image/gif',
            'bmp' => 'image/bmp',
            'ico' => 'image/vnd.microsoft.icon',
            'tiff' => 'image/tiff',
            'tif' => 'image/tiff',
            'svg' => 'image/svg+xml',
            'svgz' => 'image/svg+xml',

            // archives
            'zip' => 'application/zip',
            'rar' => 'application/x-rar-compressed',
            'exe' => 'application/x-msdownload',
            'msi' => 'application/x-msdownload',
            'cab' => 'application/vnd.ms-cab-compressed',

            // audio/video
            'mp3' => 'audio/mpeg',
            'qt' => 'video/quicktime',
            'mov' => 'video/quicktime',

            // adobe
            'pdf' => 'application/pdf',
            'psd' => 'image/vnd.adobe.photoshop',
            'ai' => 'application/postscript',
            'eps' => 'application/postscript',
            'ps' => 'application/postscript',

            // ms office
            'doc' => 'application/msword',
            'rtf' => 'application/rtf',
            'xls' => 'application/vnd.ms-excel',
            'ppt' => 'application/vnd.ms-powerpoint',

            // open office
            'odt' => 'application/vnd.oasis.opendocument.text',
            'ods' => 'application/vnd.oasis.opendocument.spreadsheet',
        );

		if (0 <  strpos($filename, '.'))
		{
			$ext = strtolower(array_pop(explode('.',$filename)));
			if (array_key_exists($ext, $mime_types))
			{
				return $mime_types[$ext];
			}
			else if (function_exists('finfo_open'))
			{
				$finfo = finfo_open(FILEINFO_MIME);
				$mimetype = finfo_file($finfo, $filename);
				finfo_close($finfo);
				return $mimetype;
			}
		}

		return 'application/octet-stream';
    }
}
