<?php

namespace RainLoop\Providers\AddressBook\Classes;

use
	RainLoop\Providers\AddressBook\Enumerations\PropertyType,
	RainLoop\Providers\AddressBook\Classes\Property
;

class Contact implements \JsonSerializable
{
	/**
	 * @var string
	 */
	public $IdContact;

	/**
	 * @var string
	 */
	public $IdContactStr;

	/**
	 * @var string
	 */
	public $Display;

	/**
	 * @var int
	 */
	public $Changed;

	/**
	 * @var array
	 */
	public $Properties;

	/**
	 * @var bool
	 */
	public $ReadOnly;

	/**
	 * @var int
	 */
	public $IdPropertyFromSearch;

	/**
	 * @var string
	 */
	public $Etag;

	public function __construct()
	{
		$this->Clear();
	}

	public function Clear() : void
	{
		$this->IdContact = '';
		$this->IdContactStr = '';
		$this->Display = '';
		$this->Changed = \time();
		$this->Properties = array();
		$this->ReadOnly = false;
		$this->IdPropertyFromSearch = 0;
		$this->Etag = '';
	}

	public function PopulateDisplayAndFullNameValue(bool $bForceFullNameReplace = false) : void
	{
		$sFullName = '';
		$sLastName = '';
		$sFirstName = '';
		$sEmail = '';
		$sOther = '';

		$oFullNameProperty = null;

		foreach ($this->Properties as /* @var $oProperty \RainLoop\Providers\AddressBook\Classes\Property */ $oProperty)
		{
			if ($oProperty)
			{
				$oProperty->UpdateDependentValues();

				if (!$oFullNameProperty && PropertyType::FULLNAME === $oProperty->Type)
				{
					$oFullNameProperty =& $oProperty;
				}

				if (0 < \strlen($oProperty->Value))
				{
					if ('' === $sEmail && $oProperty->IsEmail())
					{
						$sEmail = $oProperty->Value;
					}
					else if ('' === $sLastName && PropertyType::LAST_NAME === $oProperty->Type)
					{
						$sLastName = $oProperty->Value;
					}
					else if ('' === $sFirstName && PropertyType::FIRST_NAME === $oProperty->Type)
					{
						$sFirstName = $oProperty->Value;
					}
					else if ('' === $sFullName && PropertyType::FULLNAME === $oProperty->Type)
					{
						$sFullName = $oProperty->Value;
					}
					else if ('' === $sOther && \in_array($oProperty->Type, array(
						PropertyType::PHONE
					)))
					{
						$sOther = $oProperty->Value;
					}
				}
			}
		}

		$sDisplay = $bForceFullNameReplace ? '' : \trim($sFullName);

		if ('' === $sDisplay && (0 < \strlen($sLastName) || 0 < \strlen($sFirstName)))
		{
			$sDisplay = \trim($sFirstName.' '.$sLastName);
		}

		if ('' === $sDisplay)
		{
			$sDisplay = \trim($sFullName);
		}

		if ('' === $sDisplay)
		{
			$sDisplay = \trim($sEmail);
		}

		if ('' === $sDisplay)
		{
			$sDisplay = \trim($sOther);
		}

		$this->Display = \trim($sDisplay);

		if ($oFullNameProperty)
		{
			$oFullNameProperty->Value = $this->Display;
			$oFullNameProperty->UpdateDependentValues();
		}

		if (!$oFullNameProperty)
		{
			$this->Properties[] = new \RainLoop\Providers\AddressBook\Classes\Property(PropertyType::FULLNAME, $this->Display);
		}
	}

	public function UpdateDependentValues() : void
	{
		if (empty($this->IdContactStr))
		{
			$this->IdContactStr = \SnappyMail\UUID::generate();
		}

		$this->PopulateDisplayAndFullNameValue();
	}

	public function GetEmails() : array
	{
		$aResult = array();
		foreach ($this->Properties as /* @var $oProperty \RainLoop\Providers\AddressBook\Classes\Property */ $oProperty)
		{
			if ($oProperty && $oProperty->IsEmail())
			{
				$aResult[] = $oProperty->Value;
			}
		}

		return \array_unique($aResult);
	}

	public function CardDavNameUri() : string
	{
		return $this->IdContactStr.'.vcf';
	}

