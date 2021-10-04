<?php

use \RainLoop\Exceptions\ClientException;

class TwoFactorAuthPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Two Factor Authentication',
		VERSION  = '2.2',
		RELEASE  = '2021-10-04',
		REQUIRED = '2.6.0',
		CATEGORY = 'Login',
		DESCRIPTION = 'Provides support for TOTP 2FA';

	public function Init() : void
	{
		$this->UseLangs(true);

		$this->addJs('js/TwoFactorAuthLogin.js');
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

	public function DoLogin(\RainLoop\Model\Account $oAccount)
	{
		if ($this->TwoFactorAuthProvider($oAccount)) {
			$aData = $this->getTwoFactorInfo($oAccount);
			if ($aData && isset($aData['IsSet'], $aData['Enable']) && !empty($aData['Secret']) && $aData['IsSet'] && $aData['Enable']) {
				$sCode = \trim($this->jsonParam('totp_code', ''));
				if (empty($sCode)) {
					$this->Logger()->Write("TFA: Code required for {$oAccount->ParentEmailHelper()}");
					throw new ClientException(\RainLoop\Notifications::AuthError);
				}

				$bUseBackupCode = false;
				if (6 < \strlen($sCode) && !empty($aData['BackupCodes'])) {
					$aBackupCodes = \explode(' ', \trim(\preg_replace('/[^\d]+/', ' ', $aData['BackupCodes'])));
					$bUseBackupCode = \in_array($sCode, $aBackupCodes);
					if ($bUseBackupCode) {
						$this->removeBackupCodeFromTwoFactorInfo($oAccount->ParentEmailHelper(), $sCode);
					}
				}

				if (!$bUseBackupCode && !$this->TwoFactorAuthProvider($oAccount)->VerifyCode($aData['Secret'], $sCode)) {
					$this->Manager()->Actions()->LoggerAuthHelper($oAccount);
					$this->Logger()->Write("TFA: Code failed for {$oAccount->ParentEmailHelper()}");
					throw new ClientException(\RainLoop\Notifications::AuthError);
				}
				$this->Logger()->Write("TFA: Code verified for {$oAccount->ParentEmailHelper()}");
			}
		}
	}

	public function DoGetTwoFactorInfo() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider($oAccount)) {
			return $this->jsonResponse(__FUNCTION__, false);
		}

		return $this->jsonResponse(__FUNCTION__, $this->getTwoFactorInfo($oAccount, true));
	}

	public function DoCreateTwoFactorSecret() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider($oAccount)) {
			return $this->jsonResponse(__FUNCTION__, false);
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

		return $this->jsonResponse(__FUNCTION__, $this->getTwoFactorInfo($oAccount));
	}

	public function DoShowTwoFactorSecret() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider($oAccount)) {
			return $this->jsonResponse(__FUNCTION__, false);
		}

		$aResult = $this->getTwoFactorInfo($oAccount);
		unset($aResult['BackupCodes']);

		return $this->jsonResponse(__FUNCTION__, $aResult);
	}

	public function DoEnableTwoFactor() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider($oAccount)) {
			return $this->jsonResponse(__FUNCTION__, false);
		}

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

		return $this->jsonResponse(__FUNCTION__, $bResult);
	}

	public function DoVerifyTwoFactorCode() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider($oAccount)) {
			return $this->jsonResponse(__FUNCTION__, false);
		}

		$sCode = \trim($this->jsonParam('Code', ''));

		$aData = $this->getTwoFactorInfo($oAccount);
		$sSecret = !empty($aData['Secret']) ? $aData['Secret'] : '';

		return $this->jsonResponse(__FUNCTION__,
			$this->TwoFactorAuthProvider($oAccount)->VerifyCode($sSecret, $sCode));
	}

	public function DoClearTwoFactorInfo() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider($oAccount)) {
			return $this->jsonResponse(__FUNCTION__, false);
		}

		$this->StorageProvider()->Clear($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'two_factor'
		);

		return $this->jsonResponse(__FUNCTION__, $this->getTwoFactorInfo($oAccount, true));
	}

	protected function Logger() : \MailSo\Log\Logger
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
}
