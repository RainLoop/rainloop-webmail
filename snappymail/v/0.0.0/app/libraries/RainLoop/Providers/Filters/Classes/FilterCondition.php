<?php

namespace RainLoop\Providers\Filters\Classes;

class FilterCondition implements \JsonSerializable
{
	/**
	 * @var string
	 */
	private $sField = '';

	/**
	 * @var string
	 */
	private $sType = '';

	/**
	 * @var string
	 */
	private $sValue = '';

	/**
	 * @var string
	 */
	private $sValueSecond = '';

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

	public function FromJSON(array $aData) : bool
	{
		if (empty($aData['Field']) || empty($aData['Type']) || empty($aData['Value'])) {
			return false;
		}
		$this->sField = $aData['Field'];
		$this->sType = $aData['Type'];
		$this->sValue = (string) $aData['Value'];
		$this->sValueSecond = isset($aData['ValueSecond']) ? (string) $aData['ValueSecond'] : '';

		return true;
	}

	public static function CollectionFromJSON(array $aCollection) : array
	{
		$aResult = array();
		foreach ($aCollection as $aItem)
		{
			if (\is_array($aItem) && \count($aItem))
			{
				$oItem = new \RainLoop\Providers\Filters\Classes\FilterCondition();
				if ($oItem->FromJSON($aItem))
				{
					$aResult[] = $oItem;
				}
			}
		}
		return $aResult;
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return array(
			'@Object' => 'Object/FilterCondition',
			'Field' => $this->Field(),
			'Type' => $this->Type(),
			'Value' => $this->Value(),
			'ValueSecond' => $this->ValueSecond()
		);
	}
}
