<?php

namespace RainLoop\SabreDAV;

class CardDAV implements \Sabre\CardDAV\Backend\BackendInterface
{
	/**
	 * @var \RainLoop\Providers\PersonalAddressBook
	 */
    private $oPersonalAddressBook;

	/**
	 * @var \RainLoop\SabreDAV\AuthBasic
	 */
    private $oAuthBackend;

    /**
     * @param \RainLoop\Providers\PersonalAddressBook $oPersonalAddressBook
     * @param \RainLoop\SabreDAV\AuthBasic $oAuthBackend
     */
    public function __construct($oPersonalAddressBook, &$oAuthBackend)
	{
        $this->oPersonalAddressBook = $oPersonalAddressBook;
		$this->oPersonalAddressBook->ConsiderShare(false);
        $this->oAuthBackend = $oAuthBackend;
    }

	/**
	 * @param mixed $mData
	 */
	private function writeLog($mData)
	{
		$this->oPersonalAddressBook->Logger()->WriteMixed($mData);
	}

	/**
	 * @param string $sPrincipalUri
	 *
	 * @return string
	 */
	private function getEmailFromPrincipalUri($sPrincipalUri)
	{
		$sEmail = '';
		$aMatch = array();
		if (\preg_match('/\/?principals\/([^@\/]+@[^@\/]+)/i', $sPrincipalUri, $aMatch) && !empty($aMatch[1]))
		{
			$sEmail = \trim($aMatch[1]);
		}
		
		return $sEmail;
	}

	/**
	 * @param string $sPrincipalUri = ''
	 * @param string $mAddressBookID = ''
	 *
	 * @return string
	 */
	private function getAuthEmail($sPrincipalUri = '', $mAddressBookID = '')
	{
		$sGetCurrentUser = \trim($this->oAuthBackend->getCurrentUser());
		if (0 < \strlen($sPrincipalUri) && 0 < \strlen($sGetCurrentUser) &&
			$sGetCurrentUser !== $this->getEmailFromPrincipalUri($sPrincipalUri))
		{
			$sGetCurrentUser = '';
		}

		if (0 < \strlen((string) $mAddressBookID) && 0 < \strlen($sGetCurrentUser) &&
			(string) $mAddressBookID !== (string)  $this->oPersonalAddressBook->GetUserUidByEmail($sGetCurrentUser))
		{
			$sGetCurrentUser = '';
		}

		return $sGetCurrentUser;
	}
	
    /**
     * Returns the list of addressbooks for a specific user.
     *
     * @param string $sPrincipalUri
     * @return array
     */
    public function getAddressBooksForUser($sPrincipalUri)
	{
		$this->writeLog('::getAddressBooksForUser('.$sPrincipalUri.')');

		$aAddressBooks = array();

		$sEmail = $this->getAuthEmail($sPrincipalUri);
		if (0 < strlen($sEmail))
		{
			$mAddressBookID = $this->oPersonalAddressBook->GetUserUidByEmail($sEmail);
			if (!empty($mAddressBookID))
			{
				$aAddressBooks[] = array(
					'id'  => $mAddressBookID,
					'uri'  => 'default',
					'principaluri' => $sPrincipalUri,
					'{DAV:}displayname' => 'Personal Address Book',
					'{'.\Sabre\CardDAV\Plugin::NS_CARDDAV.'}addressbook-description' => 'Personal Address Book',
					'{http://calendarserver.org/ns/}getctag' => $this->oPersonalAddressBook->GetCtagByEmail($sEmail),
					'{'.\Sabre\CardDAV\Plugin::NS_CARDDAV.'}supported-address-data' => new \Sabre\CardDAV\Property\SupportedAddressData()
				);
			}
		}
		
        return $aAddressBooks;
    }

    /**
     * Updates an addressbook's properties
     *
     * See Sabre\DAV\IProperties for a description of the mutations array, as
     * well as the return value.
     *
     * @param mixed $mAddressBookID
     * @param array $aMutations
     * @see Sabre\DAV\IProperties::updateProperties
     * @return bool|array
     */
    public function updateAddressBook($mAddressBookID, array $aMutations)
	{
		$this->writeLog('::updateAddressBook('.$mAddressBookID.', array $aMutations['.\count($aMutations).'])');

		return false;
    }

    /**
     * Creates a new address book
     *
     * @param string $sPrincipalUri
     * @param string $sUrl Just the 'basename' of the url.
     * @param array $aProperties
	 *
     * @return void
     */
    public function createAddressBook($sPrincipalUri, $sUrl, array $aProperties)
	{
		$this->writeLog('::createAddressBook('.$sPrincipalUri.', '.$sUrl.', array $aProperties['.\count($aProperties).'])');
    }

