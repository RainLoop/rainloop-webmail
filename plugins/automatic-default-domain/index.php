<?php

class AutomaticDefaultDomain extends \RainLoop\Plugins\AbstractPlugin
{
	public function Init()
	{
		$this->addHook('filter.application-config', 'FilterAppConfig');
	}

	/**
	 * @param \RainLoop\Config\Application &$oConfig
	 */
	public function FilterAppConfig(&$oConfig)
	{
		if($oConfig)
		{
			$domain = $this->GetCurrentDomain();
			$oConfig->Set("login", "default_domain", $domain);
		}
	}

	/*
	 * Retrieves the current domain name
	 */
	private function GetCurrentDomain()
	{
  		$domain = $_SERVER['HTTP_HOST'];
  		if (preg_match('/(?P<domain>[a-z0-9][a-z0-9\-]{1,63}\.[a-z\.]{2,6})$/i', $domain, $regs)) {
    			return $regs['domain'];
  		}
  		return false;
	}

}