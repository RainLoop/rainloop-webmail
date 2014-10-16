<?php

class ProxyauthLoginExamplePlugin extends \RainLoop\Plugins\AbstractPlugin
{
	public function Init()
	{
		$this->addHook('event.login-post-login-provide', 'EventLoginPostLoginProvide');
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 */
	public function EventLoginPostLoginProvide(&$oAccount)
	{
		if ($oAccount instanceof \RainLoop\Account)
		{
			// Verify logic
			$bValid = isValidAccount($oAccount->Login(), $oAccount->Password());

			/**
			 * $oAccount->Email();			// Email (It is not a IMAP login)
			 * $oAccount->Login();			// IMAP login
			 * $oAccount->Password();		// IMAP password
			 * $oAccount->DomainIncHost();  // IMAP host
			 *
			 * @see \RainLoo\Account for more
			 */

			if ($bValid) // if verify failed
			{
				// throw a Auth Error Exception
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
			}
			else // Or setup your proxyauth admin account credentials
			{
				$oAccount->SetProxyAuthUser('admin@domain.com');
				$oAccount->SetProxyAuthPassword('secret-admin-password');
			}
		}
	}
}
