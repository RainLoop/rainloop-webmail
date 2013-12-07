<?php

namespace RainLoop\Providers\PersonalAddressBook;

interface PersonalAddressBookInterface
{
	/**
	 * @return string
	 */
	public function Version();
	
	/**
	 * @return bool
	 */
	public function IsSupported();

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param \RainLoop\Providers\PersonalAddressBook\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function ContactSave($oAccount, &$oContact);

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aContactIds
	 *
	 * @return bool
	 */
	public function DeleteContacts($oAccount, $aContactIds);

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aTagsIds
	 *
	 * @return bool
	 */
	public function DeleteTags($oAccount, $aTagsIds);

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param int $iOffset = 0
	 * @param type $iLimit = 20
	 * @param string $sSearch = ''
	 * @param bool $bAutoOnly = false
	 * @param int $iResultCount = 0
	 *
	 * @return array
	 */
	public function GetContacts($oAccount,
		$iOffset = 0, $iLimit = 20, $sSearch = '', $bAutoOnly = false, &$iResultCount = 0);

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sSearch
	 * @param int $iLimit = 20
	 *
	 * @return array
	 *
	 * @throws \InvalidArgumentException
	 */
	public function GetSuggestions($oAccount, $sSearch, $iLimit = 20);

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aEmails
	 *
	 * @return bool
	 */
	public function IncFrec($oAccount, $aEmails);
}