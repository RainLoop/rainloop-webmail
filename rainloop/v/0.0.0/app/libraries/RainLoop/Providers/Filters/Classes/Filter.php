<?php

namespace RainLoop\Providers\Filters\Classes;

class Filter
{
	/**
	 * @var string
	 */
	private $sID;

	/**
	 * @var bool
	 */
	private $bEnabled;

	/**
	 * @var string
	 */
	private $sName;

	/**
	 * @var array
	 */
	private $aConditions;

	/**
	 * @var string
	 */
	private $sConditionsType;

	/**
	 * @var string
	 */
	private $sActionType;

	/**
	 * @var string
	 */
	private $sActionValue;

	/**
	 * @var string
	 */
	private $sActionValueSecond;

	/**
	 * @var string
	 */
	private $sActionValueThird;

	/**
	 * @var string
	 */
	private $sActionValueFourth;

	/**
	 * @var bool
	 */
	private $bMarkAsRead;

	/**
	 * @var bool
	 */
	private $bSkipOthers;

	/**
	 * @var bool
	 */
	private $bKeep;

	/**
	 * @var bool
	 */
	private $bStop;

	public function __construct()
	{
		$this->Clear();
	}

	public function Clear()
	{
		$this->sID = '';
		$this->sName = '';

		$this->bEnabled = true;

		$this->aConditions = array();

		$this->sConditionsType = \RainLoop\Providers\Filters\Enumerations\ConditionsType::ANY;

		$this->sActionType = \RainLoop\Providers\Filters\Enumerations\ActionType::MOVE_TO;
		$this->sActionValue = '';
		$this->sActionValueSecond = '';
		$this->sActionValueThird = '';
		$this->sActionValueFourth  = '';

		$this->bMarkAsRead = false;
		$this->bKeep = true;
		$this->bStop = true;
	}

	/**
	 * @return string
	 */
	public function ID()
	{
		return $this->sID;
	}

	/**
	 * @return bool
	 */
	public function Enabled()
	{
		return $this->bEnabled;
	}

	/**
	 * @return string
	 */
	public function Name()
	{
		return $this->sName;
	}

	/**
	 * @return array
	 */
	public function Conditions()
	{
		return $this->aConditions;
	}

	/**
	 * @return string
	 */
	public function ConditionsType()
	{
		return $this->sConditionsType;
	}

	/**
	 * @return string
	 */
	public function ActionType()
	{
		return $this->sActionType;
	}

	/**
	 * @return string
	 */
	public function ActionValue()
	{
		return $this->sActionValue;
	}

	/**
	 * @return string
	 */
	public function ActionValueSecond()
	{
		return $this->sActionValueSecond;
	}

	/**
	 * @return string
	 */
	public function ActionValueThird()
	{
		return $this->sActionValueThird;
	}

	/**
	 * @return string
	 */
	public function ActionValueFourth()
	{
		return $this->sActionValueFourth;
	}

	/**
	 * @return bool
	 */
	public function MarkAsRead()
	{
		return $this->bMarkAsRead;
	}

	/**
	 * @return bool
	 */
	public function Stop()
	{
		return $this->bStop;
	}

	/**
	 * @return bool
	 */
	public function Keep()
	{
		return $this->bKeep;
	}

	/**
	 * @return string
	 */
	public function serializeToJson()
	{
		return \json_encode($this->ToSimpleJSON());
	}

	/**
	 * @param string $sFilterJson
	 */
	public function unserializeFromJson($sFilterJson)
	{
		$aFilterJson = \json_decode(\trim($sFilterJson), true);
		if (\is_array($aFilterJson))
		{
			return $this->FromJSON($aFilterJson);
		}

		return false;
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
			$this->sID = isset($aFilter['ID']) ? $aFilter['ID'] : '';
			$this->sName = isset($aFilter['Name']) ? $aFilter['Name'] : '';

			$this->bEnabled = isset($aFilter['Enabled']) ? '1' === (string) $aFilter['Enabled'] : true;

			$this->sConditionsType = isset($aFilter['ConditionsType']) ? $aFilter['ConditionsType'] :
				\RainLoop\Providers\Filters\Enumerations\ConditionsType::ANY;

			$this->sActionType = isset($aFilter['ActionType']) ? $aFilter['ActionType'] :
				\RainLoop\Providers\Filters\Enumerations\ActionType::MOVE_TO;

			$this->sActionValue = isset($aFilter['ActionValue']) ? $aFilter['ActionValue'] : '';
			$this->sActionValueSecond = isset($aFilter['ActionValueSecond']) ? $aFilter['ActionValueSecond'] : '';
			$this->sActionValueThird = isset($aFilter['ActionValueThird']) ? $aFilter['ActionValueThird'] : '';
			$this->sActionValueFourth = isset($aFilter['ActionValueFourth']) ? $aFilter['ActionValueFourth'] : '';

			$this->bKeep = isset($aFilter['Keep']) ? '1' === (string) $aFilter['Keep'] : true;
			$this->bStop = isset($aFilter['Stop']) ? '1' === (string) $aFilter['Stop'] : true;
			$this->bMarkAsRead = isset($aFilter['MarkAsRead']) ? '1' === (string) $aFilter['MarkAsRead'] : false;

			$this->aConditions = \RainLoop\Providers\Filters\Classes\FilterCondition::CollectionFromJSON(
				isset($aFilter['Conditions']) ? $aFilter['Conditions'] : array());

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
		$aConditions = array();
		foreach ($this->Conditions() as $oItem)
		{
			if ($oItem)
			{
				$aConditions[] = $oItem->ToSimpleJSON($bAjax);
			}
		}

		return array(
			'ID' => $this->ID(),
			'Enabled' => $this->Enabled(),
			'Name' => $this->Name(),
			'Conditions' => $aConditions,
			'ConditionsType' => $this->ConditionsType(),
			'ActionType' => $this->ActionType(),
			'ActionValue' => $this->ActionValue(),
			'ActionValueSecond' => $this->ActionValueSecond(),
			'ActionValueThird' => $this->ActionValueThird(),
			'ActionValueFourth' => $this->ActionValueFourth(),
			'Keep' => $this->Keep(),
			'Stop' => $this->Stop(),
			'MarkAsRead' => $this->MarkAsRead()
		);
	}
}
