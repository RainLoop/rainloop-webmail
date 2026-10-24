<?php
//$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = true;
//require '../index.php';

define('SNAPPYMAIL_LIBRARIES_PATH', dirname(__DIR__) . '/snappymail/v/0.0.0/app/libraries');
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

$LOGIN = new \SnappyMail\SASL\Login;
$LOGIN->base64 = true;
var_dump($LOGIN->authenticate('john', 'doe', 'VXNlcm5hbWU6'));
var_dump($LOGIN->authenticate('john', 'doe', 'VXNlcm5hbWU6CG'));
var_dump($LOGIN->authenticate('john', 'doe', 'UGFzc3dvcmQ6'));
