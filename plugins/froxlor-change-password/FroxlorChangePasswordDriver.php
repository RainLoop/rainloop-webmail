<?php

class FroxlorChangePasswordDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
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
	 * @return \FroxlorChangePasswordDriver
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
	 * @return \FroxlorChangePasswordDriver
	 */
	public function SetAllowedEmails($sAllowedEmails)
	{
		$this->sAllowedEmails = $sAllowedEmails;
		return $this;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \FroxlorChangePasswordDriver
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
		if ($this->oLogger)	{
			$this->oLogger->Write('Froxlor: Try to change password for '.$oAccount->Email());
		}

		$bResult = false;
		if (!empty($this->sDsn) && 0 < \strlen($this->sUser) && 0 < \strlen($this->sPassword) && $oAccount)
		{
			try
			{
				$oPdo = new \PDO($this->sDsn, $this->sUser, $this->sPassword);
				$oPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

				$oStmt = $oPdo->prepare('SELECT password_enc, id FROM mail_users WHERE username = ? LIMIT 1');
				if ($oStmt->execute(array($oAccount->IncLogin())))
				{
					$aFetchResult = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
					if (\is_array($aFetchResult) && isset($aFetchResult[0]['password_enc'], $aFetchResult[0]['id']))
					{
						$sDbPassword = \stripslashes($aFetchResult[0]['password_enc']);

						if ( $this->validatePasswordLogin( $sDbPassword, $sPrevPassword ) ) {
							$sEncNewPassword = $this->cryptPassword($sNewPassword, 3);
							$oStmt = $oPdo->prepare('UPDATE mail_users SET password_enc = ?,password = ? WHERE id = ?');
							$bResult = (bool) $oStmt->execute(
								array($sEncNewPassword, $sNewPassword, $aFetchResult[0]['id']));
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
	private function cryptPassword($sPassword, $type = 3)
	{
		return $this->makeCryptPassword($sPassword,$type);
	}

	/**
	 * This file is part of the Froxlor project.
	 * Copyright (c) 2010 the Froxlor Team (see authors).
	 *
	 * For the full copyright and license information, please view the COPYING
	 * file that was distributed with this source code. You can also view the
	 * COPYING file online at http://files.froxlor.org/misc/COPYING.txt
	 *
	 * @copyright  (c) the authors
	 * @author     Michal Wojcik <m.wojcik@sonet3.pl>
	 * @author     Michael Kaufmann <mkaufmann@nutime.de>
	 * @author     Froxlor team <team@froxlor.org> (2010-)
	 * @license    GPLv2 http://files.froxlor.org/misc/COPYING.txt
	 * @package    Functions
	 *
	 */

	/**
	 * Make crypted password from clear text password
	 *
	 * @author Michal Wojcik <m.wojcik@sonet3.pl>
	 * @author Michael Kaufmann <mkaufmann@nutime.de>
	 * @author Froxlor team <team@froxlor.org> (2010-)
	 *
	 * 0 - default crypt (depenend on system configuration)
	 * 1 - MD5 $1$
	 * 2 - BLOWFISH $2a$ | $2y$07$ (on php 5.3.7+)
	 * 3 - SHA-256 $5$ (default)
	 * 4 - SHA-512 $6$
	 *
	 * @param string $password Password to be crypted
	 *
	 * @return string encrypted password
	 */
	private function makeCryptPassword ($password,$type = 3) {
		switch ($type) {
			case 0:
				$cryptPassword = \crypt($password);
				break;
			case 1:
				$cryptPassword = \crypt($password, '$1$' . $this->generatePassword(true).  $this->generatePassword(true));
				break;
			case 2:
				if (\version_compare(\phpversion(), '5.3.7', '<')) {
					$cryptPassword = \crypt($password, '$2a$' . $this->generatePassword(true).  $this->generatePassword(true));
				} else {
					// Blowfish hashing with a salt as follows: "$2a$", "$2x$" or "$2y$",
					// a two digit cost parameter, "$", and 22 characters from the alphabet "./0-9A-Za-z"
					$cryptPassword = \crypt(
						$password,
						'$2y$07$' . \substr($this->generatePassword(true).$this->generatePassword(true).$this->generatePassword(true), 0, 22)
					);
				}
				break;
			case 3:
				$cryptPassword = \crypt($password, '$5$' . $this->generatePassword(true).  $this->generatePassword(true));
				break;
			case 4:
				$cryptPassword = \crypt($password, '$6$' . $this->generatePassword(true).  $this->generatePassword(true));
				break;
			default:
				$cryptPassword = \crypt($password);
				break;
		}

		return $cryptPassword;
	}

	/**
	 * Generates a random password
	 *
	 * @param boolean $isSalt
	 *            optional, create a hash for a salt used in makeCryptPassword because crypt() does not like some special characters in its salts, default is false
	 */
	private function generatePassword($isSalt = false)
	{
	    $alpha_lower = 'abcdefghijklmnopqrstuvwxyz';
	    $alpha_upper = \strtoupper($alpha_lower);
	    $numeric = '0123456789';
	    $special = '!?<>§$%&+#=';
	    $length = 10;

	    $pw = $this->special_shuffle($alpha_lower);
	    $n = \floor(($length) / 4);
	    $pw .= \mb_substr($this->special_shuffle($alpha_upper), 0, $n);
	    $pw .= \mb_substr($this->special_shuffle($numeric), 0, $n);
	    $pw = \mb_substr($pw, - $length);
	    return $this->special_shuffle($pw);
	}

	/**
	 * multibyte-character safe shuffle function
	 *
	 * @param string $str
	 *
	 * @return string
	 */
	private function special_shuffle($str = null)
	{
	    $len = \mb_strlen($str);
	    $sploded = array();
	    while ($len -- > 0) {
		$sploded[] = \mb_substr($str, $len, 1);
	    }
	    \shuffle($sploded);
	    return \join('', $sploded);
	}

	/**
	 * Function validatePasswordLogin
	 *
	 * compare user password-hash with given user-password
	 * and check if they are the same
	 * additionally it updates the hash if the system settings changed
	 * or if the very old md5() sum is used
	 *
	 * @param array $userinfo user-data from table
	 * @param string $password the password to validate
	 * @param string $table either panel_customers or panel_admins
	 * @param string $uid user-id-field in $table
	 *
	 * @return boolean
	 */
	private function validatePasswordLogin($pwd_hash, $password = null) {

	        $systype = 3; // SHA256
	        $update_hash = false;
	        // check for good'ole md5
	        if (\strlen($pwd_hash) == 32 && \ctype_xdigit($pwd_hash)) {
	                $pwd_check = \md5($password);
	                $update_hash = true;
	        } else {
	                // cut out the salt from the hash
	                $pwd_salt = \str_replace(\substr(\strrchr($pwd_hash, "$"), 1), "", $pwd_hash);
	                // create same hash to compare
	                $pwd_check = \crypt($password, $pwd_salt);
	                // check whether the hash needs to be updated
	                $hash_type_chk = \substr($pwd_hash, 0, 3);
	                if (($systype == 1 && $hash_type_chk != '$1$') || // MD5
	                        ($systype == 2 && $hash_type_chk != '$2$') || // BLOWFISH
	                        ($systype == 3 && $hash_type_chk != '$5$') || // SHA256
	                        ($systype == 4 && $hash_type_chk != '$6$')    // SHA512
	                ) {
	                        $update_hash = true;
	                }
	        }

	        return $pwd_check;
	}


}
