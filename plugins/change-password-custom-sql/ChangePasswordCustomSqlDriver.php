<?php

class ChangePasswordCustomSqlDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
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
	private $mSql = '';

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	/**
	 * @param string $mHost
	 *
	 * @return \ChangePasswordCustomSqlDriver
	 */
	public function SetmHost($mHost)
	{
		$this->mHost = $mHost;
		return $this;
	}

	/**
	 * @param string $mUser
	 *
	 * @return \ChangePasswordCustomSqlDriver
	 */
	public function SetmUser($mUser)
	{
		$this->mUser = $mUser;
		return $this;
	}

	/**
	 * @param string $mPass
	 *
	 * @return \ChangePasswordCustomSqlDriver
	 */
	public function SetmPass($mPass)
	{
		$this->mPass = $mPass;
		return $this;
	}

	/**
	 * @param string $mDatabase
	 *
	 * @return \ChangePasswordCustomSqlDriver
	 */
	public function SetmDatabase($mDatabase)
	{
		$this->mDatabase = $mDatabase;
		return $this;
	}

	/**
	 * @param string $mTable
	 *
	 * @return \ChangePasswordCustomSqlDriver
	 */
	public function SetmTable($mTable)
	{
		$this->mTable = $mTable;
		return $this;
	}

	/**
	 * @param string $mSql
	 *
	 * @return \ChangePasswordCustomSqlDriver
	 */
	public function SetmSql($mSql)
	{
		$this->mSql = $mSql;
		return $this;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \ChangePasswordCustomSqlDriver
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

		$dsn = 'mysql:host='.$this->mHost.';dbname='.$this->mDatabase.';charset=utf8';
		$options = array(
			PDO::ATTR_EMULATE_PREPARES  => true,
			PDO::ATTR_PERSISTENT        => true,
			PDO::ATTR_ERRMODE           => PDO::ERRMODE_EXCEPTION
		);

		try
		{
			$conn = new PDO($dsn,$this->mUser,$this->mPass,$options);

			//prepare SQL varaibles
			$sEmail = $oAccount->Email();
			$sEmailUser = \MailSo\Base\Utils::GetAccountNameFromEmail($sEmail);
			$sEmailDomain = \MailSo\Base\Utils::GetDomainFromEmail($sEmail);

			// some variables cannot be prepared
			$this->mSql = str_replace(array(
				':table'
			), array(
				$this->mTable
			), $this->mSql);

			$placeholders = array(
				':email' => $sEmail,
				':oldpass' => $sPrevPassword, 
				':newpass' => $sNewPassword, 
				':domain' => $sEmailDomain, 
				':username' => $sEmailUser
			);

			// we have to check that all placehoders are used in the query, passing any unused placeholders will generate an error
			$used_placeholders = array();

			foreach($placeholders as $placeholder => $value) {
				if(preg_match_all('/'.$placeholder . '(?![a-zA-Z0-9\-])'.'/', $this->mSql) === 1) {
					// backwards-compabitibility: remove single and double quotes around placeholders
					$this->mSql = str_replace('`'.$placeholder.'`', $placeholder, $this->mSql);
					$this->mSql = str_replace("'".$placeholder."'", $placeholder, $this->mSql);
					$this->mSql = str_replace('"'.$placeholder.'"', $placeholder, $this->mSql);
					$used_placeholders[$placeholder] = $value;
				}
			}

			$statement = $conn->prepare($this->mSql);

			// everything is ready (hopefully), bind the values
			foreach($used_placeholders as $placeholder => $value) {
				$statement->bindValue($placeholder, $value);
			}

			// and execute
			$mSqlReturn = $statement->execute();

			/* can be used for debugging
			ob_start();
			$statement->debugDumpParams();
			$r = ob_get_contents();
			ob_end_clean();
			$this->oLogger->Write($r);
			*/

			if ($mSqlReturn == true)
			{
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
