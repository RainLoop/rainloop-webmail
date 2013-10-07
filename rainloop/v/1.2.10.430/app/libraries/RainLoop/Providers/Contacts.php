<?php

namespace RainLoop\Providers;

class Contacts extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Contacts\ContactsInterface
	 */
	private $oDriver;

	/**
	 * @param \RainLoop\Providers\Contacts\ContactsInterface $oDriver
	 *
	 * @return void
	 */
	public function __construct($oDriver)
	{
		$this->oDriver = null;
		if ($oDriver instanceof \RainLoop\Providers\Contacts\ContactsInterface)
		{
			$this->oDriver = $oDriver;
		}
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Contacts\ContactsInterface;
	}

	/**
	 * @return bool
	 */
	public function IsSupported()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Contacts\ContactsInterface &&
			$this->oDriver->IsSupported();
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param int $iIdContact
	 *
	 * @return array
	 */
	public function GetContactById($oAccount, $iIdContact)
	{
		return $this->oDriver ? $this->oDriver->GetContactById($oAccount, $iIdContact) : null;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param int $iOffset = 0
	 * @param int $iLimit = 20
	 * @param string $sSearch = ''
	 *
	 * @return array
	 */
	public function GetContacts($oAccount, $iOffset = 0, $iLimit = 20, $sSearch = '')
	{
		return $this->oDriver ? $this->oDriver->GetContacts($oAccount, $iOffset, $iLimit, $sSearch) : array();
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 * @return array
	 */
	public function GetContactsImageHashes($oAccount)
	{
		return $this->oDriver ? $this->oDriver->GetContactsImageHashes($oAccount) : array();
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param \RainLoop\Providers\Contacts\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function CreateContact($oAccount, &$oContact)
	{
		return $this->oDriver ? $this->oDriver->CreateContact($oAccount, $oContact) : false;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param \RainLoop\Providers\Contacts\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function UpdateContact($oAccount, &$oContact)
	{
		return $this->oDriver ? $this->oDriver->UpdateContact($oAccount, $oContact) : false;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aContactIds
	 *
	 * @return bool
	 */
	public function DeleteContacts($oAccount, $aContactIds)
	{
		return $this->oDriver ? $this->oDriver->DeleteContacts($oAccount, $aContactIds) : false;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aContactIds
	 *
	 * @return bool
	 */
	public function IncFrec($oAccount, $aContactIds)
	{
		return $this->oDriver ? $this->oDriver->IncFrec($oAccount, $aContactIds) : false;
	}
}