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
	 * @return bool
	 */
	public function SynchronizeStorage()
	{
		return $this->IsSupported() && \method_exists($this->oDriver, 'SynchronizeStorage') &&
			$this->oDriver->SynchronizeStorage();
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sSearch
	 *
	 * @return array
	 *
	 * @throws \InvalidArgumentException
	 */
	public function GetSuggestions($oAccount, $sSearch)
	{
		return $this->IsActive() ? $this->oDriver->GetSuggestions($oAccount, $sSearch) : array();
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aEmail
	 *
	 * @return bool
	 */
	public function IncFrec($oAccount, $aEmail)
	{
		return $this->IsActive() ? $this->oDriver->IncFrec($oAccount, $aEmail) : false;
	}
}