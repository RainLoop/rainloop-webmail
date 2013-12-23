<?php

namespace RainLoop\Providers\PersonalAddressBook\Classes;

use
	RainLoop\Providers\PersonalAddressBook\Enumerations\PropertyType,
	RainLoop\Providers\PersonalAddressBook\Classes\Property
;

class Contact
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
	public $ScopeType;

	/**
	 * @var int
	 */
	public $Changed;

	/**
	 * @var int
	 */
	public $IdPropertyFromSearch;

	/**
	 * @var array
	 */
	public $Properties;

	/**
	 * @var array
	 */
	public $ReadOnly;

	/**
	 * @var string
	 */
	public $CardDavData;

	/**
	 * @var string
	 */
	public $CardDavHash;

	/**
	 * @var int
	 */
	public $CardDavSize;

	public function __construct()
	{
		$this->Clear();
	}

	public function Clear()
	{
		$this->IdContact = '';
		$this->IdContactStr = '';
		$this->IdUser = 0;
		$this->Display = '';
		$this->ScopeType = \RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_;
		$this->Changed = \time();
		$this->IdPropertyFromSearch = 0;
		$this->Properties = array();
		$this->ReadOnly = false;

		$this->CardDavData = '';
		$this->CardDavHash = '';
		$this->CardDavSize = 0;
	}
	
	public function UpdateDependentValues($bReparseVcard = true)
	{
		$sLastName = '';
		$sFirstName = '';
		$sEmail = '';
		$sOther = '';

		$oFullNameProperty = null;
		
		foreach ($this->Properties as /* @var $oProperty \RainLoop\Providers\PersonalAddressBook\Classes\Property */ &$oProperty)
		{
			if ($oProperty)
			{
				$oProperty->ScopeType = $this->ScopeType;
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
					else if (\in_array($oProperty->Type, array(PropertyType::FULLNAME,
						PropertyType::PHONE_PERSONAL, PropertyType::PHONE_BUSSINES,
						PropertyType::MOBILE_PERSONAL, PropertyType::MOBILE_BUSSINES,
					)))
					{
						$sOther = $oProperty->Value;
					}
				}
			}
		}

		if (empty($this->IdContactStr))
		{
			$this->IdContactStr = \Sabre\DAV\UUIDUtil::getUUID();
		}

		$sDisplay = '';
		if (0 < \strlen($sLastName) || 0 < \strlen($sFirstName))
		{
			$sDisplay = \trim($sLastName.' '.$sFirstName);
		}

		if ('' === $sDisplay && 0 < \strlen($sEmail))
		{
			$sDisplay = \trim($sEmail);
		}

		if ('' === $sDisplay)
		{
			$sDisplay = $sOther;
		}

		$this->Display = \trim($sDisplay);

		$bNewFull = false;
		if (!$oFullNameProperty)
		{
			$oFullNameProperty = new \RainLoop\Providers\PersonalAddressBook\Classes\Property(PropertyType::FULLNAME, $this->Display);
			$bNewFull = true;
		}

		$oFullNameProperty->Value = $this->Display;
		$oFullNameProperty->UpdateDependentValues();

		if ($bNewFull)
		{
			$this->Properties[] = $oFullNameProperty;
		}

		if ($bReparseVcard || '' === $this->CardDavData)
		{
			$oVCard = $this->ToVCardObject($this->CardDavData);
			$this->CardDavData = $oVCard ? $oVCard->serialize() : $this->CardDavData;
		}

		if (!empty($this->CardDavData))
		{
			$this->CardDavHash = \md5($this->CardDavData);
			$this->CardDavSize = \strlen($this->CardDavData);
		}
		else
		{
			$this->CardDavHash = '';
			$this->CardDavSize = 0;
		}
	}

	/**
	 * @return array
	 */
	public function GetEmails()
	{
		$aResult = array();
		foreach ($this->Properties as /* @var $oProperty \RainLoop\Providers\PersonalAddressBook\Classes\Property */ &$oProperty)
		{
			if ($oProperty && $oProperty->IsEmail())
			{
				$aResult[] = $oProperty->Value;
			}
		}

		return \array_unique($aResult);
	}

	/**
	 * @param string $sVCard
	 */
	public function ParseVCard($sVCard)
	{
		$bNew = empty($this->IdContact);

		if (!$bNew)
		{
			$this->Properties = array();
		}

		$oVCard = null;
		$aProperties = array();

		try
		{
			$oVCard = \Sabre\VObject\Reader::read($sVCard);
		}
		catch (\Exception $oExc) {}

		if ($oVCard && $oVCard->UID)
		{
			$this->IdContactStr = (string) $oVCard->UID;

			if (isset($oVCard->FN) && '' !== \trim($oVCard->FN))
			{
				$aProperties[] = new Property(PropertyType::FULLNAME, \trim($oVCard->FN));
			}

			if (isset($oVCard->NICKNAME) && '' !== \trim($oVCard->NICKNAME))
			{
				$aProperties[] = new Property(PropertyType::NICK_NAME, \trim($oVCard->NICKNAME));
			}

//			if (isset($oVCard->NOTE) && '' !== \trim($oVCard->NOTE))
//			{
//				$aProperties[] = new Property(PropertyType::NOTE, \trim($oVCard->NOTE));
//			}

			if (isset($oVCard->N))
			{
				$aNames = $oVCard->N->getParts();
				foreach ($aNames as $iIndex => $sValue)
				{
					$sValue = \trim($sValue);
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
				foreach($oVCard->EMAIL as $oEmail)
				{
					$oTypes = $oEmail ? $oEmail['TYPE'] : null;
					$sEmail = $oTypes ? \trim((string) $oEmail) : '';

					if ($oTypes && 0 < \strlen($sEmail))
					{
						if ($oTypes->has('WORK'))
						{
							$aProperties[] = new Property(PropertyType::EMAIl_BUSSINES, $sEmail);
						}
						else
						{
							$aProperties[] = new Property(PropertyType::EMAIl_PERSONAL, $sEmail);
						}
					}
				}
			}
			
			if (isset($oVCard->TEL))
			{
				foreach($oVCard->TEL as $oTel)
				{
					$oTypes = $oTel ? $oTel['TYPE'] : null;
					$sTel = $oTypes ? \trim((string) $oTel) : '';

					if ($oTypes && 0 < \strlen($sTel))
					{
						if ($oTypes->has('VOICE'))
						{
							if ($oTypes->has('WORK'))
							{
								$aProperties[] = new Property(PropertyType::PHONE_BUSSINES, $sTel);
							}
							else
							{
								$aProperties[] = new Property(PropertyType::PHONE_PERSONAL, $sTel);
							}
						}
						else if ($oTypes->has('CELL'))
						{
							if ($oTypes->has('WORK'))
							{
								$aProperties[] = new Property(PropertyType::MOBILE_BUSSINES, $sTel);
							}
							else
							{
								$aProperties[] = new Property(PropertyType::MOBILE_PERSONAL, $sTel);
							}
						}
						else if ($oTypes->has('FAX'))
						{
							if ($oTypes->has('WORK'))
							{
								$aProperties[] = new Property(PropertyType::FAX_BUSSINES, $sTel);
							}
							else
							{
								$aProperties[] = new Property(PropertyType::FAX_PERSONAL, $sTel);
							}
						}
						else if ($oTypes->has('WORK'))
						{
							$aProperties[] = new Property(PropertyType::MOBILE_BUSSINES, $sTel);
						}
						else
						{
							$aProperties[] = new Property(PropertyType::MOBILE_PERSONAL, $sTel);
						}
					}
				}
			}
			
			$this->Properties = $aProperties;

			$this->CardDavData = $sVCard;
		}

		$this->UpdateDependentValues(false);
	}

	/**
	 * @return string
	 */
	public function ToVCardObject($sPreVCard = '')
	{
//		$this->UpdateDependentValues();

		$oVCard = null;
		if (0 < \strlen($sPreVCard))
		{
			try
			{
				$oVCard = \Sabre\VObject\Reader::read($sPreVCard);
			}
			catch (\Exception $oExc) {};
		}

		if (!$oVCard)
		{
			$oVCard = new \Sabre\VObject\Component\VCard();
		}

		$oVCard->VERSION = '3.0';
		$oVCard->PRODID = '-//RainLoop//'.APP_VERSION.'//EN';

		unset($oVCard->FN, $oVCard->EMAIL, $oVCard->TEL);

		$sFirstName = $sLastName = $sMiddleName = $sSuffix = $sPrefix = '';
		foreach ($this->Properties as /* @var $oProperty \RainLoop\Providers\PersonalAddressBook\Classes\Property */ &$oProperty)
		{
			if ($oProperty)
			{
				switch ($oProperty->Type)
				{
					case PropertyType::FULLNAME:
						$oVCard->FN = $oProperty->Value;
						break;
					case PropertyType::NICK_NAME:
						$oVCard->NICKNAME = $oProperty->Value;
						break;
					case PropertyType::EMAIl_PERSONAL:
						$oVCard->add('EMAIL', $oProperty->Value, array('TYPE' => array('INTERNET', 'HOME')));
						break;
					case PropertyType::EMAIl_BUSSINES:
						$oVCard->add('EMAIL', $oProperty->Value, array('TYPE' => array('INTERNET', 'WORK')));
						break;
					case PropertyType::PHONE_PERSONAL:
						$oVCard->add('TEL', $oProperty->Value, array('TYPE' => array('VOICE', 'HOME')));
						break;
					case PropertyType::PHONE_BUSSINES:
						$oVCard->add('TEL', $oProperty->Value, array('TYPE' => array('VOICE', 'WORK')));
						break;
					case PropertyType::MOBILE_PERSONAL:
						$oVCard->add('TEL', $oProperty->Value, array('TYPE' => array('CELL', 'HOME')));
						break;
					case PropertyType::MOBILE_BUSSINES:
						$oVCard->add('TEL', $oProperty->Value, array('TYPE' => array('CELL', 'WORK')));
						break;
					case PropertyType::FAX_PERSONAL:
						$oVCard->add('TEL', $oProperty->Value, array('TYPE' => array('FAX', 'HOME')));
						break;
					case PropertyType::FAX_BUSSINES:
						$oVCard->add('TEL', $oProperty->Value, array('TYPE' => array('FAX', 'WORK')));
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
				}
			}
		}

		$oVCard->UID = $this->IdContactStr;
		$oVCard->N = array($sLastName, $sFirstName, $sMiddleName, $sPrefix, $sSuffix);
		$oVCard->REV = gmdate('Ymd').'T'.gmdate('His').'Z';

		return $oVCard;
	}

	/**
	 * @return string
	 */
	public function VCardUri()
	{
		return $this->IdContactStr.'.vcf';
	}
}
