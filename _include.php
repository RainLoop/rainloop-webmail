<?php

// Name this file as "include.php" to enable it.

//header('Strict-Transport-Security: max-age=31536000');

/**
 * Uncomment to use gzip compressed output
 */
//define('USE_GZIP', 1);

/**
 * Uncomment to use brotli compressed output
 */
//define('USE_BROTLI', 1);

/**
 * Uncomment to enable multiple domain installation.
 */
//define('MULTIDOMAIN', 1);

/**
 * Uncomment to disable APCU.
 */
//define('APP_USE_APCU_CACHE', false);

/**
 * Custom 'data' folder path
 */
//define('APP_DATA_FOLDER_PATH', dirname(__DIR__) . '/snappymail-data/');
//define('APP_DATA_FOLDER_PATH', '/var/external-snappymail-data-folder/');
if (isset($_ENV['CPANEL']) && isset($_ENV['TMPDIR'])) {
	define('APP_DATA_FOLDER_PATH', $_ENV['TMPDIR'] . '/snappymail/');
/*
	$_ENV['USER'] => <username>
	$_ENV['HOME'] => /home/<username>
	$_ENV['TMPDIR'] => /home/<username>/tmp
	$_ENV['REAL_DBOWNER'] => <username>
*/
}

/**
 * Additional configuration file name
 */
//define('APP_CONFIGURATION_NAME', $_SERVER['HTTP_HOST'].'.ini');