    /**
     * Deletes an entire addressbook and all its contents
     *
     * @param mixed $mAddressBookID
	 * 
     * @return void
     */
    public function deleteAddressBook($mAddressBookID)
	{
		$this->writeLog('::deleteAddressBook('.$mAddressBookID.')');
    }

    /**
     * Returns all cards for a specific addressbook id.
     *
     * This method should return the following properties for each card:
     *   * carddata - raw vcard data
     *   * uri - Some unique url
     *   * lastmodified - A unix timestamp
     *
     * It's recommended to also return the following properties:
     *   * etag - A unique etag. This must change every time the card changes.
     *   * size - The size of the card in bytes.
     *
     * If these last two properties are provided, less time will be spent
     * calculating them. If they are specified, you can also ommit carddata.
     * This may speed up certain requests, especially with large cards.
     *
     * @param mixed $mAddressBookID
	 * 
     * @return array
     */
    public function getCards($mAddressBookID)
	{
		$this->writeLog('::getCards('.$mAddressBookID.')');

		$aResult = array();
		if (!empty($mAddressBookID))
		{
			$sEmail = $this->getAuthEmail('', $mAddressBookID);
			if (!empty($sEmail))
			{
				$aList = $this->oPersonalAddressBook->GetContacts($sEmail, 0, 5000);
				foreach ($aList as /* @var $oItem \RainLoop\Providers\PersonalAddressBook\Classes\Contact */ $oItem)
				{
					if (!$oItem->ReadOnly)
					{
						$aResult[] =  array(
							'uri' => $oItem->VCardUri(),
							'lastmodified' => $oItem->Changed,
							'etag' => $oItem->CardDavHash,
							'size' => $oItem->CardDavSize
						);
					}
				}
			}
		}

		return $aResult;
    }

    /**
     * Returns a specfic card.
     *
     * The same set of properties must be returned as with getCards. The only
     * exception is that 'carddata' is absolutely required.
     *
     * @param mixed $mAddressBookID
     * @param string $sCardUri
     * @return array
     */
    public function getCard($mAddressBookID, $sCardUri)
	{
		$this->writeLog('::getCard('.$mAddressBookID.', '.$sCardUri.')');

		$mResult = false;
		
		$oContact = null;
		if (!empty($mAddressBookID) && !empty($sCardUri) && '.vcf' === \substr($sCardUri, -4))
		{
			$sEmail = $this->getAuthEmail('', $mAddressBookID);
			if (!empty($sEmail))
			{
				$oContact = $this->oPersonalAddressBook->GetContactByID($sEmail, \substr($sCardUri, 0, -4), true);
			}
		}

		if ($oContact)
		{
			$mResult = array(
				'uri' => $oContact->VCardUri(),
				'lastmodified' => $oContact->Changed,
				'etag' => $oContact->CardDavHash,
				'size' => $oContact->CardDavSize,
				'carddata' => $oContact->CardDavData
			);
		}

		return $mResult;
    }

    /**
     * Creates a new card.
     *
     * The addressbook id will be passed as the first argument. This is the
     * same id as it is returned from the getAddressbooksForUser method.
     *
     * The cardUri is a base uri, and doesn't include the full path. The
     * cardData argument is the vcard body, and is passed as a string.
     *
     * It is possible to return an ETag from this method. This ETag is for the
     * newly created resource, and must be enclosed with double quotes (that
     * is, the string itself must contain the double quotes).
     *
     * You should only return the ETag if you store the carddata as-is. If a
     * subsequent GET request on the same card does not have the same body,
     * byte-by-byte and you did return an ETag here, clients tend to get
     * confused.
     *
     * If you don't return an ETag, you can just return null.
     *
     * @param mixed $mAddressBookID
     * @param string $sCardUri
     * @param string $sCardData
	 * 
     * @return string|null
     */
    public function createCard($mAddressBookID, $sCardUri, $sCardData)
	{
		$this->writeLog('::createCard('.$mAddressBookID.', '.$sCardUri.', $sCardData)');
		$this->writeLog($sCardData);
		
		$oVCard = null;
		if (!empty($mAddressBookID) && !empty($sCardUri) && '.vcf' === \substr($sCardUri, -4) && 0 < \strlen($sCardData))
		{
			try
			{
				$oVCard = \Sabre\VObject\Reader::read($sCardData);
			}
			catch (\Exception $oException)
			{
				$this->writeLog($oException);
			}

			if ($oVCard)
			{
				$sEmail = $this->getAuthEmail('', $mAddressBookID);
				if (!empty($sEmail))
				{
					if (empty($oVCard->UID))
					{
						$oVCard->UID = \Sabre\DAV\UUIDUtil::getUUID();
						$sCardData = $oVCard->serialize();
					}

					$oContact = new \RainLoop\Providers\PersonalAddressBook\Classes\Contact();
					$oContact->ParseVCard($oVCard, $sCardData);

					$this->oPersonalAddressBook->ContactSave($sEmail, $oContact);
				}
			}
		}

		return null;
    }

