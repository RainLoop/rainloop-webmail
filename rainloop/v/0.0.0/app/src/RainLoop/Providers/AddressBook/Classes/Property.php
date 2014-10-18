<?php

namespace RainLoop\Providers\AddressBook\Classes;

use RainLoop\Providers\AddressBook\Enumerations\PropertyType;

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
	 * @var string
	 */
	public $TypeStr;

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
		$iType = \RainLoop\Providers\AddressBook\Enumerations\PropertyType::UNKNOWN, $sValue = '', $sTypeStr = '')
	{
		$this->Clear();

		$this->Type = $iType;
		$this->Value = $sValue;
		$this->TypeStr = $sTypeStr;
	}

	public function Clear()
	{
		$this->IdProperty = 0;
		
		$this->Type = PropertyType::UNKNOWN;
		$this->TypeStr = '';

		$this->Value = '';
		$this->ValueCustom = '';

		$this->Frec = 0;
	}

	/**
	 * @return bool
	 */
	public function IsEmail()
	{
		return PropertyType::EMAIl === $this->Type;
	}
	
	/**
	 * @return bool
	 */
	public function IsPhone()
	{
		return PropertyType::PHONE === $this->Type;
	}

	/**
	 * @return bool
	 */
	public function IsWeb()
	{
		return PropertyType::WEB_PAGE === $this->Type;
	}

	/**
	 * @return bool
	 */
	public function TypesAsArray()
	{
		$aResult = array();
		if (!empty($this->TypeStr))
		{
			$sTypeStr = \preg_replace('/[\s]+/', '', $this->TypeStr);
			$aResult = \explode(',', $sTypeStr);
		}

		return $aResult;
	}

	/**
	 * @return array
	 */
	public function TypesUpperAsArray()
	{
		return \array_map('strtoupper', $this->TypesAsArray());
	}

	public function UpdateDependentValues()
	{
		$this->Value = \trim($this->Value);
		$this->ValueCustom = \trim($this->ValueCustom);
		$this->TypeStr = \trim($this->TypeStr);
		
		if (0 < \strlen($this->Value))
		{
			// lower
			if ($this->IsEmail())
			{
				$this->Value = \MailSo\Base\Utils::StrToLowerIfAscii($this->Value);
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
