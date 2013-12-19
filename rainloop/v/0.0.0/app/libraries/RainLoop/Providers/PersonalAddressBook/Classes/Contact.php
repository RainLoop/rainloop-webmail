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
					case PropertyType::FIRST_NAME:
						$sFirstName = $oProperty->Value;
						break;
					case PropertyType::SUR_NAME:
						$sSurName = $oProperty->Value;
						break;
				}

				if (PropertyType::FULLNAME === $oProperty->Type)
				{
					$oVCard->FN = $oProperty->Value;
				}
			}
		}

		$oVCard->UID = ((string) $this->IdContact).'.vcf';

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
}
