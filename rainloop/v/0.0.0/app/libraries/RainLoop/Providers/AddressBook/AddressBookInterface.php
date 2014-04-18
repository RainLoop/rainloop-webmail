<?php

namespace RainLoop\Providers\AddressBook;

interface AddressBookInterface
{
	/**
	 * @return bool
	 */
	public function IsSupported();

	/**
	 * @param string $sEmail
	 * @param \RainLoop\Providers\AddressBook\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function ContactSave($sEmail, &$oContact);

	/**
	 * @param string $sEmail
	 * @param array $aContactIds
	 *
	 * @return bool
	 */
	public function DeleteContacts($sEmail, $aContactIds);

	/**
	 * @param string $sEmail
	 * @param array $aTagsIds
	 *
	 * @return bool
	 */
	public function DeleteTags($sEmail, $aTagsIds);

	/**
	 * @param string $sEmail
	 * @param int $iOffset = 0
	 * @param int $iLimit = 20
	 * @param string $sSearch = ''
	 * @param int $iResultCount = 0
	 *
	 * @return array
	 */
	public function GetContacts($sEmail, $iOffset = 0, $iLimit = 20, $sSearch = '', &$iResultCount = 0);

	/**
	 * @param string $sEmail
	 * @param string $sSearch
	 * @param int $iLimit = 20
	 *
	 * @return array
	 *
	 * @throws \InvalidArgumentException
	 */
	public function GetSuggestions($sEmail, $sSearch, $iLimit = 20);

	/**
	 * @param string $sEmail
	 * @param array $aEmails
	 *
	 * @return bool
	 */
	public function IncFrec($sEmail, $aEmails);
}