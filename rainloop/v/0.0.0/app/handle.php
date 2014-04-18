<?php

namespace RainLoop;

if (!\defined('RAINLOOP_APP_ROOT_PATH'))
{
	\define('RAINLOOP_APP_LIBRARIES_PATH', \rtrim(\realpath(__DIR__), '\\/').'/libraries/');
	\define('RAINLOOP_MB_SUPPORTED', \function_exists('mb_strtoupper'));

	\spl_autoload_register(function ($sClassName) {
		
		if (0 === \strpos($sClassName, 'RainLoop') && false !== \strpos($sClassName, '\\'))
		{
			return include RAINLOOP_APP_LIBRARIES_PATH.'RainLoop/'.\str_replace('\\', '/', \substr($sClassName, 9)).'.php';
		}
		else if (0 === \strpos($sClassName, 'Sabre') && false !== \strpos($sClassName, '\\'))
		{
			if (!RAINLOOP_MB_SUPPORTED && !defined('RL_MB_FIXED'))
			{
				\define('RL_MB_FIXED', true);
				include_once RAINLOOP_APP_LIBRARIES_PATH.'RainLoop/SabreDAV/MbStringFix.php';
			}
			
			return include RAINLOOP_APP_LIBRARIES_PATH.'Sabre/'.\str_replace('\\', '/', \substr($sClassName, 6)).'.php';
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
			if (defined('RAINLOOP_INCLUDE_AS_API') && RAINLOOP_INCLUDE_AS_API)
			{
				\RainLoop\Api::Handle();
			}
			else
			{
				\RainLoop\Service::NewInstance()->Handle();
			}
		}
	}
}