<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\Capa;
use RainLoop\Exceptions\ClientException;
use RainLoop\Model\Account;
use RainLoop\Model\MainAccount;
use RainLoop\Model\AdditionalAccount;
use RainLoop\Model\Identity;
use RainLoop\Notifications;
use RainLoop\Providers\Storage\Enumerations\StorageType;
use RainLoop\Utils;

trait Accounts
{

	protected function GetMainEmail(Account $oAccount)
	{
		return $oAccount instanceof AdditionalAccount ? $oAccount->ParentEmail() : $oAccount->Email();
	}

	public function GetAccounts(MainAccount $oAccount): array
	{
		if ($this->GetCapa(false, Capa::ADDITIONAL_ACCOUNTS, $oAccount)) {
			$sAccounts = $this->StorageProvider()->Get($oAccount,
				StorageType::CONFIG,
				'additionalaccounts'
			);
			$aAccounts = $sAccounts ? \json_decode($sAccounts, true) : $this->ConvertInsecureAccounts($oAccount);
			if ($aAccounts && \is_array($aAccounts)) {
				return $aAccounts;
			}
		}

		return array();
	}

	/**
	 * Attempt to convert the old less secure data into better secured data
	 */
	protected function ConvertInsecureAccounts(MainAccount $oMainAccount) : array
	{
		$sAccounts = $this->StorageProvider()->Get($oMainAccount, StorageType::CONFIG, 'accounts');
		if (!$sAccounts || '{' !== $sAccounts[0]) {
			return [];
		}

		$aAccounts = \json_decode($sAccounts, true);
		if (!$aAccounts || !\is_array($aAccounts)) {
			return [];
		}

		$aNewAccounts = [];
		if (1 < \count($aAccounts)) {
			$sOrder = $this->StorageProvider()->Get($oMainAccount, StorageType::CONFIG, 'accounts_identities_order');
			$aOrder = $sOrder ? \json_decode($sOrder, true) : [];
			if (!empty($aOrder['Accounts']) && \is_array($aOrder['Accounts']) && 1 < \count($aOrder['Accounts'])) {
				$aAccounts = \array_filter(\array_merge(
					\array_fill_keys($aOrder['Accounts'], null),
					$aAccounts
				));
			}
			$sHash = $oMainAccount->CryptKey();
			foreach ($aAccounts as $sEmail => $sToken) {
				try {
					$aNewAccounts[$sEmail] = [
						'account',
						$sEmail,
						$sEmail,
						'',
						'',
						'',
						'',
						$oMainAccount->Email(),
						\hash_hmac('sha1', '', $sHash)
					];
					if (!$sToken) {
						\error_log("ConvertInsecureAccount {$sEmail} no token");
						continue;
					}
					$aAccountHash = \RainLoop\Utils::DecodeKeyValues($sToken);
					if (empty($aAccountHash[0]) || 'token' !== $aAccountHash[0] // simple token validation
						|| 8 > \count($aAccountHash) // length checking
					) {
						\error_log("ConvertInsecureAccount {$sEmail} invalid aAccountHash: " . print_r($aAccountHash,1));
						continue;
					}
					$aAccountHash[3] = \SnappyMail\Crypt::EncryptUrlSafe($aAccountHash[3], $sHash);
					$aNewAccounts[$sEmail] = [
						'account',
						$aAccountHash[1],
						$aAccountHash[2],
						$aAccountHash[3],
						$aAccountHash[11],
						$aAccountHash[8],
						$aAccountHash[9],
						$oMainAccount->Email(),
						\hash_hmac('sha1', $aAccountHash[3], $sHash)
					];
				} catch (\Throwable $e) {
					\error_log("ConvertInsecureAccount {$sEmail} failed");
				}
			}

			$this->SetAccounts($oMainAccount, $aNewAccounts);
		}

		$this->StorageProvider()->Clear($oMainAccount, StorageType::CONFIG, 'accounts');

		return $aNewAccounts;
	}

