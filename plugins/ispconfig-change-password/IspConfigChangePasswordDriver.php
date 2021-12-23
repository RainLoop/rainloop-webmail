<?php

class IspConfigChangePasswordDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
{
    const PASSWORD_ENCODING = 'ISO-8859-1';

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
    private $oLogger;

    /**
     * @var PDO
     */
    private $oConnection;

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
        if ($oLogger instanceof \MailSo\Log\Logger) {
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
     * @param string            $sPrevPassword
     * @param string            $sNewPassword
     *
     * @return bool
     */
    public function ChangePassword(\RainLoop\Account $oAccount, $sPrevPassword, $sNewPassword)
    {
        $this->log('ISP: Try to change password for ' . $oAccount->Email());

        if ($this->isConfigValid() === false) {
            return false;
        }

        try {
            $sMailUser = $this->getMailUserForLogin($oAccount->IncLogin());
            if ($sMailUser === null) {
                $this->log('No user found for login: ' . $oAccount->IncLogin());
                return false;
            }

            $iDbMailUserId = $sMailUser['mailuser_id'];
            $sDbPasswordHash = $sMailUser['password'];
            $sPreviousPasswordHash = $this->getPasswordHashFromOldPassword($sDbPasswordHash, $sPrevPassword);

            if ($sPreviousPasswordHash !== $sDbPasswordHash) {
                $this->log('Hashes for current password do not match');
                throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CurrentPasswordIncorrect);
            }


            $sNewPasswordHash = $this->cryptPassword($sNewPassword, self::PASSWORD_ENCODING);

            return $this->updatePasswordForMailUserId($iDbMailUserId, $sNewPasswordHash);
        } catch (\Exception $oException) {
            if ($this->oLogger) {
                $this->oLogger->WriteException($oException);
            }
            return false;
        }
    }

    /**
     * Encrypts a password for a mailbox (based on ISPConfig version)
     *
     * Base function: interface/lib/classes/auth.inc.php -> crypt_password
     * Used in: interface/lib/classes/tform_base.inc.php via CRYPTMAIL
     * Called in: interface/web/mail/form/mail_user.tform.php
     *
     * @param string $cleartext_password
     * @param string $charset
     *
     * @return string|null
     */
    public function cryptPassword($cleartext_password, $charset = 'UTF-8')
    {
        if ($charset !== 'UTF-8') {
            $cleartext_password = \mb_convert_encoding($cleartext_password, $charset, 'UTF-8');
        }

        if (\defined('CRYPT_SHA512') && CRYPT_SHA512 == 1) {
            $salt = '$6$rounds=5000$';
            $salt_length = 16;
        } elseif (\defined('CRYPT_SHA256') && CRYPT_SHA256 == 1) {
            $salt = '$5$rounds=5000$';
            $salt_length = 16;
        } else {
            $salt = '$1$';
            $salt_length = 12;
        }

        if (function_exists('openssl_random_pseudo_bytes')) {
            $salt .= \substr(\bin2hex(\openssl_random_pseudo_bytes($salt_length)), 0, $salt_length);
        } else {
            $base64_alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./';
            for ($n = 0; $n < $salt_length; $n++) {
                $salt .= $base64_alphabet[\mt_rand(0, 63)];
            }
        }
        $salt .= "$";
        return \crypt($cleartext_password, $salt);
    }

    /**
     * @param string $sPasswordHash
     *
     * @return string
     */
    private function getSaltFromPasswordHash($sPasswordHash)
    {
        return substr($sPasswordHash, 0, strrpos($sPasswordHash, '$'));
    }

    private function getPasswordHashFromOldPassword($sHashedPassword, $sClearTextPassword)
    {
        $sClearTextPassword = mb_convert_encoding($sClearTextPassword, self::PASSWORD_ENCODING, 'UTF-8');
        $sPasswordSalt = $this->getSaltFromPasswordHash($sHashedPassword);

        return crypt($sClearTextPassword, $sPasswordSalt);
    }

    /**
     * @return bool
     */
    private function isConfigValid()
    {
        if (empty($this->sDsn)) {
            $this->log('ERROR: DB - pdo_dsn not configured');
            return false;
        }

        if ($this->sUser === '') {
            $this->log('ERROR: DB - user not configured');
            return false;
        }

        if ($this->sPassword === '') {
            $this->log('ERROR: DB - password not configured');
            return false;
        }

        return true;
    }

    /**
     * @return PDO
     * @throws Exception
     */
    private function getConnection()
    {
        if ($this->oConnection !== null) {
            return $this->oConnection;
        }

        try {
            $oPdo = new \PDO($this->sDsn, $this->sUser, $this->sPassword);
            $oPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);#
        } catch (Exception $exception) {
            $this->log('Failed to establish DB connection: ' . $exception->getMessage());
            throw $exception;
        }

        $this->oConnection = $oPdo;

        return $oPdo;
    }

    /**
     * @param string $sLogin
     *
     * @return array|null
     * @throws Exception
     */
    private function getMailUserForLogin($sLogin)
    {
        $oStatement = $this->getConnection()->prepare('SELECT * FROM mail_user WHERE login = ? LIMIT 1');
        if ($oStatement->execute(array($sLogin)) === false) {
            return null;
        }

        return $oStatement->fetch(\PDO::FETCH_ASSOC);
    }

    /**
     * @param int    $iMailUserId
     * @param string $sPasswordHash
     *
     * @return bool
     * @throws Exception
     */
    private function updatePasswordForMailUserId($iMailUserId, $sPasswordHash)
    {
        $oStatement = $this->getConnection()->prepare('UPDATE mail_user SET password = ? WHERE mailuser_id = ?');

        return $oStatement->execute(array($sPasswordHash, $iMailUserId));
    }

    /**
     * @param string $sMessage
     *
     * @return void
     */
    private function log($sMessage)
    {
        if ($this->oLogger === null) {
            return;
        }

        $this->oLogger->Write($sMessage);
    }
}
