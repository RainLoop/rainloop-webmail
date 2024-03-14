<?php

namespace RainLoop\Providers\AddressBook\Classes;

use Sabre\VObject\Component\VCard;

class Contact implements \JsonSerializable
{
	public string $id = '';

	public string $IdContactStr = '';

//	public string $Display;

	public int $Changed;

	public bool $ReadOnly = false;

	/**
	 * Used for CardDAV synchronization
	 */
	public string $Etag = '';

	protected ?VCard $vCard = null;

	function __construct()
	{
		$this->Changed = \time();
	}

	function __get($k)
	{
		if ('vCard' === $k) {
			return $this->vCard;
		}
	}

/*
	public function GetEmails() : array
	{
		$aResult = array();
		foreach ($this->vCard->EMAIL as $oProperty) {
			$aResult[] = $oProperty->Value;
		}
		return \array_unique($aResult);
	}
*/
	public function setVCard(VCard $oVCard) : void
	{
		if ($oVCard->PHOTO && !empty($oVCard->PHOTO->parameters['ENCODING'])) {
			$oVCard->VERSION = '3.0';
		}
		if (VCard::VCARD40 != $oVCard->getDocumentType()) {
			$oVCard = $oVCard->convert(VCard::VCARD40);
		}

		// KDE KAddressBook entry and used by SnappyMail
		// https://github.com/sabre-io/vobject/issues/589
		$oVCard->select('X-CRYPTO')
		|| $oVCard->add('X-CRYPTO', '', [
			'allowed' => 'PGP/INLINE,PGP/MIME,S/MIME,S/MIMEOpaque',
			'signpref' => 'Ask',
			'encryptpref' => 'Ask'
		]);

		$aWarnings = $oVCard->validate(3);
//		\error_log(\print_r($aWarnings,1));
		$this->vCard = $oVCard;
		$sUid = (string) $oVCard->UID;
		if (empty($sUid)) {
			$sUid = \SnappyMail\UUID::generate();
//			$this->vCard->UID = $sUid;
		}
/*
		$rev = new \DateTime($oVCard->REV[0]->getJsonValue());
		$this->Changed = $rev->getTimestamp();
*/
		$this->IdContactStr = $sUid;
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return array(
			'@Object' => 'Object/Contact',
			'id' => $this->id,
			'readOnly' => $this->ReadOnly,
			'jCard' => $this->vCard
		);
	}
}
