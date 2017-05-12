<?php

class ImscpChangePasswordDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
{
	/**
	 * @var string
	 */
	private $sDsn = '';

	/**
	 * @var string
	 */
	private $sUser = '';

	/**
	 * @var string
	 */
	private $sPassword = '';

	/**
	 * @var string
	 */
	private $sAllowedEmails = '';

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	/**
	 * @param string $sDsn
	 * @param string $sUser
	 * @param string $sPassword
	 *
	 * @return \ImscpChangePasswordDriver
	 */
	public function SetConfig($sDsn, $sUser, $sPassword)
	{
		$this->sDsn = $sDsn;
		$this->sUser = $sUser;
		$this->sPassword = $sPassword;

		return $this;
	}

	/**
	 * @param string $sAllowedEmails
	 *
	 * @return \ImscpChangePasswordDriver
	 */
	public function SetAllowedEmails($sAllowedEmails)
	{
		$this->sAllowedEmails = $sAllowedEmails;
		return $this;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \ImscpChangePasswordDriver
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
		return $oAccount && $oAccount->Email() &&
			\RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $this->sAllowedEmails);
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
			$this->oLogger->Write('IMSCP: Try to change password for '.$oAccount->Email());
		}

		$bResult = false;
		if (!empty($this->sDsn) && 0 < \strlen($this->sUser) && 0 < \strlen($this->sPassword) && $oAccount)
		{
			try
			{
				$oPdo = new \PDO($this->sDsn, $this->sUser, $this->sPassword);
				$oPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

				//$oStmt = $oPdo->prepare('SELECT password, mailuser_id FROM mail_user WHERE login = ? LIMIT 1');
                $oStmt = $oPdo->prepare('SELECT mail_pass, mail_addr FROM mail_users WHERE mail_addr = ? LIMIT 1');
				if ($oStmt->execute(array($oAccount->IncLogin())))
				{
					$aFetchResult = $oStmt->fetchAll(\PDO::FETCH_ASSOC);

					if (\is_array($aFetchResult) && isset($aFetchResult[0]['mail_pass'], $aFetchResult[0]['mail_addr']))
					{
						$sDbPassword = \stripslashes($aFetchResult[0]['mail_pass']);
						$sDbSalt = '$1$'.\substr($sDbPassword, 3, 8).'$';

						if ($sPrevPassword === $sDbPassword)
						{
							//$oStmt = $oPdo->prepare('UPDATE mail_user SET password = ? WHERE mailuser_id = ?');
                            $oStmt = $oPdo->prepare('UPDATE mail_users SET mail_pass = ?, status = ? WHERE mail_addr = ?');
							$bResult = (bool) $oStmt->execute(
								array($sNewPassword,'change', $aFetchResult[0]['mail_addr']));
						}
					}
				}
			}
			catch (\Exception $oException)
			{
				if ($this->oLogger)
				{
					$this->oLogger->WriteException($oException);
				}
			}
		}

		return $bResult;
	}

}