	protected function SetAccounts(MainAccount $oAccount, array $aAccounts = array()): void
	{
		$sParentEmail = $oAccount->Email();
		if ($aAccounts) {
			$this->StorageProvider()->Put(
				$oAccount,
				StorageType::CONFIG,
				'additionalaccounts',
				\json_encode($aAccounts)
			);
		} else {
			$this->StorageProvider()->Clear(
				$oAccount,
				StorageType::CONFIG,
				'additionalaccounts'
			);
		}
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountSetup(): array
	{
		$oMainAccount = $this->getMainAccountFromToken();

		if (!$this->GetCapa(false, Capa::ADDITIONAL_ACCOUNTS, $oMainAccount)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		$aAccounts = $this->GetAccounts($oMainAccount);

		$sEmail = \trim($this->GetActionParam('Email', ''));
		$sPassword = $this->GetActionParam('Password', '');
		$bNew = '1' === (string)$this->GetActionParam('New', '1');

		$sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail, true);
		if ($bNew && ($oMainAccount->Email() === $sEmail || isset($aAccounts[$sEmail]))) {
			throw new ClientException(Notifications::AccountAlreadyExists);
		} else if (!$bNew && !isset($aAccounts[$sEmail])) {
			throw new ClientException(Notifications::AccountDoesNotExist);
		}

		$oNewAccount = $this->LoginProcess($sEmail, $sPassword, false, $oMainAccount);

		$aAccounts[$oNewAccount->Email()] = $oNewAccount->asTokenArray($oMainAccount);
		$this->SetAccounts($oMainAccount, $aAccounts);

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountDelete(): array
	{
		$oMainAccount = $this->getMainAccountFromToken();

		if (!$this->GetCapa(false, Capa::ADDITIONAL_ACCOUNTS, $oMainAccount)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		$sEmailToDelete = \trim($this->GetActionParam('EmailToDelete', ''));
		$sEmailToDelete = \MailSo\Base\Utils::IdnToAscii($sEmailToDelete, true);

		$aAccounts = $this->GetAccounts($oMainAccount);

		if (\strlen($sEmailToDelete) && isset($aAccounts[$sEmailToDelete])) {
			$bReload = false;
//			$oAccount = $this->getAccountFromToken();
			if ($oAccount->Email() === $sEmailToDelete) {
				Utils::ClearCookie(self::AUTH_ADDITIONAL_TOKEN_KEY);
				$bReload = true;
			}

			unset($aAccounts[$sEmailToDelete]);
			$this->SetAccounts($oMainAccount, $aAccounts);

			return $this->TrueResponse(__FUNCTION__, array('Reload' => $bReload));
		}

		return $this->FalseResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountSwitch(): array
	{
		if ($this->switchAccount(\trim($this->GetActionParam('Email', '')))) {
			$oAccount = $this->getAccountFromToken();
			$aResult['Email'] = $oAccount->Email();
			$aResult['IncLogin'] = $oAccount->IncLogin();
			$aResult['OutLogin'] = $oAccount->OutLogin();
			$aResult['AccountHash'] = $oAccount->Hash();
			$aResult['ParentEmail'] = $oAccount->ParentEmail();
			$aResult['ContactsIsAllowed'] = $this->AddressBookProvider($oAccount)->IsActive();
			$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);
			if ($oSettingsLocal instanceof Settings) {
				$aResult['SentFolder'] = (string) $oSettingsLocal->GetConf('SentFolder', '');
				$aResult['DraftFolder'] = (string) $oSettingsLocal->GetConf('DraftFolder', '');
				$aResult['SpamFolder'] = (string) $oSettingsLocal->GetConf('SpamFolder', '');
				$aResult['TrashFolder'] = (string) $oSettingsLocal->GetConf('TrashFolder', '');
				$aResult['ArchiveFolder'] = (string) $oSettingsLocal->GetConf('ArchiveFolder', '');
				$aResult['HideUnsubscribed'] = (bool) $oSettingsLocal->GetConf('HideUnsubscribed', $aResult['HideUnsubscribed']);
				$aResult['UseThreads'] = (bool) $oSettingsLocal->GetConf('UseThreads', $aResult['UseThreads']);
				$aResult['ReplySameFolder'] = (bool) $oSettingsLocal->GetConf('ReplySameFolder', $aResult['ReplySameFolder']);
			}
//			$this->Plugins()->InitAppData($bAdmin, $aResult, $oAccount);

			return $this->DefaultResponse(__FUNCTION__, $aResult);
		}
		return $this->FalseResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoIdentityUpdate(): array
	{
		$oAccount = $this->getAccountFromToken();

		$oIdentity = new Identity();
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

		$sId = \trim($this->GetActionParam('IdToDelete', ''));
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
		$aAccounts = $this->GetActionParam('Accounts', null);
		$aIdentities = $this->GetActionParam('Identities', null);

		if (!\is_array($aAccounts) && !\is_array($aIdentities)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		$oAccount = $this->getMainAccountFromToken();
		if (1 < \count($aAccounts)) {
			$aAccounts = \array_filter(\array_merge(
				\array_fill_keys($aOrder['Accounts'], null),
				$this->GetAccounts($oAccount)
			));
			$this->SetAccounts($oAccount, $aAccounts);
		}

		return $this->DefaultResponse(__FUNCTION__, $this->StorageProvider()->Put(
			$this->getMainAccountFromToken(),
			StorageType::CONFIG,
			'identities_order',
			\json_encode(array(
				'Identities' => \is_array($aIdentities) ? $aIdentities : array()
			))
		));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountsAndIdentities(): array
	{
		$oAccount = $this->getMainAccountFromToken();

		$aAccounts = false;
		if ($this->GetCapa(false, Capa::ADDITIONAL_ACCOUNTS, $oAccount)) {
			$aAccounts = \array_map(
				'MailSo\\Base\\Utils::IdnToUtf8',
				\array_keys($this->GetAccounts($oAccount))
			);
			if ($aAccounts) {
				\array_unshift($aAccounts, \MailSo\Base\Utils::IdnToUtf8($oAccount->Email()));
			}
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Accounts' => $aAccounts,
			'Identities' => $this->GetIdentities($oAccount)
		));
	}

	/**
	 * @return Identity[]
	 */
	public function GetIdentities(MainAccount $oAccount): array
	{
		// A custom name for a single identity is also stored in this system
		$allowMultipleIdentities = $this->GetCapa(false, Capa::IDENTITIES, $oAccount);

		// Get all identities
		$identities = $this->IdentitiesProvider()->GetIdentities($oAccount, $allowMultipleIdentities);

		// Sort identities
		$orderString = $this->StorageProvider()->Get($oAccount, StorageType::CONFIG, 'identities_order');
		$old = false;
		if (!$orderString) {
			$orderString = $this->StorageProvider()->Get($oAccount, StorageType::CONFIG, 'accounts_identities_order');
			$old = !!$orderString;
		}

		$order = \json_decode($orderString, true) ?? [];
		if (isset($order['Identities']) && \is_array($order['Identities']) && 1 < \count($order['Identities'])) {
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

		if ($old) {
			$this->StorageProvider()->Put(
				$this->getMainAccountFromToken(),
				StorageType::CONFIG,
				'identities_order',
				\json_encode(array('Identities' => empty($order['Identities']) ? [] : $order['Identities']))
			);
			$this->StorageProvider()->Clear($oAccount, StorageType::CONFIG, 'accounts_identities_order');
		}

		return $identities;
	}

}
