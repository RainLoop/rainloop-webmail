<?php

class MailcowChangePasswordDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
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
			$this->oLogger->Write('Mailcow: Try to change password for '.$oAccount->Email());
		}

		$bResult = false;
		if (!empty($this->sDsn) && 0 < \strlen($this->sUser) && 0 < \strlen($this->sPassword) && $oAccount)
		{
			try
			{
				$oPdo = new \PDO($this->sDsn, $this->sUser, $this->sPassword);
				$oPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

				$oStmt = $oPdo->prepare('SELECT password, username FROM mailbox WHERE username = ? LIMIT 1');
				if ($oStmt->execute(array($oAccount->IncLogin())))
				{
					$aFetchResult = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
					if (\is_array($aFetchResult) && isset($aFetchResult[0]['password'], $aFetchResult[0]['username']))
					{
						$sDbPassword = $aFetchResult[0]['password'];
						if (\substr($sDbPassword, 0, 14) === '{SHA512-CRYPT}') {
							$sDbSalt = \substr($sDbPassword, 17, 16);
						} else {
							$sDbSalt = \substr($sDbPassword, 3, 16);
						}

						if ('{SHA512-CRYPT}'.\crypt($sPrevPassword, '$6$'.$sDbSalt) === $sDbPassword)
						{
							$oStmt = $oPdo->prepare('UPDATE mailbox SET password = ? WHERE username = ?');
							if ($oStmt->execute(array($this->cryptPassword($sNewPassword), $aFetchResult[0]['username']))) {
								$oStmt = $oPdo ->prepare('UPDATE users SET digesta1=MD5(CONCAT(?, ":SabreDAV:", ?)) WHERE username=?');
								if ($oStmt->execute(array($aFetchResult[0]['username'],$sNewPassword,$aFetchResult[0]['username']))) {
									//the MailCow & SabreDav have been updated, now update the doveadm password
									exec("/usr/bin/doveadm pw -s SHA512-CRYPT -p $sNewPassword", $hash, $return);
									$bResult = true;
								}
							}
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

		for ($iIndex = 0; $iIndex < 16; $iIndex++)
		{
			$sSalt .= $sBase64[\rand(0, 63)];
		}

		$crypted = \crypt($sPassword, '$6$'.$sSalt);
		return '{SHA512-CRYPT}'.$crypted;
	}
}
