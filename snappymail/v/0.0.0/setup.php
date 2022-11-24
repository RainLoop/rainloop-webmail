<?php

if (defined('APP_VERSION'))
{
	if (PHP_VERSION_ID  < 70400)
	{
		echo '<p style="color: red">';
		echo '[301] Your PHP version ('.PHP_VERSION.') is lower than the minimal required 7.4.0!';
		echo '</p>';
		exit(301);
	}

	$aOptional = array(
		'cURL' => extension_loaded('curl'),
		'exif' => extension_loaded('exif'),
		'gd' => extension_loaded('gd'),
		'gnupg' => extension_loaded('gnupg'),
		'gmagick' => extension_loaded('gmagick'),
		'imagick' => extension_loaded('imagick'),
		'iconv' => function_exists('iconv'),
		'intl' => function_exists('idn_to_ascii'),
		'ldap' => extension_loaded('ldap'),
		'OpenSSL' => extension_loaded('openssl'),
		'mysql' => extension_loaded('pdo_mysql'),
		'pgsql' => extension_loaded('pdo_pgsql'),
		'redis' => extension_loaded('redis'),
		'Sodium' => extension_loaded('sodium'),
		'sqlite' => extension_loaded('pdo_sqlite'),
		'tidy' => extension_loaded('tidy'),
		'uuid' => extension_loaded('uuid'),
		'xxtea' => extension_loaded('xxtea'),
		'zip' => extension_loaded('zip'),
		'finfo' => class_exists('finfo')
	);

	$aRequirements = array(
		'mbstring' => extension_loaded('mbstring'),
		'Zlib' => extension_loaded('zlib'),
		// enabled by default:
		'json' => function_exists('json_decode'),
		'libxml' => function_exists('libxml_use_internal_errors'),
		'dom' => class_exists('DOMDocument')
		// https://github.com/the-djmaze/snappymail/issues/392
//		'phar' => class_exists('PharData')
	);

	if (in_array(false, $aRequirements))
	{
		echo '<p>[302] The following PHP extensions are not available in your PHP configuration!</p>';

		echo '<ul>';
		foreach ($aRequirements as $sKey => $bValue)
		{
			if (!$bValue)
			{
				echo '<li>'.$sKey.'</li>';
			}
		}
		echo '</ul>';

		exit(302);
	}

	$sCheckName = 'delete_if_you_see_it_after_install';
	$sCheckFolder = APP_DATA_FOLDER_PATH.$sCheckName;
	$sCheckFilePath = APP_DATA_FOLDER_PATH.$sCheckName.'/'.$sCheckName.'.file';

	is_file($sCheckFilePath) && unlink($sCheckFilePath);
	is_dir($sCheckFolder) && rmdir($sCheckFolder);

	if (!is_dir(APP_DATA_FOLDER_PATH))
	{
		mkdir(APP_DATA_FOLDER_PATH, 0700, true);
	}
	else
	{
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
	if (!is_file(APP_DATA_FOLDER_PATH.'.htaccess') && is_file(__DIR__ . '/app/.htaccess'))
	{
		copy(__DIR__ . '/app/.htaccess', APP_DATA_FOLDER_PATH.'.htaccess');
	}

	if (!is_dir(APP_PRIVATE_DATA))
	{
		mkdir(APP_PRIVATE_DATA, 0700, true);
		file_put_contents(APP_PRIVATE_DATA.'.htaccess', 'Require all denied');
	}
	else if (is_dir(APP_PRIVATE_DATA.'cache'))
	{
		foreach (new RecursiveIteratorIterator(
			new RecursiveDirectoryIterator(APP_PRIVATE_DATA.'cache', FilesystemIterator::SKIP_DOTS),
			RecursiveIteratorIterator::CHILD_FIRST) as $sName) {
				$sName->isDir() ? rmdir($sName) : unlink($sName);
		}
		clearstatcache();
	}

	foreach (array('logs', 'cache', 'configs', 'domains', 'plugins', 'storage') as $sName)
	{
		if (!is_dir(APP_PRIVATE_DATA.$sName))
		{
			mkdir(APP_PRIVATE_DATA.$sName, 0700, true);
		}
	}

	if (!file_exists(APP_PRIVATE_DATA.'domains/disabled') && is_dir(APP_PRIVATE_DATA.'domains'))
	{
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
}
