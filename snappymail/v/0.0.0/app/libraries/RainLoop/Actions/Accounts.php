<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\Capa;
use RainLoop\Exceptions\ClientException;
use RainLoop\Model\Account;
use RainLoop\Model\Identity;
use RainLoop\Notifications;
use RainLoop\Providers\Storage\Enumerations\StorageType;
use function trim;

trait Accounts
{

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountSetup(): array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, Capa::ADDITIONAL_ACCOUNTS, $oAccount)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		$sParentEmail = $oAccount->ParentEmailHelper();

		$aAccounts = $this->GetAccounts($oAccount);

		$sEmail = trim($this->GetActionParam('Email', ''));
		$sPassword = $this->GetActionParam('Password', '');
		$bNew = '1' === (string)$this->GetActionParam('New', '1');

		$sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail, true);
		if ($bNew && ($oAccount->Email() === $sEmail || $sParentEmail === $sEmail || isset($aAccounts[$sEmail]))) {
			throw new ClientException(Notifications::AccountAlreadyExists);
		} else if (!$bNew && !isset($aAccounts[$sEmail])) {
			throw new ClientException(Notifications::AccountDoesNotExist);
		}

		$oNewAccount = $this->LoginProcess($sEmail, $sPassword);
		$oNewAccount->SetParentEmail($sParentEmail);

		$aAccounts[$oNewAccount->Email()] = $oNewAccount->GetAuthToken();
		if (!$oAccount->IsAdditionalAccount()) {
			$aAccounts[$oAccount->Email()] = $oAccount->GetAuthToken();
		}

		$this->SetAccounts($oAccount, $aAccounts);
		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountDelete(): array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, Capa::ADDITIONAL_ACCOUNTS, $oAccount)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		$sParentEmail = $oAccount->ParentEmailHelper();
		$sEmailToDelete = trim($this->GetActionParam('EmailToDelete', ''));
		$sEmailToDelete = \MailSo\Base\Utils::IdnToAscii($sEmailToDelete, true);

		$aAccounts = $this->GetAccounts($oAccount);

		if (0 < \strlen($sEmailToDelete) && $sEmailToDelete !== $sParentEmail && isset($aAccounts[$sEmailToDelete])) {
			unset($aAccounts[$sEmailToDelete]);

			$oAccountToChange = null;
			if ($oAccount->Email() === $sEmailToDelete && !empty($aAccounts[$sParentEmail])) {
				$oAccountToChange = $this->GetAccountFromCustomToken($aAccounts[$sParentEmail], false, false);
				if ($oAccountToChange) {
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
	public function DoIdentityUpdate(): array
	{
		$oAccount = $this->getAccountFromToken();

		$oIdentity = new \RainLoop\Model\Identity();
		if (!$oIdentity->FromJSON($this->GetActionParams(), true)) {
			throw new ClientException(Notifications::InvalidInputArgument);
		}

		$this->IdentitiesProvider()->UpdateIdentity($oAccount, $oIdentity);
		return $this->DefaultResponse(__FUNCTION__, true);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoIdentityDelete(): array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, Capa::IDENTITIES, $oAccount)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		$sId = trim($this->GetActionParam('IdToDelete', ''));
		if (empty($sId)) {
			throw new ClientException(Notifications::UnknownError);
		}

		$this->IdentitiesProvider()->DeleteIdentity($oAccount, $sId);
		return $this->DefaultResponse(__FUNCTION__, true);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountsAndIdentitiesSortOrder(): array
	{
		$oAccount = $this->getAccountFromToken();

		$aAccounts = $this->GetActionParam('Accounts', null);
		$aIdentities = $this->GetActionParam('Identities', null);

		if (!\is_array($aAccounts) && !\is_array($aIdentities)) {
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
	public function DoAccountsAndIdentities(): array
	{
		$oAccount = $this->getAccountFromToken();

		$mAccounts = false;

		if ($this->GetCapa(false, Capa::ADDITIONAL_ACCOUNTS, $oAccount)) {
			$mAccounts = $this->GetAccounts($oAccount);
			$mAccounts = \array_keys($mAccounts);

			foreach ($mAccounts as $iIndex => $sName) {
				$mAccounts[$iIndex] = \MailSo\Base\Utils::IdnToUtf8($sName);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Accounts' => $mAccounts,
			'Identities' => $this->GetIdentities($oAccount)
		));
	}

	/**
	 * @param Account $account
	 * @return Identity[]
	 */
	public function GetIdentities(Account $account): array
	{
		// A custom name for a single identity is also stored in this system
		$allowMultipleIdentities = $this->GetCapa(false, Capa::IDENTITIES, $account);

		// Get all identities
		$identities = $this->IdentitiesProvider()->GetIdentities($account, $allowMultipleIdentities);

		// Sort identities
		$orderString = $this->StorageProvider()->Get($account, StorageType::CONFIG, 'accounts_identities_order');
		$order = \json_decode($orderString, true) ?? [];
		if (isset($order['Identities']) && \is_array($order['Identities']) && \count($order['Identities']) > 1) {
			$list = \array_map(function ($item) {
				if ('' === $item) {
					$item = '---';
				}
				return $item;
			}, $order['Identities']);

			\usort($identities, function ($a, $b) use ($list) {
				return \array_search($a->Id(true), $list) < \array_search($b->Id(true), $list) ? -1 : 1;
			});
		}

		return $identities;
	}

}
