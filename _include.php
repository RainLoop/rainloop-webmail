<?php

// Name this file as "include.php" to enable it.

//header('Strict-Transport-Security: max-age=31536000');

// Uncomment to use gzip compressed output
//define('USE_GZIP', 1);

// Uncomment to use brotli compressed output
//define('USE_BROTLI', 1);

// Uncomment to enable multiple domain installation.
//define('MULTIDOMAIN', 1);

// Uncomment to disable APCU.
//define('APP_USE_APCU_CACHE', false);

/**
 * Custom 'data' folder path
 * @return string
 */
function __get_custom_data_full_path()
{
	return '';
	return dirname(__DIR__) . '/snappymail-data';
	return '/var/external-snappymail-data-folder';
}

/**
 * Additional configuration file name
 * @return string
 */
function __get_additional_configuration_name()
{
	return '';
	return defined('APP_SITE') && 0 < strlen(APP_SITE) ? APP_SITE.'.ini' : '';
}
