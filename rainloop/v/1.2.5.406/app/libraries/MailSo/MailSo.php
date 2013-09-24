<?php

namespace MailSo;

if (!\defined('MAILSO_LIBRARY_ROOT_PATH'))
{
	\define('MAILSO_LIBRARY_ROOT_PATH', \defined('MAILSO_LIBRARY_USE_PHAR')
		? 'phar://mailso.phar/' : \rtrim(\realpath(__DIR__), '\\/').'/');

	\spl_autoload_register(function ($sClassName) {
		return (0 === \strpos($sClassName, 'MailSo') && false !== \strpos($sClassName, '\\')) ?
			include MAILSO_LIBRARY_ROOT_PATH.\str_replace('\\', '/', \substr($sClassName, 7)).'.php' : false;
	});

	if (\class_exists('MailSo\Base\Loader'))
	{
		\MailSo\Base\Loader::Init();
	}
	else
	{
		throw new \Exception('MailSo initialisation error');
	}
}