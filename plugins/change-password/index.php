<?php

use \RainLoop\Exceptions\ClientException;

class ChangePasswordPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password',
		VERSION  = '2.0',
		RELEASE  = '2021-03-03',
		REQUIRED = '2.3.4',
		CATEGORY = 'Security',
		DESCRIPTION = 'This plugin allows you to change passwords of email accounts';

	// \RainLoop\Notifications\
	const CouldNotSaveNewPassword = 130;
	const CurrentPasswordIncorrect = 131;
	const NewPasswordShort = 132;
	const NewPasswordWeak = 133;

	public function Init() : void
	{
		$this->UseLangs(true); // start use langs folder

		$this->addJs('js/ChangePasswordUserSettings.js'); // add js file
		$this->addJsonHook('ChangePassword', 'ChangePassword');
		$this->addTemplate('templates/SettingsChangePassword.html');
	}

	protected function getSupportedDrivers(bool $all = false) : iterable
	{
		if ($phar_file = \Phar::running()) {
			$phar = new \Phar($phar_file, \FilesystemIterator::CURRENT_AS_FILEINFO | \FilesystemIterator::KEY_AS_FILENAME);
			foreach (new \RecursiveIteratorIterator($phar) as $file) {
				if (\preg_match('#/drivers/([a-z]+)\\.php$#Di', $file, $m)) {
					try
					{
						if ($all || $this->Config()->Get('plugin', "driver_{$m[1]}_enabled", false)) {
							require_once $file;
							$class = 'ChangePasswordDriver' . $m[1];
							if ($class::isSupported()) {
								yield $m[1] => $class;
							}
						}
					}
					catch (\Throwable $oException)
					{
					}
				}
			}
		} else {
//			foreach (\glob(__DIR__ . '/../change-password-*', GLOB_ONLYDIR) as $file) {
			foreach (\glob(__DIR__ . '/drivers/*.php') as $file) {
				try
				{
					$name = \basename($file, '.php');
					if ($all || $this->Config()->Get('plugin', "driver_{$name}_enabled", false)) {
						require_once $file;
						$class = 'ChangePasswordDriver' . $name;
						if ($class::isSupported()) {
							yield $name => $class;
						}
					}
				}
				catch (\Throwable $oException)
				{
				}
			}
		}
	}

	public function Supported() : string
	{
		foreach ($this->getSupportedDrivers() as $class) {
			return '';
		}
		return 'There are no change-password drivers enabled';
	}

	public function configMapping() : array
	{
		$result = [
			\RainLoop\Plugins\Property::NewInstance("pass_min_length")
				->SetLabel('Password minimum length')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::INT)
				->SetDescription('Minimum length of the password')
				->SetDefaultValue(10),
			\RainLoop\Plugins\Property::NewInstance("pass_min_strength")
				->SetLabel('Password minimum strength')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::INT)
				->SetDescription('Minimum strength of the password in %')
				->SetDefaultValue(60),
		];
		foreach ($this->getSupportedDrivers(true) as $name => $class) {
			$result[] = \RainLoop\Plugins\Property::NewInstance("driver_{$name}_enabled")
				->SetLabel('Enable ' . $class::NAME)
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDescription($class::DESCRIPTION);
			$result[] = \RainLoop\Plugins\Property::NewInstance("driver_{$name}_allowed_emails")
				->SetLabel('Allowed emails')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@example.net user2@example1.net *@example2.net')
				->SetDefaultValue('*');
			$result = \array_merge($result, \call_user_func("{$class}::configMapping"));
		}
		return $result;
	}

	public function ChangePassword()
	{
		$oActions = $this->Manager()->Actions();
		$oAccount = $oActions->GetAccount();

		if (!$oAccount->Email()) {
			throw new ClientException(static::CouldNotSaveNewPassword);
		}

		$sPrevPassword = $this->jsonParam('PrevPassword');
		if ($sPrevPassword !== $oAccount->Password()) {
			throw new ClientException(static::CurrentPasswordIncorrect, null, $oActions->StaticI18N('NOTIFICATIONS/CURRENT_PASSWORD_INCORRECT'));
		}

		$sNewPassword = $this->jsonParam('NewPassword');
		if ($this->Config()->Get('plugin', 'pass_min_length', 10) > \strlen($sNewPassword)) {
			throw new ClientException(static::NewPasswordShort, null, $oActions->StaticI18N('NOTIFICATIONS/NEW_PASSWORD_SHORT'));
		}

		if ($this->Config()->Get('plugin', 'pass_min_strength', 60) > static::PasswordStrength($sNewPassword)) {
			throw new ClientException(static::NewPasswordWeak, null, $oActions->StaticI18N('NOTIFICATIONS/NEW_PASSWORD_WEAK'));
		}

		$bResult = false;
		$oConfig = $this->Config();
		foreach ($this->getSupportedDrivers() as $name => $class) {
			$sFoundedValue = '';
			if (\RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $oConfig->Get('plugin', "driver_{$name}_allowed_emails"), $sFoundedValue)) {
				$name = $class::NAME;
				$oLogger = $oActions->Logger();
				try
				{
					$oDriver = new $class(
						$oConfig,
						$oLogger
					);
					if (!$oDriver->ChangePassword($oAccount, $sPrevPassword, $sNewPassword)) {
						throw new ClientException(static::CouldNotSaveNewPassword);
					}
					$bResult = true;
					if ($oLogger) {
						$oLogger->Write("{$name} password changed for {$oAccount->Email()}");
					}
				}
				catch (\Throwable $oException)
				{
					if ($oLogger) {
						$oLogger->Write("ERROR: {$name} password change for {$oAccount->Email()} failed");
						$oLogger->WriteException($oException);
//						$oLogger->WriteException($oException, \MailSo\Log\Enumerations\Type::WARNING, $name);
					}
				}
			}
		}

		if (!$bResult) {
			throw new ClientException(static::CouldNotSaveNewPassword);
		}

		$oAccount->SetPassword($sNewPassword);
		$oActions->SetAuthToken($oAccount);

		return $oActions->GetSpecAuthToken();
