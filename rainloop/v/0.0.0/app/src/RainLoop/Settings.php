<?php

namespace RainLoop;

class Settings
{
	/**
	 * @var array
	 */
	protected $aData;

	/**
	 * @return void
	 */
	public function __construct()
	{
		$this->aData = array();
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