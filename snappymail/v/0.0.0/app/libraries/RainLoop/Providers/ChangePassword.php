<?php

namespace RainLoop\Providers;

use \RainLoop\Model\Account;
use \RainLoop\Exceptions\ClientException;
use \RainLoop\Notifications;

class ChangePassword extends AbstractProvider
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

	public function __construct(\RainLoop\Actions $oActions, ?ChangePassword\ChangePasswordInterface $oDriver = null, bool $bCheckWeak = true)
	{
		$this->oActions = $oActions;
		$this->oDriver = $oDriver;
		$this->bCheckWeak = $bCheckWeak;
	}

	public function isPossible(Account $oAccount) : bool
	{
		return $this->IsActive() && $this->oDriver->isPossible($oAccount);
	}

	public function ChangePassword(Account $oAccount, string $sPrevPassword, string $sNewPassword) : bool
	{
		if (!$this->isPossible($oAccount)) {
			throw new ClientException(Notifications::CouldNotSaveNewPassword);
		}

		if ($sPrevPassword !== $oAccount->Password()) {
			throw new ClientException(Notifications::CurrentPasswordIncorrect);
		}

		$sPasswordForCheck = \trim($sNewPassword);
		if (10 > \strlen($sPasswordForCheck)) {
			throw new ClientException(Notifications::NewPasswordShort);
		}

		if ($this->bCheckWeak && !\MailSo\Base\Utils::PasswordWeaknessCheck($sPasswordForCheck)) {
			throw new ClientException(Notifications::NewPasswordWeak);
		}

		if (!$this->oDriver->ChangePassword($oAccount, $sPrevPassword, $sNewPassword)) {
			throw new ClientException(Notifications::CouldNotSaveNewPassword);
		}

		$oAccount->SetPassword($sNewPassword);
		$this->oActions->SetAuthToken($oAccount);

		return $this->oActions->GetSpecAuthToken();
	}

	public function IsActive() : bool
	{
		return $this->oDriver instanceof ChangePassword\ChangePasswordInterface;
	}
}
