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
		include_once APP_VERSION_ROOT_PATH.'app/libraries/PHPGangsta/GoogleAuthenticator.php';

		$oGoogleAuthenticator = new \PHPGangsta_GoogleAuthenticator();
		return $oGoogleAuthenticator->verifyCode($sSecret, $sCode, 8);
	}

	/**
	 * @return string
	 */
	public function CreateSecret()
	{
		include_once APP_VERSION_ROOT_PATH.'app/libraries/PHPGangsta/GoogleAuthenticator.php';

		$oGoogleAuthenticator = new \PHPGangsta_GoogleAuthenticator();
		return $oGoogleAuthenticator->createSecret();
	}
}