//		return $this->jsonResponse(__FUNCTION__, $oActions->GetSpecAuthToken());
	}

	public static function encrypt(string $algo, string $password)
	{
		switch (\strtolower($algo))
		{
			case 'argon2i':
				return \password_hash($password, PASSWORD_ARGON2I);

			case 'argon2id':
				return \password_hash($password, PASSWORD_ARGON2ID);

			case 'bcrypt':
				return \password_hash($password, PASSWORD_BCRYPT);

			case 'sha256-crypt':
				return \crypt($password,'$5$'.\substr(\base64_encode(\random_bytes(32)), 0, 16));

			case 'sha512-crypt':
				return \crypt($password,'$6$'.\substr(\base64_encode(\random_bytes(32)), 0, 16));

			default:
				break;
		}

		return $sPassword;
	}

	private static function PasswordStrength(string $sPassword) : int
	{
		$i = \strlen($sPassword);
		$s = $i ? 1 : 0;
		while (--$i) {
			if ($sPassword[$i] != $sPassword[$i-1]) {
				++$s;
			} else {
				$s -= 0.5;
			}
		}
		$c = 0;
		$re = [ '/[^0-9A-Za-z]+/g', '/[0-9]+/g', '/[A-Z]+/g', '/[a-z]+/g' ];
		foreach ($re as $regex) {
			if (\preg_match_all($regex, $sPassword, $m)) {
				++$c;
				foreach ($m[0] as $str) {
					if (5 > \strlen($str)) {
						++$s;
					}
				}
			}
		}
		$s = ($s / 3 * $c);

		return \max(0, \min(100, $s * 5));
	}

}
