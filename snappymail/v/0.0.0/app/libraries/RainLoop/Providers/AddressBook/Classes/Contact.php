<?php

namespace RainLoop\Providers\AddressBook\Classes;

class Contact implements \JsonSerializable
{
	/**
	 * @var string
	 */
	public $id = '';

	/**
	 * @var string
	 */
	public $IdContactStr = '';

	/**
	 * @var string
	 */
//	public $Display;

	/**
	 * @var int
	 */
	public $Changed;

	/**
	 * @var bool
	 */
	public $ReadOnly = false;

	/**
	 * @var string
	 * Used for CardDAV synchronization
	 */
	public $Etag = '';

	/**
	 * @var \Sabre\VObject\Component\VCard
	 */
	protected $vCard = null;

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
	public function setVCard(\Sabre\VObject\Component\VCard $oVCard) : void
	{
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
