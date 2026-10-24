<?php

class CacheAPCuPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'Cache APCu',
		VERSION = '2.36',
		RELEASE = '2024-03-22',
		REQUIRED = '2.36.0',
		CATEGORY = 'Cache',
		DESCRIPTION = 'Cache handler using PHP APCu';

	public function Init() : void
	{
		if (\MailSo\Base\Utils::FunctionsCallable(array('apcu_store', 'apcu_fetch', 'apcu_delete', 'apcu_clear_cache'))) {
			$this->addHook('main.fabrica', 'MainFabrica');
		}
	}

	public function Supported() : string
	{
		return \MailSo\Base\Utils::FunctionsCallable(array('apcu_store', 'apcu_fetch', 'apcu_delete', 'apcu_clear_cache'))
			? ''
			: 'PHP APCu not installed';
	}

	public function MainFabrica($sName, &$mResult)
	{
		if ('cache' == $sName) {
			require_once __DIR__ . '/APCU.php';
			$mResult = new \MailSo\Cache\Drivers\APCU;
		}
	}
}
