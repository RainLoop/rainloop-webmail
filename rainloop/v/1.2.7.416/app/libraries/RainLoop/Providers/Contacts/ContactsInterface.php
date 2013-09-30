<?php

namespace RainLoop\Providers\Contacts;

interface ContactsInterface
{
	/**
	 * @param \RainLoop\Account $oAccount
	 * @param int $iIdContact
	 *
	 * @return $oContact|null
	 */
	public function GetContactById($oAccount, $iIdContact);

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param int $iOffset = 0
	 * @param int $iLimit = 20
	 * @param string $sSearch = ''
	 *
	 * @return array
	 */
	public function GetContacts($oAccount, $iOffset = 0, $iLimit = 20, $sSearch = '');

	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 * @return array
	 */
	public function GetContactsImageHashes($oAccount);

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param \RainLoop\Providers\Contacts\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function CreateContact($oAccount, &$oContact);

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param \RainLoop\Providers\Contacts\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function UpdateContact($oAccount, &$oContact);

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aContactIds
	 *
	 * @return bool
	 */
	public function DeleteContacts($oAccount, $aContactIds);

	/**
	 * @return bool
	 */
	public function IsSupported();

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aContactIds
	 *
	 * @return bool
	 */
	public function IncFrec($oAccount, $aContactIds);
}