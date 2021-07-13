<?php

namespace RainLoop\Providers;

use \RainLoop\Providers\AddressBook\Enumerations\PropertyType as PropertyType;

class AddressBook extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\AddressBook\AddressBookInterface
	 */
	private $oDriver;

	public function __construct(?\RainLoop\Providers\AddressBook\AddressBookInterface $oDriver)
	{
		$this->oDriver = $oDriver;
	}

	public function Test() : string
	{
		\sleep(1);
		return $this->oDriver instanceof \RainLoop\Providers\AddressBook\AddressBookInterface ?
			$this->oDriver->Test() : 'Personal address book driver is not allowed';
	}

	public function IsActive() : bool
	{
		return $this->oDriver instanceof \RainLoop\Providers\AddressBook\AddressBookInterface &&
			$this->oDriver->IsSupported();
	}

	public function IsSupported() : bool
	{
		return $this->oDriver instanceof \RainLoop\Providers\AddressBook\AddressBookInterface &&
			$this->oDriver->IsSupported();
	}

	public function IsSharingAllowed() : bool
	{
		return $this->oDriver instanceof \RainLoop\Providers\AddressBook\AddressBookInterface &&
			$this->oDriver->IsSharingAllowed();
	}

	public function Sync(string $sEmail, string $sUrl, string $sUser, string $sPassword) : bool
	{
		return $this->IsActive() ? $this->oDriver->Sync($sEmail, $sUrl, $sUser, $sPassword) : false;
	}

	public function Export(string $sEmail, string $sType = 'vcf') : bool
	{
		return $this->IsActive() ? $this->oDriver->Export($sEmail, $sType) : false;
	}

	public function ContactSave(string $sEmail, \RainLoop\Providers\AddressBook\Classes\Contact $oContact) : bool
	{
		return $this->IsActive() ? $this->oDriver->ContactSave($sEmail, $oContact) : false;
	}

	public function DeleteContacts(string $sEmail, array $aContactIds) : bool
	{
		return $this->IsActive() ? $this->oDriver->DeleteContacts($sEmail, $aContactIds) : false;
	}

	public function DeleteAllContacts(string $sEmail) : bool
	{
		return $this->IsActive() ? $this->oDriver->DeleteAllContacts($sEmail) : false;
	}

	public function GetContacts(string $sEmail, int $iOffset = 0, int $iLimit = 20, string $sSearch = '', int &$iResultCount = 0) : array
	{
		return $this->IsActive() ? $this->oDriver->GetContacts($sEmail,
			$iOffset, $iLimit, $sSearch, $iResultCount) : array();
	}

	public function GetContactByID(string $sEmail, $mID, bool $bIsStrID = false) : ?\RainLoop\Providers\AddressBook\Classes\Contact
	{
		return $this->IsActive() ? $this->oDriver->GetContactByID($sEmail, $mID, $bIsStrID) : null;
	}

	/**
	 * @throws \InvalidArgumentException
	 */
	public function GetSuggestions(string $sEmail, string $sSearch, int $iLimit = 20) : array
	{
		return $this->IsActive() ? $this->oDriver->GetSuggestions($sEmail, $sSearch, $iLimit) : array();
	}

	public function IncFrec(string $sEmail, array $aEmails, bool $bCreateAuto = true) : bool
	{
		return $this->IsActive() ? $this->oDriver->IncFrec($sEmail, $aEmails, $bCreateAuto) : false;
	}

	private function csvNameToTypeConvertor(string $sCsvName) : int
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

	public function ImportCsvArray(string $sEmail, array $aCsvData) : int
	{
		$iCount = 0;
		if ($this->IsActive() && 0 < \count($aCsvData))
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

	public function ImportVcfFile(string $sEmail, string $sVcfData) : int
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
			catch (\Throwable $oExc)
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
						\MailSo\Base\Utils::ResetTimeLimit();

						$oContact->PopulateByVCard($oVCard);

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