    /**
     * Updates a card.
     *
     * The addressbook id will be passed as the first argument. This is the
     * same id as it is returned from the getAddressbooksForUser method.
     *
     * The cardUri is a base uri, and doesn't include the full path. The
     * cardData argument is the vcard body, and is passed as a string.
     *
     * It is possible to return an ETag from this method. This ETag should
     * match that of the updated resource, and must be enclosed with double
     * quotes (that is: the string itself must contain the actual quotes).
     *
     * You should only return the ETag if you store the carddata as-is. If a
     * subsequent GET request on the same card does not have the same body,
     * byte-by-byte and you did return an ETag here, clients tend to get
     * confused.
     *
     * If you don't return an ETag, you can just return null.
     *
     * @param mixed $mAddressBookID
     * @param string $sCardUri
     * @param string $sCardData
	 * 
     * @return string|null
     */
    public function updateCard($mAddressBookID, $sCardUri, $sCardData)
	{
		$this->writeLog('::updateCard('.$mAddressBookID.', '.$sCardUri.', $sCardData)');
		$this->writeLog($sCardData);

		if (!empty($mAddressBookID) && !empty($sCardUri) && '.vcf' === \substr($sCardUri, -4) && 0 < \strlen($sCardData))
		{
			try
			{
				$oVCard = \Sabre\VObject\Reader::read($sCardData);
			}
			catch (\Exception $oException)
			{
				$this->writeLog($oException);
			}

			if ($oVCard)
			{
				$sEmail = $this->getAuthEmail('', $mAddressBookID);
				if (!empty($sEmail))
				{
					$iRev = 0;
					$aMatch = array();
					if (!empty($oVCard->REV) && \preg_match('/(20[0-9][0-9])([0-1][0-9])([0-3][0-9])T([0-2][0-9])([0-5][0-9])([0-5][0-9])Z/i', $oVCard->REV, $aMatch))
					{//												1Y			2m			3d			4H			5i			6s
						$iRev = \gmmktime($aMatch[4], $aMatch[5], $aMatch[6], $aMatch[2], $aMatch[3], $aMatch[1]);
					}

					$oContact = $this->oPersonalAddressBook->GetContactByID($sEmail, \substr($sCardUri, 0, -4), true);
					if ($oContact && (0 === $iRev || $oContact->Changed < $iRev))
					{
						if (empty($oVCard->UID))
						{
							$oVCard->UID = \Sabre\DAV\UUIDUtil::getUUID();
							$sCardData = $oVCard->serialize();
						}

						$oContact->ParseVCard($oVCard, $sCardData);
						if ($this->oPersonalAddressBook->ContactSave($sEmail, $oContact) && !empty($oContact->CardDavHash))
						{
							return '"'.$oContact->CardDavHash.'"';
						}
					}
					else
					{
						if ($oContact && $oContact->Changed < $iRev)
						{
							$this->writeLog('Obsolete revision: ['.(empty($oVCard->REV) ? '' : $oVCard->REV).', '.$oContact->Changed.', '.$iRev.']');
						}
					}
				}
			}
		}

		return null;
    }

    /**
     * Deletes a card
     *
     * @param mixed $mAddressBookID
     * @param string $sCardUri
	 * 
     * @return bool
     */
    public function deleteCard($mAddressBookID, $sCardUri)
	{
		$this->writeLog('::deleteCard('.$mAddressBookID.', '.$sCardUri.')');

		$bResult = false;
		$oContact = null;
		if (!empty($mAddressBookID) && !empty($sCardUri) && '.vcf' === \substr($sCardUri, -4))
		{
			$sEmail = $this->getAuthEmail('', $mAddressBookID);
			if (!empty($sEmail))
			{
				$oContact = $this->oPersonalAddressBook->GetContactByID($sEmail, \substr($sCardUri, 0, -4), true);
			}
		}

		if ($oContact)
		{
			$bResult = $this->oPersonalAddressBook->DeleteContacts($sEmail, array($oContact->IdContact));
		}

		return $bResult;
    }
}
