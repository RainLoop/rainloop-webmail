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
		return $oAccount && $oAccount->Domain() &&
			\in_array(\strtolower($oAccount->Domain()->Name()), $this->aDomains);
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

		$dsn = 'mysql:host='.$this->mHost.';dbname='.$this->mDatabase.';charset=utf8';
		$options = array(
			PDO::ATTR_EMULATE_PREPARES  => false,
			PDO::ATTR_PERSISTENT        => true,
			PDO::ATTR_ERRMODE           => PDO::ERRMODE_EXCEPTION
		);

		try
			{
				$conn = new PDO($dsn,$this->mUser,$this->mPass,$options);
				
				$select = $conn->prepare("SELECT $this->mColumn FROM $this->mTable WHERE pw_name=? AND pw_domain=? LIMIT 1");

				$email_parts = explode("@", $oAccount->Email());

				$select->execute(array(
						$email_parts[0],
						$email_parts[1]
				));

				$colCrypt = $select->fetchAll(PDO::FETCH_ASSOC);
				$sCryptPass = $colCrypt[0][$this->mColumn];

				if (0 < strlen($sCryptPass) && crypt($sPrevPassword, $sCryptPass) === $sCryptPass /*&& 7 < mb_strlen($sNewPassword) && 20 > mb_strlen($sNewPassword) && !preg_match('/[^A-Za-z0-9]+/', $sNewPassword)*/)
				{

						$update = $conn->prepare('UPDATE '.$this->mTable.' SET '.$this->mColumn.'=ENCRYPT(?,concat("$1$",right(md5(rand()), 8 ),"$")), pw_clear_passwd=\'\' WHERE pw_name=? AND pw_domain=?');
						$update->execute(array(
								$sNewPassword,
								$email_parts[0],
								$email_parts[1]
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
