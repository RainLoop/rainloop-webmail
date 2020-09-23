<?php

namespace RainLoop\Config;

class Plugin extends \RainLoop\Config\AbstractConfig
{
	/**
	 * @var array
	 */
	private $aMap;

	public function __construct(string $sPluginName, array $aMap = array())
	{
		$this->aMap = is_array($aMap) ? $this->convertConfigMap($aMap) : array();

		parent::__construct('plugin-'.$sPluginName.'.ini', '; SnappyMail plugin ('.$sPluginName.')');
	}

	private function convertConfigMap(array $aMap) : array
	{
		if (0 < \count($aMap))
		{
			$aResultMap = array();
			foreach ($aMap as /* @var $oProperty \RainLoop\Plugins\Property */ $oProperty)
			{
				if ($oProperty)
				{
					$mValue = $oProperty->DefaultValue();
					$sValue = \is_array($mValue) && isset($mValue[0]) ? $mValue[0] : $mValue;
					$aResultMap[$oProperty->Name()] = array($sValue, '');
				}
			}

			if (0 < \count($aResultMap))
			{
				return array(
					'plugin' => $aResultMap
				);
			}
		}

		return array();
	}

	protected function defaultValues() : array
	{
		return $this->aMap;
	}
}
