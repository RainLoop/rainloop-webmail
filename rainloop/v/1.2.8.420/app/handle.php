<?php

namespace RainLoop;

if (!\defined('RAINLOOP_APP_ROOT_PATH'))
{
	\define('RAINLOOP_APP_LIBRARIES_PATH', \rtrim(\realpath(__DIR__), '\\/').'/libraries/');

	\spl_autoload_register(function ($sClassName) {
		
		if (0 === \strpos($sClassName, 'RainLoop') && false !== \strpos($sClassName, '\\'))
		{
			return include RAINLOOP_APP_LIBRARIES_PATH.'RainLoop/'.\str_replace('\\', '/', \substr($sClassName, 9)).'.php';
		}

		return false;
	});

	if (\class_exists('RainLoop\Service'))
	{
		$oException = null;
		try
		{
			include APP_VERSION_ROOT_PATH.'app/libraries/MailSo/MailSo.php';
		}
		catch (\Exception $oException) {}

		if (!$oException)
		{
			\RainLoop\Service::NewInstance()->Handle();
		}
	}
}