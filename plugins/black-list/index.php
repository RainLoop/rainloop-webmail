<?php

class BlackListPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'Blacklist',
		VERSION = '2.2',
		RELEASE = '2024-03-04',
		REQUIRED = '2.5.0',
		CATEGORY = 'Login',
		DESCRIPTION = 'Simple blacklist extension (with wildcard and exceptions functionality).';

	public function Init() : void
	{
		$this->addHook('login.credentials.step-1', 'FilterLoginCredentials');
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function FilterLoginCredentials(string &$sEmail)
	{
		$sBlackList = \trim($this->Config()->Get('plugin', 'black_list', ''));
		if (\strlen($sBlackList) && \RainLoop\Plugins\Helper::ValidateWildcardValues($sEmail, $sBlackList)) {
			$sExceptions = \trim($this->Config()->Get('plugin', 'exceptions', ''));
			if (!\strlen($sExceptions) || !\RainLoop\Plugins\Helper::ValidateWildcardValues($sEmail, $sExceptions)) {
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
			\RainLoop\Plugins\Property::NewInstance('black_list')->SetLabel('Black List')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Emails black list, space as delimiter, wildcard supported.')
				->SetDefaultValue('*@domain1.com user@domain2.com'),
			\RainLoop\Plugins\Property::NewInstance('exceptions')->SetLabel('Exceptions')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Exceptions for black list, space as delimiter, wildcard supported.')
				->SetDefaultValue('demo@domain1.com *@domain2.com admin@*')
		);
	}
}
