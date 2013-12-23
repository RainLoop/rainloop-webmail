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
     * @param mixed $mAddressBookId
     * @param array $aMutations
     * @see Sabre\DAV\IProperties::updateProperties
     * @return bool|array
     */
    public function updateAddressBook($mAddressBookID, array $aMutations)
	{
		$this->writeLog('::updateAddressBook('.$mAddressBookID.', $aMutations)');

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
		$this->writeLog('::createAddressBook('.$sPrincipalUri.', '.$sUrl.', $aProperties)');
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
				$aList = $this->oPersonalAddressBook->GetContacts($sEmail, 0, 500);
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
			return array(
				'uri' => $oContact->VCardUri(),
				'lastmodified' => $oContact->Changed,
				'etag' => $oContact->CardDavHash,
				'size' => $oContact->CardDavSize,
				'carddata' => $oContact->CardDavData
			);
		}

		return false;
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
		
		if (!empty($mAddressBookID) && !empty($sCardUri) && '.vcf' === \substr($sCardUri, -4) && 0 < \strlen($sCardData))
		{
			$sEmail = $this->getAuthEmail('', $mAddressBookID);
			if (!empty($sEmail))
			{
				$oContact = new \RainLoop\Providers\PersonalAddressBook\Classes\Contact();
				$oContact->ParseVCard($sCardData);
				
				$this->oPersonalAddressBook->ContactSave($sEmail, $oContact);
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
			$sEmail = $this->getAuthEmail('', $mAddressBookID);
			if (!empty($sEmail))
			{
				$oContact = $this->oPersonalAddressBook->GetContactByID($sEmail, \substr($sCardUri, 0, -4), true);
				if (!$oContact)
				{
					$oContact = new \RainLoop\Providers\PersonalAddressBook\Classes\Contact();
				}

				$oContact->ParseVCard($sCardData);
				if ($this->oPersonalAddressBook->ContactSave($sEmail, $oContact) && !empty($oContact->CardDavHash))
				{
					return '"'.$oContact->CardDavHash.'"';
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
