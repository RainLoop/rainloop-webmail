<?php

class NextcloudPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'Nextcloud',
		VERSION = '1.0',
		RELEASE  = '2022-10-10',
		CATEGORY = 'Integrations',
		DESCRIPTION = 'Integrate with Nextcloud',
		REQUIRED = '2.15.2';

	public function Init() : void
	{
		$this->addHook('main.fabrica', 'MainFabrica');
	}

	public function Supported() : string
	{
		return static::IsIntegrated() ? '' : 'Not running inside Nextcloud';
	}

	public static function IsIntegrated()
	{
//		return !empty($_ENV['RAINLOOP_OWNCLOUD']) &&
		return \class_exists('OC') && isset(\OC::$server);
	}

	public static function IsLoggedIn()
	{
		return static::IsIntegrated() && \OC::$server->getUserSession()->isLoggedIn();
	}

	/**
	 * @param mixed $mResult
	 */
	public function MainFabrica(string $sName, &$mResult)
	{
		if ('suggestions' === $sName) {
			if (!\is_array($mResult)) {
				$mResult = array();
			}
			include_once __DIR__ . '/NextcloudContactsSuggestions.php';
			$mResult[] = new NextcloudContactsSuggestions();
		}
	}
}
