<?php

class VideoOnLoginScreenPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
	NAME = 'Video On Login Screen',
	VERSION = '0.1',
	RELEASE = '2023-11-09',
	REQUIRED = '2.5.0',
	CATEGORY = 'Login',
	DESCRIPTION = 'Play a simple video on the login screen.';

	/**
	 * @return void
	 */
	public function Init() : void
	{
		$this->addJs('js/video-on-login.js');
		$this->addHook('main.content-security-policy', 'ContentSecurityPolicy');
	}

	/**
	 * @return array
	 */
	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('mp4_file')->SetLabel('Url to a mp4 file')
				->SetPlaceholder('http://')
				->SetAllowedInJs(true)
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('playback_rate')->SetLabel('Playback rate')
				->SetAllowedInJs(true)
				->SetType(\RainLoop\Enumerations\PluginPropertyType::SELECTION)
				->SetDefaultValue(array('100%', '25%', '50%', '75%', '125%', '150%', '200%')),
		);
	}

	public function ContentSecurityPolicy(\SnappyMail\HTTP\CSP $CSP)
	{
		$vSource = $this->Config()->Get('plugin', 'mp4_file', 'self');
		$CSP->add('media-src', $vSource);
	}
}
