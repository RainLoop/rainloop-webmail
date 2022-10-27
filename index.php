<?php

if (!defined('APP_VERSION'))
{
	define('APP_VERSION', '0.0.0');
	define('APP_INDEX_ROOT_PATH', __DIR__ . DIRECTORY_SEPARATOR);
}

if (file_exists(APP_INDEX_ROOT_PATH.'snappymail/v/'.APP_VERSION.'/include.php'))
{
	include APP_INDEX_ROOT_PATH.'snappymail/v/'.APP_VERSION.'/include.php';
}
else
{
	echo '[105] Missing snappymail/v/'.APP_VERSION.'/include.php';
	exit(105);
}
