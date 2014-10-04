<?php

namespace RainLoop\Providers;

class ChangePassword extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Actions
	 */
	private $oActions;

	/**
	 * @var \RainLoop\Providers\ChangePassword\ChangePasswordInterface
	 */
	private $oDriver;

	/**
	 * @var bool
	 */
	private $bCheckWeak;

	/**
	 * @param \RainLoop\Actions $oActions
	 * @param \RainLoop\Providers\ChangePassword\ChangePasswordInterface|null $oDriver = null
	 * @param bool $bCheckWeak = true
	 *
	 * @return void
	 */
	public function __construct($oActions, $oDriver = null, $bCheckWeak = true)
	{
		$this->oActions = $oActions;
		$this->oDriver = $oDriver;
		$this->bCheckWeak = !!$bCheckWeak;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 * @return bool
	 */
	public function PasswordChangePossibility($oAccount)
	{
		return $this->IsActive() &&
			$oAccount instanceof \RainLoop\Account &&
			$this->oDriver && $this->oDriver->PasswordChangePossibility($oAccount)
		;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sPrevPassword
	 * @param string $sNewPassword
	 */
	public function ChangePassword(\RainLoop\Account $oAccount, $sPrevPassword, $sNewPassword)
	{
		if ($this->oDriver instanceof \RainLoop\Providers\ChangePassword\ChangePasswordInterface &&
			$this->PasswordChangePossibility($oAccount))
		{
			if ($sPrevPassword !== $oAccount->Password())
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CurrentPasswordIncorrect);
			}

			$this->weaknessCheck($sNewPassword);

			if (!$this->oDriver->ChangePassword($oAccount, $sPrevPassword, $sNewPassword))
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CouldNotSaveNewPassword);
			}

			$oAccount->SetPassword($sNewPassword);
			$this->oActions->SetAuthToken($oAccount);
		}
		else
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CouldNotSaveNewPassword);
		}
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\ChangePassword\ChangePasswordInterface;
	}

	/**
	 * @param string $sPassword
	 */
	public function weaknessCheck($sPassword)
	{
		$sPassword = \trim($sPassword);
		if (4 > \strlen($sPassword))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::NewPasswordShort);
		}

		if ($this->bCheckWeak)
		{
			$sLine = ' password 123.456 12345678 abc123 qwerty monkey letmein dragon 111.111 baseball iloveyou trustno1 1234567 sunshine master 123.123 welcome shadow ashley football jesus michael ninja mustang password1 123456 123456789 qwerty 111111 1234567 666666 12345678 7777777 123321 654321 1234567890 123123 555555 vkontakte gfhjkm 159753 777777 temppassword qazwsx 1q2w3e 1234 112233 121212 qwertyuiop qq18ww899 987654321 12345 zxcvbn zxcvbnm 999999 samsung ghbdtn 1q2w3e4r 1111111 123654 159357 131313 qazwsxedc 123qwe 222222 asdfgh 333333 9379992 asdfghjkl 4815162342 12344321 88888888 11111111 knopka 789456 qwertyu 1q2w3e4r5t iloveyou vfhbyf marina password qweasdzxc 10203 987654 yfnfif cjkysirj nikita 888888 vfrcbv k.,jdm qwertyuiop[] qwe123 qweasd natasha 123123123 fylhtq q1w2e3 stalker 1111111111 q1w2e3r4 nastya 147258369 147258 fyfcnfcbz 1234554321 1qaz2wsx andrey 111222 147852 genius sergey 7654321 232323 123789 fktrcfylh spartak admin test 123 azerty abc123 lol123 easytocrack1 hello saravn holysh!t test123 tundra_cool2 456 dragon thomas killer root 1111 pass master aaaaaa a monkey daniel asdasd e10adc3949ba59abbe56e057f20f883e changeme computer jessica letmein mirage loulou lol superman shadow admin123 secret administrator sophie kikugalanetroot doudou liverpool hallo sunshine charlie parola 100827092 michael andrew password1 fuckyou matrix cjmasterinf internet hallo123 eminem demo gewinner pokemon abcd1234 guest ngockhoa martin sandra asdf hejsan george qweqwe lollipop lovers q1q1q1 tecktonik naruto 12 password12 password123 password1234 password12345 password123456 password1234567 password12345678 password123456789 000000 maximius 123abc baseball1 football1 soccer princess slipknot 11111 nokia super star 666999 12341234 1234321 135790 159951 212121 zzzzzz 121314 134679 142536 19921992 753951 7007 1111114 124578 19951995 258456 qwaszx zaqwsx 55555 77777 54321 qwert 22222 33333 99999 88888 66666 ';
			if (false !== \strpos($sLine, \strtolower($sPassword)))
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::NewPasswordWeak);
			}
		}
	}
}
