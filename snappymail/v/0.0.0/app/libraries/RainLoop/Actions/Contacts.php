<?php

namespace RainLoop\Actions;

trait Contacts
{

	public function DoSaveContactsSyncData() : array
	{
		$oAccount = $this->getAccountFromToken();

		$oAddressBookProvider = $this->AddressBookProvider($oAccount);
		if (!$oAddressBookProvider || !$oAddressBookProvider->IsActive()) {
			return $this->FalseResponse();
		}

		$sPassword = $this->GetActionParam('Password', '');

		$mData = $this->getContactsSyncData($oAccount);

		$bResult = $this->setContactsSyncData($oAccount, array(
			'Mode' => \intval($this->GetActionParam('Mode', '0')),
			'User' => $this->GetActionParam('User', ''),
			'Password' => static::APP_DUMMY === $sPassword
				? (isset($mData['Password']) ? $mData['Password'] : '')
				: $sPassword,
			'Url' => $this->GetActionParam('Url', '')
		));

		return $this->DefaultResponse($bResult);
	}

	public function DoContactsSync() : array
	{
		$oAccount = $this->getAccountFromToken();
		$oAddressBookProvider = $this->AddressBookProvider($oAccount);
		if (!$oAddressBookProvider) {
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::ContactsSyncError, null, 'No AddressBookProvider');
		}
		\ignore_user_abort(true);
		\SnappyMail\HTTP\Stream::start(/*$binary = false*/);
		\SnappyMail\HTTP\Stream::JSON(['messsage'=>'start']);
		if (!$oAddressBookProvider->Sync()) {
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::ContactsSyncError, null, 'AddressBookProvider->Sync() failed');
		}
		return $this->TrueResponse();
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
		if ($oAbp->IsActive()) {
			$iResultCount = 0;
			$mResult = $oAbp->GetContacts($iOffset, $iLimit, $sSearch, $iResultCount);
		}

		return $this->DefaultResponse(array(
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
		if (\count($aFilteredUids) && $this->AddressBookProvider($oAccount)->IsActive()) {
			$bResult = $this->AddressBookProvider($oAccount)->DeleteContacts($aFilteredUids);
		}

		return $this->DefaultResponse($bResult);
	}

	public function DoContactSave() : array
	{
		$oAccount = $this->getAccountFromToken();

		$bResult = false;

		if ($this->HasActionParam('Uid') && $this->HasActionParam('jCard')) {
			$oAddressBookProvider = $this->AddressBookProvider($oAccount);
			if ($oAddressBookProvider && $oAddressBookProvider->IsActive()) {
				$vCard = \Sabre\VObject\Reader::readJson($this->GetActionParam('jCard'));
				if ($vCard && $vCard instanceof \Sabre\VObject\Component\VCard) {
					$vCard->REV = \gmdate('Ymd\\THis\\Z');
					$vCard->PRODID = 'SnappyMail-'.APP_VERSION;
					$sUid = \trim($this->GetActionParam('Uid'));
					$oContact = $sUid ? $oAddressBookProvider->GetContactByID($sUid) : null;
					if (!$oContact) {
						$oContact = new \RainLoop\Providers\AddressBook\Classes\Contact();
					}
					$oContact->setVCard($vCard);
					$bResult = $oAddressBookProvider->ContactSave($oContact);
				}
			}
		}

		return $this->DefaultResponse(array(
			'ResultID' => $bResult ? $oContact->id : '',
			'Result' => $bResult
		));
	}

	public function UploadContacts() : array
	{
		$oAccount = $this->getAccountFromToken();

		$mResponse = false;

		$aFile = $this->GetActionParam('File', null);
		$iError = $this->GetActionParam('Error', \RainLoop\Enumerations\UploadError::UNKNOWN);

		if ($oAccount && UPLOAD_ERR_OK === $iError && \is_array($aFile)) {
			$sSavedName = 'upload-post-'.\md5($aFile['name'].$aFile['tmp_name']);
			if (!$this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $aFile['tmp_name'])) {
				$iError = \RainLoop\Enumerations\UploadError::ON_SAVING;
			} else {
				\ini_set('auto_detect_line_endings', true);
				$mData = $this->FilesProvider()->GetFile($oAccount, $sSavedName);
				if ($mData) {
					$sFileStart = \fread($mData, 20);
					\rewind($mData);

					if (false !== $sFileStart) {
						$sFileStart = \trim($sFileStart);
						if (false !== \strpos($sFileStart, 'BEGIN:VCARD')) {
							$mResponse = $this->importContactsFromVcfFile($oAccount, $mData);
						} else if (false !== \strpos($sFileStart, ',') || false !== \strpos($sFileStart, ';')) {
							$mResponse = $this->importContactsFromCsvFile($oAccount, $mData, $sFileStart);
						}
					}
				}

				if (\is_resource($mData)) {
					\fclose($mData);
				}

				unset($mData);
				$this->FilesProvider()->Clear($oAccount, $sSavedName);

				\ini_set('auto_detect_line_endings', false);
			}
		}

		if (UPLOAD_ERR_OK !== $iError) {
			$iClientError = \RainLoop\Enumerations\UploadError::NORMAL;
			$sError = $this->getUploadErrorMessageByCode($iError, $iClientError);
			if (!empty($sError)) {
				return $this->FalseResponse($iClientError, $sError);
			}
		}

		return $this->DefaultResponse($mResponse);
	}

	public function setContactsSyncData(\RainLoop\Model\Account $oAccount, array $aData) : bool
	{
		if (!isset($aData['Mode'])) {
			$aData['Mode'] = empty($aData['Enable']) ? 0 : 1;
		}
		$oMainAccount = $this->getMainAccountFromToken();
		if ($aData['Password']) {
			$aData['Password'] = \SnappyMail\Crypt::EncryptToJSON($aData['Password'], $oMainAccount->CryptKey());
		}
		$aData['PasswordHMAC'] = $aData['Password'] ? \hash_hmac('sha1', $aData['Password'], $oMainAccount->CryptKey()) : null;
		return $this->StorageProvider()->Put(
			$oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'contacts_sync',
			\json_encode($aData)
		);
	}

	protected function getContactsSyncData(\RainLoop\Model\Account $oAccount) : ?array
	{
		$sData = $this->StorageProvider()->Get($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'contacts_sync'
		);
		if (!empty($sData)) {
			$aData = \json_decode($sData, true);
			if ($aData) {
				if ($aData['Password']) {
					$oMainAccount = $this->getMainAccountFromToken();
					// Verify oAccount password hasn't changed so that Password can be decrypted
					if ($aData['PasswordHMAC'] !== \hash_hmac('sha1', $aData['Password'], $oMainAccount->CryptKey())) {
						// Failed
						$aData['Password'] = null;
					} else {
						// Success
						$aData['Password'] = \SnappyMail\Crypt::DecryptFromJSON(
							$aData['Password'],
							$oMainAccount->CryptKey()
						);
					}
				}
				if (!isset($aData['Mode'])) {
					$aData['Mode'] = empty($aData['Enable']) ? 0 : 1;
				}
				return $aData;
			}

			return \SnappyMail\Upgrade::ConvertInsecureContactsSync($this, $oAccount);
		}
		return null;
	}

	public function RawContactsVcf() : bool
	{
		$oAccount = $this->getAccountFromToken();

		\header('Content-Type: text/x-vcard; charset=UTF-8');
		\header('Content-Disposition: attachment; filename="contacts.vcf"');
		\header('Accept-Ranges: none');
		\header('Content-Transfer-Encoding: binary');

		$this->Http()->ServerNoCache();

		$oAddressBookProvider = $this->AddressBookProvider($oAccount);
		return $oAddressBookProvider->IsActive() ?
			$oAddressBookProvider->Export('vcf') : false;
	}

	public function RawContactsCsv() : bool
	{
		$oAccount = $this->getAccountFromToken();

		\header('Content-Type: text/csv; charset=UTF-8');
		\header('Content-Disposition: attachment; filename="contacts.csv"');
		\header('Accept-Ranges: none');
		\header('Content-Transfer-Encoding: binary');

		$this->Http()->ServerNoCache();

		$oAddressBookProvider = $this->AddressBookProvider($oAccount);
		return $oAddressBookProvider->IsActive() ?
			$oAddressBookProvider->Export('csv') : false;
	}

	private function importContactsFromVcfFile(\RainLoop\Model\Account $oAccount, /*resource*/ $rFile): int
	{
		$iCount = 0;
		if ($oAccount && \is_resource($rFile)) {
			$oAddressBookProvider = $this->AddressBookProvider($oAccount);
			if ($oAddressBookProvider && $oAddressBookProvider->IsActive()) {
				$sFile = \stream_get_contents($rFile);
				if (\is_resource($rFile)) {
					\fclose($rFile);
				}

				if (is_string($sFile) && 5 < \strlen($sFile)) {
					$this->Logger()->Write('Import contacts from vcf');
					$iCount = $oAddressBookProvider->ImportVcfFile($sFile);
				}
			}
		}

		return $iCount;
	}

	private function importContactsFromCsvFile(\RainLoop\Model\Account $oAccount, /*resource*/ $rFile, string $sFileStart): int
	{
		$iCount = 0;
		$aHeaders = null;
		$aData = array();

		if ($oAccount && \is_resource($rFile)) {
			$oAddressBookProvider = $this->AddressBookProvider($oAccount);
			if ($oAddressBookProvider && $oAddressBookProvider->IsActive()) {
				$sDelimiter = ((int)\strpos($sFileStart, ',') > (int)\strpos($sFileStart, ';')) ? ',' : ';';

				\setlocale(LC_CTYPE, 'en_US.UTF-8');
				while (false !== ($mRow = \fgetcsv($rFile, 5000, $sDelimiter, '"'))) {
					if (null === $aHeaders) {
						if (3 >= \count($mRow)) {
							return 0;
						}

						$aHeaders = $mRow;

						foreach ($aHeaders as $iIndex => $sHeaderValue) {
							$aHeaders[$iIndex] = \MailSo\Base\Utils::Utf8Clear($sHeaderValue);
						}
					} else {
						$aNewItem = array();
						foreach ($aHeaders as $iIndex => $sHeaderValue) {
							$aNewItem[$sHeaderValue] = isset($mRow[$iIndex]) ? $mRow[$iIndex] : '';
						}

						$aData[] = $aNewItem;
					}
				}

				if (\count($aData)) {
					$this->oLogger->Write('Import contacts from csv');
					$iCount = $oAddressBookProvider->ImportCsvArray($aData);
				}
			}
		}

		return $iCount;
	}

}
