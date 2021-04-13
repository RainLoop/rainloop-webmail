<?php

use \RainLoop\Exceptions\ClientException;

class TwoFactorAuthPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Two Factor Authentication',
		VERSION  = '2.0',
		RELEASE  = '2021-04-13',
		REQUIRED = '2.5.0',
		CATEGORY = 'Security',
		DESCRIPTION = 'This plugin allows you to to have TOTP';

	// \RainLoop\Notifications\
	const
		AccountTwoFactorAuthRequired = 120,
		AccountTwoFactorAuthError = 121,

		Capa_TWO_FACTOR = 'TWO_FACTOR',
		Capa_TWO_FACTOR_FORCE = 'TWO_FACTOR_FORCE';

	/**
	 * @var \RainLoop\Providers\TwoFactorAuth
	 */
	private $oTwoFactorAuthProvider;

	public function Init() : void
	{
		$this->UseLangs(true);

		$this->addJs('js/TwoFactorAuthSettings.js');

		$this->addJsonHook('GetTwoFactorInfo', 'DoGetTwoFactorInfo');
		$this->addJsonHook('CreateTwoFactorSecret', 'DoCreateTwoFactorSecret');
		$this->addJsonHook('ShowTwoFactorSecret', 'DoShowTwoFactorSecret');
		$this->addJsonHook('EnableTwoFactor', 'DoEnableTwoFactor');
		$this->addJsonHook('TestTwoFactorInfo', 'DoTestTwoFactorInfo');
		$this->addJsonHook('ClearTwoFactorInfo', 'DoClearTwoFactorInfo');

		$this->addTemplate('templates/TwoFactorAuthSettings.html');
		$this->addTemplate('templates/PopupsTwoFactorAuthTest.html');
	}

	public function configMapping() : array
	{
		return [
			\RainLoop\Plugins\Property::NewInstance('allow_two_factor_auth')
				->SetLabel('TAB_SECURITY/LABEL_ALLOW_TWO_STEP')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL),
			\RainLoop\Plugins\Property::NewInstance('force_two_factor_auth')
				->SetLabel('TAB_SECURITY/LABEL_FORCE_TWO_STEP')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
		];
	}


	public function DoGetTwoFactorInfo() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider() ||
			!$this->GetCapa(false, static::Capa_TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		return $this->DefaultResponse(__FUNCTION__,
			$this->getTwoFactorInfo($oAccount, true));
	}

	public function DoCreateTwoFactorSecret() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider() ||
			!$this->GetCapa(false, static::Capa_TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sEmail = $oAccount->ParentEmailHelper();

		$sSecret = $this->TwoFactorAuthProvider()->CreateSecret();

		$aCodes = array();
		for ($iIndex = 9; $iIndex > 0; $iIndex--)
		{
			$aCodes[] = \rand(100000000, 900000000);
		}

		$this->StorageProvider()->Put($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'two_factor',
			\RainLoop\Utils::EncodeKeyValues(array(
				'User' => $sEmail,
				'Enable' => false,
				'Secret' => $sSecret,
				'BackupCodes' => \implode(' ', $aCodes)
			))
		);

		$this->requestSleep();

		return $this->DefaultResponse(__FUNCTION__,
			$this->getTwoFactorInfo($oAccount));
	}

	public function DoShowTwoFactorSecret() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider() ||
			!$this->GetCapa(false, static::Capa_TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$aResult = $this->getTwoFactorInfo($oAccount);
		unset($aResult['BackupCodes']);

		return $this->DefaultResponse(__FUNCTION__, $aResult);
	}

	public function DoEnableTwoFactor() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider() ||
			!$this->GetCapa(false, static::Capa_TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

//		$this->setSettingsFromParams($oSettings, 'EnableTwoFactor', 'bool');

		$sEmail = $oAccount->ParentEmailHelper();

		$bResult = false;
		$mData = $this->getTwoFactorInfo($oAccount);
		if (isset($mData['Secret'], $mData['BackupCodes']))
		{
			$bResult = $this->StorageProvider()->Put($oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'two_factor',
				\RainLoop\Utils::EncodeKeyValues(array(
					'User' => $sEmail,
					'Enable' => '1' === \trim($this->jsonParam('Enable', '0')),
					'Secret' => $mData['Secret'],
					'BackupCodes' => $mData['BackupCodes']
				))
			);
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult);
	}

	public function DoTestTwoFactorInfo() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider() ||
			!$this->GetCapa(false, static::Capa_TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sCode = \trim($this->jsonParam('Code', ''));

		$aData = $this->getTwoFactorInfo($oAccount);
		$sSecret = !empty($aData['Secret']) ? $aData['Secret'] : '';

//		$this->Logger()->WriteDump(array(
//			$sCode, $sSecret, $aData,
//			$this->TwoFactorAuthProvider()->VerifyCode($sSecret, $sCode)
//		));

		$this->requestSleep();

		return $this->DefaultResponse(__FUNCTION__,
			$this->TwoFactorAuthProvider()->VerifyCode($sSecret, $sCode));
	}

	public function DoClearTwoFactorInfo() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider() ||
			!$this->GetCapa(false, static::Capa_TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$this->StorageProvider()->Clear($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'two_factor'
		);

		return $this->DefaultResponse(__FUNCTION__,
			$this->getTwoFactorInfo($oAccount, true));
	}

	protected function TwoFactorAuthProvider() : \RainLoop\Providers\TwoFactorAuth
	{
//		if ($this->Config()->Get('plugin', 'allow_two_factor_auth', 0))
//		if ($this->Config()->Get('plugin', 'force_two_factor_auth', 0))

		if (!$this->oTwoFactorAuthProvider) {
			require __DIR__ . '/providers/interface.php';
			require __DIR__ . '/providers/totp.php';
			$this->oTwoFactorAuthProvider = new TwoFactorAuthTotp();
		}
		return $this->oTwoFactorAuthProvider;
	}

	protected function getTwoFactorInfo(\RainLoop\Model\Account $oAccount, bool $bRemoveSecret = false) : array
	{
		$sEmail = $oAccount->ParentEmailHelper();

		$mData = null;

		$aResult = array(
			'User' => '',
			'IsSet' => false,
			'Enable' => false,
			'Secret' => '',
			'UrlTitle' => '',
			'BackupCodes' => ''
		);

		if (!empty($sEmail))
		{
			$aResult['User'] = $sEmail;

			$sData = $this->StorageProvider()->Get($oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'two_factor'
			);

			if ($sData)
			{
				$mData = \RainLoop\Utils::DecodeKeyValues($sData);
			}
		}

		if (!empty($aResult['User']) &&
			!empty($mData['User']) && !empty($mData['Secret']) &&
			!empty($mData['BackupCodes']) && $sEmail === $mData['User'])
		{
			$aResult['IsSet'] = true;
			$aResult['Enable'] = isset($mData['Enable']) ? !!$mData['Enable'] : false;
			$aResult['Secret'] = $mData['Secret'];
			$aResult['BackupCodes'] = $mData['BackupCodes'];
			$aResult['UrlTitle'] = $this->Config()->Get('webmail', 'title', '');
		}

		if ($bRemoveSecret)
		{
			if (isset($aResult['Secret']))
			{
				unset($aResult['Secret']);
			}

			if (isset($aResult['UrlTitle']))
			{
				unset($aResult['UrlTitle']);
			}

			if (isset($aResult['BackupCodes']))
			{
				unset($aResult['BackupCodes']);
			}
		}

		return $aResult;
	}

	protected function removeBackupCodeFromTwoFactorInfo(\RainLoop\Model\Account $oAccount, string $sCode) : bool
	{
		if (!$oAccount || empty($sCode))
		{
			return false;
		}

		$sData = $this->StorageProvider()->Get($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'two_factor'
		);

		if ($sData)
		{
			$mData = \RainLoop\Utils::DecodeKeyValues($sData);

			if (!empty($mData['BackupCodes']))
			{
				$sBackupCodes = \preg_replace('/[^\d]+/', ' ', ' '.$mData['BackupCodes'].' ');
				$sBackupCodes = \str_replace(' '.$sCode.' ', '', $sBackupCodes);

				$mData['BackupCodes'] = \trim(\preg_replace('/[^\d]+/', ' ', $sBackupCodes));

				return $this->StorageProvider()->Put($oAccount,
					\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
					'two_factor',
					\RainLoop\Utils::EncodeKeyValues($mData)
				);
			}
		}

		return false;
	}

