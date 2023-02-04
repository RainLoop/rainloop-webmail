#!/usr/bin/php
<?php
/**
 * Alternative to cyberpanel/install/install.py
 * https://github.com/usmannasir/cyberpanel/blob/f7e4f5d91cb2b40473ae6ceb4ca473493ab3bb0c/install/install.py#L1255
 */
define('SNAPPYMAIL_PUBLIC_DIR', '/usr/local/CyberCP/public/snappymail');

if (PHP_SAPI !== 'cli' && false === stripos(php_sapi_name(), 'cli')) {
	exit('not cli');
}

chdir(SNAPPYMAIL_PUBLIC_DIR);

spl_autoload_register(function($sClassName){
	$file = SNAPPYMAIL_LIBRARIES_PATH . strtolower(strtr($sClassName, '\\', DIRECTORY_SEPARATOR)) . '.php';
	if (is_file($file)) {
		include_once $file;
	}
});

file_put_contents(
	SNAPPYMAIL_PUBLIC_DIR . '/include.php',
	str_replace(
		'//define(\'APP_DATA_FOLDER_PATH\', dirname(__DIR__) . \'/snappymail-data/\')',
		'define(\'APP_DATA_FOLDER_PATH\', \'/usr/local/lscp/cyberpanel/rainloop/data/\')',
		file_get_contents(SNAPPYMAIL_PUBLIC_DIR . '/_include.php')
	)
);

$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = true;
require_once SNAPPYMAIL_PUBLIC_DIR . '/index.php';

$oConfig = RainLoop\Api::Config();

// https://github.com/usmannasir/cyberpanel/blob/f7e4f5d91cb2b40473ae6ceb4ca473493ab3bb0c/install/install.py#L1342
$oConfig->Set('ssl', 'verify_certificate', false);

// https://github.com/usmannasir/cyberpanel/blob/f7e4f5d91cb2b40473ae6ceb4ca473493ab3bb0c/install/install.py#L1354
$oConfig->Set('plugins', 'enable', true);

/**
 * Install mailbox-detect extension
 */
SnappyMail\Repository::installPackage('plugin', 'mailbox-detect');
/**
 * Enable mailbox-detect autocreate_system_folders
 * https://github.com/usmannasir/cyberpanel/blob/f7e4f5d91cb2b40473ae6ceb4ca473493ab3bb0c/install/install.py#L1363
 */
$oPlugin = RainLoop\Api::Actions()->Plugins()->CreatePluginByName('mailbox-detect');
if ($oPlugin) {
	$oPluginConfig = $oPlugin->Config();
	$oPluginConfig->Set('plugin', 'autocreate_system_folders', true);
	$oPluginConfig->Save();
}

/**
 * Enable mailbox-detect extension
 * https://github.com/usmannasir/cyberpanel/blob/f7e4f5d91cb2b40473ae6ceb4ca473493ab3bb0c/install/install.py#L1363
 */
$aList = SnappyMail\Repository::getEnabledPackagesNames();
$aList[] = 'mailbox-detect';
$oConfig->Set('plugins', 'enabled_list', implode(',', array_unique($aList)));

$oConfig->Save();
