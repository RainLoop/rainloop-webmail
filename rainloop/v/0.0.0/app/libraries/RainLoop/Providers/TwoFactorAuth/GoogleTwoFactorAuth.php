<?php

namespace RainLoop\Providers\TwoFactorAuth;

class GoogleTwoFactorAuth
	extends \RainLoop\Providers\TwoFactorAuth\AbstractTwoFactorAuth
	implements \RainLoop\Providers\TwoFactorAuth\TwoFactorAuthInterface
{

	public function VerifyCode(string $sSecret, string $sCode) : bool
	{
		include_once APP_VERSION_ROOT_PATH.'app/libraries/PHPGangsta/GoogleAuthenticator.php';

		$oGoogleAuthenticator = new \PHPGangsta_GoogleAuthenticator();
		return $oGoogleAuthenticator->verifyCode($sSecret, $sCode, 8);
	}

	public function CreateSecret() : string
	{
		include_once APP_VERSION_ROOT_PATH.'app/libraries/PHPGangsta/GoogleAuthenticator.php';

		$oGoogleAuthenticator = new \PHPGangsta_GoogleAuthenticator();
		return $oGoogleAuthenticator->createSecret();
	}
}
