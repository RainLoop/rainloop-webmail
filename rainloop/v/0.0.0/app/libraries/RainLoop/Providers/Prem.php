<?php

namespace RainLoop\Providers;

class Prem
{
	/**
	 * @return void
	 */
	public function __construct($oConfig, $oLogger, $oCacher)
	{
		$this->oConfig = $oConfig;
		$this->oLogger = $oLogger;
		$this->oCacher = $oCacher;
	}

	public function PopulateAppData(array &$aAppData)
	{
		if (\is_array($aAppData))
		{
			$aAppData['Community'] = false;

			$oConfig = $this->oConfig;
			if ($oConfig)
			{
				$aAppData['PremType'] = true;
				$aAppData['LoginLogo'] = $oConfig->Get('branding', 'login_logo', '');
				$aAppData['LoginBackground'] = $oConfig->Get('branding', 'login_background', '');
				$aAppData['LoginCss'] = $oConfig->Get('branding', 'login_css', '');
				$aAppData['LoginDescription'] = $oConfig->Get('branding', 'login_desc', '');
				$aAppData['UserLogo'] = $oConfig->Get('branding', 'user_logo', '');
				$aAppData['UserLogoTitle'] = $oConfig->Get('branding', 'user_logo_title', '');
				$aAppData['UserLogoMessage'] = $oConfig->Get('branding', 'user_logo_message', '');
				$aAppData['UserIframeMessage'] = $oConfig->Get('branding', 'user_iframe_message', '');
				$aAppData['UserCss'] = $oConfig->Get('branding', 'user_css', '');
				$aAppData['WelcomePageUrl'] = $oConfig->Get('branding', 'welcome_page_url', '');
				$aAppData['WelcomePageDisplay'] = \strtolower($oConfig->Get('branding', 'welcome_page_display', 'none'));
			}
		}
	}

	public function PremSection(&$oActions, &$oConfig)
	{
		if ($oActions && $oActions->HasOneOfActionParams(array(
			'LoginLogo', 'LoginBackground', 'LoginDescription', 'LoginCss',
			'UserLogo', 'UserLogoTitle', 'UserLogoMessage', 'UserIframeMessage', 'UserCss',
			'WelcomePageUrl', 'WelcomePageDisplay'
		)))
		{
			$oActions->setConfigFromParams($oConfig, 'LoginLogo', 'branding', 'login_logo', 'string');
			$oActions->setConfigFromParams($oConfig, 'LoginBackground', 'branding', 'login_background', 'string');
			$oActions->setConfigFromParams($oConfig, 'LoginDescription', 'branding', 'login_desc', 'string');
			$oActions->setConfigFromParams($oConfig, 'LoginCss', 'branding', 'login_css', 'string');

			$oActions->setConfigFromParams($oConfig, 'UserLogo', 'branding', 'user_logo', 'string');
			$oActions->setConfigFromParams($oConfig, 'UserLogoTitle', 'branding', 'user_logo_title', 'string');
			$oActions->setConfigFromParams($oConfig, 'UserLogoMessage', 'branding', 'user_logo_message', 'string');
			$oActions->setConfigFromParams($oConfig, 'UserIframeMessage', 'branding', 'user_iframe_message', 'string');
			$oActions->setConfigFromParams($oConfig, 'UserCss', 'branding', 'user_css', 'string');

			$oActions->setConfigFromParams($oConfig, 'WelcomePageUrl', 'branding', 'welcome_page_url', 'string');
			$oActions->setConfigFromParams($oConfig, 'WelcomePageDisplay', 'branding', 'welcome_page_display', 'string');
		}
	}

}
