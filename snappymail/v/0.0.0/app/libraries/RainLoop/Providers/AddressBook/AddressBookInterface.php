<?php

namespace RainLoop\Providers\AddressBook;

interface AddressBookInterface
{
	public function IsSupported() : bool;

	public function SetEmail(string $sEmail) : bool;

	public function Sync() : bool;

	public function Export(string $sType = 'vcf') : bool;

	public function ContactSave(Classes\Contact $oContact) : bool;

	public function DeleteContacts(array $aContactIds) : bool;

	public function DeleteAllContacts(string $sEmail) : bool;

	public function GetContacts(int $iOffset = 0, int $iLimit = 20, string $sSearch = '', int &$iResultCount = 0) : array;

	public function GetContactByEmail(string $sEmail) : ?Classes\Contact;

	public function GetContactByID($mID, bool $bIsStrID = false) : ?Classes\Contact;

	public function GetSuggestions(string $sSearch, int $iLimit = 20) : array;

	/**
	 * Add/increment email address usage
	 * Handy for "most used" sorting suggestions in PdoAddressBook
	 */
	public function IncFrec(array $aEmails, bool $bCreateAuto = true) : bool;

	public function Test() : string;
}
