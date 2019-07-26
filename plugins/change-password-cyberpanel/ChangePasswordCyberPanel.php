<?php

class ChangePasswordCyberPanel implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
{
	/**
	 * @var string
	 */
	private $mHost = '127.0.0.1';

	/**
	 * @var string
	 */
	private $mUser = '';

	/**
	 * @var string
	 */
	private $mPass = '';

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	/**
	 * @param string $mHost
	 *
	 * @return \ChangePasswordCyberPanel
	 */
	public function SetmHost($mHost)
	{
		$this->mHost = $mHost;
		return $this;
	}

	/**
	 * @param string $mUser
	 *
	 * @return \ChangePasswordCyberPanel
	 */
	public function SetmUser($mUser)
	{
		$this->mUser = $mUser;
		return $this;
	}

	/**
	 * @param string $mPass
	 *
	 * @return \ChangePasswordCyberPanel
	 */
	public function SetmPass($mPass)
	{
		$this->mPass = $mPass;
		return $this;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \ChangePasswordCyberPanel
	 */
	public function SetLogger($oLogger)
	{
		if ($oLogger instanceof \MailSo\Log\Logger)
		{
			$this->oLogger = $oLogger;
		}

		return $this;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 * @return bool
	 */
	public function PasswordChangePossibility($oAccount)
	{
		return $oAccount && $oAccount->Email();
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sPrevPassword
	 * @param string $sNewPassword
	 *
	 * @return bool
	 */
	public function ChangePassword(\RainLoop\Account $oAccount, $sPrevPassword, $sNewPassword)
	{
		if ($this->oLogger)
		{
			$this->oLogger->Write('Try to change password for '.$oAccount->Email());
		}

		$bResult = false;
		$db = mysqli_connect($this->mHost, $this->mUser, $this->mPass, 'cyberpanel');

		try
		{
			$sEmail = mysqli_real_escape_string($db, $oAccount->Email());
			$sEmailUser = mysqli_real_escape_string($db, \MailSo\Base\Utils::GetAccountNameFromEmail($sEmail));
			$sEmailDomain = mysqli_real_escape_string($db, \MailSo\Base\Utils::GetDomainFromEmail($sEmail));

			$password_check_query = "SELECT * FROM e_users WHERE emailOwner_id = '$sEmailDomain' AND email = '$sEmail'";
			$result = mysqli_query($db, $password_check_query);
			$password_check = mysqli_fetch_assoc($result);
            
			if (password_verify($sPrevPassword, substr($password_check['password'], 7))) {
				$hashed_password = mysqli_real_escape_string($db, '{CRYPT}'.password_hash($sNewPassword, PASSWORD_BCRYPT));
				$password_update_query = "UPDATE e_users SET password = '$hashed_password' WHERE emailOwner_id = '$sEmailDomain' AND email = '$sEmail'";
				mysqli_query($db, $password_update_query);
				$bResult = true;
				if ($this->oLogger)
				{
					$this->oLogger->Write('Success! The password was changed.');
				}
			} else {
				$bResult = false;
				if ($this->oLogger)
				{
					$this->oLogger->Write('Something went wrong. Either the current password is incorrect or the new password does not meet the criteria.');
				}
			}
		}
		catch (\Exception $oException)
		{
			$bResult = false;
			if ($this->oLogger)
			{
				$this->oLogger->WriteException($oException);
			}
		}
		
		return $bResult;
	}
}
