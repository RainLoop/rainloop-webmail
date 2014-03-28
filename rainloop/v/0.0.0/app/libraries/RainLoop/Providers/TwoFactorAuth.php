<?php

namespace RainLoop\Providers;

class TwoFactorAuth extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\TwoFactorAuth\TwoFactorAuthInterface
	 */
	private $oDriver;

	/**
	 * @param \RainLoop\Providers\TwoFactorAuth\TwoFactorAuthInterface|null $oDriver = null
	 *
	 * @return void
	 */
	public function __construct($oDriver = null)
	{
		$this->oDriver = $oDriver;
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\TwoFactorAuth\TwoFactorAuthInterface;
	}

	/**
	 * @param string $sSecret
	 * @param string $sCode
	 * @return bool
	 */
	public function VerifyCode($sSecret, $sCode)
	{
		$bResult = false;
		if ($this->IsActive())
		{
			$bResult = $this->oDriver->VerifyCode($sSecret, $sCode);
		}

		return $bResult;
	}
}
