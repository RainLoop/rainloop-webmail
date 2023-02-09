<?php

namespace RainLoop\Providers;

class AddressBook extends AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\AddressBook\AddressBookInterface
	 */
	private $oDriver;

	public function __construct(?AddressBook\AddressBookInterface $oDriver)
	{
		$this->oDriver = $oDriver;
	}

	public function Test() : string
	{
		\sleep(1);
		return $this->oDriver ? $this->oDriver->Test() : 'Personal address book driver is not allowed';
	}

	public function IsActive() : bool
	{
		return $this->oDriver && $this->oDriver->IsSupported();
	}

	public function Sync() : bool
	{
		return $this->IsActive() ? $this->oDriver->Sync() : false;
	}

	public function Export(string $sType = 'vcf') : bool
	{
		return $this->IsActive() ? $this->oDriver->Export($sType) : false;
	}

	public function ContactSave(AddressBook\Classes\Contact $oContact) : bool
	{
		return $this->IsActive() ? $this->oDriver->ContactSave($oContact) : false;
	}

	public function DeleteContacts(array $aContactIds) : bool
	{
		return $this->IsActive() ? $this->oDriver->DeleteContacts($aContactIds) : false;
	}

	public function DeleteAllContacts(string $sEmail) : bool
	{
		return $this->IsActive() ? $this->oDriver->DeleteAllContacts($sEmail) : false;
	}

	public function GetContacts(int $iOffset = 0, int $iLimit = 20, string $sSearch = '', int &$iResultCount = 0) : array
	{
		return $this->IsActive() ? $this->oDriver->GetContacts(
			\max(0, $iOffset),
			0 < $iLimit ? $iLimit : 20,
			\trim($sSearch),
			$iResultCount
		) : array();
	}

	public function GetContactByEmail(string $sEmail) : ?AddressBook\Classes\Contact
	{
		return $this->IsActive() ? $this->oDriver->GetContactByEmail($sEmail) : null;
	}

	public function GetContactByID($mID, bool $bIsStrID = false) : ?AddressBook\Classes\Contact
	{
		return $this->IsActive() ? $this->oDriver->GetContactByID($mID, $bIsStrID) : null;
	}

	/**
	 * @throws \InvalidArgumentException
	 */
	public function GetSuggestions(string $sSearch, int $iLimit = 20) : array
	{
		return $this->IsActive() ? $this->oDriver->GetSuggestions($sSearch, $iLimit) : array();
	}

	public function IncFrec(array $aEmails, bool $bCreateAuto = true) : bool
	{
		return $this->IsActive() ? $this->oDriver->IncFrec($aEmails, $bCreateAuto) : false;
	}

	public function ImportVcfFile(string $sVcfData) : int
	{
		$iCount = 0;
		if ($this->IsActive()) {
			try
			{
				foreach (AddressBook\Utils::VcfFileToContacts($sVcfData) as $oContact) {
					if ($this->ContactSave($oContact)) {
						++$iCount;
					}
				}
			}
			catch (\Throwable $oExc)
			{
				$this->Logger()->WriteException($oExc);
			}
		}
		return $iCount;
	}
}
