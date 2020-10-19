<?php

namespace RainLoop\Actions;

use \RainLoop\Enumerations\Capa;
use \RainLoop\Exceptions\ClientException;
use \RainLoop\Notifications;

trait Accounts
{

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountSetup() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Capa::ADDITIONAL_ACCOUNTS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sParentEmail = $oAccount->ParentEmailHelper();

		$aAccounts = $this->GetAccounts($oAccount);

		$sEmail = \trim($this->GetActionParam('Email', ''));
		$sPassword = $this->GetActionParam('Password', '');
		$bNew = '1' === (string) $this->GetActionParam('New', '1');

		$sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail, true);
		if ($bNew && ($oAccount->Email() === $sEmail || $sParentEmail === $sEmail || isset($aAccounts[$sEmail])))
		{
			throw new ClientException(Notifications::AccountAlreadyExists);
		}
		else if (!$bNew && !isset($aAccounts[$sEmail]))
		{
			throw new ClientException(Notifications::AccountDoesNotExist);
		}

		$oNewAccount = $this->LoginProcess($sEmail, $sPassword, '', '', false, true);
		$oNewAccount->SetParentEmail($sParentEmail);

		$aAccounts[$oNewAccount->Email()] = $oNewAccount->GetAuthToken();
		if (!$oAccount->IsAdditionalAccount())
		{
			$aAccounts[$oAccount->Email()] = $oAccount->GetAuthToken();
		}

		$this->SetAccounts($oAccount, $aAccounts);
		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountDelete() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Capa::ADDITIONAL_ACCOUNTS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sParentEmail = $oAccount->ParentEmailHelper();
		$sEmailToDelete = \trim($this->GetActionParam('EmailToDelete', ''));
		$sEmailToDelete = \MailSo\Base\Utils::IdnToAscii($sEmailToDelete, true);

		$aAccounts = $this->GetAccounts($oAccount);

		if (0 < \strlen($sEmailToDelete) && $sEmailToDelete !== $sParentEmail && isset($aAccounts[$sEmailToDelete]))
		{
			unset($aAccounts[$sEmailToDelete]);

			$oAccountToChange = null;
			if ($oAccount->Email() === $sEmailToDelete && !empty($aAccounts[$sParentEmail]))
			{
				$oAccountToChange = $this->GetAccountFromCustomToken($aAccounts[$sParentEmail], false, false);
				if ($oAccountToChange)
				{
					$this->AuthToken($oAccountToChange);
				}
			}

			$this->SetAccounts($oAccount, $aAccounts);
			return $this->TrueResponse(__FUNCTION__, array('Reload' => !!$oAccountToChange));
		}

		return $this->FalseResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoIdentityUpdate() : array
	{
		$oAccount = $this->getAccountFromToken();

		$oIdentity = new \RainLoop\Model\Identity();
		if (!$oIdentity->FromJSON($this->GetActionParams(), true))
		{
			throw new ClientException(Notifications::InvalidInputArgument);
		}

		$aIdentities = $this->GetIdentities($oAccount);

		$bAdded = false;
		$aIdentitiesForSave = array();
		foreach ($aIdentities as $oItem)
		{
			if ($oItem)
			{
				if ($oItem->Id() === $oIdentity->Id())
				{
					$aIdentitiesForSave[] = $oIdentity;
					$bAdded = true;
				}
				else
				{
					$aIdentitiesForSave[] = $oItem;
				}
			}
		}

		if (!$bAdded)
		{
			$aIdentitiesForSave[] = $oIdentity;
		}

		return $this->DefaultResponse(__FUNCTION__, $this->SetIdentities($oAccount, $aIdentitiesForSave));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoIdentityDelete() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Capa::IDENTITIES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sId = \trim($this->GetActionParam('IdToDelete', ''));
		if (empty($sId))
		{
			throw new ClientException(Notifications::UnknownError);
		}

		$aNew = array();
		$aIdentities = $this->GetIdentities($oAccount);

		foreach ($aIdentities as $oItem)
		{
			if ($oItem && $sId !== $oItem->Id())
			{
				$aNew[] = $oItem;
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $this->SetIdentities($oAccount, $aNew));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountsAndIdentitiesSortOrder() : array
	{
		$oAccount = $this->getAccountFromToken();

		$aAccounts = $this->GetActionParam('Accounts', null);
		$aIdentities = $this->GetActionParam('Identities', null);

		if (!\is_array($aAccounts) && !\is_array($aIdentities))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		return $this->DefaultResponse(__FUNCTION__, $this->StorageProvider()->Put($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG, 'accounts_identities_order',
			\json_encode(array(
				'Accounts' => \is_array($aAccounts) ? $aAccounts : array(),
				'Identities' => \is_array($aIdentities) ? $aIdentities : array()
			))
		));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountsAndIdentities() : array
	{
		$oAccount = $this->getAccountFromToken();

		$mAccounts = false;

		if ($this->GetCapa(false, false, Capa::ADDITIONAL_ACCOUNTS, $oAccount))
		{
			$mAccounts = $this->GetAccounts($oAccount);
			$mAccounts = \array_keys($mAccounts);

			foreach ($mAccounts as $iIndex => $sName)
			{
				$mAccounts[$iIndex] = \MailSo\Base\Utils::IdnToUtf8($sName);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Accounts' => $mAccounts,
			'Identities' => $this->GetIdentities($oAccount)
		));
	}

}
