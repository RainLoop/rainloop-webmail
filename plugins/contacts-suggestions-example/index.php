<?php

class ContactsSuggestionsExamplePlugin extends \RainLoop\Plugins\AbstractPlugin
{
	public function Init() : void
	{
		$this->addHook('main.fabrica', 'MainFabrica');
	}

	/**
	 * @param string $sName
	 * @param mixed $mResult
	 */
	public function MainFabrica($sName, &$mResult)
	{
		switch ($sName)
		{
			case 'suggestions':

				if (!\is_array($mResult))
				{
					$mResult = array();
				}

				include_once __DIR__.'/ContactsExampleSuggestions.php';
				$mResult[] = new ContactsExampleSuggestions();
				break;
		}
	}
}
