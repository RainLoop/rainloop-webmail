<?php

class CustomAuthExamplePlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Custom Auth Example Extension',
		VERSION = '2.1',
		REQUIRED = '2.5.0',
		CATEGORY = 'Login',
		DESCRIPTION = 'Custom auth mechanism example';

	public function Init() : void
	{
		$this->addHook('login.credentials', 'FilterLoginCredentials');
	}

	/**
	 * @param string $sEmail
	 * @param string $sLogin
	 * @param string $sPassword
	 *
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function FilterLoginCredentials(&$sEmail, &$sLogin, &$sPassword)
	{
		// Your custom php logic
		// You may change login credentials
		if ('demo@snappymail.eu' === $sEmail)
		{
			$sEmail = 'user@snappymail.eu';
			$sLogin = 'user@snappymail.eu';
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
