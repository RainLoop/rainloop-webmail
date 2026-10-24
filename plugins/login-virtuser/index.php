<?php

class LoginVirtuserPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'Virtuser Login',
		AUTHOR = 'v20z',
		URL     = 'https://github.com/the-djmaze/snappymail/issues/1691',
		VERSION = '0.2',
		RELEASE = '2024-09-20',
		REQUIRED = '2.36.1',
		CATEGORY = 'Login',
		DESCRIPTION = 'File based Email-to-User lookup.';

	public function Init() : void
	{
		$this->addHook('login.credentials', 'ParseVirtuserFiles');
	}

	/**
	 * @param string $sEmail
	 * @param string $sImapUser
	 * @param string $sPassword
	 * @param string $sSmtpUser
	 *
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function ParseVirtuserFiles(string &$sEmail, string &$sImapUser, string &$sPassword, string &$sSmtpUser)
	{
		$sFiles = \trim($this->Config()->Get('plugin', 'virtuser_files', ''));
		if (!empty($sFiles))
		{
			$aFiles = \explode("\n", \preg_replace('/[\r\n\t\s]+/', "\n", $sFiles));
			foreach ($aFiles as $sFile)
			{
				$fContent = file("$sFile");
				if (empty($fContent)) {
					continue;
				}

				foreach($fContent as $sLine) {
					$sLine = trim($sLine);
					if (empty($sLine) || $sLine[0] == '#') {
						continue;
					}

					$aData = preg_split( '/[[:blank:]]+/', $sLine, 3, PREG_SPLIT_NO_EMPTY);
					if (is_array($aData) && !empty($aData[0]) && isset($aData[1])) {
						if ($sEmail === $aData[0] && 0 < strlen($aData[1])) {
							$sImapUser = $aData[1];
							return;
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
			\RainLoop\Plugins\Property::NewInstance('virtuser_files')->SetLabel('Virtuser files')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Each line is an absolute path to virtuser file')
				->SetDefaultValue("/etc/postfix/virtual\n/etc/mail/virtusertable")
		);
	}
}
