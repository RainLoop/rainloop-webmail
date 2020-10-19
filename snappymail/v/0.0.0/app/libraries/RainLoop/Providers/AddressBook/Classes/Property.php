<?php

namespace RainLoop\Providers\AddressBook\Classes;

use RainLoop\Providers\AddressBook\Enumerations\PropertyType;

class Property implements \JsonSerializable
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
	public $ValueLower;

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

	public function Clear() : void
	{
		$this->IdProperty = 0;

		$this->Type = PropertyType::UNKNOWN;
		$this->TypeStr = '';

		$this->Value = '';
		$this->ValueLower = '';
		$this->ValueCustom = '';

		$this->Frec = 0;
	}

	public function IsName() : bool
	{
		return \in_array($this->Type, array(PropertyType::FULLNAME, PropertyType::FIRST_NAME,
			PropertyType::LAST_NAME, PropertyType::MIDDLE_NAME, PropertyType::NICK_NAME));
	}

	public function IsEmail() : bool
	{
		return PropertyType::EMAIl === $this->Type;
	}

	public function IsPhone() : bool
	{
		return PropertyType::PHONE === $this->Type;
	}

	public function IsWeb() : bool
	{
		return PropertyType::WEB_PAGE === $this->Type;
	}

	public function IsValueForLower() : bool
	{
		return $this->IsEmail() || $this->IsName() || $this->IsWeb();
	}

	public function TypesAsArray() : array
	{
		$aResult = array();
		if (!empty($this->TypeStr))
		{
			$sTypeStr = \preg_replace('/[\s]+/', '', $this->TypeStr);
			$aResult = \explode(',', $sTypeStr);
		}

		return $aResult;
	}

	public function TypesUpperAsArray() : array
	{
		return \array_map('strtoupper', $this->TypesAsArray());
	}

	public function UpdateDependentValues() : void
	{
		$this->Value = \trim($this->Value);
		$this->ValueCustom = \trim($this->ValueCustom);
		$this->TypeStr = \trim($this->TypeStr);
		$this->ValueLower = '';

		if (0 < \strlen($this->Value))
		{
			// lower
			if ($this->IsEmail())
			{
				$this->Value = \MailSo\Base\Utils::StrMailDomainToLowerIfAscii($this->Value);
			}

			if ($this->IsName())
			{
				$this->Value = \MailSo\Base\Utils::StripSpaces($this->Value);
			}

			// lower value for searching
			if ($this->IsValueForLower() && \MailSo\Base\Utils::FunctionExistsAndEnabled('mb_strtolower'))
			{
				$this->ValueLower = (string) \mb_strtolower($this->Value, 'UTF-8');
			}

			// phone value for searching
			if ($this->IsPhone())
			{
				$sPhone = \trim($this->Value);
				$sPhone = \preg_replace('/^[+]+/', '', $sPhone);
				$sPhone = \preg_replace('/[^\d]/', '', $sPhone);

				$this->ValueCustom = \trim($sPhone);
			}
		}
	}

	public function jsonSerialize()
	{
		// Simple hack
		if ($this && $this->IsWeb())
		{
			$this->Value = \preg_replace('/(skype|ftp|http[s]?)\\\:\/\//i', '$1://', $this->Value);
		}
		return array(
			'@Object' => 'Object/Property',
			'IdProperty' => $this->IdProperty,
			'Type' => $this->Type,
			'TypeStr' => $this->TypeStr,
			'Value' => \MailSo\Base\Utils::Utf8Clear($this->Value)
		));
	}
}
