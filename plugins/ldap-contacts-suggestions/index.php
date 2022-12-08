<?php

class LdapContactsSuggestionsPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Contacts suggestions (LDAP)',
		VERSION  = '2.10',
		RELEASE  = '2022-12-08',
		REQUIRED = '2.23.0',
		CATEGORY = 'Contacts',
		DESCRIPTION = 'Get contacts suggestions from LDAP.';

	public function Init() : void
	{
		$this->addHook('main.fabrica', 'MainFabrica');
	}

	/**
	 * @return string
	 */
	public function Supported() : string
	{
		if (!\function_exists('ldap_connect'))
		{
			return 'The LDAP PHP extension must be installed to use this extension';
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

				$sLdapUri = \trim($this->Config()->Get('plugin', 'ldap_uri', ''));
				$bUseStartTLS = (bool) $this->Config()->Get('plugin', 'use_start_tls', True);
				$sBindDn = \trim($this->Config()->Get('plugin', 'bind_dn', ''));
				$sBindPassword = \trim($this->Config()->Get('plugin', 'bind_password', ''));
				$sBaseDn = \trim($this->Config()->Get('plugin', 'base_dn', ''));
				$sObjectClasses = \trim($this->Config()->Get('plugin', 'object_classes', ''));
				$sUidAttributes = \trim($this->Config()->Get('plugin', 'uid_attributes', ''));
				$sNameAttributes = \trim($this->Config()->Get('plugin', 'name_attributes', ''));
				$sEmailAttributes = \trim($this->Config()->Get('plugin', 'mail_attributes', ''));
				$sAllowedEmails = \trim($this->Config()->Get('plugin', 'allowed_emails', ''));

				if (0 < \strlen($sLdapUri) && 0 < \strlen($sBaseDn) && 0 < \strlen($sObjectClasses) && 0 < \strlen($sEmailAttributes))
				{
					include_once __DIR__.'/LdapContactsSuggestions.php';

					$oProvider = new LdapContactsSuggestions();
					$oProvider->SetConfig($sLdapUri, $bUseStartTLS, $sBindDn, $sBindPassword, $sBaseDn, $sObjectClasses, $sUidAttributes, $sNameAttributes, $sEmailAttributes, $sAllowedEmails);

					$mResult[] = $oProvider;
				}

				break;
		}
	}

	/**
	 * @return array
	 */
	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('ldap_uri')->SetLabel('LDAP URI')
				->SetDescription('LDAP server URI(s), space separated')
				->SetDefaultValue('ldap://localhost:389'),
			\RainLoop\Plugins\Property::NewInstance('use_start_tls')->SetLabel('Use StartTLS')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(True),
			\RainLoop\Plugins\Property::NewInstance('bind_dn')->SetLabel('Bind DN')
				->SetDescription('DN to bind (login) with. If left blank, anonymous bind will be tried and the password will be ignored')
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('bind_password')->SetLabel('Bind password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('base_dn')->SetLabel('Search base DN')
				->SetDescription('DN to use as the search base. Supported tokens: {domain}, {domain:dc}, {email}, {email:user}, {email:domain}, {login}, {imap:login}, {imap:host}, {imap:port}')
				->SetDefaultValue('ou=People,dc=example,dc=com'),
			\RainLoop\Plugins\Property::NewInstance('object_classes')->SetLabel('objectClasses to use')
				->SetDescription('LDAP objectClasses to search for, comma separated list')
				->SetDefaultValue('inetOrgPerson'),
			\RainLoop\Plugins\Property::NewInstance('uid_attributes')->SetLabel('uid attributes')
				->SetDescription('LDAP attributes for userids, comma separated list in order of preference')
				->SetDefaultValue('uid'),
			\RainLoop\Plugins\Property::NewInstance('name_attributes')->SetLabel('Name attributes')
				->SetDescription('LDAP attributes for user names, comma separated list in order of preference')
				->SetDefaultValue('displayName,cn,givenName,sn'),
			\RainLoop\Plugins\Property::NewInstance('mail_attributes')->SetLabel('Mail attributes')
				->SetDescription('LDAP attributes for user email addresses, comma separated list in order of preference')
				->SetDefaultValue('mailAddress,mail,mailAlternateAddress,mailAlias'),
			\RainLoop\Plugins\Property::NewInstance('allowed_emails')->SetLabel('Allowed emails')
				->SetDescription('Email addresses of users which should be allowed to do LDAP lookups, space as delimiter, wildcard supported. Example: user1@domain1.net user2@domain1.net *@domain2.net')
				->SetDefaultValue('*')
		);
	}
}
