<?php

namespace RainLoop\Providers\PersonalAddressBook\Classes;

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
	 * @var bool
	 */
	public $Auto;

	/**
	 * @var int
	 */
	public $Changed;

	/**
	 * @var array
	 */
	public $Tags;

	/**
	 * @var array
	 */
	public $Properties;

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
		$this->Auto = false;
		$this->Changed = \time();
		$this->Tags = array();
		$this->Properties = array();
	}
	
	public function UpdateDependentValues()
	{
		$sDisplayName = '';
		$sDisplayEmail = '';
		
		foreach ($this->Properties as /* @var $oProperty \RainLoop\Providers\PersonalAddressBook\Classes\Property */ &$oProperty)
		{
			if ($oProperty)
			{
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
}
