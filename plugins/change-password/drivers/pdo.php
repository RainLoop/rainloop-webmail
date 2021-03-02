<?php

class ChangePasswordDriverPDO
{
	const
		NAME        = 'PDO',
		DESCRIPTION = 'Use your own SQL (PDO) statement (with wildcards).';

	private
		$dsn = '',
		$user = '',
		$pass = '',
		$sql = '',
		$encrypt = '',
		$encrypt_prefix = ''; // Like: {ARGON2I} {BLF-CRYPT} {SHA512-CRYPT}

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	function __construct(\RainLoop\Config\Plugin $oConfig, \MailSo\Log\Logger $oLogger)
	{
		$this->oLogger = $oLogger;
		$this->dsn = $oConfig->Get('plugin', 'pdo_dsn', '');
		$this->user = $oConfig->Get('plugin', 'pdo_user', '');
		$this->pass = $oConfig->Get('plugin', 'pdo_password', '');
		$this->sql = $oConfig->Get('plugin', 'pdo_sql', '');
		$this->encrypt = $oConfig->Get('plugin', 'pdo_encrypt', '');
		$this->encrypt_prefix = $oConfig->Get('plugin', 'pdo_encryptprefix', '');
	}

	public static function isSupported() : bool
	{
		return true;
	}

	public static function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('pdo_dsn')->SetLabel('DSN')
				->SetDefaultValue('mysql:host=localhost;dbname=snappymail;charset=utf8'),
			\RainLoop\Plugins\Property::NewInstance('pdo_user')->SetLabel('User'),
			\RainLoop\Plugins\Property::NewInstance('pdo_password')->SetLabel('Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD),
			\RainLoop\Plugins\Property::NewInstance('pdo_sql')->SetLabel('Statement')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('SQL statement (allowed wildcards :email, :oldpass, :newpass, :domain, :username).')
				->SetDefaultValue('UPDATE table SET password = :newpass WHERE domain = :domain AND username = :username and oldpass = :oldpass'),
			\RainLoop\Plugins\Property::NewInstance('pdo_encrypt')->SetLabel('Encryption')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::SELECTION)
				->SetDefaultValue(array('none', 'bcrypt', 'Argon2i', 'Argon2id', 'SHA256-CRYPT', 'SHA512-CRYPT'))
				->SetDescription('In what way do you want the passwords to be encrypted?'),
			\RainLoop\Plugins\Property::NewInstance('pdo_encryptprefix')->SetLabel('Encrypt prefix')
				->SetDescription('Optional encrypted password prefix, like: {BLF-CRYPT}'),
		);
	}

	public function ChangePassword(\RainLoop\Model\Account $oAccount, string $sPrevPassword, string $sNewPassword) : bool
	{
		$options = array(
			\PDO::ATTR_EMULATE_PREPARES  => true,
			\PDO::ATTR_PERSISTENT        => true,
			\PDO::ATTR_ERRMODE           => \PDO::ERRMODE_EXCEPTION
		);

		$conn = new \PDO($this->dsn, $this->user, $this->pass, $options);

		//prepare SQL varaibles
		$sEmail = $oAccount->Email();
		$sEmailUser = \MailSo\Base\Utils::GetAccountNameFromEmail($sEmail);
		$sEmailDomain = \MailSo\Base\Utils::GetDomainFromEmail($sEmail);

		$placeholders = array(
			':email' => $sEmail,
			':oldpass' => $this->encrypt_prefix . \ChangePasswordPlugin::encrypt($this->encrypt, $sPrevPassword),
			':newpass' => $this->encrypt_prefix . \ChangePasswordPlugin::encrypt($this->encrypt, $sNewPassword),
			':domain' => $sEmailDomain,
			':username' => $sEmailUser
		);

		$statement = $conn->prepare($this->sql);

		// we have to check that all placehoders are used in the query, passing any unused placeholders will generate an error
		foreach ($placeholders as $placeholder => $value) {
			if (\preg_match_all("/{$placeholder}(?![a-zA-Z0-9\-])/", $this->sql)) {
				$statement->bindValue($placeholder, $value);
			}
		}

		// and execute
		return !!$statement->execute();
	}
}
