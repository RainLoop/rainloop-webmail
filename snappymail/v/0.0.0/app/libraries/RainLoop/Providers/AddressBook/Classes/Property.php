<?php

namespace RainLoop\Providers\AddressBook\Classes;

use RainLoop\Providers\AddressBook\Enumerations\PropertyType;

class Property implements \JsonSerializable
{
	/**
	 * @var int
	 */
	public $IdProperty = 0;

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
	 * @var int
	 */
	public $Frec = 0;

	public function __construct(int $iType = PropertyType::UNKNOWN, string $sValue = '', string $sTypeStr = '')
	{
		$this->Type = $iType;
		$this->Value = $sValue;
		$this->TypeStr = $sTypeStr;
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		throw new \Exception('Obsolete ' . __CLASS__ . '::jsonSerialize()');
	}
}
