<?php

namespace RainLoop\Providers\PersonalAddressBook\Classes;

use RainLoop\Providers\PersonalAddressBook\Enumerations\PropertyType;

class Property
{
	/**
	 * @var int
	 */
	public $IdProperty;
	
	/**
	 * @var int
	 */
	public $Type;

	/**
	 * @var int
	 */
	public $ScopeType;

	/**
	 * @var string
	 */
	public $TypeCustom;

	/**
	 * @var string
	 */
	public $Value;

	/**
	 * @var string
	 */
	public $ValueCustom;

	/**
	 * @var int
	 */
	public $Frec;

	public function __construct(
		$iType = \RainLoop\Providers\PersonalAddressBook\Enumerations\PropertyType::UNKNOWN, $sValue = '')
	{
		$this->Clear();

		$this->Type = $iType;
		$this->Value = $sValue;
	}

	public function Clear()
	{
		$this->IdProperty = 0;
		
		$this->Type = PropertyType::UNKNOWN;
		$this->ScopeType = \RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_;
		$this->TypeCustom = '';

		$this->Value = '';
		$this->ValueCustom = '';

		$this->Frec = 0;
	}

	/**
	 * @return bool
	 */
	public function IsEmail()
	{
		return \in_array($this->Type, array(
			PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER
		));
	}
	
	/**
	 * @return bool
	 */
	public function IsPhone()
	{
		return \in_array($this->Type, array(
			PropertyType::PHONE_PERSONAL, PropertyType::PHONE_BUSSINES, PropertyType::PHONE_OTHER,
			PropertyType::MOBILE_PERSONAL, PropertyType::MOBILE_BUSSINES, PropertyType::MOBILE_OTHER,
			PropertyType::FAX_PERSONAL, PropertyType::FAX_BUSSINES, PropertyType::FAX_OTHER
		));
	}

	public function UpdateDependentValues()
	{
		// trimer
		$this->Value = \trim($this->Value);
		$this->ValueCustom = \trim($this->ValueCustom);
		$this->TypeCustom = \trim($this->TypeCustom);
		
		if (0 < \strlen($this->Value))
		{
			// lower
			if ($this->IsEmail())
			{
				$this->Value = \strtolower($this->Value);
			}

			// phones clear value for searching
			if ($this->IsPhone())
			{
				$sPhone = $this->Value;
				$sPhone = \preg_replace('/^[+]+/', '', $sPhone);
				$sPhone = \preg_replace('/[^\d]/', '', $sPhone);
				$this->ValueCustom = $sPhone;
			}
		}
	}
}
