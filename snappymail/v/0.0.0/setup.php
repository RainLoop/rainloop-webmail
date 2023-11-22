<?php

require_once __DIR__ . '/app/libraries/snappymail/integrity.php';

$result = \SnappyMail\Integrity::phpVersion();
if ($result) {
	echo '<p style="color: red">[301] ' . $result . '</p>';
	exit(301);
}

$result = \SnappyMail\Integrity::phpExtensions();
if ($result) {
	echo '<p>[302] The following PHP extensions are not available in your PHP configuration!</p>';
	echo '<ul><li>' . \implode('</li>li><li>', $result) . '</li></ul>';
	exit(302);
}

if (defined('APP_VERSION')) {
	$sCheckName = 'delete_if_you_see_it_after_install';
	$sCheckFolder = APP_DATA_FOLDER_PATH.$sCheckName;
	$sCheckFilePath = APP_DATA_FOLDER_PATH.$sCheckName.'/'.$sCheckName.'.file';

	is_file($sCheckFilePath) && unlink($sCheckFilePath);
	is_dir($sCheckFolder) && rmdir($sCheckFolder);

	if (!is_dir(APP_DATA_FOLDER_PATH)) {
		mkdir(APP_DATA_FOLDER_PATH, 0700, true);
	} else {
		chmod(APP_DATA_FOLDER_PATH, 0700);
	}

	$sTest = '';
	switch (true)
	{
		case !is_dir(APP_DATA_FOLDER_PATH):
			$sTest = 'is_dir';
			break;
		case !is_readable(APP_DATA_FOLDER_PATH):
			$sTest = 'is_readable';
			break;
		case !is_writable(APP_DATA_FOLDER_PATH):
			$sTest = 'is_writable';
			break;
		case !mkdir($sCheckFolder, 0700):
			$sTest = 'mkdir';
			break;
		case false === file_put_contents($sCheckFilePath, time()):
			$sTest = 'file_put_contents';
			break;
		case !unlink($sCheckFilePath):
			$sTest = 'unlink';
			break;
		case !rmdir($sCheckFolder):
			$sTest = 'rmdir';
			break;
	}

	if (!empty($sTest))
	{
		echo '[202] Data folder permissions error ['.$sTest.']';
		error_log("Data folder permission error {$sTest}({$sCheckFolder})");
		exit(202);
	}

	unset($sCheckName, $sCheckFilePath, $sCheckFolder, $sTest);

	file_put_contents(APP_DATA_FOLDER_PATH.'INSTALLED', APP_VERSION);
	file_put_contents(APP_DATA_FOLDER_PATH.'index.html', 'Forbidden');
	file_put_contents(APP_DATA_FOLDER_PATH.'index.php', 'Forbidden');
	if (!is_file(APP_DATA_FOLDER_PATH.'.htaccess') && is_file(__DIR__ . '/app/.htaccess')) {
		copy(__DIR__ . '/app/.htaccess', APP_DATA_FOLDER_PATH.'.htaccess');
	}

	if (!is_dir(APP_PRIVATE_DATA)) {
		mkdir(APP_PRIVATE_DATA, 0700, true);
		file_put_contents(APP_PRIVATE_DATA.'.htaccess', 'Require all denied');
	} else if (is_dir(APP_PRIVATE_DATA.'cache')) {
		foreach (new RecursiveIteratorIterator(
			new RecursiveDirectoryIterator(APP_PRIVATE_DATA.'cache', FilesystemIterator::SKIP_DOTS),
			RecursiveIteratorIterator::CHILD_FIRST) as $sName) {
				$sName->isDir() ? rmdir($sName) : unlink($sName);
		}
		clearstatcache();
	}

	foreach (array('configs', 'domains', 'plugins', 'storage') as $sName) {
		if (!is_dir(APP_PRIVATE_DATA.$sName)) {
			mkdir(APP_PRIVATE_DATA.$sName, 0700, true);
		}
	}

	if (!file_exists(APP_PRIVATE_DATA.'domains/disabled') && is_dir(APP_PRIVATE_DATA.'domains')) {
		$aFiles = glob(__DIR__ . '/app/domains/*');
		if ($aFiles) {
			foreach ($aFiles as $sFile) {
				if (is_file($sFile)) {
					$sNewFile = APP_PRIVATE_DATA.'domains/'.basename($sFile);
					if (!file_exists($sNewFile)) {
						copy($sFile, $sNewFile);
					}
				}
			}
		}

		$sName = \SnappyMail\IDN::toAscii(mb_strtolower(gethostname()));
		$sFile = APP_PRIVATE_DATA.'domains/'.$sName.'.json';
		if (!file_exists($sFile) && !file_exists(APP_PRIVATE_DATA.'domains/'.$sName.'.ini')) {
			$config = json_decode(file_get_contents(__DIR__ . '/app/domains/default.json'), true);
			$config['IMAP']['shortLogin'] = true;
			$config['SMTP']['shortLogin'] = true;
			file_put_contents($sFile, json_encode($config, JSON_PRETTY_PRINT));
		}
	}

	if (defined('SNAPPYMAIL_UPDATE_PLUGINS')) {
		// Update plugins
		$asApi = !empty($_ENV['SNAPPYMAIL_INCLUDE_AS_API']);
		$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = true;
		$aList = \SnappyMail\Repository::getEnabledPackagesNames();
		foreach ($aList as $sId) {
			\SnappyMail\Repository::installPackage('plugin', $sId);
		}
		$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = $asApi;
	}

}
