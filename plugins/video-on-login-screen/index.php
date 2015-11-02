<?php

class VideoOnLoginScreenPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	/**
	 * @return void
	 */
	public function Init()
	{
		$this->addJs('js/vide/jquery.vide.js');
		$this->addJs('js/video-on-login.js');
	}

	/**
	 * @return array
	 */
	public function configMapping()
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('mp4_file')->SetLabel('Url to a mp4 file')
				->SetPlaceholder('http://')
				->SetAllowedInJs(true)
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('webm_file')->SetLabel('Url to a webm file')
				->SetPlaceholder('http://')
				->SetAllowedInJs(true)
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('ogv_file')->SetLabel('Url to a ogv file')
				->SetPlaceholder('http://')
				->SetAllowedInJs(true)
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('playback_rate')->SetLabel('Playback rate')
				->SetAllowedInJs(true)
				->SetType(\RainLoop\Enumerations\PluginPropertyType::SELECTION)
				->SetDefaultValue(array('100%', '25%', '50%', '75%', '125%', '150%', '200%')),
			\RainLoop\Plugins\Property::NewInstance('muted')->SetLabel('Muted')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetAllowedInJs(true)
				->SetDefaultValue(true),
		);
	}
}
