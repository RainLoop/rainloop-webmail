<?php

class WhiteListPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'Whitelist',
		VERSION = '2.2',
		RELEASE = '2024-03-04',
		REQUIRED = '2.5.0',
		CATEGORY = 'Login',
		DESCRIPTION = 'Simple login whitelist (with wildcard and exceptions functionality).';

	public function Init() : void
	{
		$this->addHook('login.credentials.step-1', 'FilterLoginCredentials');
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function FilterLoginCredentials(string &$sEmail)
	{
		$sWhiteList = \trim($this->Config()->Get('plugin', 'white_list', ''));
		if (\strlen($sWhiteList) && !\RainLoop\Plugins\Helper::ValidateWildcardValues($sEmail, $sWhiteList)) {
			$sExceptions = \trim($this->Config()->Get('plugin', 'exceptions', ''));
			if (!\strlen($sExceptions) || \RainLoop\Plugins\Helper::ValidateWildcardValues($sEmail, $sExceptions)) {
				throw new \RainLoop\Exceptions\ClientException(
					$this->Config()->Get('plugin', 'auth_error', false)
					? \RainLoop\Notifications::AuthError
					: \RainLoop\Notifications::AccountNotAllowed
				);
			}
		}
	}

	/**
	 * @return array
	 */
	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('auth_error')->SetLabel('Auth Error')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDescription('Throw an authentication error instead of an access error.')
				->SetDefaultValue(false),
			\RainLoop\Plugins\Property::NewInstance('white_list')->SetLabel('White List')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Emails white list, space as delimiter, wildcard supported.')
				->SetDefaultValue('*@domain1.com user@domain2.com'),
			\RainLoop\Plugins\Property::NewInstance('exceptions')->SetLabel('Exceptions')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Exceptions for white list, space as delimiter, wildcard supported.')
				->SetDefaultValue('demo@domain1.com *@domain2.com admin@*')
		);
	}
}
