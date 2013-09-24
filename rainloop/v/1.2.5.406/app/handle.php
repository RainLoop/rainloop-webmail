<?php

namespace RainLoop;

if (!\defined('RAINLOOP_APP_ROOT_PATH'))
{
	\define('RAINLOOP_APP_LIBRARIES_PATH', \rtrim(\realpath(__DIR__), '\\/').'/libraries/');

	\spl_autoload_register(function ($sClassName) {
		
		if (false !== \strpos($sClassName, '\\'))
		{
			foreach (array('RainLoop', 'Buzz', 'KeenIO') as $sName)
			{
				if (0 === \strpos($sClassName, $sName))
				{
					return include RAINLOOP_APP_LIBRARIES_PATH.$sName.'/'.\str_replace('\\', '/', \substr($sClassName, \strlen($sName) + 1)).'.php';
				}
			}
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