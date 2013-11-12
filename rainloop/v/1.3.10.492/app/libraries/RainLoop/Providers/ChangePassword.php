<?php

namespace RainLoop\Providers;

class ChangePassword extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Actions
	 */
	private $oActions;

	/**
	 * @var \RainLoop\Providers\ChangePassword\ChangePasswordInterface
	 */
	private $oDriver;

	/**
	 * @param \RainLoop\Actions $oActions
	 * @param \RainLoop\Providers\ChangePassword\ChangePasswordInterface|null $oDriver = null
	 *
	 * @return void
	 */
	public function __construct($oActions, $oDriver = null)
	{
		$this->oActions = $oActions;
		$this->oDriver = $oDriver;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 * @return bool
	 */
	public function PasswordChangePossibility($oAccount)
	{
		return $this->IsActive() &&
			$oAccount instanceof \RainLoop\Account &&
			$this->oDriver && $this->oDriver->PasswordChangePossibility($oAccount)
		;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sPrevPassword
	 * @param string $sNewPassword
	 *
	 * @return bool
	 */
	public function ChangePassword(\RainLoop\Account $oAccount, $sPrevPassword, $sNewPassword)
	{
		$bResult = false;
		if ($this->oDriver instanceof \RainLoop\Providers\ChangePassword\ChangePasswordInterface &&
			$this->PasswordChangePossibility($oAccount) && $sPrevPassword === $oAccount->Password())
		{
			if ($this->oDriver->ChangePassword($oAccount, $sPrevPassword, $sNewPassword))
			{
				$oAccount->SetPassword($sNewPassword);
				$this->oActions->SetAuthToken($oAccount);
				$bResult = true;
			}
		}

		return $bResult;
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\ChangePassword\ChangePasswordInterface;
	}
}
