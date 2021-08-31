<?php

if (!\defined('RAINLOOP_APP_LIBRARIES_PATH'))
{
	\define('RAINLOOP_APP_PATH', \rtrim(\realpath(__DIR__), '\\/').'/');
	\define('RAINLOOP_APP_LIBRARIES_PATH', RAINLOOP_APP_PATH.'libraries/');

	/**
	 * @param string $sClassName
	 */
	function rainLoopSplAutoloadRegisterFunction($sClassName) : void
	{
		/** case-sensitive autoload */
		$file = \strtr($sClassName, '\\', DIRECTORY_SEPARATOR) . '.php';
//		if ($file = \stream_resolve_include_path($file)) {
		if (\is_file(RAINLOOP_APP_LIBRARIES_PATH . $file)) {
			include_once RAINLOOP_APP_LIBRARIES_PATH . $file;
		}
	}

	if (false === \set_include_path(RAINLOOP_APP_LIBRARIES_PATH . PATH_SEPARATOR . \get_include_path())) {
		exit('set_include_path() failed. Probably due to Apache config using php_admin_value instead of php_value');
	}
	\spl_autoload_extensions('.php');
	\spl_autoload_register();
	\spl_autoload_register('rainLoopSplAutoloadRegisterFunction');
}

if (\class_exists('RainLoop\Api'))
{
	if (!empty($_ENV['RAINLOOP_INCLUDE_AS_API']))
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
else if (\function_exists('rainLoopSplAutoloadRegisterFunction'))
{
	\spl_autoload_unregister('rainLoopSplAutoloadRegisterFunction');
}
