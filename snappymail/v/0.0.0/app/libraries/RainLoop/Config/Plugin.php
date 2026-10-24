<?php

namespace RainLoop\Config;

class Plugin extends \RainLoop\Config\AbstractConfig
{
	private array $aMap = array();

	public function __construct(string $sPluginName, array $aMap = array())
	{
		if (\count($aMap)) {
			$aResultMap = array();
			foreach ($aMap as $oProperty) {
				if ($oProperty instanceof \RainLoop\Plugins\Property) {
					$mDefaultValue = $oProperty->DefaultValue();
					$aResultMap[$oProperty->Name()] = array(
						\is_array($mDefaultValue) ? '' : $mDefaultValue,
						''
					);
				}
			}

			if (\count($aResultMap)) {
				$this->aMap = array(
					'plugin' => $aResultMap
				);
			}
		}

//		parent::__construct('plugin-'.$sPluginName.'.ini', '; SnappyMail plugin ('.$sPluginName.')');
		parent::__construct('plugin-'.$sPluginName.'.json');
	}

	protected function defaultValues() : array
	{
		return $this->aMap;
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		$aData = [];
		foreach (parent::jsonSerialize() as $sSectionKey => $aSectionValue) {
			if (\is_array($aSectionValue)) {
				$aData[$sSectionKey] = [];
				foreach ($aSectionValue as $sParamKey => $mParamValue) {
					$aData[$sSectionKey][$sParamKey] = $mParamValue[0];
				}
			}
		}
		return $aData;
	}
}
