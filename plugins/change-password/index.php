<?php

use \RainLoop\Exceptions\ClientException;

class ChangePasswordPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password',
		CATEGORY = 'Security',
		DESCRIPTION = '';

	// \RainLoop\Notifications\
	const CouldNotSaveNewPassword = 130;
	const CurrentPasswordIncorrect = 131;
	const NewPasswordShort = 132;
	const NewPasswordWeak = 133;

	public function Init() : void
	{
		$this->UseLangs(true); // start use langs folder

		$this->addJs('js/ChangePasswordUserSettings.js'); // add js file
		$this->addJsonHook('ChangePassword', 'ChangePassword');
		$this->addTemplate('templates/SettingsChangePassword.html');

		/**
		 * Admin
		 */
/*
		$this->addJs('js/ChangePasswordAdminSettings.js', true); // add js file
		$this->addJsonHook('AdminChangePassword', 'AdminChangePassword');
		$this->addTemplate('templates/ChangePasswordAdminSettings.html', true);
*/
	}

	public function ChangePassword()
	{
		$sPrevPassword = $this->jsonParam('PrevPassword');
		$sNewPassword = $this->jsonParam('NewPassword');

		$oActions = $this->Manager()->Actions();
		$oAccount = $oActions->GetAccount();
/*
		if (!$this->isPossible($oAccount)) {
			throw new ClientException(static::CouldNotSaveNewPassword);
		}
*/
		if ($sPrevPassword !== $oAccount->Password()) {
			throw new ClientException(static::CurrentPasswordIncorrect, null, $oActions->StaticI18N('NOTIFICATIONS/CURRENT_PASSWORD_INCORRECT'));
		}

		$sPasswordForCheck = \trim($sNewPassword);
		if (10 > \strlen($sPasswordForCheck)) {
			throw new ClientException(static::NewPasswordShort, null, $oActions->StaticI18N('NOTIFICATIONS/NEW_PASSWORD_SHORT'));
		}

		if (!\MailSo\Base\Utils::PasswordWeaknessCheck($sPasswordForCheck)) {
			throw new ClientException(static::NewPasswordWeak, null, $oActions->StaticI18N('NOTIFICATIONS/NEW_PASSWORD_WEAK'));
		}
/*

		require __DIR__ . '/drivers/pdo.php';
		$this->oDriver = new \ChangePasswordDriverPDO;
		if (!$this->oDriver->ChangePassword($oAccount, $sPrevPassword, $sNewPassword)) {
			throw new ClientException(static::CouldNotSaveNewPassword);
		}

		$oAccount->SetPassword($sNewPassword);
		$oActions->SetAuthToken($oAccount);
*/
		return $oActions->GetSpecAuthToken();
//		return $this->jsonResponse(__FUNCTION__, $oActions->GetSpecAuthToken());
	}

	public function AdminChangePassword()
	{
	}

}
