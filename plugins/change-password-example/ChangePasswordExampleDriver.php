<?php

class ChangePasswordExampleDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
{
	/**
	 * @var string
	 */
	private $sAllowedEmails = '';

	/**
	 * @param string $sAllowedEmails
	 *
	 * @return \ChangePasswordExampleDriver
	 */
	public function SetAllowedEmails($sAllowedEmails)
	{
		$this->sAllowedEmails = $sAllowedEmails;
		return $this;
	}

	public function PasswordChangePossibility(\RainLoop\Model\Account $oAccount) : bool
	{
		return $oAccount && $oAccount->Email() &&
			\RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $this->sAllowedEmails);
	}

	public function ChangePassword(\RainLoop\Model\Account $oAccount, string $sPrevPassword, string $sNewPassword) : bool
	{
		$bResult = false;

		// TODO

		return $bResult;
	}
}
