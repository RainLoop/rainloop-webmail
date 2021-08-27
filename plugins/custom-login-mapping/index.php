<?php

class CustomLoginMappingPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'Custom Login Mapping',
		VERSION = '2.1',
		RELEASE = '2021-04-21',
		REQUIRED = '2.5.0',
		CATEGORY = 'Login',
		DESCRIPTION = 'Enables custom usernames by email address.';

	public function Init() : void
	{
		$this->addHook('login.credentials', 'FilterLoginCredentials');
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
		$sMapping = \trim($this->Config()->Get('plugin', 'mapping', ''));
		if (!empty($sMapping))
		{
			$aLines = \explode("\n", \preg_replace('/[\r\n\t\s]+/', "\n", $sMapping));
			foreach ($aLines as $sLine)
			{
				if (false !== strpos($sLine, ':'))
				{
					$aData = \explode(':', $sLine, 2);
					if (is_array($aData) && !empty($aData[0]) && isset($aData[1]))
					{
						$aData = \array_map('trim', $aData);
						if ($sEmail === $aData[0] && 0 < strlen($aData[1]))
						{
							$sLogin = $aData[1];
						}
					}
				}
			}
		}
	}

	/**
	 * @return array
	 */
	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('mapping')->SetLabel('Mapping')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('email:login mapping')
				->SetDefaultValue("user@domain.com:user.bob\nadmin@domain.com:user.john")
		);
	}
}