	public function ToVCard(string $sPreVCard = '', $oLogger = null) : string
	{
		$this->UpdateDependentValues();

		if ("\xef\xbb\xbf" === \substr($sPreVCard, 0, 3))
		{
			$sPreVCard = \substr($sPreVCard, 3);
		}

		$oVCard = null;
		if (0 < \strlen($sPreVCard))
		{
			try
			{
				$oVCard = \Sabre\VObject\Reader::read($sPreVCard);
			}
			catch (\Throwable $oExc)
			{
				if ($oLogger)
				{
					$oLogger->WriteException($oExc);
					$oLogger->WriteDump($sPreVCard);
				}
			}
		}

//		if ($oLogger)
//		{
//			$oLogger->WriteDump($sPreVCard);
//		}

		if (!$oVCard)
		{
			$oVCard = new \Sabre\VObject\Component\VCard();
		}

		$oVCard->VERSION = '3.0';
		$oVCard->PRODID = '-//RainLoop//'.APP_VERSION.'//EN';

		unset($oVCard->FN, $oVCard->EMAIL, $oVCard->TEL, $oVCard->URL, $oVCard->NICKNAME);

		$sUid = $sFirstName = $sLastName = $sMiddleName = $sSuffix = $sPrefix = '';
		foreach ($this->Properties as /* @var $oProperty \RainLoop\Providers\AddressBook\Classes\Property */ $oProperty)
		{
			if ($oProperty)
			{
				$sAddKey = '';
				switch ($oProperty->Type)
				{
					case PropertyType::FULLNAME:
						$oVCard->FN = $oProperty->Value;
						break;
					case PropertyType::NICK_NAME:
						$oVCard->NICKNAME = $oProperty->Value;
						break;
					case PropertyType::NOTE:
						$oVCard->NOTE = $oProperty->Value;
						break;
					case PropertyType::UID:
						$sUid = $oProperty->Value;
						break;
					case PropertyType::FIRST_NAME:
						$sFirstName = $oProperty->Value;
						break;
					case PropertyType::LAST_NAME:
						$sLastName = $oProperty->Value;
						break;
					case PropertyType::MIDDLE_NAME:
						$sMiddleName = $oProperty->Value;
						break;
					case PropertyType::NAME_SUFFIX:
						$sSuffix = $oProperty->Value;
						break;
					case PropertyType::NAME_PREFIX:
						$sPrefix = $oProperty->Value;
						break;
					case PropertyType::EMAIl:
						if (empty($sAddKey))
						{
							$sAddKey = 'EMAIL';
						}
					case PropertyType::WEB_PAGE:
						if (empty($sAddKey))
						{
							$sAddKey = 'URL';
						}
					case PropertyType::PHONE:
						if (empty($sAddKey))
						{
							$sAddKey = 'TEL';
						}

						$aTypes = $oProperty->TypesAsArray();
						$oVCard->add($sAddKey, $oProperty->Value, \is_array($aTypes) && 0 < \count($aTypes) ? array('TYPE' => $aTypes) : null);
						break;
				}
			}
		}

		$oVCard->UID = empty($sUid) ? $this->IdContactStr : $sUid;
		$oVCard->N = array($sLastName, $sFirstName, $sMiddleName, $sPrefix, $sSuffix);
		$oVCard->REV = \gmdate('Ymd', $this->Changed).'T'.\gmdate('His', $this->Changed).'Z';

		return (string) $oVCard->serialize();
	}

