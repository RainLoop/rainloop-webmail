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
	 * @var bool
	 */
	private $bCheckWeak;

	public function __construct(\RainLoop\Actions $oActions, ?\RainLoop\Providers\ChangePassword\ChangePasswordInterface $oDriver = null, bool $bCheckWeak = true)
	{
		$this->oActions = $oActions;
		$this->oDriver = $oDriver;
		$this->bCheckWeak = $bCheckWeak;
	}

	public function PasswordChangePossibility(\RainLoop\Model\Account $oAccount) : bool
	{
		return $this->IsActive() &&
			$this->oDriver && $this->oDriver->PasswordChangePossibility($oAccount)
		;
	}

	public function ChangePassword(\RainLoop\Model\Account $oAccount, string $sPrevPassword, string $sNewPassword)
	{
		$mResult = false;

		if ($this->oDriver instanceof \RainLoop\Providers\ChangePassword\ChangePasswordInterface &&
			$this->PasswordChangePossibility($oAccount))
		{
			if ($sPrevPassword !== $oAccount->Password())
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CurrentPasswordIncorrect);
			}

			$sPasswordForCheck = \trim($sNewPassword);
			if (6 > \strlen($sPasswordForCheck))
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::NewPasswordShort);
			}

			if (!\MailSo\Base\Utils::PasswordWeaknessCheck($sPasswordForCheck))
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::NewPasswordWeak);
			}

			if (!$this->oDriver->ChangePassword($oAccount, $sPrevPassword, $sNewPassword))
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CouldNotSaveNewPassword);
			}

			$oAccount->SetPassword($sNewPassword);
			$this->oActions->SetAuthToken($oAccount);

			$mResult = $this->oActions->GetSpecAuthToken();
		}
		else
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CouldNotSaveNewPassword);
		}

		return $mResult;
	}

	public function IsActive() : bool
	{
		return $this->oDriver instanceof \RainLoop\Providers\ChangePassword\ChangePasswordInterface;
	}
}
