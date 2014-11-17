<?php

if (!\defined('RAINLOOP_APP_LIBRARIES_PATH'))
{
	\define('RAINLOOP_APP_PATH', \rtrim(\realpath(__DIR__), '\\/').'/');
	\define('RAINLOOP_APP_LIBRARIES_PATH', RAINLOOP_APP_PATH.'libraries/');
	\define('RAINLOOP_MB_SUPPORTED', \function_exists('mb_strtoupper'));

	\define('RAINLOOP_INCLUDE_AS_API_DEF', isset($_ENV['RAINLOOP_INCLUDE_AS_API']) && $_ENV['RAINLOOP_INCLUDE_AS_API']);

	if (!defined('RL_BACKWARD_CAPABILITY'))
	{
		\define('RL_BACKWARD_CAPABILITY', true);
		include_once RAINLOOP_APP_PATH.'src/RainLoop/Common/BackwardCapability/Account.php';
	}

	/**
	 * @param string $sClassName
	 *
	 * @return mixed
	 */
	function RainLoopSplAutoloadRegisterFunction($sClassName)
	{
		if (0 === \strpos($sClassName, 'RainLoop') && false !== \strpos($sClassName, '\\'))
		{
			return include RAINLOOP_APP_PATH.'src/RainLoop/'.\str_replace('\\', '/', \substr($sClassName, 9)).'.php';
		}
		else if (!RAINLOOP_INCLUDE_AS_API_DEF)
		{
			if (0 === \strpos($sClassName, 'Facebook') && false !== \strpos($sClassName, '\\'))
			{
				return include RAINLOOP_APP_LIBRARIES_PATH.'Facebook/'.\str_replace('\\', '/', \substr($sClassName, 9)).'.php';
			}
			else if (0 === \strpos($sClassName, 'GuzzleHttp') && false !== \strpos($sClassName, '\\'))
			{
				return include RAINLOOP_APP_LIBRARIES_PATH.'GuzzleHttp/'.\str_replace('\\', '/', \substr($sClassName, 11)).'.php';
			}
			else if (0 === \strpos($sClassName, 'Sabre') && false !== \strpos($sClassName, '\\'))
			{
				if (!RAINLOOP_MB_SUPPORTED && !defined('RL_MB_FIXED'))
				{
					\define('RL_MB_FIXED', true);
					include_once RAINLOOP_APP_PATH.'src/RainLoop/Common/MbStringFix.php';
				}

				return include RAINLOOP_APP_LIBRARIES_PATH.'Sabre/'.\str_replace('\\', '/', \substr($sClassName, 6)).'.php';
			}
		}

		return false;
	}

	\spl_autoload_register('RainLoopSplAutoloadRegisterFunction', false);
}

if (\class_exists('RainLoop\Service'))
{
	if (!\class_exists('MailSo\Version'))
	{
		include APP_VERSION_ROOT_PATH.'app/libraries/MailSo/MailSo.php';
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
else if (\function_exists('RainLoopSplAutoloadRegisterFunction'))
{
	\spl_autoload_unregister('RainLoopSplAutoloadRegisterFunction');
}
