<?php

// Name this file as "include.php" to enable it.

//header('Strict-Transport-Security: max-age=31536000');

// Uncomment to use gzip encoded output
//define('USE_GZIP', 1);

// Uncomment to enable multiple domain installation.
//define('MULTIDOMAIN', 1);

/**
 * @return string
 */
function __get_custom_data_full_path()
{
	return '';
	return dirname(__DIR__) . '/rainloop-data';
	return '/var/external-rainloop-data-folder'; // custom data folder path
}

/**
 * @return string
 */
function __get_additional_configuration_name()
{
	return '';
	return defined('APP_SITE') && 0 < strlen(APP_SITE) ? APP_SITE.'.ini' : ''; // additional configuration file name
}

