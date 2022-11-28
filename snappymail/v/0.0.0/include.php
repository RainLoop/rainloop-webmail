<?php
if (defined('APP_VERSION_ROOT_PATH')) {
	return;
}

if (function_exists('sys_getloadavg')) {
	$load = sys_getloadavg();
	if ($load && $load[0] > 95) {
		header('HTTP/1.1 503 Service Unavailable');
		header('Retry-After: 120');
		exit('Mailserver too busy. Please try again later.');
	}
	unset($load);
}

// PHP 8
if (!function_exists('str_contains')) {
	function str_contains(string $haystack, string $needle) : bool
	{
		return false !== strpos($haystack, $needle);
	}
}
if (!function_exists('str_starts_with')) {
	function str_starts_with(string $haystack, string $needle) : bool
	{
		return 0 === strncmp($haystack, $needle, strlen($needle));
	}
}
if (!function_exists('str_ends_with')) {
	function str_ends_with(string $haystack, string $needle) : bool
	{
		$length = strlen($needle);
		return $length ? substr($haystack, -$length) === $needle : true;
	}
}

if (!defined('APP_VERSION')) {
	define('APP_VERSION', basename(__DIR__));
}

if (!defined('APP_INDEX_ROOT_PATH')) {
	define('APP_INDEX_ROOT_PATH', dirname(dirname(dirname(__DIR__))) . DIRECTORY_SEPARATOR);
}

// revoke permissions
umask(0077);

ini_set('register_globals', 0);
ini_set('xdebug.max_nesting_level', 500);

define('APP_VERSION_ROOT_PATH', __DIR__ . DIRECTORY_SEPARATOR);

date_default_timezone_set('UTC');

$sCustomDataPath = '';
$sCustomConfiguration = '';

if (is_file(APP_INDEX_ROOT_PATH.'include.php')) {
	include_once APP_INDEX_ROOT_PATH.'include.php';
}

$sPrivateDataFolderInternalName = '';
if (defined('MULTIDOMAIN')) {
	$sPrivateDataFolderInternalName = strtolower(trim(empty($_SERVER['HTTP_HOST']) ? (empty($_SERVER['SERVER_NAME']) ? '' : $_SERVER['SERVER_NAME']) : $_SERVER['HTTP_HOST']));
	$sPrivateDataFolderInternalName = 'www.' === substr($sPrivateDataFolderInternalName, 0, 4) ? substr($sPrivateDataFolderInternalName, 4) : $sPrivateDataFolderInternalName;
	$sPrivateDataFolderInternalName = preg_replace('/^.+@/', '', preg_replace('/(.+\\..+):[\d]+$/', '$1', $sPrivateDataFolderInternalName));
	$sPrivateDataFolderInternalName = in_array($sPrivateDataFolderInternalName, array('', '127.0.0.1', '::1')) ? 'localhost' : $sPrivateDataFolderInternalName;
}
define('APP_PRIVATE_DATA_NAME', $sPrivateDataFolderInternalName ?: '_default_');
unset($sPrivateDataFolderInternalName);

if (!defined('APP_DATA_FOLDER_PATH')) {
	$sCustomDataPath = rtrim(trim(function_exists('__get_custom_data_full_path') ? __get_custom_data_full_path() : $sCustomDataPath), '\\/');
	define('APP_DATA_FOLDER_PATH', strlen($sCustomDataPath) ? $sCustomDataPath.'/' : APP_INDEX_ROOT_PATH.'data/');
}
unset($sCustomDataPath);

if (!defined('APP_CONFIGURATION_NAME')) {
	define('APP_CONFIGURATION_NAME', function_exists('__get_additional_configuration_name')
		? trim(__get_additional_configuration_name()) : $sCustomConfiguration);
}
unset($sCustomConfiguration);

$sData = is_file(APP_DATA_FOLDER_PATH.'DATA.php') ? file_get_contents(APP_DATA_FOLDER_PATH.'DATA.php') : '';
define('APP_PRIVATE_DATA', APP_DATA_FOLDER_PATH.'_data_'.($sData ? md5($sData) : '').'/'.APP_PRIVATE_DATA_NAME.'/');
define('APP_PLUGINS_PATH', APP_PRIVATE_DATA.'plugins/');

