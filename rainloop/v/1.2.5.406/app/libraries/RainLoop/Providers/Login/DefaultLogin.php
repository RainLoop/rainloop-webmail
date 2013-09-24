<?php

namespace RainLoop\Providers\Login;

class DefaultLogin implements \RainLoop\Providers\Login\LoginInterface
{
	/**
	 * @param string $sEmail
	 * @param string $sLogin
	 * @param string $sPassword
	 *
	 * @return bool
	 */
	public function ProvideParameters(&$sEmail, &$sLogin, &$sPassword)
	{
		return 0 < strlen($sEmail) && 0 < strlen($sLogin) && 0 < strlen($sPassword);
	}
}