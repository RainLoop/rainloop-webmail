<?php

	define('APP_INDEX_ROOT_PATH', str_replace('\\', '/', rtrim(dirname(__FILE__), '\\/').'/'));

	$sCustomDataPath = '';
	if (file_exists(APP_INDEX_ROOT_PATH.'include.php'))
	{
		include_once APP_INDEX_ROOT_PATH.'include.php';
		$sCustomDataPath = function_exists('__get_custom_data_full_path') ? rtrim(trim(__get_custom_data_full_path()), '\\/') : '';
	}

	define('APP_DATA_FOLDER_PATH', 0 === strlen($sCustomDataPath) ? APP_INDEX_ROOT_PATH.'data/' : $sCustomDataPath.'/');

	$sVersion = @file_get_contents(APP_DATA_FOLDER_PATH.'VERSION');
	if (false !== $sVersion)
	{
		$sVersion = trim(preg_replace('/[\.]+/', '.', preg_replace('/[^a-zA-Z0-9\.\-_]/', '', $sVersion)));
		if (0 < strlen($sVersion) && file_exists(APP_INDEX_ROOT_PATH.'rainloop/v/'.$sVersion.'/index.php'))
		{
			define('APP_VERSION', $sVersion);
			include APP_INDEX_ROOT_PATH.'rainloop/v/'.APP_VERSION.'/index.php';
		}
		else
		{
			echo '[102] Version file content error';
			exit(102);
		}
	}
	else
	{
		echo '[101] Can\'t read version file';
		exit(101);
	}
