<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\PluginPropertyType;
use RainLoop\Exceptions\ClientException;
use RainLoop\Notifications;
use SnappyMail\Repository;

trait AdminExtensions
{

	public function DoAdminPackagesList() : array
	{
		return $this->DefaultResponse(Repository::getPackagesList());
	}

	public function DoAdminPackageDelete() : array
	{
		return $this->DefaultResponse(Repository::deletePackage($this->GetActionParam('id', '')));
	}

	public function DoAdminPackageInstall() : array
	{
		$sType = $this->GetActionParam('type', '');
		$bResult = Repository::installPackage(
			$sType,
			$this->GetActionParam('id', ''),
			$this->GetActionParam('file', '')
		);
		return $this->DefaultResponse($bResult ?
			('plugin' !== $sType ? array('Reload' => true) : true) : false);
	}

	public function DoAdminPluginDisable() : array
	{
		$this->IsAdminLoggined();

		$sId = (string) $this->GetActionParam('id', '');
		$bDisable = '1' === (string) $this->GetActionParam('disabled', '1');

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

		return $this->DefaultResponse(Repository::enablePackage($sId, !$bDisable));
	}

	public function DoAdminPluginLoad() : array
	{
		$this->IsAdminLoggined();

		$mResult = false;
		$sId = (string) $this->GetActionParam('id', '');

		if (!empty($sId)) {
			$oPlugin = $this->Plugins()->CreatePluginByName($sId);
			if ($oPlugin) {
				$mResult = array(
					'@Object' => 'Object/Plugin',
					'id' => $sId,
					'name' => $oPlugin->Name(),
					'readme' => $oPlugin->Description(),
					'config' => array()
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
								$mResult['config'][] = $oItem;
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
								$mResult['config'][] = $oItem;
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

		$sId = (string) $this->GetActionParam('id', '');

		if (!empty($sId)) {
			$oPlugin = $this->Plugins()->CreatePluginByName($sId);
			if ($oPlugin) {
				$oConfig = $oPlugin->Config();
				$aMap = $oPlugin->ConfigMap(true);
				if (\is_array($aMap)) {
					$aSettings = (array) $this->GetActionParam('settings', []);
					foreach ($aMap as $oItem) {
						$sKey = $oItem->Name();
						$mValue = $aSettings[$sKey] ?? $oConfig->Get('plugin', $sKey);
						if (PluginPropertyType::PASSWORD !== $oItem->Type() || static::APP_DUMMY !== $mValue) {
							$oItem->SetValue($mValue);
							$mValue = $oItem->Value();
							if (null !== $mValue) {
								if ($oItem->encrypted) {
									$oConfig->setEncrypted('plugin', $sKey, $mValue);
								} else {
									$oConfig->Set('plugin', $sKey, $mValue);
								}
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
}
