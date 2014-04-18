<?php

namespace RainLoop\Providers;

use \RainLoop\Providers\AddressBook\Enumerations\PropertyType as PropertyType;

class AddressBook extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\AddressBook\AddressBookInterface
	 */
	private $oDriver;

	/**
	 * @param \RainLoop\Providers\AddressBook\Interface $oDriver
	 *
	 * @return void
	 */
	public function __construct($oDriver)
	{
		$this->oDriver = null;
		if ($oDriver instanceof \RainLoop\Providers\AddressBook\AddressBookInterface)
		{
			$this->oDriver = $oDriver;
		}
	}

	/**
	 * @return string
	 */
	public function Test()
	{
		\sleep(1);
		return $this->oDriver instanceof \RainLoop\Providers\AddressBook\AddressBookInterface ?
			$this->oDriver->Test() : 'Personal address book driver is not allowed';
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\AddressBook\AddressBookInterface &&
			$this->oDriver->IsSupported();
	}

	/**
	 * @return bool
	 */
	public function IsSupported()
	{
		return $this->oDriver instanceof \RainLoop\Providers\AddressBook\AddressBookInterface &&
			$this->oDriver->IsSupported();
	}

	/**
	 * @param string $sEmail
	 * @param \RainLoop\Providers\AddressBook\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function ContactSave($sEmail, &$oContact)
	{
		return $this->IsActive() ? $this->oDriver->ContactSave($sEmail, $oContact) : false;
	}

	/**
	 * @param string $sEmail
	 * @param array $aContactIds
	 *
	 * @return bool
	 */
	public function DeleteContacts($sEmail, $aContactIds)
	{
		return $this->IsActive() ? $this->oDriver->DeleteContacts($sEmail, $aContactIds) : false;
	}

	/**
	 * @param string $sEmail
	 * @param int $iOffset = 0
	 * @param type $iLimit = 20
	 * @param string $sSearch = ''
	 * @param int $iResultCount = 0
	 *
	 * @return array
	 */
	public function GetContacts($sEmail, $iOffset = 0, $iLimit = 20, $sSearch = '', &$iResultCount = 0)
	{
		return $this->IsActive() ? $this->oDriver->GetContacts($sEmail,
			$iOffset, $iLimit, $sSearch, $iResultCount) : array();
	}

	/**
	 * @param string $sEmail
	 * @param string $mID
	 * @param bool $bIsStrID = false
	 *
	 * @return \RainLoop\Providers\AddressBook\Classes\Contact|null
	 */
	public function GetContactByID($sEmail, $mID, $bIsStrID = false)
	{
		return $this->IsActive() ? $this->oDriver->GetContactByID($sEmail, $mID, $bIsStrID) : null;
	}

	/**
	 * @param string $sEmail
	 * @param string $sSearch
	 * @param int $iLimit = 20
	 *
	 * @return array
	 *
	 * @throws \InvalidArgumentException
	 */
	public function GetSuggestions($sEmail, $sSearch, $iLimit = 20)
	{
		return $this->IsActive() ? $this->oDriver->GetSuggestions($sEmail, $sSearch, $iLimit) : array();
	}

	/**
	 * @param string $sEmail
	 * @param array $aEmails
	 * @param bool $bCreateAuto = true
	 *
	 * @return bool
	 */
	public function IncFrec($sEmail, $aEmails, $bCreateAuto = true)
	{
		return $this->IsActive() ? $this->oDriver->IncFrec($sEmail, $aEmails, $bCreateAuto) : false;
	}

	/**
	 * @param string $sCsvName
	 *
	 * @return int
	 */
	private function csvNameToTypeConvertor($sCsvName)
	{
		static $aMap = null;
		if (null === $aMap)
		{
			$aMap = array(
				'Title' => PropertyType::FULLNAME,
				'First Name' => PropertyType::FIRST_NAME,
				'Middle Name' => PropertyType::MIDDLE_NAME,
				'Last Name' => PropertyType::LAST_NAME,
				'Suffix' => PropertyType::NAME_SUFFIX,
				'Business Fax' => PropertyType::FAX_BUSSINES,
				'Business Phone' => PropertyType::PHONE_BUSSINES,
				'Business Phone 2' => PropertyType::PHONE_BUSSINES,
				'Company Main Phone' => PropertyType::PHONE_BUSSINES,
				'Home Fax' => PropertyType::FAX_PERSONAL,
				'Home Phone' => PropertyType::PHONE_PERSONAL,
				'Home Phone 2' => PropertyType::PHONE_PERSONAL,
				'Mobile Phone' => PropertyType::MOBILE_PERSONAL,
				'Other Fax' => PropertyType::FAX_OTHER,
				'Other Phone' => PropertyType::PHONE_OTHER,
//				'Primary Phone' => PropertyType::PHONE_PERSONAL,
				'E-mail Address' => PropertyType::EMAIl_PERSONAL,
				'E-mail 2 Address' => PropertyType::EMAIl_OTHER,
				'E-mail 3 Address' => PropertyType::EMAIl_OTHER,
				'E-mail Display Name' => PropertyType::FULLNAME,
				'E-mail 2 Display Name' => PropertyType::FULLNAME,
				'E-mail 3 Display Name' => PropertyType::FULLNAME,
				'Notes' => PropertyType::NOTE,
				'Web Page' => PropertyType::WEB_PAGE_PERSONAL,
				'WebPage' => PropertyType::WEB_PAGE_PERSONAL,
			);

			$aMap = \array_change_key_case($aMap, CASE_LOWER);
		}
		
		$sCsvNameLower = \MailSo\Base\Utils::IsAscii($sCsvName) ? \strtolower($sCsvName) : '';
		return isset($aMap[$sCsvNameLower]) ? $aMap[$sCsvNameLower] : PropertyType::UNKNOWN;
	}

	/**
	 * @param string $sEmail
	 * @param array $aCsvData
	 *
	 * @return int
	 */
	public function ImportCsvArray($sEmail, $aCsvData)
	{
		$iCount = 0;
		if ($this->IsActive() && \is_array($aCsvData) && 0 < \count($aCsvData))
		{
			$oContact = new \RainLoop\Providers\AddressBook\Classes\Contact();
			foreach ($aCsvData as $aItem)
			{
				foreach ($aItem as $sItemName => $sItemValue)
				{
					$sItemName = \trim($sItemName);
					$sItemValue = \trim($sItemValue);

					if (!empty($sItemName) && !empty($sItemValue))
					{
						$iType = $this->csvNameToTypeConvertor($sItemName);
						if (PropertyType::UNKNOWN !== $iType)
						{
							$oProp = new \RainLoop\Providers\AddressBook\Classes\Property();
							$oProp->Type = $iType;
							$oProp->Value = $sItemValue;

							$oContact->Properties[] = $oProp;
						}
					}
				}

				if ($oContact && 0 < \count($oContact->Properties))
				{
					if ($this->ContactSave($sEmail, $oContact))
					{
						$iCount++;
					}
				}

				$oContact->Clear();
			}

			unset($oContact);
		}
		
		return $iCount;
	}
	
	/**
	 * @param string $sEmail
	 * @param string $sVcfData
	 *
	 * @return int
	 */
	public function ImportVcfFile($sEmail, $sVcfData)
	{
		$iCount = 0;
		if ($this->IsActive() && \is_string($sVcfData))
		{
			$sVcfData = \trim($sVcfData);
			if ("\xef\xbb\xbf" === \substr($sVcfData, 0, 3))
			{
				$sVcfData = \substr($sVcfData, 3);
			}

			$oVCardSplitter = null;
			try
			{
				$oVCardSplitter = new \Sabre\VObject\Splitter\VCard($sVcfData);
			}
			catch (\Exception $oExc)
			{
				$this->Logger()->WriteException($oExc);
			}

			if ($oVCardSplitter)
			{
				$oContact = new \RainLoop\Providers\AddressBook\Classes\Contact();

				$oVCard = null;

				while ($oVCard = $oVCardSplitter->getNext())
				{
					if ($oVCard instanceof \Sabre\VObject\Component\VCard)
					{
						if (empty($oVCard->UID))
						{
							$oVCard->UID = \Sabre\DAV\UUIDUtil::getUUID();
						}

						$oContact->ParseVCard($oVCard, $oVCard->serialize());
						if (0 < \count($oContact->Properties))
						{
							if ($this->ContactSave($sEmail, $oContact))
							{
								$iCount++;
							}
						}

						$oContact->Clear();
					}
				}
			}
		}

		return $iCount;
	}
}
