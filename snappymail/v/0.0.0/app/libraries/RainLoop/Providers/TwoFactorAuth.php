<?php

namespace RainLoop\Providers;

class TwoFactorAuth extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\TwoFactorAuth\TwoFactorAuthInterface
	 */
	private $oDriver;

	public function __construct(?\RainLoop\Providers\TwoFactorAuth\TwoFactorAuthInterface $oDriver = null)
	{
		$this->oDriver = $oDriver;
	}

	public function IsActive() : bool
	{
		return $this->oDriver instanceof \RainLoop\Providers\TwoFactorAuth\TwoFactorAuthInterface;
	}

	public function GetQRCodeGoogleUrl(string $sName, string $sSecret, string $sTitle = '') : string
	{
		$sUrl = sprintf('otpauth://%s/%s?secret=%s&issuer=%s', 'totp', urlencode($sName), $sSecret, urlencode($sTitle));
		return 'https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl='.\urlencode($sUrl);
	}

	public function CreateSecret() : string
	{
		$sResult = '';
		if ($this->IsActive())
		{
			$sResult = $this->oDriver->CreateSecret();
		}

		return $sResult;
	}

	public function VerifyCode(string $sSecret, string $sCode) : bool
	{
		$bResult = false;
		if ($this->IsActive())
		{
			$bResult = $this->oDriver->VerifyCode($sSecret, $sCode);
		}

		return $bResult;
	}
}
