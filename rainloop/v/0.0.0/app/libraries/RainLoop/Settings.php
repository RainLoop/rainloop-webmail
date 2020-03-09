<?php

namespace RainLoop;

class Settings
{
	/**
	 * @var array
	 */
	protected $aData;

	/**
	 * @var bool
	 */
	protected $bLocal;

	/**
	 * @return void
	 */
	public function __construct(bool $bLocal = false)
	{
		$this->aData = array();
		$this->bLocal = !!$bLocal;
	}

	public function InitData(array $aData) : self
	{
		if (\is_array($aData))
		{
			$this->aData = $aData;
		}

		return $this;
	}

	public function DataAsArray() : array
	{
		return $this->aData;
	}

	public function IsLocal() : bool
	{
		return $this->bLocal;
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
	 *
	 * @return void
	 */
	public function SetConf(string $sName, $mValue)
	{
		$this->aData[$sName] = $mValue;
	}
}
