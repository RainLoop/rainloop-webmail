<?php

namespace RainLoop\Providers\TwoFactorAuth;

class GoogleTwoFactorAuth
	extends \RainLoop\Providers\TwoFactorAuth\AbstractTwoFactorAuth
	implements \RainLoop\Providers\TwoFactorAuth\TwoFactorAuthInterface
{
	/**
	 * @param string $sSecret
	 * @param string $sCode
	 *
	 * @return bool
	 */
	public function VerifyCode($sSecret, $sCode)
	{
		$oGoogleAuthenticator = new \PHPGangsta_GoogleAuthenticator();
		return $oGoogleAuthenticator->verifyCode($sSecret, $sCode, 8);
	}

	/**
	 * @return string
	 */
	public function CreateSecret()
	{
		$oGoogleAuthenticator = new \PHPGangsta_GoogleAuthenticator();
		return $oGoogleAuthenticator->createSecret();
	}
}
