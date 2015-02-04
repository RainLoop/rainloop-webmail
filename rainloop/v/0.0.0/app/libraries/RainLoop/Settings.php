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
	public function __construct($bLocal = false)
	{
		$this->aData = array();
		$this->bLocal = !!$bLocal;
	}

	/**
	 * @param array $aData
	 *
	 * @return \RainLoop\Settings
	 */
	public function InitData($aData)
	{
		if (\is_array($aData))
		{
			$this->aData = $aData;
		}

		return $this;
	}

	/**
	 * @return array
	 */
	public function DataAsArray()
	{
		return $this->aData;
	}

	/**
	 * @return bool
	 */
	public function IsLocal()
	{
		return $this->bLocal;
	}

	/**
	 * @param string $sName
	 * @param mixed $mDefValue = null
	 *
	 * @return mixed
	 */
	public function GetConf($sName, $mDefValue = null)
	{
		return isset($this->aData[$sName]) ? $this->aData[$sName] : $mDefValue;
	}

	/**
	 * @param string $sName
	 * @param mixed $mValue
	 *
	 * @return void
	 */
	public function SetConf($sName, $mValue)
	{
		$this->aData[$sName] = $mValue;
	}
}