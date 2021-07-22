<?php
/*
$this->DefaultResponse(__FUNCTION__,
$this->FalseResponse(__FUNCTION__);
*/

use \RainLoop\Exceptions\ClientException;

class TwoFactorAuthPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Two Factor Authentication',
		VERSION  = '2.1',
		RELEASE  = '2021-07-22',
		REQUIRED = '2.5.4',
		CATEGORY = 'Login',
		DESCRIPTION = 'This plugin allows you to to have TOTP';

	// \RainLoop\Notifications\
	const
		AccountTwoFactorAuthRequired = 120,
		AccountTwoFactorAuthError = 121,

		Capa_TWO_FACTOR = 'TWO_FACTOR',
		Capa_TWO_FACTOR_FORCE = 'TWO_FACTOR_FORCE';

	public function Init() : void
	{
		$this->UseLangs(true);

//		$this->addCss('style.less');
		$this->addJs('js/TwoFactorAuthSettings.js');

		$this->addHook('login.success', 'DoLogin');

		$this->addJsonHook('GetTwoFactorInfo', 'DoGetTwoFactorInfo');
		$this->addJsonHook('CreateTwoFactorSecret', 'DoCreateTwoFactorSecret');
		$this->addJsonHook('ShowTwoFactorSecret', 'DoShowTwoFactorSecret');
		$this->addJsonHook('EnableTwoFactor', 'DoEnableTwoFactor');
		$this->addJsonHook('VerifyTwoFactorCode', 'DoVerifyTwoFactorCode');
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

	public function DoLogin(\RainLoop\Model\Account $oAccount)
	{
		// Stripped from \RainLoop\Actions::LoginProcess
		if ($this->TwoFactorAuthProvider($oAccount)) {
			$aData = $this->getTwoFactorInfo($oAccount);
			if ($aData && isset($aData['IsSet'], $aData['Enable']) && !empty($aData['Secret']) && $aData['IsSet'] && $aData['Enable']) {
				$sSecretHash = \md5(APP_SALT . $aData['Secret'] . Utils::Fingerprint());
				$sSecretCookieHash = Utils::GetCookie(self::AUTH_TFA_SIGN_ME_TOKEN_KEY, '');

				if (empty($sSecretCookieHash) || $sSecretHash !== $sSecretCookieHash) {
					$sAdditionalCode = \trim($this->jsonParam('AdditionalCode', ''));
					if (empty($sAdditionalCode)) {
						$this->Logger()->Write('TFA: Required Code for ' . $oAccount->ParentEmailHelper() . ' account.');

						throw new Exceptions\ClientException(Notifications::AccountTwoFactorAuthRequired);
					} else {
						$this->Logger()->Write('TFA: Verify Code for ' . $oAccount->ParentEmailHelper() . ' account.');

						$bUseBackupCode = false;
						if (6 < \strlen($sAdditionalCode) && !empty($aData['BackupCodes'])) {
							$aBackupCodes = \explode(' ', \trim(\preg_replace('/[^\d]+/', ' ', $aData['BackupCodes'])));
							$bUseBackupCode = \in_array($sAdditionalCode, $aBackupCodes);

							if ($bUseBackupCode) {
								$this->removeBackupCodeFromTwoFactorInfo($oAccount->ParentEmailHelper(), $sAdditionalCode);
							}
						}

						if (!$bUseBackupCode && !$this->TwoFactorAuthProvider($oAccount)->VerifyCode($aData['Secret'], $sAdditionalCode)) {
							$this->Manager()->Actions()->loginErrorDelay();

							$this->Manager()->Actions()->LoggerAuthHelper($oAccount);

							throw new Exceptions\ClientException(Notifications::AccountTwoFactorAuthError);
						}

						// $bAdditionalCodeSignMe
//						if ('1' === (string) $this->Manager()->Actions()->GetActionParam('AdditionalCodeSignMe', '0')) {
						if ('1' === (string) $this->jsonParam('AdditionalCodeSignMe', '0')) {
							Utils::SetCookie(self::AUTH_TFA_SIGN_ME_TOKEN_KEY, $sSecretHash,
								\time() + 60 * 60 * 24 * 14);
						}
					}
				}
			}
		}
/*
		// Stripped from \RainLoop\Actions\User::DoLogin
		if (Notifications::AccountTwoFactorAuthRequired === $oException->getCode())
		{
			return $this->DefaultResponse(__FUNCTION__, true, array(
				'TwoFactorAuth' => true
			));
		}
*/
	}

	public function DoGetTwoFactorInfo() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider($oAccount)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		return $this->DefaultResponse(__FUNCTION__, $this->getTwoFactorInfo($oAccount, true));
	}

	public function DoCreateTwoFactorSecret() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider($oAccount)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		$sEmail = $oAccount->ParentEmailHelper();

		$sSecret = $this->TwoFactorAuthProvider($oAccount)->CreateSecret();

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

		$this->Manager()->Actions()->requestSleep();

		return $this->DefaultResponse(__FUNCTION__, $this->getTwoFactorInfo($oAccount));
	}

	public function DoShowTwoFactorSecret() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider($oAccount)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		$aResult = $this->getTwoFactorInfo($oAccount);
		unset($aResult['BackupCodes']);

		return $this->DefaultResponse(__FUNCTION__, $aResult);
	}

	public function DoEnableTwoFactor() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider($oAccount)) {
			return $this->FalseResponse(__FUNCTION__);
		}