	public function ToCsv(bool $bWithHeader = false) : string
	{
		$aData = array();
		if ($bWithHeader)
		{
			$aData[] = array(
				'Title', 'First Name', 'Middle Name', 'Last Name', 'Nick Name', 'Display Name',
				'Company', 'Department', 'Job Title', 'Office Location',
				'E-mail Address', 'Notes', 'Web Page', 'Birthday',
				'Other Email', 'Other Phone', 'Other Mobile', 'Mobile Phone',
				'Home Email',		'Home Phone',		'Home Fax',
				'Home Street',		'Home City',		'Home State',		'Home Postal Code',			'Home Country',
				'Business Email',	'Business Phone',	'Business Fax',
				'Business Street',	'Business City',	'Business State',	'Business Postal Code',		'Business Country'
			);
		}

		$aValues = array(
			'',		// 0	'Title',
			'',		// 1	'First Name',
			'',		// 2	'Middle Name',
			'',		// 3	'Last Name',
			'',		// 4	'Nick Name',
			'',		// 5	'Display Name',
			'',		// 6	'Company',
			'',		// 7	'Department',
			'',		// 8	'Job Title',
			'',		// 9	'Office Location',
			'',		// 10	'E-mail Address',
			'',		// 11	'Notes',
			'',		// 12	'Web Page',
			'',		// 13	'Birthday',
			'',		// 14	'Other Email',
			'',		// 15	'Other Phone',
			'',		// 16	'Other Mobile',
			'',		// 17	'Mobile Phone',
			'',		// 18	'Home Email',
			'',		// 19	'Home Phone',
			'',		// 20	'Home Fax',
			'',		// 21	'Home Street',
			'',		// 22	'Home City',
			'',		// 23	'Home State',
			'',		// 24	'Home Postal Code',
			'',		// 25	'Home Country',
			'',		// 26	'Business Email',
			'',		// 27	'Business Phone',
			'',		// 28	'Business Fax',
			'',		// 29	'Business Street',
			'',		// 30	'Business City',
			'',		// 31	'Business State',
			'',		// 32	'Business Postal Code',
			''		// 33	'Business Country'
		);

		$this->UpdateDependentValues();

		foreach ($this->Properties as /* @var $oProperty \RainLoop\Providers\AddressBook\Classes\Property */ $oProperty)
		{
			$iIndex = -1;
			if ($oProperty)
			{
				$aUpperTypes = $oProperty->TypesUpperAsArray();
				switch ($oProperty->Type)
				{
					case PropertyType::FULLNAME:
						$iIndex = 5;
						break;
					case PropertyType::NICK_NAME:
						$iIndex = 4;
						break;
					case PropertyType::FIRST_NAME:
						$iIndex = 1;
						break;
					case PropertyType::LAST_NAME:
						$iIndex = 3;
						break;
					case PropertyType::MIDDLE_NAME:
						$iIndex = 2;
						break;
					case PropertyType::EMAIl:
						switch (true)
						{
							case \in_array('OTHER', $aUpperTypes):
								$iIndex = 14;
								break;
							case \in_array('WORK', $aUpperTypes):
								$iIndex = 26;
								break;
							default:
								$iIndex = 18;
								break;
						}
						break;
					case PropertyType::PHONE:
						switch (true)
						{
							case \in_array('OTHER', $aUpperTypes):
								$iIndex = 15;
								break;
							case \in_array('WORK', $aUpperTypes):
								$iIndex = 27;
								break;
							case \in_array('MOBILE', $aUpperTypes):
								$iIndex = 17;
								break;
							default:
								$iIndex = 19;
								break;
						}
						break;
					case PropertyType::WEB_PAGE:
						$iIndex = 12;
						break;
					case PropertyType::NOTE:
						$iIndex = 11;
						break;
				}

				if (-1 < $iIndex)
				{
					$aValues[$iIndex] = $oProperty->Value;
				}
			}
		}

		// subfix
		if (empty($aValues[10]))  // 'E-mail Address'
		{
			if (!empty($aValues[18]))
			{
				$aValues[10] = $aValues[18];
			}
			else if (!empty($aValues[26]))
			{
				$aValues[10] = $aValues[26];
			}
			else if (!empty($aValues[14]))
			{
				$aValues[10] = $aValues[14];
			}
		}

		$aData[] = \array_map(function ($sValue) {
			$sValue = \trim($sValue);
			return \preg_match('/[\r\n,"]/', $sValue) ? '"'.\str_replace('"', '""', $sValue).'"' : $sValue;
		}, $aValues);

		$sResult = '';
		foreach ($aData as $aSubData)
		{
			$sResult .= \implode(',', $aSubData)."\r\n";
		}

		return $sResult;
	}

	/**
	 * @param mixed $oProp
	 */
	private function getPropertyValueHelper($oProp, bool $bOldVersion) : string
	{
		$sValue = \trim($oProp);
		if ($bOldVersion && !isset($oProp->parameters['CHARSET']))
		{
			if (0 < \strlen($sValue))
			{
				$sEncValue = \utf8_encode($sValue);
				if (0 === \strlen($sEncValue))
				{
					$sEncValue = $sValue;
				}

				$sValue = $sEncValue;
			}
		}

		return \MailSo\Base\Utils::Utf8Clear($sValue);
	}

