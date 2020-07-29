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

	public function ID() : string
	{
		return $this->sID;
	}

	public function Enabled() : bool
	{
		return $this->bEnabled;
	}

	public function Name() : string
	{
		return $this->sName;
	}

	public function Conditions() : array
	{
		return $this->aConditions;
	}

	public function ConditionsType() : string
	{
		return $this->sConditionsType;
	}

	public function ActionType() : string
	{
		return $this->sActionType;
	}

	public function ActionValue() : string
	{
		return $this->sActionValue;
	}

	public function ActionValueSecond() : string
	{
		return $this->sActionValueSecond;
	}

	public function ActionValueThird() : string
	{
		return $this->sActionValueThird;
	}

	public function ActionValueFourth() : string
	{
		return $this->sActionValueFourth;
	}

	public function MarkAsRead() : bool
	{
		return $this->bMarkAsRead;
	}

	public function Stop() : bool
	{
		return $this->bStop;
	}

	public function Keep() : bool
	{
		return $this->bKeep;
	}

	public function serializeToJson() : string
	{
		return \json_encode($this->ToSimpleJSON());
	}

	public function unserializeFromJson(string $sFilterJson)
	{
		$aFilterJson = \json_decode(\trim($sFilterJson), true);
		if (\is_array($aFilterJson))
		{
			return $this->FromJSON($aFilterJson);
		}

		return false;
	}

	public function FromJSON(array $aFilter) : bool
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

		$this->aConditions = FilterCondition::CollectionFromJSON(
			isset($aFilter['Conditions']) ? $aFilter['Conditions'] : array());

		return true;
	}

	public function ToSimpleJSON(bool $bAjax = false) : array
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
