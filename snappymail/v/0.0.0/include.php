<?php
if (defined('APP_VERSION_ROOT_PATH')) {
	return;
}

// PHP 8
if (PHP_VERSION_ID < 80000) {
	require __DIR__ . '/app/libraries/polyfill/php8.php';
}

if (!extension_loaded('ctype')) {
	require __DIR__ . '/app/libraries/polyfill/ctype.php';
}

if (!defined('APP_VERSION')) {
	define('APP_VERSION', basename(__DIR__));
}
if (!defined('SNAPPYMAIL_DEV')) {
	define('SNAPPYMAIL_DEV', '0.0.0' === APP_VERSION);
}

if (!defined('APP_INDEX_ROOT_PATH')) {
	define('APP_INDEX_ROOT_PATH', dirname(dirname(dirname(__DIR__))) . DIRECTORY_SEPARATOR);
}

// revoke permissions
umask(0077);

ini_set('register_globals', '0');
ini_set('xdebug.max_nesting_level', '500');

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
if (isset($_SERVER['HTTPS']) && !headers_sent()) {
	header('Strict-Transport-Security: max-age=31536000');
}

// cPanel https://github.com/the-djmaze/snappymail/issues/697
if (!empty($_ENV['CPANEL']) && !is_dir(APP_PLUGINS_PATH.'login-remote')) {
	require __DIR__ . '/cpanel.php';
}

if (empty($_ENV['SNAPPYMAIL_INCLUDE_AS_API'])) {
	RainLoop\Service::Handle();
}
