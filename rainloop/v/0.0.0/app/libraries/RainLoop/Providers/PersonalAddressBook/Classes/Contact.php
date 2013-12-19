<?php

namespace RainLoop\Providers\PersonalAddressBook\Classes;

use RainLoop\Providers\PersonalAddressBook\Enumerations\PropertyType;

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
	 * @var string
	 */
	public $DisplayName;

	/**
	 * @var string
	 */
	public $DisplayEmail;

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
		$this->DisplayName = '';
		$this->DisplayEmail = '';
		$this->ScopeType = \RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_;
		$this->Changed = \time();
		$this->IdPropertyFromSearch = 0;
		$this->Properties = array();
		$this->ReadOnly = false;
	}
	
	public function UpdateDependentValues()
	{
		$sDisplayName = '';
		$sDisplayEmail = '';
		
		foreach ($this->Properties as /* @var $oProperty \RainLoop\Providers\PersonalAddressBook\Classes\Property */ &$oProperty)
		{
			if ($oProperty)
			{
				$oProperty->ScopeType = $this->ScopeType;
				$oProperty->UpdateDependentValues();
				
				if ('' === $sDisplayName && \RainLoop\Providers\PersonalAddressBook\Enumerations\PropertyType::FULLNAME === $oProperty->Type &&
					0 < \strlen($oProperty->Value))
				{
					$sDisplayName = $oProperty->Value;
				}
				else if ('' === $sDisplayEmail && $oProperty->IsEmail() &&
					0 < \strlen($oProperty->Value))
				{
					$sDisplayEmail = $oProperty->Value;
				}
			}
		}

		if (empty($this->IdContactStr))
		{
			$this->IdContactStr = \Sabre\DAV\UUIDUtil::getUUID();
		}

		$this->DisplayName = $sDisplayName;
		$this->DisplayEmail = $sDisplayEmail;

		$this->Display = 0 < \strlen($sDisplayName) ? $sDisplayName : (!empty($sDisplayEmail) ? $sDisplayEmail : '');
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
	 * @return string
	 */
	public function ToVCardObject()
	{
		$this->UpdateDependentValues();

		$oVCard = new \Sabre\VObject\Component\VCard('VCARD');

		$oVCard->VERSION = '3.0';
		$oVCard->PRODID = '-//RainLoop//'.APP_VERSION.'//EN';

		$sFirstName = $sSurName = '';
		foreach ($this->Properties as /* @var $oProperty \RainLoop\Providers\PersonalAddressBook\Classes\Property */ &$oProperty)
		{
			if ($oProperty)
			{
				switch ($oProperty->Type)
				{
					case PropertyType::FULLNAME:
						$oVCard->FN = $oProperty->Value;
						break;
					case PropertyType::NICK:
						$oVCard->NICKNAME = $oProperty->Value;
						break;
					case PropertyType::EMAIl_PERSONAL:
					case PropertyType::EMAIl_OTHER:
						$oVCard->add('EMAIL', $oProperty->Value, array('TYPE' => 'INTERNET', 'TYPE' => 'HOME'));
						break;
					case PropertyType::EMAIl_BUSSINES:
						$oVCard->add('EMAIL', $oProperty->Value, array('TYPE' => 'INTERNET', 'TYPE' => 'WORK'));
						break;
					case PropertyType::PHONE_PERSONAL:
					case PropertyType::PHONE_OTHER:
						$oVCard->add('TEL', $oProperty->Value, array('TYPE' => 'VOICE', 'TYPE' => 'HOME'));
						break;
					case PropertyType::PHONE_BUSSINES:
						$oVCard->add('TEL', $oProperty->Value, array('TYPE' => 'VOICE', 'TYPE' => 'WORK'));
						break;
					case PropertyType::MOBILE_PERSONAL:
					case PropertyType::MOBILE_BUSSINES:
					case PropertyType::MOBILE_OTHER:
						$oVCard->add('TEL', $oProperty->Value, array('TYPE' => 'VOICE', 'TYPE' => 'CELL'));
						break;
					case PropertyType::FAX_PERSONAL:
					case PropertyType::FAX_OTHER:
						$oVCard->add('TEL', $oProperty->Value, array('TYPE' => 'FAX', 'TYPE' => 'HOME'));
						break;
					case PropertyType::FAX_BUSSINES:
						$oVCard->add('TEL', $oProperty->Value, array('TYPE' => 'FAX', 'TYPE' => 'WORK'));
						break;
					case PropertyType::FIRST_NAME:
						$sFirstName = $oProperty->Value;
						break;
					case PropertyType::SUR_NAME:
						$sSurName = $oProperty->Value;
						break;
				}
			}
		}

		$oVCard->UID = $this->VCardUID();

//		$oVCard->N = array(
//			$sSurName,
//			$sFirstName,
//			'',
//			'',
//			'',
//			''
//		);

		return $oVCard;
	}

	/**
	 * @return string
	 */
	public function VCardUID()
	{
		return $this->IdContactStr.'.vcf';
	}


}