ini_set('default_charset', 'UTF-8');
ini_set('internal_encoding', 'UTF-8');
mb_internal_encoding('UTF-8');
mb_language('uni');

if (!defined('SNAPPYMAIL_LIBRARIES_PATH')) {
	define('SNAPPYMAIL_LIBRARIES_PATH', rtrim(realpath(__DIR__), '\\/').'/app/libraries/');

	if (false === set_include_path(SNAPPYMAIL_LIBRARIES_PATH . PATH_SEPARATOR . get_include_path())) {
		exit('set_include_path() failed. Probably due to Apache config using php_admin_value instead of php_value');
	}

	spl_autoload_extensions('.php');
	/** lowercase autoloader */
	spl_autoload_register();
	/** case-sensitive autoloader */
	spl_autoload_register(function($sClassName){
		$file = SNAPPYMAIL_LIBRARIES_PATH . strtr($sClassName, '\\', DIRECTORY_SEPARATOR) . '.php';
//		if ($file = stream_resolve_include_path(strtr($sClassName, '\\', DIRECTORY_SEPARATOR) . '.php')) {
		if (is_file($file)) {
			include_once $file;
		}
	});
}

// installation checking data folder
if (APP_VERSION !== (is_file(APP_DATA_FOLDER_PATH.'INSTALLED') ? file_get_contents(APP_DATA_FOLDER_PATH.'INSTALLED') : '')
 || !is_dir(APP_PRIVATE_DATA))
{
	include __DIR__ . '/setup.php';
}

$sSalt = is_file(APP_DATA_FOLDER_PATH.'SALT.php') ? trim(file_get_contents(APP_DATA_FOLDER_PATH.'SALT.php')) : '';
if (!$sSalt) {
	// random salt
	$sSalt = '<'.'?php //'.bin2hex(random_bytes(48));
	file_put_contents(APP_DATA_FOLDER_PATH.'SALT.php', $sSalt);
}
define('APP_SALT', md5($sSalt.APP_PRIVATE_DATA_NAME.$sSalt));

unset($sSalt, $sData);

if (!isset($_SERVER['HTTP_USER_AGENT'])) {
	$_SERVER['HTTP_USER_AGENT'] = '';
}

if (empty($_SERVER['HTTPS']) || 'off' === $_SERVER['HTTPS']) {
	unset($_SERVER['HTTPS']);
}
if (isset($_SERVER['REQUEST_SCHEME']) && 'https' === $_SERVER['REQUEST_SCHEME']) {
	$_SERVER['HTTPS'] = 'on';
}
if (isset($_SERVER['HTTPS'])) {
	header('Strict-Transport-Security: max-age=31536000');
}

// See https://github.com/kjdev/php-ext-brotli
if (!ini_get('zlib.output_compression') && !ini_get('brotli.output_compression')) {
	if (defined('USE_BROTLI') && is_callable('brotli_compress_add') && false !== stripos($_SERVER['HTTP_ACCEPT_ENCODING'], 'br')) {
		ob_start(function(string $buffer, int $phase){
			static $resource;
			if ($phase & PHP_OUTPUT_HANDLER_START) {
				header('Content-Encoding: br');
				$resource = brotli_compress_init(/*int $quality = 11, int $mode = BROTLI_GENERIC*/);
			}
			return brotli_compress_add($resource, $buffer, ($phase & PHP_OUTPUT_HANDLER_FINAL) ? BROTLI_FINISH : BROTLI_PROCESS);
		});
	} else if (defined('USE_GZIP')) {
		ob_start('ob_gzhandler');
	}
}

// cPanel https://github.com/the-djmaze/snappymail/issues/697
if (!empty($_ENV['CPANEL']) && !is_dir(APP_PLUGINS_PATH.'login-remote')) {
	require __DIR__ . '/cpanel.php';
}

if (class_exists('RainLoop\\Api')) {
	RainLoop\Api::Handle();
	// NextCloud/OwnCloud?
	if (empty($_ENV['SNAPPYMAIL_INCLUDE_AS_API'])) {
		RainLoop\Service::Handle();
		exit(0);
	}
}
