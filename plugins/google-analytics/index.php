<?php

class GoogleAnalyticsPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	/**
	 * @return void
	 */
	public function Init()
	{
		if ('' !== $this->Config()->Get('plugin', 'account', ''))
		{
			$this->addJs('js/include.js');
		}
	}
	
	/**
	 * @return array
	 */
	public function configMapping()
	{
		$oAccount = \RainLoop\Plugins\Property::NewInstance('account')->SetLabel('Account')
			->SetAllowedInJs(true)
			->SetDefaultValue('')
		;

		if (\method_exists($oAccount, 'SetPlaceholder'))
		{
			$oAccount->SetPlaceholder('UA-XXXXXXXX-X');
		}
		
		return array($oAccount,
			\RainLoop\Plugins\Property::NewInstance('domain_name')->SetLabel('Domain Name')
				->SetAllowedInJs(true)
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('universal_analytics')->SetLabel('Use Universal Analytics')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetAllowedInJs(true)
				->SetDefaultValue(true),
			\RainLoop\Plugins\Property::NewInstance('track_pageview')->SetLabel('Track Pageview')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetAllowedInJs(true)
				->SetDefaultValue(true),
			\RainLoop\Plugins\Property::NewInstance('send_events')->SetLabel('Send Events')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetAllowedInJs(true)
				->SetDefaultValue(false)
		);
	}
}
