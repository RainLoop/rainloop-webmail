<?php

	define('APP_INDEX_ROOT_PATH', rtrim(dirname(__FILE__), '\\/').'/');
	define('APP_INDEX_FILE_NAME', !empty($_SERVER['PHP_SELF']) ? basename($_SERVER['PHP_SELF']) : 'index.php');

	$sCustomDataPath = '';
	if (file_exists(APP_INDEX_ROOT_PATH.'include.php'))
	{
		include_once APP_INDEX_ROOT_PATH.'include.php';
		$sCustomDataPath = function_exists('__get_custom_data_full_path') ? trim(__get_custom_data_full_path()) : '';
	}

	define('APP_DATA_FOLDER_PATH', 0 === strlen($sCustomDataPath) ? APP_INDEX_ROOT_PATH.'data/' : $sCustomDataPath);

	$sVersion = @file_get_contents(APP_DATA_FOLDER_PATH.'VERSION');
	if (false !== $sVersion)
	{
		$sVersion = trim(preg_replace('/[\.]+/', '.', preg_replace('/[^a-zA-Z0-9\.\-_]/', '', $sVersion)));
		if (0 < strlen($sVersion))
		{
			define('APP_VERSION', $sVersion);
			if (file_exists(APP_INDEX_ROOT_PATH.'rainloop/v/'.APP_VERSION.'/index.php'))
			{
				include APP_INDEX_ROOT_PATH.'rainloop/v/'.APP_VERSION.'/index.php';
			}
			else
			{
				echo 'Can\'t find startup file (Error Code: 103)';
				exit(103);
			}
		}
		else
		{
			echo 'Version file content error (Error Code: 102)';
			exit(102);
		}
	}
	else
	{
		echo 'Can\'t read version file (Error Code: 101)';
		exit(101);
	}
