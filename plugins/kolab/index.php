<?php

class KolabPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'Kolab',
		VERSION = '0.1',
		RELEASE  = '2022-05-13',
		CATEGORY = 'Security',
		DESCRIPTION = 'Get contacts suggestions from Kolab.',
		REQUIRED = '2.15.2';

	public function Init() : void
	{
		$this->addHook('main.fabrica', 'MainFabrica');
	}

	public function Supported() : string
	{
		return '';
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
//			$sFolder = \trim($this->Config()->Get('plugin', 'mailbox', ''));
//			if ($sFolder) {
				include_once __DIR__ . '/KolabContactsSuggestions.php';
				$mResult[] = new KolabContactsSuggestions();
//			}
		}
	}
}
