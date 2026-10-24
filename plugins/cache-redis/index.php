<?php

class CacheRedisPlugin extends \RainLoop\Plugins\AbstractPlugin
{
//	use \MailSo\Log\Inherit;

	const
		NAME = 'Cache Redis',
		VERSION = '2.36.2',
		RELEASE = '2024-04-08',
		REQUIRED = '2.36.0',
		CATEGORY = 'Cache',
		DESCRIPTION = 'Cache handler using Redis';

	public function Init() : void
	{
		spl_autoload_register(function($sClassName){
			$file = __DIR__ . DIRECTORY_SEPARATOR . strtr($sClassName, '\\', DIRECTORY_SEPARATOR) . '.php';
			is_file($file) && include_once $file;
		});
		if (\class_exists('Predis\Client')) {
			$this->addHook('main.fabrica', 'MainFabrica');
		}
	}

	public function Supported() : string
	{
		return '';
	}

	public function MainFabrica($sName, &$mResult)
	{
		if ('cache' == $sName) {
			require_once __DIR__ . '/Redis.php';
			$mResult = new \MailSo\Cache\Drivers\Redis(
				$this->Config()->Get('plugin', 'host', '127.0.0.1'),
				(int) $this->Config()->Get('plugin', 'port', 6379)
			);
		}
	}

	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('host')->SetLabel('Host')
				->SetDescription('Hostname of the redis server')
				->SetDefaultValue('127.0.0.1'),
			\RainLoop\Plugins\Property::NewInstance('port')->SetLabel('Port')
				->SetDescription('Port of the redis server')
				->SetDefaultValue(6379)
/*
			,\RainLoop\Plugins\Property::NewInstance('password')->SetLabel('Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
				->SetDefaultValue('')
*/
		);
	}
}
