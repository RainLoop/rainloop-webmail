<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\PluginPropertyType;
use RainLoop\Exceptions\ClientException;
use RainLoop\Notifications;

trait AdminExtensions
{

	public function DoAdminPackagesList() : array
	{
		return $this->DefaultResponse(\SnappyMail\Repository::getPackagesList());
	}

	public function DoAdminPackageDelete() : array
	{
		$sId = $this->GetActionParam('Id', '');
		$bResult = \SnappyMail\Repository::deletePackage($sId);
		static::pluginEnable($sId, false);
		return $this->DefaultResponse($bResult);
	}

	public function DoAdminPackageInstall() : array
	{
		$sType = $this->GetActionParam('Type', '');
		$bResult = \SnappyMail\Repository::installPackage(
			$sType,
			$this->GetActionParam('Id', ''),
			$this->GetActionParam('File', '')
		);
		return $this->DefaultResponse($bResult ?
			('plugin' !== $sType ? array('Reload' => true) : true) : false);
	}

	public function DoAdminPluginDisable() : array
	{
		$this->IsAdminLoggined();

		$sId = (string) $this->GetActionParam('Id', '');
		$bDisable = '1' === (string) $this->GetActionParam('Disabled', '1');

		if (!$bDisable) {
			$oPlugin = $this->Plugins()->CreatePluginByName($sId);
			if ($oPlugin) {
				$sValue = $oPlugin->Supported();
				if (\strlen($sValue)) {
					return $this->FalseResponse(Notifications::UnsupportedPluginPackage, $sValue);
				}
			} else {
				return $this->FalseResponse(Notifications::InvalidPluginPackage);
			}
		}

		return $this->DefaultResponse($this->pluginEnable($sId, !$bDisable));
	}

	public function DoAdminPluginLoad() : array
	{
		$this->IsAdminLoggined();

		$mResult = false;
		$sId = (string) $this->GetActionParam('Id', '');

		if (!empty($sId)) {
			$oPlugin = $this->Plugins()->CreatePluginByName($sId);
			if ($oPlugin) {
				$mResult = array(
					'@Object' => 'Object/Plugin',
					'Id' => $sId,
					'Name' => $oPlugin->Name(),
					'Readme' => $oPlugin->Description(),
					'Config' => array()
				);

				$aMap = $oPlugin->ConfigMap();
				if (\is_array($aMap)) {
					$oConfig = $oPlugin->Config();
					foreach ($aMap as $oItem) {
						if ($oItem) {
							if ($oItem instanceof \RainLoop\Plugins\Property) {
								if (PluginPropertyType::PASSWORD === $oItem->Type()) {
									$oItem->SetValue(static::APP_DUMMY);
								} else {
									$oItem->SetValue($oConfig->Get('plugin', $oItem->Name(), ''));
								}
								$mResult['Config'][] = $oItem;
							} else if ($oItem instanceof \RainLoop\Plugins\PropertyCollection) {
								foreach ($oItem as $oSubItem) {
									if ($oSubItem && $oSubItem instanceof \RainLoop\Plugins\Property) {
										if (PluginPropertyType::PASSWORD === $oSubItem->Type()) {
											$oSubItem->SetValue(static::APP_DUMMY);
										} else {
											$oSubItem->SetValue($oConfig->Get('plugin', $oSubItem->Name(), ''));
										}
									}
								}
								$mResult['Config'][] = $oItem;
							}
						}
					}
				}
			}
		}

		return $this->DefaultResponse($mResult);
	}

	public function DoAdminPluginSettingsUpdate() : array
	{
		$this->IsAdminLoggined();

		$sId = (string) $this->GetActionParam('Id', '');

		if (!empty($sId)) {
			$oPlugin = $this->Plugins()->CreatePluginByName($sId);
			if ($oPlugin) {
				$oConfig = $oPlugin->Config();
				$aMap = $oPlugin->ConfigMap(true);
				if (\is_array($aMap)) {
					$aSettings = (array) $this->GetActionParam('Settings', []);
					foreach ($aMap as $oItem) {
						$sKey = $oItem->Name();
						$sValue = $aSettings[$sKey] ?? $oConfig->Get('plugin', $sKey);
						if (PluginPropertyType::PASSWORD !== $oItem->Type() || static::APP_DUMMY !== $sValue) {
							$oItem->SetValue($sValue);
							$mResultValue = $oItem->Value();
							if (null !== $mResultValue) {
								$oConfig->Set('plugin', $sKey, $mResultValue);
							}
						}
					}
				}
				if ($oConfig->Save()) {
					return $this->TrueResponse();
				}
			}
		}

		throw new ClientException(Notifications::CantSavePluginSettings);
	}

	private function pluginEnable(string $sName, bool $bEnable = true) : bool
	{
		if (!\strlen($sName)) {
			return false;
		}

		$oConfig = $this->Config();

		$aEnabledPlugins = \SnappyMail\Repository::getEnabledPackagesNames();

		$aNewEnabledPlugins = array();
		if ($bEnable) {
			$aNewEnabledPlugins = $aEnabledPlugins;
			$aNewEnabledPlugins[] = $sName;
		} else {
			foreach ($aEnabledPlugins as $sPlugin) {
				if ($sName !== $sPlugin && \strlen($sPlugin)) {
					$aNewEnabledPlugins[] = $sPlugin;
				}
			}
		}

		$oConfig->Set('plugins', 'enabled_list', \trim(\implode(',', \array_unique($aNewEnabledPlugins)), ' ,'));

		return $oConfig->Save();
	}

}
