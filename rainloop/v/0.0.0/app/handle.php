<?php

if (!\defined('RAINLOOP_APP_LIBRARIES_PATH'))
{
	\define('RAINLOOP_APP_PATH', \rtrim(\realpath(__DIR__), '\\/').'/');
	\define('RAINLOOP_APP_LIBRARIES_PATH', RAINLOOP_APP_PATH.'libraries/');

	\define('RAINLOOP_INCLUDE_AS_API_DEF', isset($_ENV['RAINLOOP_INCLUDE_AS_API']) && $_ENV['RAINLOOP_INCLUDE_AS_API']);

	function rainLoopSplAutoloadNamespaces() : array
	{
		return RAINLOOP_INCLUDE_AS_API_DEF ? array('RainLoop', 'Predis', 'MailSo') :
			array('RainLoop', 'PHPThumb', 'Predis', 'SabreForRainLoop', 'Imagine', 'MailSo');
	}

	/**
	 * @param string $sClassName
	 */
	function rainLoopSplAutoloadRegisterFunction($sClassName) : void
	{
		if ($sClassName && '\\' === $sClassName[0])
		{
			$sClassName = \substr($sClassName, 1);
		}

		foreach (rainLoopSplAutoloadNamespaces() as $sNamespaceName)
		{
			if (0 === \strpos($sClassName, $sNamespaceName.'\\'))
			{
				include RAINLOOP_APP_LIBRARIES_PATH.\strtr($sClassName, '\\', '/').'.php';
				break;
			}
		}
	}

	\spl_autoload_register('rainLoopSplAutoloadRegisterFunction', false);
}

if (\class_exists('RainLoop\Api'))
{
	\MailSo\Base\Loader::Init();

	if (!\function_exists('yaml_parse')) {
		function yaml_parse(string $input) {
			require_once RAINLOOP_APP_LIBRARIES_PATH.'spyc/Spyc.php';
			return \Spyc::YAMLLoadString(\str_replace(array(': >-', ': |-', ': |+'), array(': >', ': |', ': |'), $input));
		}
		function yaml_parse_file(string $filename) {
			return yaml_parse(\file_get_contents($filename));
		}
	}

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
else if (\function_exists('rainLoopSplAutoloadRegisterFunction'))
{
	\spl_autoload_unregister('rainLoopSplAutoloadRegisterFunction');
}
