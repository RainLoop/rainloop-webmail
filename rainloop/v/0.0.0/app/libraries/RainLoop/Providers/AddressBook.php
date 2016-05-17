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
	 * @return bool
	 */
	public function IsSharingAllowed()
	{
		return $this->oDriver instanceof \RainLoop\Providers\AddressBook\AddressBookInterface &&
			$this->oDriver->IsSharingAllowed();
	}

	/**
	 * @param string $sEmail
	 * @param string $sUrl
	 * @param string $sUser
	 * @param string $sPassword
	 *
	 * @return bool
	 */
	public function Sync($sEmail, $sUrl, $sUser, $sPassword)
	{
		return $this->IsActive() ? $this->oDriver->Sync($sEmail, $sUrl, $sUser, $sPassword) : false;
	}

	/**
	 * @param string $sEmail
	 * @param string $sType = 'vcf'
	 *
	 * @return bool
	 */
	public function Export($sEmail, $sType = 'vcf')
	{
		return $this->IsActive() ? $this->oDriver->Export($sEmail, $sType) : false;
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
	 *
	 * @return bool
	 */
	public function DeleteAllContacts($sEmail)
	{
		return $this->IsActive() ? $this->oDriver->DeleteAllContacts($sEmail) : false;
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
				'Name' => PropertyType::FULLNAME,
				'FullName' => PropertyType::FULLNAME,
				'DisplayName' => PropertyType::FULLNAME,
				'GivenName' => PropertyType::FULLNAME,
				'First' => PropertyType::FIRST_NAME,
				'FirstName' => PropertyType::FIRST_NAME,
				'Middle' => PropertyType::MIDDLE_NAME,
				'MiddleName' => PropertyType::MIDDLE_NAME,
				'Last' => PropertyType::LAST_NAME,
				'LastName' => PropertyType::LAST_NAME,
				'Suffix' => PropertyType::NAME_SUFFIX,
				'NameSuffix' => PropertyType::NAME_SUFFIX,
				'Prefix' => PropertyType::NAME_PREFIX,
				'NamePrefix' => PropertyType::NAME_PREFIX,
				'ShortName' => PropertyType::NICK_NAME,
				'NickName' => PropertyType::NICK_NAME,
				'BusinessFax' => array(PropertyType::PHONE, 'Work,Fax'),
				'BusinessFax2' => array(PropertyType::PHONE, 'Work,Fax'),
				'BusinessFax3' => array(PropertyType::PHONE, 'Work,Fax'),
				'BusinessPhone' => array(PropertyType::PHONE, 'Work'),
				'BusinessPhone2' => array(PropertyType::PHONE, 'Work'),
				'BusinessPhone3' => array(PropertyType::PHONE, 'Work'),
				'CompanyPhone' => array(PropertyType::PHONE, 'Work'),
				'CompanyMainPhone' => array(PropertyType::PHONE, 'Work'),
				'HomeFax' => array(PropertyType::PHONE, 'Home,Fax'),
				'HomeFax2' => array(PropertyType::PHONE, 'Home,Fax'),
				'HomeFax3' => array(PropertyType::PHONE, 'Home,Fax'),
				'HomePhone' => array(PropertyType::PHONE, 'Home'),
				'HomePhone2' => array(PropertyType::PHONE, 'Home'),
				'HomePhone3' => array(PropertyType::PHONE, 'Home'),
				'Mobile' => array(PropertyType::PHONE, 'Mobile'),
				'MobilePhone' => array(PropertyType::PHONE, 'Mobile'),
				'BusinessMobile' => array(PropertyType::PHONE, 'Work,Mobile'),
				'BusinessMobilePhone' => array(PropertyType::PHONE, 'Work,Mobile'),
				'OtherFax' => array(PropertyType::PHONE, 'Other,Fax'),
				'OtherPhone' => array(PropertyType::PHONE, 'Other'),
				'PrimaryPhone' => array(PropertyType::PHONE, 'Pref,Home'),
				'Email' => array(PropertyType::EMAIl, 'Home'),
				'Email2' => array(PropertyType::EMAIl, 'Home'),
				'Email3' => array(PropertyType::EMAIl, 'Home'),
				'HomeEmail' => array(PropertyType::EMAIl, 'Home'),
				'HomeEmail2' => array(PropertyType::EMAIl, 'Home'),
				'HomeEmail3' => array(PropertyType::EMAIl, 'Home'),
				'PrimaryEmail' => array(PropertyType::EMAIl, 'Home'),
				'PrimaryEmail2' => array(PropertyType::EMAIl, 'Home'),
				'PrimaryEmail3' => array(PropertyType::EMAIl, 'Home'),
				'EmailAddress' => array(PropertyType::EMAIl, 'Home'),
				'Email2Address' => array(PropertyType::EMAIl, 'Home'),
				'Email3Address' => array(PropertyType::EMAIl, 'Home'),
				'OtherEmail' => array(PropertyType::EMAIl, 'Other'),
				'BusinessEmail' => array(PropertyType::EMAIl, 'Work'),
				'BusinessEmail2' => array(PropertyType::EMAIl, 'Work'),
				'BusinessEmail3' => array(PropertyType::EMAIl, 'Work'),
				'PersonalEmail' => array(PropertyType::EMAIl, 'Home'),
				'PersonalEmail2' => array(PropertyType::EMAIl, 'Home'),
				'PersonalEmail3' => array(PropertyType::EMAIl, 'Home'),
				'Notes' => PropertyType::NOTE,
				'Web' => PropertyType::WEB_PAGE,
				'BusinessWeb' => array(PropertyType::WEB_PAGE, 'Work'),
				'WebPage' => PropertyType::WEB_PAGE,
				'BusinessWebPage' => array(PropertyType::WEB_PAGE, 'Work'),
				'WebSite' => PropertyType::WEB_PAGE,
				'BusinessWebSite' => array(PropertyType::WEB_PAGE, 'Work'),
				'PersonalWebSite' => PropertyType::WEB_PAGE
			);

			$aMap = \array_change_key_case($aMap, CASE_LOWER);
		}

		$sCsvNameLower = \MailSo\Base\Utils::IsAscii($sCsvName) ? \preg_replace('/[\s\-]+/', '', \strtolower($sCsvName)) : '';
		return !empty($sCsvNameLower) && isset($aMap[$sCsvNameLower]) ? $aMap[$sCsvNameLower] : PropertyType::UNKNOWN;
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
				\MailSo\Base\Utils::ResetTimeLimit();

				foreach ($aItem as $sItemName => $sItemValue)
				{
					$sItemName = \trim($sItemName);
					$sItemValue = \trim($sItemValue);

					if (!empty($sItemName) && !empty($sItemValue))
					{
						$mData = $this->csvNameToTypeConvertor($sItemName);
						$iType = \is_array($mData) ? $mData[0] : $mData;

						if (PropertyType::UNKNOWN !== $iType)
						{
							$oProp = new \RainLoop\Providers\AddressBook\Classes\Property();
							$oProp->Type = $iType;
							$oProp->Value = $sItemValue;
							$oProp->TypeStr = \is_array($mData) && !empty($mData[1]) ? $mData[1] : '';

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

		if (\class_exists('SabreForRainLoop\DAV\Client') && $this->IsActive() && \is_string($sVcfData))
		{
			$sVcfData = \trim($sVcfData);
			if ("\xef\xbb\xbf" === \substr($sVcfData, 0, 3))
			{
				$sVcfData = \substr($sVcfData, 3);
			}

			$oVCardSplitter = null;
			try
			{
				$oVCardSplitter = new \SabreForRainLoop\VObject\Splitter\VCard($sVcfData);
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
					if ($oVCard instanceof \SabreForRainLoop\VObject\Component\VCard)
					{
						\MailSo\Base\Utils::ResetTimeLimit();

						if (empty($oVCard->UID))
						{
							$oVCard->UID = \SabreForRainLoop\DAV\UUIDUtil::getUUID();
						}

						$oContact->PopulateByVCard($oVCard->UID, $oVCard->serialize());

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
