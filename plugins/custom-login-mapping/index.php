<?php

class CustomLoginMappingPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'Custom Login Mapping',
		VERSION = '2.3',
		RELEASE = '2024-09-21',
		REQUIRED = '2.36.1',
		CATEGORY = 'Login',
		DESCRIPTION = 'Enables custom usernames by email address.';

	public function Init() : void
	{
		// Happens only at DoLogin | ServiceSso | DoAccountSetup
		$this->addHook('login.credentials', 'FilterLoginCredentials');
	}

	/**
	 * @param string $sEmail
	 * @param string $sImapUser
	 * @param string $sPassword
	 * @param string $sSmtpUser
	 *
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function FilterLoginCredentials(string &$sEmail, string &$sImapUser, string &$sPassword, string &$sSmtpUser)
	{
		$sMapping = \trim($this->Config()->Get('plugin', 'mapping', ''));
		if (!empty($sMapping)) {
			$aLines = \explode("\n", \preg_replace('/[\r\n\t\s]+/', "\n", $sMapping));
			foreach ($aLines as $sLine) {
				$aData = \explode(':', $sLine, 3);
				if (\is_array($aData) && isset($aData[1]) && \trim($aData[0]) === $sEmail) {
					$aData = \array_map('trim', $aData);
					if (\strlen($aData[1])) {
						$sImapUser = $aData[1];
					}
					if (isset($aData[2]) && \strlen($aData[2])) {
						$sSmtpUser = $aData[2];
					}
				}
			}
		}
	}

	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('mapping')->SetLabel('Mapping')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('email:imap-login:smtp-login mapping')
				->SetDefaultValue("user@domain.com:imapuser.bob:smtpuser.bob\nadmin@domain.com:imapuser.john")
		);
	}
}
