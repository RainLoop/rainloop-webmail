<?php

namespace RainLoop;

use RainLoop\Model\Account;
use RainLoop\Providers\Settings as SettingsProvider;

class Settings implements \JsonSerializable
{
	protected array $aData;
	protected Account $oAccount;
	protected SettingsProvider $oProvider;

	public function __construct(SettingsProvider $oProvider, Account $oAccount, array $aData)
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
		$this->oAccount = $oAccount;
		$this->oProvider = $oProvider;
	}

	public function save() : bool
	{
		return $this->oProvider->Save($this->oAccount, $this);
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
