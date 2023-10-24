<?php

use RainLoop\Model\MainAccount;

class ProxyauthLoginExamplePlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Proxy Auth Login Example',
		VERSION  = '2.2',
		RELEASE  = '2023-10-24',
		REQUIRED = '2.23.0',
		CATEGORY = 'General',
		DESCRIPTION = '';

	public function Init() : void
	{
		$this->addHook('login.success', 'EventLoginPostLoginProvide');
	}

	/**
	 * @param string $sLogin
	 * @param string $sPassword
	 */
	public function isValidAccount($sLogin, $sPassword)
	{
		return !empty($sLogin) && !empty($sPassword);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 */
	public function EventLoginPostLoginProvide(MainAccount $oAccount)
	{
		// Verify logic
		if (!$this->isValidAccount($oAccount->IncLogin(), $oAccount->IncPassword())) {
			// throw a Auth Error Exception
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
		}

		$oAccount->SetProxyAuthUser('admin@domain.com');
		$oAccount->SetProxyAuthPassword('secret-admin-password');
	}
}
