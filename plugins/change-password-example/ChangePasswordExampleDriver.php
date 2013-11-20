<?php

class ChangePasswordExampleDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
{
	/**
	 * @var array
	 */
	private $aDomains = array();
	
	/**
	 * @param array $aDomains
	 *
	 * @return bool
	 */
	public function SetAllowedDomains($aDomains)
	{
		if (\is_array($aDomains) && 0 < \count($aDomains))
		{
			$this->aDomains = $aDomains;
		}

		return $this;
	}
	
	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 * @return bool
	 */
	public function PasswordChangePossibility($oAccount)
	{
		return $oAccount && $oAccount->Domain() &&
			\in_array(\strtolower($oAccount->Domain()->Name()), $this->aDomains);
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

		// TODO

		return $bResult;
	}
}