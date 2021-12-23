<?php

	if (defined('APP_VERSION'))
	{
		if (version_compare(PHP_VERSION, '7.3.0', '<'))
		{
			echo '<p style="color: red">';
			echo '[301] Your PHP version ('.PHP_VERSION.') is lower than the minimal required 7.3.0!';
			echo '</p>';
			exit(301);
		}

		$aOptional = array(
			'cURL' => extension_loaded('curl'),
			'gd' => extension_loaded('gd'),
			'gmagick' => extension_loaded('gmagick'),
			'imagick' => extension_loaded('imagick'),
			'intl' => function_exists('idn_to_ascii'),
			'ldap' => extension_loaded('ldap'),
			'OpenSSL' => extension_loaded('openssl'),
			'mysql' => extension_loaded('pdo_mysql'),
			'pgsql' => extension_loaded('pdo_pgsql'),
			'Sodium' => extension_loaded('sodium'),
			'sqlite' => extension_loaded('pdo_sqlite'),
			'xxtea' => extension_loaded('xxtea'),
			'zip' => extension_loaded('zip')
		);

		$aRequirements = array(
			'mbstring' => extension_loaded('mbstring'),
			'Zlib' => extension_loaded('zlib'),
			// enabled by default:
			'json' => function_exists('json_decode'),
			'libxml' => function_exists('libxml_use_internal_errors'),
			'dom' => class_exists('DOMDocument')
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
			exit(202);
		}

		unset($sCheckName, $sCheckFilePath, $sCheckFolder, $sTest);
	}
