<?php

class BlackListPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	public function Init()
	{
		$this->addHook('filter.login-credentials', 'FilterLoginCredentials');
	}

	/**
	 * @param string $sEmail
	 * @param string $sLogin
	 * @param string $sPassword
	 *
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function FilterLoginCredentials(&$sEmail, &$sLogin, &$sPassword)
	{
		$sBlackList = \trim($this->Config()->Get('plugin', 'black_list', ''));
		if (0 < \strlen($sBlackList) && \RainLoop\Plugins\Helper::ValidateWildcardValues($sEmail, $sBlackList))
		{
			$sExceptions = \trim($this->Config()->Get('plugin', 'exceptions', ''));
			if (0 === \strlen($sExceptions) || !\RainLoop\Plugins\Helper::ValidateWildcardValues($sEmail, $sExceptions))
			{
				throw new \RainLoop\Exceptions\ClientException(
					$this->Config()->Get('plugin', 'auth_error', true) ?
						\RainLoop\Notifications::AuthError : \RainLoop\Notifications::AccountNotAllowed);
			}
		}
	}

	/**
	 * @return array
	 */
	public function configMapping()
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('auth_error')->SetLabel('Auth Error')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDescription('Throw an authentication error instead of an access error.')
				->SetDefaultValue(true),
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
