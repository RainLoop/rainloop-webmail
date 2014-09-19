<?php

if (!\class_exists('Crypt_RSA'))
{
	\set_include_path(\get_include_path().PATH_SEPARATOR.\dirname(__FILE__).'/../rainloop/v/0.0.0/app/libraries/phpseclib');
	include_once 'Crypt/RSA.php';
	\defined('CRYPT_RSA_MODE') || \define('CRYPT_RSA_MODE', CRYPT_RSA_MODE_INTERNAL);
}

$rsa = new Crypt_RSA();
$key = $rsa->createKey(1024);

var_dump($key);
