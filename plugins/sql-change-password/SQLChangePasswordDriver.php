<?php

class SQLChangePasswordDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
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
	private $sdbotable = '';
	
	/**
	 * @var string
	 */
	private $sdbofieldUserid = '';
	
	/**
	 * @var string
	 */
	private $sdbofieldUsername = '';
	
	/**
	 * @var string
	 */
	private $sdbofieldPassword = '';
	
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
	 * @return \SQLChangePasswordDriver
	 */
	public function SetConfig($sDsn, $sUser, $sPassword, $sdbotable, $sdbofieldUserid, $sdbofieldUsername, $sdbofieldPassword)
	{
		$this->sDsn = $sDsn;
		$this->sUser = $sUser;
		$this->sPassword = $sPassword;
		$this->sdbotable = $sdbotable;
		$this->sdbofieldUserid = $sdbofieldUserid;
		$this->sdbofieldUsername = $sdbofieldUsername;
		$this->sdbofieldPassword = $sdbofieldPassword;

		return $this;
	}

	/**
	 * @param string $sAllowedEmails
	 *
	 * @return \SQLChangePasswordDriver
	 */
	public function SetAllowedEmails($sAllowedEmails)
	{
		$this->sAllowedEmails = $sAllowedEmails;
		return $this;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \SQLChangePasswordDriver
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
			$this->oLogger->Write('SQLChangePassword: Try to change password for '.$oAccount->Email());
		}

		$bResult = false;
		if (!empty($this->sDsn) && 0 < \strlen($this->sUser) && 0 < \strlen($this->sPassword) && $oAccount)
		{
			try
			{
				$oPdo = new \PDO($this->sDsn, $this->sUser, $this->sPassword);
				$oPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

				$oStmt = $oPdo->prepare('SELECT '.$this->sdbofieldUserid.', '.$this->sdbofieldPassword.' FROM '.$this->sdbotable.' WHERE '.$this->sdbofieldUsername.' = ? LIMIT 1');
								
				if ($oStmt->execute(array($oAccount->Login())))
				{
					$aFetchResult = $oStmt->fetchAll(\PDO::FETCH_ASSOC);									
					if (\is_array($aFetchResult) && isset($aFetchResult[0][$this->sdbofieldPassword], $aFetchResult[0][$this->sdbofieldUserid]))
					{					
						preg_match('/^{(.*CRYPT)}/', $aFetchResult[0][$this->sdbofieldPassword], $matchesCryptPattern);						
						$sDBPassword = preg_replace('/^{(.*CRYPT)}/', '', $aFetchResult[0][$this->sdbofieldPassword]);

						if (crypt(stripslashes($sPrevPassword), $sDBPassword) === $sDBPassword)
						{
							$oStmt = $oPdo->prepare('UPDATE '.$this->sdbotable.' SET '.$this->sdbofieldPassword.' = ? WHERE '.$this->sdbofieldUserid.' = ?');
							$cryptNewPassword = $matchesCryptPattern[0].crypt($sNewPassword, $sDBPassword);
							$bResult = (bool) $oStmt->execute(
								array($cryptNewPassword, $aFetchResult[0][$this->sdbofieldUserid]));
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