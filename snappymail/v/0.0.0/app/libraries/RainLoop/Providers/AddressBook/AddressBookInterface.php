<?php

namespace RainLoop\Providers\AddressBook;

interface AddressBookInterface
{
	public function IsSupported() : bool;

	public function IsSharingAllowed() : bool;

	public function Sync(array $oConfig) : bool;

	public function Export(string $sEmail, string $sType = 'vcf') : bool;

	public function ContactSave(string $sEmail, Classes\Contact $oContact) : bool;

	public function DeleteContacts(string $sEmail, array $aContactIds) : bool;

	public function DeleteAllContacts(string $sEmail) : bool;

	public function GetContacts(string $sEmail, int $iOffset = 0, int $iLimit = 20, string $sSearch = '', int &$iResultCount = 0) : array;

	public function GetContactByID(string $sEmail, $mID, bool $bIsStrID = false) : ?Classes\Contact;

	public function GetSuggestions(string $sEmail, string $sSearch, int $iLimit = 20) : array;

	public function IncFrec(string $sEmail, array $aEmails, bool $bCreateAuto = true) : bool;

	public function Test() : string;
}