//		$this->Manager()->Actions()->setSettingsFromParams($oSettings, 'EnableTwoFactor', 'bool');
		$oSettings = $this->Manager()->Actions()->SettingsProvider()->Load($oAccount);
		if ($this->Manager()->Actions()->HasActionParam('EnableTwoFactor')) {
			$sValue = $this->GetActionParam('EnableTwoFactor', '');
			$oSettings->SetConf('EnableTwoFactor', !empty($sValue));
		}

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

	public function DoVerifyTwoFactorCode() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider($oAccount)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		$sCode = \trim($this->jsonParam('Code', ''));

		$aData = $this->getTwoFactorInfo($oAccount);
		$sSecret = !empty($aData['Secret']) ? $aData['Secret'] : '';

//		$this->Logger()->WriteDump(array(
//			$sCode, $sSecret, $aData,
//			$this->TwoFactorAuthProvider($oAccount)->VerifyCode($sSecret, $sCode)
//		));

		$this->Manager()->Actions()->requestSleep();

		return $this->DefaultResponse(__FUNCTION__,
			$this->TwoFactorAuthProvider($oAccount)->VerifyCode($sSecret, $sCode));
	}

	public function DoClearTwoFactorInfo() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider($oAccount)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		$this->StorageProvider()->Clear($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'two_factor'
		);

		return $this->DefaultResponse(__FUNCTION__, $this->getTwoFactorInfo($oAccount, true));
	}

	protected function Logger() : \RainLoop\Providers\TwoFactorAuth
	{
		return $this->Manager()->Actions()->Logger();
	}
	protected function getAccountFromToken() : \RainLoop\Model\Account
	{
		return $this->Manager()->Actions()->GetAccount();
	}
	protected function StorageProvider() : \RainLoop\Providers\Storage
	{
		return $this->Manager()->Actions()->StorageProvider();
	}

	private $oTwoFactorAuthProvider;
	protected function TwoFactorAuthProvider(\RainLoop\Model\Account $oAccount) : ?TwoFactorAuthInterface
	{
//		if ($this->Config()->Get('plugin', 'allow_two_factor_auth', 0))
//		if ($this->Config()->Get('plugin', 'force_two_factor_auth', 0))

		if (!$this->oTwoFactorAuthProvider && $this->Manager()->Actions()->GetCapa(false, static::Capa_TWO_FACTOR, $oAccount)) {
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
}
