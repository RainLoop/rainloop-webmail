<?php

namespace RainLoop\Actions;

trait Contacts
{

	public function DoSaveContactsSyncData() : array
	{
		$oAccount = $this->getAccountFromToken();

		$oAddressBookProvider = $this->AddressBookProvider($oAccount);
		if (!$oAddressBookProvider || !$oAddressBookProvider->IsActive())
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$bEnabled = '1' === (string) $this->GetActionParam('Enable', '0');
		$sUrl = $this->GetActionParam('Url', '');
		$sUser = $this->GetActionParam('User', '');
		$sPassword = $this->GetActionParam('Password', '');

		$mData = $this->getContactsSyncData($oAccount);

		$bResult = $this->StorageProvider()->Put($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'contacts_sync',
			\RainLoop\Utils::EncodeKeyValues(array(
				'Enable' => $bEnabled,
				'User' => $sUser,
				'Password' => APP_DUMMY === $sPassword && isset($mData['Password']) ?
					$mData['Password'] : (APP_DUMMY === $sPassword ? '' : $sPassword),
				'Url' => $sUrl
			))
		);

		return $this->DefaultResponse(__FUNCTION__, $bResult);
	}

	public function DoContactsSync() : array
	{
		$bResult = false;
		$oAccount = $this->getAccountFromToken();

		$oAddressBookProvider = $this->AddressBookProvider($oAccount);
		if ($oAddressBookProvider && $oAddressBookProvider->IsActive())
		{
			$mData = $this->getContactsSyncData($oAccount);
			if (isset($mData['Enable'], $mData['User'], $mData['Password'], $mData['Url']) && $mData['Enable'])
			{
				$bResult = $oAddressBookProvider->Sync(
					$oAccount->ParentEmailHelper(),
					$mData['Url'], $mData['User'], $mData['Password']);
			}
		}

		if (!$bResult)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::ContactsSyncError);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoContacts() : array
	{
		$oAccount = $this->getAccountFromToken();

		$sSearch = \trim($this->GetActionParam('Search', ''));
		$iOffset = (int) $this->GetActionParam('Offset', 0);
		$iLimit = (int) $this->GetActionParam('Limit', 20);
		$iOffset = 0 > $iOffset ? 0 : $iOffset;
		$iLimit = 0 > $iLimit ? 20 : $iLimit;

		$iResultCount = 0;
		$mResult = array();

		$oAbp = $this->AddressBookProvider($oAccount);
		if ($oAbp->IsActive())
		{
			$iResultCount = 0;
			$mResult = $oAbp->GetContacts($oAccount->ParentEmailHelper(),
				$iOffset, $iLimit, $sSearch, $iResultCount);
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Offset' => $iOffset,
			'Limit' => $iLimit,
			'Count' => $iResultCount,
			'Search' => $sSearch,
			'List' => $mResult
		));
	}

	public function DoContactsDelete() : array
	{
		$oAccount = $this->getAccountFromToken();
		$aUids = \explode(',', (string) $this->GetActionParam('Uids', ''));

		$aFilteredUids = \array_filter($aUids, function (&$mUid) {
			$mUid = (int) \trim($mUid);
			return 0 < $mUid;
		});

		$bResult = false;
		if (0 < \count($aFilteredUids) && $this->AddressBookProvider($oAccount)->IsActive())
		{
			$bResult = $this->AddressBookProvider($oAccount)->DeleteContacts($oAccount->ParentEmailHelper(), $aFilteredUids);
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult);
	}

	public function DoContactSave() : array
	{
		$oAccount = $this->getAccountFromToken();

		$bResult = false;

		$oAddressBookProvider = $this->AddressBookProvider($oAccount);
		$sRequestUid = \trim($this->GetActionParam('RequestUid', ''));
		if ($oAddressBookProvider && $oAddressBookProvider->IsActive() && 0 < \strlen($sRequestUid))
		{
			$sUid = \trim($this->GetActionParam('Uid', ''));

			$oContact = null;
			if (0 < \strlen($sUid))
			{
				$oContact = $oAddressBookProvider->GetContactByID($oAccount->ParentEmailHelper(), $sUid);
			}

			if (!$oContact)
			{
				$oContact = new \RainLoop\Providers\AddressBook\Classes\Contact();
				if (0 < \strlen($sUid))
				{
					$oContact->IdContact = $sUid;
				}
			}

			$oContact->Properties = array();
			$aProperties = $this->GetActionParam('Properties', array());
			if (\is_array($aProperties))
			{
				foreach ($aProperties as $aItem)
				{
					if ($aItem && isset($aItem[0], $aItem[1]) && \is_numeric($aItem[0]))
					{
						$oProp = new \RainLoop\Providers\AddressBook\Classes\Property();
						$oProp->Type = (int) $aItem[0];
						$oProp->Value = $aItem[1];
						$oProp->TypeStr = empty($aItem[2]) ? '': $aItem[2];

						$oContact->Properties[] = $oProp;
					}
				}
			}

			if (!empty($oContact->Etag))
			{
				$oContact->Etag = \md5($oContact->ToVCard());
			}

			$oContact->PopulateDisplayAndFullNameValue(true);

			$bResult = $oAddressBookProvider->ContactSave($oAccount->ParentEmailHelper(), $oContact);
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'RequestUid' => $sRequestUid,
			'ResultID' => $bResult ? $oContact->IdContact : '',
			'Result' => $bResult
		));
	}

}
