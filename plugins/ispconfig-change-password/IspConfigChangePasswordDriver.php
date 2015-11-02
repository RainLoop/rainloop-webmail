<?php

class IspConfigChangePasswordDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
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
	 * @return \IspConfigChangePasswordDriver
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
	 * @return \IspConfigChangePasswordDriver
	 */
	public function SetAllowedEmails($sAllowedEmails)
	{
		$this->sAllowedEmails = $sAllowedEmails;
		return $this;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \IspConfigChangePasswordDriver
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
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return bool
	 */
	public function PasswordChangePossibility($oAccount)
	{
		return $oAccount && $oAccount->Email() &&
			\RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $this->sAllowedEmails);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sPrevPassword
	 * @param string $sNewPassword
	 *
	 * @return bool
	 */
	public function ChangePassword(\RainLoop\Account $oAccount, $sPrevPassword, $sNewPassword)
	{
		if ($this->oLogger)
		{
			$this->oLogger->Write('ISP: Try to change password for '.$oAccount->Email());
		}

		$bResult = false;
		if (!empty($this->sDsn) && 0 < \strlen($this->sUser) && 0 < \strlen($this->sPassword) && $oAccount)
		{
			try
			{
				$oPdo = new \PDO($this->sDsn, $this->sUser, $this->sPassword);
				$oPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

				$oStmt = $oPdo->prepare('SELECT password, mailuser_id FROM mail_user WHERE login = ? LIMIT 1');
				if ($oStmt->execute(array($oAccount->IncLogin())))
				{
					$aFetchResult = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
					if (\is_array($aFetchResult) && isset($aFetchResult[0]['password'], $aFetchResult[0]['mailuser_id']))
					{
						$sDbPassword = \stripslashes($aFetchResult[0]['password']);
						$sDbSalt = '$1$'.\substr($sDbPassword, 3, 8).'$';

						if (\crypt(\stripslashes($sPrevPassword), $sDbSalt) === $sDbPassword)
						{
							$oStmt = $oPdo->prepare('UPDATE mail_user SET password = ? WHERE mailuser_id = ?');
							$bResult = (bool) $oStmt->execute(
								array($this->cryptPassword($sNewPassword), $aFetchResult[0]['mailuser_id']));
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

	/**
	 * @param string $sPassword
	 * @return string
	 */
	private function cryptPassword($sPassword)
	{
		$sSalt = '';
		$sBase64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

		for ($iIndex = 0; $iIndex < 8; $iIndex++)
		{
			$sSalt .= $sBase64[\rand(0, 63)];
		}

		return \crypt($sPassword, '$1$'.$sSalt.'$');
	}
}