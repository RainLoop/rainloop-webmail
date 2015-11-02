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
	 * @param string $sName
	 * @param string $sSecret
	 * @param string $sTitle = ''
	 *
	 * @return string
	 */
	public function GetQRCodeGoogleUrl($sName, $sSecret, $sTitle = '')
	{
		$sUrl = sprintf('otpauth://%s/%s?secret=%s&issuer=%s', 'totp', urlencode($sName), $sSecret, urlencode($sTitle));
		return 'https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl='.\urlencode($sUrl);
	}

	/**
	 * @return string
	 */
	public function CreateSecret()
	{
		$sResult = '';
		if ($this->IsActive())
		{
			$sResult = $this->oDriver->CreateSecret();
		}

		return $sResult;
	}
	
	/**
	 * @param string $sSecret
	 * @param string $sCode
	 * 
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
