<?php

namespace RainLoop\Providers\PersonalAddressBook\Classes;

class Contact
{
	/**
	 * @var int
	 */
	public $IdContact;

	/**
	 * @var int
	 */
	public $IdUser;

	/**
	 * @var string
	 */
	public $DisplayInList;

	/**
	 * @var bool
	 */
	public $IsAuto;

	/**
	 * @var bool
	 */
	public $IsShare;

	/**
	 * @var bool
	 */
	public $CanBeChanged;

	/**
	 * @var int
	 */
	public $Created;

	/**
	 * @var int
	 */
	public $Updated;

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
		$this->IdContact = 0;
		$this->IdUser = 0;
		$this->DisplayInList = '';
		$this->IsAuto = false;
		$this->IsShare = false;
		$this->CanBeChanged = false;
		$this->Changed = \time();
		$this->Tags = array();
		$this->Properties = array();
	}
	
	public function UpdateDependentValues()
	{
		$sDisplayName = '';
		$sDisplayEmail = '';
		
		foreach ($this->Properties as /* @var $oProperty \RainLoop\Providers\PersonalAddressBook\Classes\Property */ $oProperty)
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
		
		$this->DisplayInList = 0 < \strlen($sDisplayName) ? $sDisplayName : (!empty($sDisplayEmail) ? $sDisplayEmail : '');
	}
}
