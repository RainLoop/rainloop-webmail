<?php

class LdapContactsSuggestionsPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	public function Init()
	{
		$this->addHook('main.fabrica', 'MainFabrica');
	}

	/**
	 * @return string
	 */
	public function Supported()
	{
		if (!\function_exists('ldap_connect'))
		{
			return 'The LDAP PHP extension must be installed to use this plugin';
		}

		return '';
	}

	/**
	 * @param string $sName
	 * @param mixed $mResult
	 */
	public function MainFabrica($sName, &$mResult)
	{
		switch ($sName)
		{
			case 'suggestions':

				if (!\is_array($mResult))
				{
					$mResult = array();
				}

				$sHostName = \trim($this->Config()->Get('plugin', 'hostname', ''));
				$iHostPort = (int) $this->Config()->Get('plugin', 'port', 389);
				$sAccessDn = \trim($this->Config()->Get('plugin', 'access_dn', ''));
				$sAccessPassword = \trim($this->Config()->Get('plugin', 'access_password', ''));
				$sUsersDn = \trim($this->Config()->Get('plugin', 'users_dn_format', ''));
				$sObjectClass = \trim($this->Config()->Get('plugin', 'object_class', ''));
				$sSearchField = \trim($this->Config()->Get('plugin', 'search_field', ''));
				$sNameField = \trim($this->Config()->Get('plugin', 'name_field', ''));
				$sEmailField = \trim($this->Config()->Get('plugin', 'mail_field', ''));

				if (0 < \strlen($sUsersDn) && 0 < \strlen($sObjectClass) && 0 < \strlen($sEmailField))
				{
					include_once __DIR__.'/LdapContactsSuggestions.php';

					$oProvider = new LdapContactsSuggestions();
					$oProvider->SetConfig($sHostName, $iHostPort, $sAccessDn, $sAccessPassword, $sUsersDn, $sObjectClass, $sSearchField, $sNameField, $sEmailField);

					$mResult[] = $oProvider;
				}

				break;
		}
	}

	/**
	 * @return array
	 */
	public function configMapping()
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('hostname')->SetLabel('LDAP hostname')
				->SetDefaultValue('127.0.0.1'),
			\RainLoop\Plugins\Property::NewInstance('port')->SetLabel('LDAP port')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::INT)
				->SetDefaultValue(389),
			\RainLoop\Plugins\Property::NewInstance('access_dn')->SetLabel('Access dn (login)')
				->SetDescription('LDAP bind DN to authentifcate with. If left blank, anonymous bind will be tried and Access password will be ignored')
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('access_password')->SetLabel('Access password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('users_dn_format')->SetLabel('Users DN format')
				->SetDescription('LDAP users dn format. Supported tokens: {email}, {login}, {domain}, {domain:dc}, {imap:login}, {imap:host}, {imap:port}')
				->SetDefaultValue('ou=People,dc=domain,dc=com'),
			\RainLoop\Plugins\Property::NewInstance('object_class')->SetLabel('objectClass value')
				->SetDefaultValue('inetOrgPerson'),
			\RainLoop\Plugins\Property::NewInstance('search_field')->SetLabel('Search field')
				->SetDefaultValue('uid'),
			\RainLoop\Plugins\Property::NewInstance('name_field')->SetLabel('Name field')
				->SetDefaultValue('givenname'),
			\RainLoop\Plugins\Property::NewInstance('mail_field')->SetLabel('Mail field')
				->SetDefaultValue('mail'),
			\RainLoop\Plugins\Property::NewInstance('allowed_emails')->SetLabel('Allowed emails')
				->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@domain1.net user2@domain1.net *@domain2.net')
				->SetDefaultValue('*')
		);
	}
}
