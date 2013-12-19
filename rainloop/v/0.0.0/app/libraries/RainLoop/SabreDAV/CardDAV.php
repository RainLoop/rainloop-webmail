<?php

namespace RainLoop\SabreDAV;

class CardDAV implements \Sabre\CardDAV\Backend\BackendInterface {
	
	/**
	 * @var \RainLoop\Providers\PersonalAddressBook
	 */
    private $oPersonalAddressBook;

    /**
     * @param \RainLoop\Providers\PersonalAddressBook $oPersonalAddressBook
     */
    public function __construct($oPersonalAddressBook)
	{
        $this->oPersonalAddressBook = $oPersonalAddressBook;
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
	 * @param string $sPrincipalUri
	 *
	 * @return string
	 */
	private function getCalendarID($sPrincipalUri)
	{
		$mUserId = (string) $this->oPersonalAddressBook->GetUserUidByEmail(
			$this->getEmailFromPrincipalUri($sPrincipalUri));

		return !empty($mUserId) ? $mUserId : '';
	}
	
    /**
     * Returns the list of addressbooks for a specific user.
     *
     * @param string $sPrincipalUri
     * @return array
     */
    public function getAddressBooksForUser($sPrincipalUri)
	{
		$mAddressBookID = $this->getCalendarID($sPrincipalUri);

		$aAddressBooks = array();
		if (!empty($mAddressBookID))
		{
			$aAddressBooks[] = array(
				'id'  => $mAddressBookID,
				'uri'  => 'default',
				'principaluri' => $sPrincipalUri,
				'{DAV:}displayname' => 'Personal Address Book',
				'{'.\Sabre\CardDAV\Plugin::NS_CARDDAV.'}addressbook-description' => 'Personal Address Book',
				'{http://calendarserver.org/ns/}getctag' => 1,
				'{'.\Sabre\CardDAV\Plugin::NS_CARDDAV.'}supported-address-data' => new \Sabre\CardDAV\Property\SupportedAddressData()
			);
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
    public function updateAddressBook($mAddressBookId, array $aMutations)
	{
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
    }

    /**
     * Deletes an entire addressbook and all its contents
     *
     * @param mixed $mAddressBookId
	 * 
     * @return void
     */
    public function deleteAddressBook($mAddressBookId)
	{
    }

    private function simpleGetCards($mAddressBookId, $sCardUri = '')
	{
		$aResult = array();
		if (!empty($mAddressBookId))
		{
			$aList = $this->oPersonalAddressBook->GetContacts($mAddressBookId, 0, 20);
			foreach ($aList as /* @var $oItem \RainLoop\Providers\PersonalAddressBook\Classes\Contact */ $oItem)
			{
				$oVCard = $oItem->ToVCardObject();
				if ('' === $sCardUri || $sCardUri === $oVCard->UID)
				{
					$aResult[] =  array(
						'id' => $oItem->IdContact,
						'uri' => $oVCard->UID,
						'lastmodified' => $oItem->Changed,
						'carddata' => $oVCard->serialize()
					);
				}
			}
		}

		return $aResult;
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
     * @param mixed $mAddressbookId
	 * 
     * @return array
     */
    public function getCards($mAddressBookId)
	{
		return $this->simpleGetCards($mAddressBookId);
    }

    /**
     * Returns a specfic card.
     *
     * The same set of properties must be returned as with getCards. The only
     * exception is that 'carddata' is absolutely required.
     *
     * @param mixed $mAddressBookId
     * @param string $sCardUri
     * @return array
     */
    public function getCard($mAddressBookId, $sCardUri)
	{
		$aList = $this->simpleGetCards($mAddressBookId, $sCardUri);
		return 0 < count($aList) && isset($aList) ? $aList[0] : false;
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
     * @param mixed $mAddressBookId
     * @param string $sCardUri
     * @param string $sCardData
     * @return string|null
     */
    public function createCard($mAddressBookId, $sCardUri, $sCardData)
	{
		return null;
//
//        $stmt = $this->pdo->prepare('INSERT INTO ' . $this->cardsTableName . ' (carddata, uri, lastmodified, addressbookid) VALUES (?, ?, ?, ?)');
//
//        $result = $stmt->execute(array($cardData, $cardUri, time(), $addressBookId));
//
//        $stmt2 = $this->pdo->prepare('UPDATE ' . $this->addressBooksTableName . ' SET ctag = ctag + 1 WHERE id = ?');
//        $stmt2->execute(array($addressBookId));
//
//        return '"' . md5($cardData) . '"';
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
     * @param mixed $mAddressBookId
     * @param string $sCardUri
     * @param string $sCardData
     * @return string|null
     */
    public function updateCard($mAddressBookId, $sCardUri, $sCardData)
	{
		return null;

//        $stmt = $this->pdo->prepare('UPDATE ' . $this->cardsTableName . ' SET carddata = ?, lastmodified = ? WHERE uri = ? AND addressbookid =?');
//        $stmt->execute(array($cardData, time(), $cardUri, $addressBookId));
//
//        $stmt2 = $this->pdo->prepare('UPDATE ' . $this->addressBooksTableName . ' SET ctag = ctag + 1 WHERE id = ?');
//        $stmt2->execute(array($addressBookId));
//
//        return '"' . md5($cardData) . '"';
    }

    /**
     * Deletes a card
     *
     * @param mixed $mAddressBookId
     * @param string $sCardUri
	 * 
     * @return bool
     */
    public function deleteCard($mAddressBookId, $sCardUri)
	{
		return false;
//        $stmt = $this->pdo->prepare('DELETE FROM ' . $this->cardsTableName . ' WHERE addressbookid = ? AND uri = ?');
//        $stmt->execute(array($addressBookId, $cardUri));
//
//        $stmt2 = $this->pdo->prepare('UPDATE ' . $this->addressBooksTableName . ' SET ctag = ctag + 1 WHERE id = ?');
//        $stmt2->execute(array($addressBookId));
//
//        return $stmt->rowCount()===1;
    }
}
