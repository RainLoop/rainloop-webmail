<?php

use RainLoop\Exceptions\ClientException;
use SnappyMail\SensitiveString;

class ChangePasswordPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Change Password',
		VERSION  = '2.36',
		RELEASE  = '2024-03-17',
		REQUIRED = '2.36.0',
		CATEGORY = 'Security',
		DESCRIPTION = 'Extension to allow users to change their passwords';

	// \RainLoop\Notifications\
	const
		CouldNotSaveNewPassword = 130,
		CurrentPasswordIncorrect = 131,
		NewPasswordShort = 132,
		NewPasswordWeak = 133;

	public function Init() : void
	{
		$this->UseLangs(true); // start use langs folder

//		$this->addCss('style.css');
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
					$class = 'ChangePasswordDriver' . $m[1];
					try
					{
						if ($all || $this->Config()->Get('plugin', "driver_{$m[1]}_enabled", false)) {
							require_once $file;
							if ($class::isSupported()) {
								yield $m[1] => $class;
							}
						}
					}
					catch (\Throwable $oException)
					{
						\trigger_error("ERROR {$class}: " . $oException->getMessage());
					}
				}
			}
		} else {
			foreach (\glob(__DIR__ . '/drivers/*.php') as $file) {
				$name = \basename($file, '.php');
				$class = 'ChangePasswordDriver' . $name;
				try
				{
					if ($all || $this->Config()->Get('plugin', "driver_{$name}_enabled", false)) {
						require_once $file;
						if ($class::isSupported()) {
							yield $name => $class;
						}
					}
				}
				catch (\Throwable $oException)
				{
					\trigger_error("ERROR {$class}: " . $oException->getMessage());
				}
			}
		}

		foreach (\glob(__DIR__ . '/../change-password-*', GLOB_ONLYDIR) as $file) {
			$name = \str_replace('change-password-', '', \basename($file));
			$class = "ChangePassword{$name}Driver";
			$file .= '/driver.php';
			try
			{
				if (\is_readable($file) && ($all || $this->Config()->Get('plugin', "driver_{$name}_enabled", false))) {
					require_once $file;
					if ($class::isSupported()) {
						yield $name => $class;
					}
				}
			}
			catch (\Throwable $oException)
			{
				\trigger_error("ERROR {$class}: " . $oException->getMessage());
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
				->SetDefaultValue(10)
				->SetAllowedInJs(true),
			\RainLoop\Plugins\Property::NewInstance("pass_min_strength")
				->SetLabel('Password minimum strength')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::INT)
				->SetDescription('Minimum strength of the password in %')
				->SetDefaultValue(70)
				->SetAllowedInJs(true),
		];
		foreach ($this->getSupportedDrivers(true) as $name => $class) {
			$group = new \RainLoop\Plugins\PropertyCollection($name);
			$props = [
				\RainLoop\Plugins\Property::NewInstance("driver_{$name}_enabled")
					->SetLabel('Enable ' . $class::NAME)
					->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
					->SetDescription($class::DESCRIPTION)
					->SetDefaultValue(false),
				\RainLoop\Plugins\Property::NewInstance("driver_{$name}_allowed_emails")
					->SetLabel('Allowed emails')
					->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
					->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@example.net user2@example1.net *@example2.net')
					->SetDefaultValue('*')
			];
			$group->exchangeArray(\array_merge($props, \call_user_func("{$class}::configMapping")));
			$result[] = $group;
		}
		return $result;
	}

	public function ChangePassword()
	{
		$oActions = $this->Manager()->Actions();
		$oAccount = $oActions->GetAccount();

		if (!$oAccount->Email()) {
			\trigger_error('ChangePassword failed: empty email address');
			throw new ClientException(static::CouldNotSaveNewPassword);
		}

		$sPrevPassword = $this->jsonParam('PrevPassword');
		if ($sPrevPassword !== $oAccount->IncPassword()) {
			throw new ClientException(static::CurrentPasswordIncorrect, null, $oActions->StaticI18N('NOTIFICATIONS/CURRENT_PASSWORD_INCORRECT'));
		}
		$oPrevPassword = new \SnappyMail\SensitiveString($sPrevPassword);

		$sNewPassword = $this->jsonParam('NewPassword');
		if ($this->Config()->Get('plugin', 'pass_min_length', 10) > \strlen($sNewPassword)) {
			throw new ClientException(static::NewPasswordShort, null, $oActions->StaticI18N('NOTIFICATIONS/NEW_PASSWORD_SHORT'));
		}
		if ($this->Config()->Get('plugin', 'pass_min_strength', 70) > static::PasswordStrength($sNewPassword)) {
			throw new ClientException(static::NewPasswordWeak, null, $oActions->StaticI18N('NOTIFICATIONS/NEW_PASSWORD_WEAK'));
		}
		$oNewPassword = new \SnappyMail\SensitiveString($sNewPassword);

		$bResult = false;
		$oConfig = $this->Config();
		foreach ($this->getSupportedDrivers() as $name => $class) {
			if (\RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $oConfig->Get('plugin', "driver_{$name}_allowed_emails"))) {
				$name = $class::NAME;
				$oLogger = $oActions->Logger();
				try
				{
					$oDriver = new $class(
						$oConfig,
						$oLogger
					);
					if (!$oDriver->ChangePassword($oAccount, $oPrevPassword, $oNewPassword)) {
						throw new ClientException(static::CouldNotSaveNewPassword);
					}
					$bResult = true;
					if ($oLogger) {
						$oLogger->Write("{$name} password changed for {$oAccount->Email()}");
					}
				}
				catch (\Throwable $oException)
				{
					\trigger_error("{$class} failed: {$oException->getMessage()}");
					if ($oLogger) {
						$oLogger->Write("ERROR: {$name} password change for {$oAccount->Email()} failed");
						$oLogger->WriteException($oException);
//						$oLogger->WriteException($oException, \LOG_WARNING, $name);
					}
				}
			}
		}

		if (!$bResult) {
			\trigger_error("ChangePassword failed");
			throw new ClientException(static::CouldNotSaveNewPassword);
		}

		$oAccount->SetPassword($oNewPassword);
		if ($oAccount instanceof \RainLoop\Model\MainAccount) {
			$oActions->SetAuthToken($oAccount);
		}

		return $this->jsonResponse(__FUNCTION__, $oActions->AppData(false));
	}

	public static function encrypt(string $algo, SensitiveString $password)
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

		return $password;
	}

	private static function PasswordStrength(string $sPassword) : int
	{
		$i = \strlen($sPassword);
		$max = \min(100, $i * 8);
		$s = 0;
		while (--$i) {
			$s += ($sPassword[$i] != $sPassword[$i-1] ? 1 : -0.5);
		}
		$c = 0;
		$re = [ '/[^0-9A-Za-z]+/', '/[0-9]+/', '/[A-Z]+/', '/[a-z]+/' ];
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

		return \intval(\max(0, \min($max, $s * $c * 1.5)));
	}

}
