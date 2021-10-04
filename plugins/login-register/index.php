<?php

class LoginRegisterPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Register and Forgot',
		VERSION  = '2.1',
		RELEASE  = '2021-10-04',
		REQUIRED = '2.5.2',
		CATEGORY = 'Login',
		DESCRIPTION = 'Links on login screen for registration and forgotten password';

	public function Init() : void
	{
		$this->UseLangs(true);
		$this->addJs('LoginRegister.js');
		$this->addHook('filter.app-data', 'FilterAppData');
	}

	public function configMapping() : array
	{
		return [
			\RainLoop\Plugins\Property::NewInstance("forgot_password_link_url")
//				->SetLabel('TAB_LOGIN/LABEL_FORGOT_PASSWORD_LINK_URL')
				->SetLabel('Forgot password url')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::URL),
			\RainLoop\Plugins\Property::NewInstance("registration_link_url")
//				->SetLabel('TAB_LOGIN/LABEL_REGISTRATION_LINK_URL')
				->SetLabel('Register url')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::URL),
		];
	}

	public function FilterAppData($bAdmin, &$aResult)
	{
		if (!$bAdmin && \is_array($aResult) && empty($aResult['Auth'])) {
			$aResult['forgotPasswordLinkUrl'] = \trim($this->Config()->Get('plugin', 'forgot_password_link_url', ''));
			$aResult['registrationLinkUrl'] = \trim($this->Config()->Get('plugin', 'registration_link_url', ''));
		}
	}

}