	/**
	 * @param mixed $oProp
	 */
	private function addArrayPropertyHelper(array &$aProperties, $oArrayProp, int $iType) : void
	{
		foreach ($oArrayProp as $oProp)
		{
			$oTypes = $oProp ? $oProp['TYPE'] : null;
			$aTypes = $oTypes ? $oTypes->getParts() : array();
			$sValue = $oProp ? \trim($oProp->getValue()) : '';

			if (0 < \strlen($sValue))
			{
				if (!$oTypes || $oTypes->has('PREF'))
				{
					\array_unshift($aProperties, new Property($iType, $sValue, \implode(',', $aTypes)));
				}
				else
				{
					\array_push($aProperties, new Property($iType, $sValue, \implode(',', $aTypes)));
				}
			}
		}
	}

	public function PopulateByVCard(\Sabre\VObject\Component\VCard $oVCard, string $sEtag = '') : bool
	{
		$this->Properties = array();

		if (!empty($sEtag))
		{
			$this->Etag = $sEtag;
		}

		$aProperties = array();

		$bOldVersion = empty($oVCard->VERSION) ? false :
			\in_array((string) $oVCard->VERSION, array('2.1', '2.0', '1.0'));

		if (isset($oVCard->FN) && '' !== \trim($oVCard->FN))
		{
			$sValue = $this->getPropertyValueHelper($oVCard->FN, $bOldVersion);
			$aProperties[] = new Property(PropertyType::FULLNAME, $sValue);
		}

		if (isset($oVCard->NICKNAME) && '' !== \trim($oVCard->NICKNAME))
		{
			$sValue = $sValue = $this->getPropertyValueHelper($oVCard->NICKNAME, $bOldVersion);
			$aProperties[] = new Property(PropertyType::NICK_NAME, $sValue);
		}

		if (isset($oVCard->NOTE) && '' !== \trim($oVCard->NOTE))
		{
			$sValue = $this->getPropertyValueHelper($oVCard->NOTE, $bOldVersion);
			$aProperties[] = new Property(PropertyType::NOTE, $sValue);
		}

		if (isset($oVCard->N))
		{
			$aNames = $oVCard->N->getParts();
			foreach ($aNames as $iIndex => $sValue)
			{
				$sValue = \trim($sValue);
				if ($bOldVersion && !isset($oVCard->N->parameters['CHARSET']))
				{
					if (0 < \strlen($sValue))
					{
						$sEncValue = \utf8_encode($sValue);
						if (0 === \strlen($sEncValue))
						{
							$sEncValue = $sValue;
						}

						$sValue = $sEncValue;
					}
				}

				$sValue = \MailSo\Base\Utils::Utf8Clear($sValue);
				switch ($iIndex) {
					case 0:
						$aProperties[] = new Property(PropertyType::LAST_NAME, $sValue);
						break;
					case 1:
						$aProperties[] = new Property(PropertyType::FIRST_NAME, $sValue);
						break;
					case 2:
						$aProperties[] = new Property(PropertyType::MIDDLE_NAME, $sValue);
						break;
					case 3:
						$aProperties[] = new Property(PropertyType::NAME_PREFIX, $sValue);
						break;
					case 4:
						$aProperties[] = new Property(PropertyType::NAME_SUFFIX, $sValue);
						break;
				}
			}
		}

		if (isset($oVCard->EMAIL))
		{
			$this->addArrayPropertyHelper($aProperties, $oVCard->EMAIL, PropertyType::EMAIl);
		}

		if (isset($oVCard->URL))
		{
			$this->addArrayPropertyHelper($aProperties, $oVCard->URL, PropertyType::WEB_PAGE);
		}

		if (isset($oVCard->TEL))
		{
			$this->addArrayPropertyHelper($aProperties, $oVCard->TEL, PropertyType::PHONE);
		}

		$this->IdContactStr = $oVCard->UID ? (string) $oVCard->UID : \SnappyMail\UUID::generate();
		$aProperties[] = new Property(PropertyType::UID, $this->IdContactStr);

		$this->Properties = $aProperties;

		$this->UpdateDependentValues();

		return true;
	}

	public function jsonSerialize()
	{
		$properties = array();
		foreach ($this->Properties as $property) {
			$properties[] = $property->jsonSerialize();
		}
		return array(
			'@Object' => 'Object/Contact',
			'id' => $this->IdContact,
			'display' => \MailSo\Base\Utils::Utf8Clear($this->Display),
			'readOnly' => $this->ReadOnly,
			'IdPropertyFromSearch' => $this->IdPropertyFromSearch,
			'properties' => $properties
		);
	}
}
