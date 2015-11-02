<?php

class CustomAuthExamplePlugin extends \RainLoop\Plugins\AbstractPlugin
{
	public function Init()
	{
		$this->addHook('filter.login-credentials', 'FilterLoginСredentials');
	}

	/**
	 * @param string $sEmail
	 * @param string $sLogin
	 * @param string $sPassword
	 *
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function FilterLoginСredentials(&$sEmail, &$sLogin, &$sPassword)
	{
		// Your custom php logic
		// You may change login credentials
		if ('demo@rainloop.net' === $sEmail)
		{
			$sEmail = 'user@rainloop.net';
			$sLogin = 'user@rainloop.net';
			$sPassword = 'super-puper-password';
		}
		else
		{
			// or throw auth exeption
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
			// or
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AccountNotAllowed);
			// or
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DomainNotAllowed);
		}
	}
}