/*
	public function ChangePassword()
	{
		$oActions = $this->Manager()->Actions();
		$oAccount = $oActions->GetAccount();

		if (!$oAccount->Email()) {
			\trigger_error('ChangePassword failed: empty email address');
			throw new ClientException(static::CouldNotSaveNewPassword);
		}

		$sPrevPassword = $this->jsonParam('PrevPassword');
		if ($sPrevPassword !== $oAccount->Password()) {
			throw new ClientException(static::CurrentPasswordIncorrect, null, $oActions->StaticI18N('NOTIFICATIONS/CURRENT_PASSWORD_INCORRECT'));
		}

		$sNewPassword = $this->jsonParam('NewPassword');
		if ($this->Config()->Get('plugin', 'pass_min_length', 10) > \strlen($sNewPassword)) {
			throw new ClientException(static::NewPasswordShort, null, $oActions->StaticI18N('NOTIFICATIONS/NEW_PASSWORD_SHORT'));
		}

		if ($this->Config()->Get('plugin', 'pass_min_strength', 70) > static::PasswordStrength($sNewPassword)) {
			throw new ClientException(static::NewPasswordWeak, null, $oActions->StaticI18N('NOTIFICATIONS/NEW_PASSWORD_WEAK'));
		}

		$bResult = false;
		$oConfig = $this->Config();
		foreach ($this->getSupportedDrivers() as $name => $class) {
			$sFoundedValue = '';
			if (\RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $oConfig->Get('plugin', "driver_{$name}_allowed_emails"), $sFoundedValue)) {
				$name = $class::NAME;
				$oLogger = $oActions->Logger();
				try
				{
					$oDriver = new $class(
						$oConfig,
						$oLogger
					);
					if (!$oDriver->ChangePassword($oAccount, $sPrevPassword, $sNewPassword)) {
						throw new ClientException(static::CouldNotSaveNewPassword);
					}
					$bResult = true;
					if ($oLogger) {
						$oLogger->Write("{$name} password changed for {$oAccount->Email()}");
					}
				}
				catch (\Throwable $oException)
				{
					\trigger_error("{$class} failed: {$oException->getMessage()}");
					if ($oLogger) {
						$oLogger->Write("ERROR: {$name} password change for {$oAccount->Email()} failed");
						$oLogger->WriteException($oException);
//						$oLogger->WriteException($oException, \MailSo\Log\Enumerations\Type::WARNING, $name);
					}
				}
			}
		}

		if (!$bResult) {
			\trigger_error("ChangePassword failed");
			throw new ClientException(static::CouldNotSaveNewPassword);
		}

		$oAccount->SetPassword($sNewPassword);
		$oActions->SetAuthToken($oAccount);

		return $this->jsonResponse(__FUNCTION__, $oActions->GetSpecAuthToken());
	}
*/
}
