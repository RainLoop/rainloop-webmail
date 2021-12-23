<?php

if (!defined('APP_VERSION'))
{
	define('APP_VERSION', '0.0.0');
	define('APP_INDEX_ROOT_PATH', __DIR__ . DIRECTORY_SEPARATOR);
}

if (file_exists('snappymail/v/'.APP_VERSION.'/include.php'))
{
	include 'snappymail/v/'.APP_VERSION.'/include.php';
}
else
{
	echo '[105] Missing version directory';
	exit(105);
}
