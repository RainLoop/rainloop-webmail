<?php

namespace RainLoop\Actions;

trait ChangePassword
{
	/**
	 * @var \RainLoop\Providers\ChangePassword
	 */
	private $oChangePasswordProvider;

	public function ChangePasswordProvider() : \RainLoop\Providers\ChangePassword
	{
		if (!$this->oChangePasswordProvider) {
			$this->oChangePasswordProvider = new \RainLoop\Providers\ChangePassword(
				$this, $this->fabrica('change-password'), !!$this->Config()->Get('labs', 'check_new_password_strength')
			);
		}

		return $this->oChangePasswordProvider;
	}

	public function DoChangePassword() : array
	{
		$mResult = false;

		if ($oAccount = $this->getAccountFromToken()) {
			try
			{
				$mResult = $this->ChangePasswordProvider()->ChangePassword(
					$oAccount,
					$this->GetActionParam('PrevPassword', ''),
					$this->GetActionParam('NewPassword', '')
				);
			}
			catch (\Throwable $oException)
			{
				$this->loginErrorDelay();
				$this->Logger()->Write('Error: Can\'t change password for '.$oAccount->Email().' account.', \MailSo\Log\Enumerations\Type::NOTICE);

				throw $oException;
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $mResult);
	}

}
