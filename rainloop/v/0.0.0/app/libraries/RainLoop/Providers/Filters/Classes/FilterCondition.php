<?php

namespace RainLoop\Providers\Filters\Classes;

class FilterCondition
{
	/**
	 * @var string
	 */
	private $sField;

	/**
	 * @var string
	 */
	private $sType;

	/**
	 * @var string
	 */
	private $sValue;

	public function __construct()
	{
		$this->Clear();
	}

	public function Clear()
	{
		$this->sField = \RainLoop\Providers\Filters\Enumerations\ConditionField::FROM;
		$this->sType = \RainLoop\Providers\Filters\Enumerations\ConditionType::EQUAL_TO;
		$this->sValue = '';
	}

	/**
	 * @return string
	 */
	public function Field()
	{
		return $this->sField;
	}

	/**
	 * @return string
	 */
	public function Type()
	{
		return $this->sType;
	}

	/**
	 * @return string
	 */
	public function Value()
	{
		return $this->sValue;
	}

	/**
	 * @param array $aFilter
	 *
	 * @return array
	 */
	public function FromJSON($aFilter)
	{
		if (\is_array($aFilter))
		{
			$this->sField = isset($aFilter['Field']) ? $aFilter['Field'] :
				\RainLoop\Providers\Filters\Enumerations\ConditionField::FROM;

			$this->sType = isset($aFilter['Type']) ? $aFilter['Type'] :
				\RainLoop\Providers\Filters\Enumerations\ConditionType::EQUAL_TO;

			$this->sValue = isset($aFilter['Value']) ? $aFilter['Value'] : '';
		}
	}

	/**
	 * @param bool $bAjax = false
	 *
	 * @return array
	 */
	public function ToSimpleJSON($bAjax = false)
	{
		return array(
			'Field' => $this->Field(),
			'Type' => $this->Type(),
			'Value' => $this->Value()
		);
	}
}
