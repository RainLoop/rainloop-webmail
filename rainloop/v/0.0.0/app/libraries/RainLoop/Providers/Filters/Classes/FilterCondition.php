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
	 * @return string
	 */
	public function ValueSecond()
	{
		return $this->sValueSecond;
	}

	/**
	 * @param array $aData
	 *
	 * @return array
	 */
	public function FromJSON($aData)
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
			'Value' => $this->Value(),
			'ValueSecond' => $this->ValueSecond()
		);
	}

	/**
	 * @return array
	 */
	public static function CollectionFromJSON($aCollection)
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
