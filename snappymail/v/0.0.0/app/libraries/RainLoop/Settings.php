<?php

namespace RainLoop;

class Settings implements \JsonSerializable
{
	/**
	 * @var array
	 */
	protected $aData = array();

	public function __construct(array $aData)
	{
		$this->aData = $aData;
	}

	public function toArray() : array
	{
		return $this->aData;
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return $this->aData;;
	}

	/**
	 * @param mixed $mDefValue = null
	 *
	 * @return mixed
	 */
	public function GetConf(string $sName, $mDefValue = null)
	{
		return isset($this->aData[$sName]) ? $this->aData[$sName] : $mDefValue;
	}

	/**
	 * @param mixed $mValue
	 */
	public function SetConf(string $sName, $mValue) : void
	{
		$this->aData[$sName] = $mValue;
	}
}
