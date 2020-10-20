<?php

namespace RainLoop\Actions;

use \RainLoop\Enumerations\Capa;

trait TwoFactor
{
	/**
	 * @var \RainLoop\Providers\TwoFactorAuth
	 */
	private $oTwoFactorAuthProvider;

	public function DoGetTwoFactorInfo() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, Capa::TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		return $this->DefaultResponse(__FUNCTION__,
			$this->getTwoFactorInfo($oAccount, true));
	}

	public function DoCreateTwoFactorSecret() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, Capa::TWO_FACTOR, $oAccount))
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

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, Capa::TWO_FACTOR, $oAccount))
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

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, Capa::TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
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
					'Enable' => '1' === \trim($this->GetActionParam('Enable', '0')),
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

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, Capa::TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sCode = \trim($this->GetActionParam('Code', ''));

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

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, Capa::TWO_FACTOR, $oAccount))
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
		if (!$this->oTwoFactorAuthProvider) {
			$this->oTwoFactorAuthProvider = new \RainLoop\Providers\TwoFactorAuth(
				$this->Config()->Get('security', 'allow_two_factor_auth', false) ? $this->fabrica('two-factor-auth') : null
			);
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
