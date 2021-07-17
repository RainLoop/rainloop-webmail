<?php

namespace OCA\SnappyMail\Util;

use OCP\App\IAppManager;
use OCP\IConfig;
use OCP\ISession;
use OCP\IUserSession;

class SnappyMailHelper {

	private $appManager;
	private $config;
	private $session;
	private $userSession;

	public function __construct(IConfig $config, IUserSession $userSession, IAppManager $appManager, ISession $session) {
		$this->appManager = $appManager;
		$this->config = $config;
		$this->userSession = $userSession;
		$this->session = $session;
	}

	public function registerHooks() {
		$this->userSession->listen('\OC\User', 'postLogin', function($user, $loginName, $password, $isTokenLogin) {
			$this->login($user, $loginName, $password, $isTokenLogin, $this->config, $this->session);
		});

		$this->userSession->listen('\OC\User', 'logout', function() {
			$this->logout($this->appManager, $this->config, $this->session);
		});
	}

	/**
	 * @return string
	 */
	public static function getAppUrl()
	{
		$sRequestUri = \OC::$server->getURLGenerator()->linkToRoute('snappymail.page.appGet');
		if ($sRequestUri)
		{
			return $sRequestUri;
		}

		$sRequestUri = empty($_SERVER['REQUEST_URI']) ? '': trim($_SERVER['REQUEST_URI']);
		$sRequestUri = preg_replace('/index.php\/.+$/', 'index.php/', $sRequestUri);
		$sRequestUri = $sRequestUri.'apps/snappymail/app/';

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
			self::regSnappyMailDataFunction();

			$_ENV['RAINLOOP_INCLUDE_AS_API'] = true;
			include $sPath;

			if (class_exists('\\SnappyMail\\Api'))
			{
				$SsoHash = \SnappyMail\Api::GetUserSsoHash($sEmail, $sPassword);
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

	/**
	 * @return boolean
	 */
	public static function mcryptSupported()
	{
		return function_exists('mcrypt_encrypt') &&
			function_exists('mcrypt_decrypt') &&
			defined('MCRYPT_RIJNDAEL_256') &&
			defined('MCRYPT_MODE_ECB');
	}

	/**
	 * @return string
	 */
	public static function openSslSupportedMethod()
	{
		$method = 'AES-256-CBC';
		return function_exists('openssl_encrypt') &&
			function_exists('openssl_decrypt') &&
			function_exists('openssl_random_pseudo_bytes') &&
			function_exists('openssl_cipher_iv_length') &&
			function_exists('openssl_get_cipher_methods') &&
			defined('OPENSSL_RAW_DATA') && defined('OPENSSL_ZERO_PADDING') &&
			in_array($method, openssl_get_cipher_methods()) ? $method : '';
	}

	/**
	 * @param string $sMethod
	 * @param string $sPassword
	 * @param string $sSalt
	 *
	 * @return string
	 */
	public static function encodePasswordSsl($sMethod, $sPassword, $sSalt)
	{
		$sData = base64_encode($sPassword);

		$iv = @openssl_random_pseudo_bytes(openssl_cipher_iv_length($sMethod));
		$r = @openssl_encrypt($sData, $sMethod, md5($sSalt), OPENSSL_RAW_DATA, $iv);

		return @base64_encode(base64_encode($r).'|'.base64_encode($iv));
	}

	/**
	 * @param string $sMethod
	 * @param string $sPassword
	 * @param string $sSalt
	 *
	 * @return string
	 */
	public static function decodePasswordSsl($sMethod, $sPassword, $sSalt)
	{
		$sLine = base64_decode(trim($sPassword));
		$aParts = explode('|', $sLine, 2);

		if (is_array($aParts) && !empty($aParts[0]) && !empty($aParts[1])) {

			$sData = @base64_decode($aParts[0]);
			$iv = @base64_decode($aParts[1]);

			return @base64_decode(trim(
				@openssl_decrypt($sData, $sMethod, md5($sSalt), OPENSSL_RAW_DATA, $iv)
			));
		}

		return '';
	}

	/**
	 * @param string $sPassword
	 * @param string $sSalt
	 *
	 * @return string
	 */
	public static function encodePassword($sPassword, $sSalt)
	{
		$method = self::openSslSupportedMethod();
		if ($method)
		{
			return self::encodePasswordSsl($method, $sPassword, $sSalt);
		}
		else if (self::mcryptSupported())
		{
			return @trim(base64_encode(
				@mcrypt_encrypt(MCRYPT_RIJNDAEL_256, md5($sSalt), base64_encode($sPassword), MCRYPT_MODE_ECB)
			));
		}

		return @trim(base64_encode($sPassword));
	}

	/**
	 * @param string $sPassword
	 * @param string $sSalt
	 *
	 * @return string
	 */
	public static function decodePassword($sPassword, $sSalt)
	{
		$method = self::openSslSupportedMethod();
		if ($method)
		{
			return self::decodePasswordSsl($method, $sPassword, $sSalt);
		}
		else if (self::mcryptSupported())
		{
			return @base64_decode(trim(
				@mcrypt_decrypt(MCRYPT_RIJNDAEL_256, md5($sSalt), base64_decode(trim($sPassword)), MCRYPT_MODE_ECB)
			));
		}

		return @base64_decode(trim($sPassword));
	}

	/**
	 * @param array $aParams
	 * @return boolean
	 * @UseSession
	 */
	public static function login($user, $loginName, $password, $isTokenLogin, $config, &$session)
	{
		$sUser = $user->getUID();

		$sEmail = $sUser;
		$sPassword = $password;
		$sEncodedPassword = self::encodePassword($sPassword, md5($sEmail));

		// Only store the user's password in the current session if they have
		// enabled auto-login using Nextcloud username or email address.
		if ($config->getAppValue('snappymail', 'snappymail-autologin') || $config->getAppValue('snappymail', 'snappymail-autologin-with-email')) {
			$session['snappymail-autologin-password'] = $sEncodedPassword;
		}
	}

	/**
	 * @UseSession
	 */
	public static function logout($appManager, $config, &$session)
	{
		$session['snappymail-autologin-password'] = '';

		$sApiPath = $appManager->getAppPath('snappymail') . '/app/index.php';

		self::regSnappyMailDataFunction();

		$_ENV['RAINLOOP_INCLUDE_AS_API'] = true;
		include $sApiPath;

		\SnappyMail\Api::LogoutCurrentLogginedUser();

		return true;
	}

	public static function regSnappyMailDataFunction()
	{
		if (!@function_exists('__get_custom_data_full_path'))
		{
			$_ENV['SNAPPYMAIL_NEXTCLOUD'] = true;

			function __get_custom_data_full_path()
			{
				$sData = rtrim(trim(OC::$server->getSystemConfig()->getValue('datadirectory', '')), '\\/').'/';
				return @is_dir($sData) ? $sData.'snappymail-storage' : '';
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

		if (0 < strpos($filename, '.'))
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
