<?php

namespace RainLoop;

class Settings implements \JsonSerializable
{
	protected array $aData = array();

	public function __construct(array $aData)
	{
		if (isset($aData['SpamFolder']) && !isset($aData['JunkFolder'])) {
			$aData['JunkFolder'] = $aData['SpamFolder'];
		}
		if (isset($aData['DraftFolder']) && !isset($aData['DraftsFolder'])) {
			$aData['DraftsFolder'] = $aData['DraftFolder'];
		}
		if (isset($aData['Language']) && !isset($aData['language'])) {
			$aData['language'] = $aData['Language'];
			unset($aData['Language']);
		}
		$this->aData = $aData;
	}

	public function toArray() : array
	{
		return $this->aData;
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return $this->aData;;
	}

	/**
	 * @param mixed $mDefValue = null
	 *
	 * @return mixed
	 */
	public function GetConf(string $sName, $mDefValue = null)
	{
		return isset($this->aData[$sName]) ? $this->aData[$sName] : $mDefValue;
	}

	/**
	 * @param mixed $mValue
	 */
	public function SetConf(string $sName, $mValue) : void
	{
		$this->aData[$sName] = $mValue;
	}
}
