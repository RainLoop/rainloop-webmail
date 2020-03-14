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

	/**
	 * @var string
	 */
	private $sValueSecond;

	public function __construct()
	{
		$this->Clear();
	}

	public function Clear()
	{
		$this->sField = \RainLoop\Providers\Filters\Enumerations\ConditionField::FROM;
		$this->sType = \RainLoop\Providers\Filters\Enumerations\ConditionType::EQUAL_TO;
		$this->sValue = '';
		$this->sValueSecond = '';
	}

	public function Field() : string
	{
		return $this->sField;
	}

	public function Type() : string
	{
		return $this->sType;
	}

	public function Value() : string
	{
		return $this->sValue;
	}

	public function ValueSecond() : string
	{
		return $this->sValueSecond;
	}

	public function FromJSON(array $aData) : array
	{
		if (\is_array($aData))
		{
			$this->sField = isset($aData['Field']) ? $aData['Field'] :
				\RainLoop\Providers\Filters\Enumerations\ConditionField::FROM;

			$this->sType = isset($aData['Type']) ? $aData['Type'] :
				\RainLoop\Providers\Filters\Enumerations\ConditionType::EQUAL_TO;

			$this->sValue = isset($aData['Value']) ? (string) $aData['Value'] : '';
			$this->sValueSecond = isset($aData['ValueSecond']) ? (string) $aData['ValueSecond'] : '';

			return true;
		}

		return false;
	}

	public function ToSimpleJSON(bool $bAjax = false) : array
	{
		return array(
			'Field' => $this->Field(),
			'Type' => $this->Type(),
			'Value' => $this->Value(),
			'ValueSecond' => $this->ValueSecond()
		);
	}

	public static function CollectionFromJSON(array $aCollection) : array
	{
		$aResult = array();
		if (\is_array($aCollection) && 0 < \count($aCollection))
		{
			foreach ($aCollection as $aItem)
			{
				if (\is_array($aItem) && 0 < \count($aItem))
				{
					$oItem = new \RainLoop\Providers\Filters\Classes\FilterCondition();
					if ($oItem->FromJSON($aItem))
					{
						$aResult[] = $oItem;
					}
				}
			}
		}

		return $aResult;
	}
}
