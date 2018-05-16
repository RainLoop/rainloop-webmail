<?php

if (!\defined('RAINLOOP_APP_LIBRARIES_PATH'))
{
	\define('RAINLOOP_APP_PATH', \rtrim(\realpath(__DIR__), '\\/').'/');
	\define('RAINLOOP_APP_LIBRARIES_PATH', RAINLOOP_APP_PATH.'libraries/');
	\define('RAINLOOP_APP_VENDOR_PATH', RAINLOOP_APP_PATH.'vendor/');
	\define('RAINLOOP_MB_SUPPORTED', \function_exists('mb_strtoupper'));
	\define('RAINLOOP_INCLUDE_AS_API_DEF', isset($_ENV['RAINLOOP_INCLUDE_AS_API']) && $_ENV['RAINLOOP_INCLUDE_AS_API']);

	if (!defined('RL_BACKWARD_CAPABILITY'))
	{
		\define('RL_BACKWARD_CAPABILITY', true);
		include_once RAINLOOP_APP_LIBRARIES_PATH.'RainLoop/Common/BackwardCapability/Account.php';
	}

	if (!RAINLOOP_MB_SUPPORTED && !defined('RL_MB_FIXED'))
	{
		\define('RL_MB_FIXED', true);
		include_once RAINLOOP_APP_LIBRARIES_PATH.'RainLoop/Common/MbStringFix.php';
	}

	if (!defined('RL_VENDOR_LIBRARY_LOADER'))
	{
		\define('RL_VENDOR_LIBRARY_LOADER', true);
		include_once RAINLOOP_APP_VENDOR_PATH.'autoload.php';
	}

	/**
	 * @param string $sClassName
	 *
	 * @return mixed
	 */
	function rainLoopSplAutoloadRegisterFunction($sClassName)
	{
		if ($sClassName && '\\' === $sClassName[0])
		{
			$sClassName = \substr($sClassName, 1);
		}

		if (0 === \strpos($sClassName, 'RainLoop\\'))
		{
				return include RAINLOOP_APP_LIBRARIES_PATH.\strtr($sClassName, '\\', '/').'.php';
		}

		return false;
	}

	\spl_autoload_register('rainLoopSplAutoloadRegisterFunction', false);
}

if (\class_exists('RainLoop\Api'))
{
	if (!\class_exists('MailSo\Version', false))
	{
		include RAINLOOP_APP_LIBRARIES_PATH.'MailSo/MailSo.php';
	}

	if (\class_exists('MailSo\Version'))
	{
		if (RAINLOOP_INCLUDE_AS_API_DEF)
		{
			if (!\defined('APP_API_STARTED'))
			{
				\define('APP_API_STARTED', true);

				\RainLoop\Api::Handle();
			}
		}
		else if (!\defined('APP_STARTED'))
		{
			\define('APP_STARTED', true);

			\RainLoop\Api::Handle();
			\RainLoop\Service::Handle();

			\RainLoop\Api::ExitOnEnd();
		}
	}
}
else if (\function_exists('rainLoopSplAutoloadRegisterFunction'))
{
	\spl_autoload_unregister('rainLoopSplAutoloadRegisterFunction');
}
