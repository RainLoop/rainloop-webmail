<?php

namespace RainLoop\Providers\Filters\Classes;

class Filter
{
	/**
	 * @var string
	 */
	private $sID;

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
	private $sActionType;

	/**
	 * @var string
	 */
	private $sActionValue;

	/**
	 * @var bool
	 */
	private $bMarkAsRead;

	/**
	 * @var bool
	 */
	private $bSkipOthers;

	public function __construct()
	{
		$this->Clear();
	}

	public function Clear()
	{
		$this->sID = '';
		$this->sName = '';

		$this->aConditions = array();

		$this->sFilterRulesType = \RainLoop\Providers\Filters\Enumerations\FilterRulesType::ALL;

		$this->sActionType = \RainLoop\Providers\Filters\Enumerations\ActionType::MOVE_TO;
		$this->sActionValue = '';

		$this->bMarkAsRead = false;
		$this->bSkipOthers = false;
	}

	/**
	 * @return string
	 */
	public function ID()
	{
		return $this->sID;
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
	public function FilterRulesType()
	{
		return $this->sFilterRulesType;
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
	 * @return bool
	 */
	public function MarkAsRead()
	{
		return $this->bMarkAsRead;
	}

	/**
	 * @return bool
	 */
	public function SkipOthers()
	{
		return $this->bSkipOthers;
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
		$sFilterJson = \json_decode(\trim($sFilterJson));
		if (!empty($sFilterJson))
		{
		}
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

			$this->sFilterRulesType = isset($aFilter['FilterRulesType']) ? $aFilter['FilterRulesType'] :
				\RainLoop\Providers\Filters\Enumerations\FilterRulesType::ALL;

			$this->sActionType = isset($aFilter['ActionType']) ? $aFilter['ActionType'] :
				\RainLoop\Providers\Filters\Enumerations\ActionType::MOVE_TO;

			$this->sActionValue = isset($aFilter['ActionValue']) ? $aFilter['ActionValue'] : '';

			$this->bMarkAsRead = isset($aFilter['MarkAsRead']) ? $aFilter['MarkAsRead'] : false;
			$this->bSkipOthers = isset($aFilter['SkipOthers']) ? $aFilter['SkipOthers'] : false;
		}
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
			'Name' => $this->Name(),
			'Conditions' => $aConditions,
			'FilterRulesType' => $this->FilterRulesType(),
			'ActionType' => $this->ActionType(),
			'ActionValue' => $this->ActionValue(),
			'MarkAsRead' => $this->MarkAsRead(),
			'SkipOthers' => $this->SkipOthers()
		);
	}
}
