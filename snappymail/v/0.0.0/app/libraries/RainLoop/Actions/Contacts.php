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

		$aFilteredUids = \array_filter(\array_map('intval', $aUids));

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
					if ($aItem && isset($aItem['type'], $aItem['value'])
					 && \is_numeric($aItem['type']) && (int) $aItem['type']
					 && \RainLoop\Providers\AddressBook\Enumerations\PropertyType::FULLNAME != $aItem['type']
					 && \strlen(\trim($aItem['value'])))
					{
						$oProp = new \RainLoop\Providers\AddressBook\Classes\Property();
						$oProp->Type = (int) $aItem['type'];
						$oProp->Value = \trim($aItem['value']);
						$oProp->TypeStr = $aItem['typeStr'] ?? '';

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

	public function UploadContacts() : array
	{
		$oAccount = $this->getAccountFromToken();

		$mResponse = false;

		$aFile = $this->GetActionParam('File', null);
		$iError = $this->GetActionParam('Error', \RainLoop\Enumerations\UploadError::UNKNOWN);

		if ($oAccount && UPLOAD_ERR_OK === $iError && \is_array($aFile))
		{
			$sSavedName = 'upload-post-'.\md5($aFile['name'].$aFile['tmp_name']);
			if (!$this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $aFile['tmp_name']))
			{
				$iError = \RainLoop\Enumerations\UploadError::ON_SAVING;
			}
			else
			{
				\ini_set('auto_detect_line_endings', true);
				$mData = $this->FilesProvider()->GetFile($oAccount, $sSavedName);
				if ($mData)
				{
					$sFileStart = \fread($mData, 20);
					\rewind($mData);

					if (false !== $sFileStart)
					{
						$sFileStart = \trim($sFileStart);
						if (false !== \strpos($sFileStart, 'BEGIN:VCARD'))
						{
							$mResponse = $this->importContactsFromVcfFile($oAccount, $mData);
						}
						else if (false !== \strpos($sFileStart, ',') || false !== \strpos($sFileStart, ';'))
						{
							$mResponse = $this->importContactsFromCsvFile($oAccount, $mData, $sFileStart);
						}
					}
				}

				if (\is_resource($mData))
				{
					\fclose($mData);
				}

				unset($mData);
				$this->FilesProvider()->Clear($oAccount, $sSavedName);

				\ini_set('auto_detect_line_endings', false);
			}
		}

		if (UPLOAD_ERR_OK !== $iError)
		{
			$iClientError = \RainLoop\Enumerations\UploadClientError::NORMAL;
			$sError = $this->getUploadErrorMessageByCode($iError, $iClientError);

			if (!empty($sError))
			{
				return $this->FalseResponse(__FUNCTION__, $iClientError, $sError);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $mResponse);
	}

	protected function getContactsSyncData(\RainLoop\Model\Account $oAccount) : ?array
	{
		$mResult = null;
		$sData = $this->StorageProvider()->Get($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'contacts_sync'
		);
		if (!empty($sData)) {
			$aData = \RainLoop\Utils::DecodeKeyValues($sData);
			if ($aData) {
				$mResult = array(
					'Enable' => isset($aData['Enable']) ? !!$aData['Enable'] : false,
					'Url' => isset($aData['Url']) ? \trim($aData['Url']) : '',
					'User' => isset($aData['User']) ? \trim($aData['User']) : '',
					'Password' => isset($aData['Password']) ? $aData['Password'] : ''
				);
			}
		}
		return $mResult;
	}

	public function RawContactsVcf() : bool
	{
		$oAccount = $this->getAccountFromToken();

		\header('Content-Type: text/x-vcard; charset=UTF-8');
		\header('Content-Disposition: attachment; filename="contacts.vcf"');
		\header('Accept-Ranges: none');
		\header('Content-Transfer-Encoding: binary');

		$this->oHttp->ServerNoCache();

		return $this->AddressBookProvider($oAccount)->IsActive() ?
			$this->AddressBookProvider($oAccount)->Export($oAccount->ParentEmailHelper(), 'vcf') : false;
	}

	public function RawContactsCsv() : bool
	{
		$oAccount = $this->getAccountFromToken();

		\header('Content-Type: text/csv; charset=UTF-8');
		\header('Content-Disposition: attachment; filename="contacts.csv"');
		\header('Accept-Ranges: none');
		\header('Content-Transfer-Encoding: binary');

		$this->oHttp->ServerNoCache();

		return $this->AddressBookProvider($oAccount)->IsActive() ?
			$this->AddressBookProvider($oAccount)->Export($oAccount->ParentEmailHelper(), 'csv') : false;
	}

}
