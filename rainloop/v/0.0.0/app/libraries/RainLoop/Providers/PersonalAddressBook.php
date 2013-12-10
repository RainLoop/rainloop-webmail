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
	public function IsSupported()
	{
		return $this->oDriver instanceof \RainLoop\Providers\PersonalAddressBook\PersonalAddressBookInterface &&
			$this->oDriver->IsSupported();
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param \RainLoop\Providers\PersonalAddressBook\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function ContactSave($oAccount, &$oContact)
	{
		return $this->IsActive() ? $this->oDriver->ContactSave($oAccount, $oContact) : false;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aContactIds
	 *
	 * @return bool
	 */
	public function DeleteContacts($oAccount, $aContactIds)
	{
		return $this->IsActive() ? $this->oDriver->DeleteContacts($oAccount, $aContactIds) : false;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param int $iOffset = 0
	 * @param type $iLimit = 20
	 * @param string $sSearch = ''
	 * @param int $iScopeType = \RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_
	 * @param int $iResultCount = 0
	 *
	 * @return array
	 */
	public function GetContacts($oAccount, $iOffset = 0, $iLimit = 20, $sSearch = '',
		$iScopeType = \RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_, &$iResultCount = 0)
	{
		return $this->IsActive() ? $this->oDriver->GetContacts($oAccount,
			$iOffset, $iLimit, $sSearch, $iScopeType, $iResultCount) : array();
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sSearch
	 * @param int $iLimit = 20
	 *
	 * @return array
	 *
	 * @throws \InvalidArgumentException
	 */
	public function GetSuggestions($oAccount, $sSearch, $iLimit = 20)
	{
		return $this->IsActive() ? $this->oDriver->GetSuggestions($oAccount, $sSearch, $iLimit) : array();
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aEmails
	 *  @param bool $bCreateAuto = true
	 *
	 * @return bool
	 */
	public function IncFrec($oAccount, $aEmails, $bCreateAuto = true)
	{
		return $this->IsActive() ? $this->oDriver->IncFrec($oAccount, $aEmails, $bCreateAuto) : false;
	}
}
