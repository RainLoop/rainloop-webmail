<?php

namespace RainLoop\Providers;

class PersonalAddressBook extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\PersonalAddressBook\PersonalAddressBookInterface
	 */
	private $oDriver;

	/**
	 * @param \RainLoop\Providers\PersonalAddressBook\PersonalAddressBookInterface $oDriver
	 *
	 * @return void
	 */
	public function __construct($oDriver)
	{
		$this->oDriver = null;
		if ($oDriver instanceof \RainLoop\Providers\PersonalAddressBook\PersonalAddressBookInterface)
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
		return $this->oDriver instanceof \RainLoop\Providers\PersonalAddressBook\PersonalAddressBookInterface ?
			$this->oDriver->Test() : 'Personal address book driver is not allowed';
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\PersonalAddressBook\PersonalAddressBookInterface &&
			$this->oDriver->IsSupported();
	}

	/**
	 * @return bool
	 */
	public function IsSharingAllowed()
	{
		return $this->oDriver instanceof \RainLoop\Providers\PersonalAddressBook\PersonalAddressBookInterface &&
			$this->oDriver->IsSharingAllowed();
	}

	/**
	 * @return bool
	 */
	public function IsSupported()
	{
		return $this->oDriver instanceof \RainLoop\Providers\PersonalAddressBook\PersonalAddressBookInterface &&
			$this->oDriver->IsSupported();
	}

	/**
	 * @param string $sEmail
	 * 
	 * @return string
	 */
	public function GetUserUidByEmail($sEmail)
	{
		return $this->oDriver instanceof \RainLoop\Providers\PersonalAddressBook\PersonalAddressBookInterface ?
			$this->oDriver->GetUserUidByEmail($sEmail) : '';
	}

	/**
	 * @param string $sEmail
	 *
	 * @return int
	 */
	public function GetCtagByEmail($sEmail)
	{
		return $this->oDriver instanceof \RainLoop\Providers\PersonalAddressBook\PersonalAddressBookInterface ?
			$this->oDriver->GetCtagByEmail($sEmail) : 0;
	}

	/**
	 * @param string $sEmail
	 * @param bool $bCreate = false
	 *
	 * @return string
	 */
	public function GetUserHashByEmail($sEmail, $bCreate = false)
	{
		return $this->oDriver instanceof \RainLoop\Providers\PersonalAddressBook\PersonalAddressBookInterface ?
			$this->oDriver->GetUserHashByEmail($sEmail, $bCreate) : '';
	}

	/**
	 * @param bool $bConsiderShare = true
	 */
	public function ConsiderShare($bConsiderShare = true)
	{
		if ($this->oDriver)
		{
			$this->oDriver->ConsiderShare($bConsiderShare);
		}

		return $this;
	}

	/**
	 * @param string $sEmail
	 * @param \RainLoop\Providers\PersonalAddressBook\Classes\Contact $oContact
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
	 * @param string $sID
	 * @param bool $bIsStrID = false
	 *
	 * @return \RainLoop\Providers\PersonalAddressBook\Classes\Contact|null
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
}
