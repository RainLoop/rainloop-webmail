<?php

namespace RainLoop\Providers\Login;

interface LoginInterface
{
	/**
	 * @param string $sEmail
	 * @param string $sLogin
	 * @param string $sPassword
	 *
	 * @return bool
	 */
	public function ProvideParameters(&$sEmail, &$sLogin, &$sPassword);
}