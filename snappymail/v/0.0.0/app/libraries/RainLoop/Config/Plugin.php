<?php

namespace RainLoop\Config;

class Plugin extends \RainLoop\Config\AbstractConfig
{
	/**
	 * @var array
	 */
	private $aMap = array();

	public function __construct(string $sPluginName, array $aMap = array())
	{
		if (\count($aMap)) {
			$aResultMap = array();
			foreach ($aMap as /* @var $oProperty \RainLoop\Plugins\Property */ $oProperty) {
				if ($oProperty) {
					$mValue = $oProperty->DefaultValue();
					$sValue = \is_array($mValue) && isset($mValue[0]) ? $mValue[0] : $mValue;
					$aResultMap[$oProperty->Name()] = array($sValue, '');
				}
			}

			if (\count($aResultMap)) {
				$this->aMap = array(
					'plugin' => $aResultMap
				);
			}
		}

		parent::__construct('plugin-'.$sPluginName.'.ini', '; SnappyMail plugin ('.$sPluginName.')');
	}

	protected function defaultValues() : array
	{
		return $this->aMap;
	}
}
