<?php
/**
 * change-password-docker-mailserver - Plugin that adds functionality to change the email account password of docker-mailserver container with the email frontend
 *
 * @author VanVan <https://github.com/VanVan>
 *
 */

class ChangePasswordDockerMailserverPlugin extends \RainLoop\Plugins\AbstractPlugin
{
    /**
     * @return void
     */
	public function Init()
	{
		$this->addHook('main.fabrica', 'MainFabrica');
	}

    /**
     * @return string
     */
    public function Supported()
    {
        if (!\function_exists('ssh2_exec'))
        {
            return 'The PECL SSH2 PHP exention must be installed to use this plugin';
        }

        return '';
    }

	/**
	 * @param string $sName
	 * @param mixed $oProvider
     *
     * @return void
	 */
	public function MainFabrica($sName, &$oProvider)
	{
		switch ($sName)
		{
			case 'change-password':

				include_once __DIR__.'/ChangePasswordVanVanDriver.php';

				$oProvider = new ChangePasswordVanVanDriver();

				$oProvider
					->SetHost($this->Config()->Get('plugin', 'host', ''))
					->SetPort((int) $this->Config()->Get('plugin', 'port', 22))
                    ->SetUser($this->Config()->Get('plugin', 'user', 'root'))
                    ->SetPassword($this->Config()->Get('plugin', 'password', ''))
                    ->SetLocation($this->Config()->Get('plugin', 'location', '/data/mailserver/setup.sh'))
                    ->SetCheckExecution($this->Config()->Get('plugin', 'check_execution', true))
					->SetAllowedEmails(\strtolower(\trim($this->Config()->Get('plugin', 'allowed_emails', ''))))
					->SetLogger($this->Manager()->Actions()->Logger())
				;

				break;
		}
	}

	/**
	 * @return array
	 */
	public function configMapping()
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('host')->SetLabel('SSH Docker Host')
				->SetDefaultValue('127.0.0.1')->SetDescription('Host running docker-mailserver docker container'),
			\RainLoop\Plugins\Property::NewInstance('port')->SetLabel('SSH Port')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::INT)
				->SetDefaultValue(22),
            \RainLoop\Plugins\Property::NewInstance('user')->SetLabel('SSH User')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING)
                ->SetDefaultValue('root')->SetDescription('For security reasons, you should use unprivileged user with sudoers access to docker-mailserver setup.sh'),
            \RainLoop\Plugins\Property::NewInstance('password')->SetLabel('SSH Password')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD),
            \RainLoop\Plugins\Property::NewInstance('location')->SetLabel('setup.sh Location')->SetDefaultValue('/data/mailserver/setup.sh')
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
                ->SetDescription('Full path Location of setup.sh from docker-mailserver. No location edit hack protection. Protect access of your RainLoop Admin Panel'),
            \RainLoop\Plugins\Property::NewInstance('checkExecution')->SetLabel('Check setup.sh execution success')->SetDefaultValue(true)
                ->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
                ->SetDescription('Check the correct execution of the command before considering the password correctly changed'),
			\RainLoop\Plugins\Property::NewInstance('allowed_emails')->SetLabel('Allowed emails')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@domain1.fr user2@domain1.fr *@domain2.fr')
				->SetDefaultValue('*')
		);
	}
}
