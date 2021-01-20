<?php

namespace RainLoop\Providers\Filters\Classes;

class Filter implements \JsonSerializable
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
		$this->sID = $aFilter['ID'] ?? '';
		$this->sName = $aFilter['Name'] ?? '';

		$this->bEnabled = !isset($aFilter['Enabled']) || !empty($aFilter['Enabled']);

		$this->sConditionsType = $aFilter['ConditionsType']
			?? \RainLoop\Providers\Filters\Enumerations\ConditionsType::ANY;

		$this->sActionType = $aFilter['ActionType']
			?? \RainLoop\Providers\Filters\Enumerations\ActionType::MOVE_TO;

		$this->sActionValue = $aFilter['ActionValue'] ?? '';
		$this->sActionValueSecond = $aFilter['ActionValueSecond'] ?? '';
		$this->sActionValueThird = $aFilter['ActionValueThird'] ?? '';
		$this->sActionValueFourth = $aFilter['ActionValueFourth'] ?? '';

		$this->bKeep = !isset($aFilter['Keep']) || !empty($aFilter['Keep']);
		$this->bStop = !isset($aFilter['Stop']) || !empty($aFilter['Stop']);
		$this->bMarkAsRead = !isset($aFilter['MarkAsRead']) || !empty($aFilter['MarkAsRead']);

		$this->aConditions = empty($aFilter['Conditions']) ? array() : FilterCondition::CollectionFromJSON($aFilter['Conditions']);

		return !empty($this->aConditions);
	}

	public function jsonSerialize()
	{
		return array(
			'@Object' => 'Object/Filter',
			'ID' => $this->ID(),
			'Enabled' => $this->Enabled(),
			'Name' => $this->Name(),
			'Conditions' => $this->Conditions(),
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
