<?php

class LdapChangePasswordPlugin extends \RainLoop\Plugins\AbstractPlugin
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
	 * @param mixed $oProvider
	 */
	public function MainFabrica($sName, &$oProvider)
	{
		switch ($sName)
		{
			case 'change-password':

				$sHostName = \trim($this->Config()->Get('plugin', 'hostname', ''));
				$iHostPort = (int) $this->Config()->Get('plugin', 'port', 389);
				$sUserDnFormat = \trim($this->Config()->Get('plugin', 'user_dn_format', ''));
				$sPasswordField = \trim($this->Config()->Get('plugin', 'password_field', ''));
				$sPasswordEncType = \trim($this->Config()->Get('plugin', 'password_enc_type', ''));

				if (!empty($sHostName) && 0 < $iHostPort && !empty($sUserDnFormat) && !empty($sPasswordField) && !empty($sPasswordEncType))
				{
					include_once __DIR__.'/ChangePasswordLdapDriver.php';

					$oProvider = new \ChangePasswordLdapDriver();

					$oProvider
						->SetConfig($sHostName, $iHostPort, $sUserDnFormat, $sPasswordField, $sPasswordEncType)
						->SetAllowedEmails(\strtolower(\trim($this->Config()->Get('plugin', 'allowed_emails', ''))))
						->SetLogger($this->Manager()->Actions()->Logger())
					;
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
			\RainLoop\Plugins\Property::NewInstance('user_dn_format')->SetLabel('User DN format')
				->SetDescription('LDAP user dn format. Supported tokens: {email}, {email:user}, {email:domain}, {login}, {domain}, {domain:dc}, {imap:login}, {imap:host}, {imap:port}, {gecos}')
				->SetDefaultValue('uid={imap:login},ou=Users,{domain:dc}'),
			\RainLoop\Plugins\Property::NewInstance('password_field')->SetLabel('Password field')
				->SetDefaultValue('userPassword'),
			\RainLoop\Plugins\Property::NewInstance('password_enc_type')->SetLabel('Encryption type')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::SELECTION)
				->SetDefaultValue(array('SHA', 'SSHA', 'MD5', 'Crypt', 'Clear')),
			\RainLoop\Plugins\Property::NewInstance('allowed_emails')->SetLabel('Allowed emails')
				->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@domain1.net user2@domain1.net *@domain2.net')
				->SetDefaultValue('*')
		);
	}
}
