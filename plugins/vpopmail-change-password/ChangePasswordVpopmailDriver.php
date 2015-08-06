<?php

class ChangePasswordVpopmailDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
{
	/**
	 * @var string
	 */
	private $mHost = 'localhost';

	/**
	 * @var string
	 */
	private $mUser = '';

	/**
	 * @var string
	 */
	private $mPass = '';

	/**
	 * @var string
	 */
	private $mDatabase = '';

	/**
	 * @var string
	 */
	private $mTable = '';

	/**
	 * @var string
	 */
	private $mColumn = '';

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	/**
	 * @var array
	 */
	private $aDomains = array();

	/**
	 * @param string $mHost
	 *
	 * @return \ChangePasswordVpopmailDriver
	 */
	public function SetmHost($mHost)
	{
		$this->mHost = $mHost;
		return $this;
	}

	/**
	 * @param string $mUser
	 *
	 * @return \ChangePasswordVpopmailDriver
	 */
	public function SetmUser($mUser)
	{
		$this->mUser = $mUser;
		return $this;
	}

	/**
	 * @param string $mPass
	 *
	 * @return \ChangePasswordVpopmailDriver
	 */
	public function SetmPass($mPass)
	{
		$this->mPass = $mPass;
		return $this;
	}

	/**
	 * @param string $mDatabase
	 *
	 * @return \ChangePasswordVpopmailDriver
	 */
	public function SetmDatabase($mDatabase)
	{
		$this->mDatabase = $mDatabase;
		return $this;
	}

	/**
	 * @param string $mTable
	 *
	 * @return \ChangePasswordVpopmailDriver
	 */
	public function SetmTable($mTable)
	{
		$this->mTable = $mTable;
		return $this;
	}

	/**
	 * @param string $mColumn
	 *
	 * @return \ChangePasswordVpopmailDriver
	 */
	public function SetmColumn($mColumn)
	{
		$this->mColumn = $mColumn;
		return $this;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \ChangePasswordVpopmailDriver
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
	 * @param array $aDomains
	 *
	 * @return bool
	 */
	public function SetAllowedDomains($aDomains)
	{
		if (\is_array($aDomains) && 0 < \count($aDomains))
		{
			$this->aDomains = $aDomains;
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
		return 0 === \count($this->aDomains) || ($oAccount && \in_array(\strtolower(
			\MailSo\Base\Utils::GetDomainFromEmail($oAccount->Email)), $this->aDomains));
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

		if (empty($this->mHost) || empty($this->mDatabase) || empty($this->mColumn) || empty($this->mTable))
		{
			return false;
		}

		$bResult = false;

		$sDsn = 'mysql:host='.$this->mHost.';dbname='.$this->mDatabase.';charset=utf8';
		$aOptions = array(
			PDO::ATTR_EMULATE_PREPARES  => false,
			PDO::ATTR_PERSISTENT        => true,
			PDO::ATTR_ERRMODE           => PDO::ERRMODE_EXCEPTION
		);

		$sLoginPart = \MailSo\Base\Utils::GetAccountNameFromEmail($oAccount->Email());
		$sDomainPart = \MailSo\Base\Utils::GetDomainFromEmail($oAccount->Email());

		try
		{
			$oConn = new PDO($sDsn, $this->mUser, $this->mPass, $aOptions);

			$oSelect = $oConn->prepare('SELECT '.$this->mColumn.' FROM '.$this->mTable.' WHERE pw_name=? AND pw_domain=? LIMIT 1');
			$oSelect->execute(array($sLoginPart, $sDomainPart));

			$aColCrypt = $oSelect->fetchAll(PDO::FETCH_ASSOC);

			$sCryptPass = isset($aColCrypt[0][$this->mColumn]) ? $aColCrypt[0][$this->mColumn] : '';
			if (0 < \strlen($sCryptPass) && \crypt($sPrevPassword, $sCryptPass) === $sCryptPass)
			{
				$oUpdate = $oConn->prepare('UPDATE '.$this->mTable.' SET '.$this->mColumn.'=ENCRYPT(?,concat("$1$",right(md5(rand()), 8 ),"$")), pw_clear_passwd=\'\' WHERE pw_name=? AND pw_domain=?');
				$oUpdate->execute(array(
					$sNewPassword,
					$sLoginPart,
					$sDomainPart
				));

				$bResult = true;
				if ($this->oLogger)
				{
					$this->oLogger->Write('Success! Password changed.');
				}
			}
			else
			{
				$bResult = false;
				if ($this->oLogger)
				{
					$this->oLogger->Write('Something went wrong. Either current password is incorrect, or new password does not match criteria.');
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
