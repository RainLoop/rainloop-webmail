<?php
/**
 * change-password-docker-mailserver - Plugin that adds functionality to change the email account password of docker-mailserver container with the email frontend
 *
 * @author VanVan <https://github.com/VanVan>
 *
 */

class ChangePasswordVanVanDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
{
	/**
	 * @var string
	 */
	private $sHost = '127.0.0.1';

	/**
	 * @var int
	 */
	private $iPort = 21;

    /**
     * @var string
     */
    private $sUser = 'root';

    /**
     * @var string
     */
    private $sPassword = '';

    /**
     * @var string
     */
    private $sLocation = 'setup.sh';

    /**
     * @var string
     */
    private $bCheckExecution = true;

	/**
	 * @var string
	 */
	private $sAllowedEmails = '';

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	/**
	 * @param string $sHost
	 *
	 * @return \ChangePasswordVanVanDriver
	 */
	public function SetHost($sHost)
	{
		$this->sHost = $sHost;
		return $this;
	}

	/**
	 * @param int $iPort
	 *
	 * @return \ChangePasswordVanVanDriver
	 */
	public function SetPort($iPort)
	{
		$this->iPort = (int) $iPort;
		return $this;
	}

    /**
     * @param string $sHost
     *
     * @return \ChangePasswordVanVanDriver
     */
    public function SetUser($sUser)
    {
        $this->sUser = $sUser;
        return $this;
    }

    /**
     * @param string $sPassword
     *
     * @return \ChangePasswordVanVanDriver
     */
    public function SetPassword($sPassword)
    {
        $this->sPassword = $sPassword;
        return $this;
    }

    /**
     * @param string $sLocation
     *
     * @return \ChangePasswordVanVanDriver
     */
    public function SetLocation($sLocation)
    {
        $this->sLocation = $sLocation;
        return $this;
    }

    /**
     * @param boolean $bCheckExecution
     *
     * @return \ChangePasswordVanVanDriver
     */
    public function SetCheckExecution($bCheckExecution)
    {
        $this->bCheckExecution = $bCheckExecution;
        return $this;
    }

	/**
	 * @param string $sAllowedEmails
	 *
	 * @return \ChangePasswordVanVanDriver
	 */
	public function SetAllowedEmails($sAllowedEmails)
	{
		$this->sAllowedEmails = $sAllowedEmails;
		return $this;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \ChangePasswordVanVanDriver
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
		$bResult = false;

		try
		{
			if(strpos("'", $oAccount->Email()) !== false || strpos('"', $oAccount->Email()) !== false)
				return false;
			if(strpos("'", $sNewPassword) !== false || strpos('"', $sNewPassword) !== false)
                return false;


			$connection = ssh2_connect($this->sHost, $this->iPort);
            if ($connection)
			    if (ssh2_auth_password($connection, $this->sUser, $this->sPassword)) {
                    $sftp = ssh2_sftp($connection);
                    $streamFile = file_exists('ssh2.sftp://' . intval($sftp) . $this->sLocation);
                    if ($streamFile && $stream = ssh2_exec($connection, ($this->sUser=='root'?'':'sudo ').$this->sLocation . ' email update "' . $oAccount->Email() . '" "' . $sNewPassword . '"')) {
                        stream_set_blocking($stream, true);
                        $stream_out = ssh2_fetch_stream($stream, SSH2_STREAM_STDIO);
                        $stream_out_error = ssh2_fetch_stream($stream, SSH2_STREAM_STDERR);
                        $outputString = stream_get_contents($stream_out);
                        $errorString = stream_get_contents($stream_out_error);
                        sleep(1);
                        if (!$this->bCheckExecution || (strlen($outputString) == 0 && (strlen($errorString) == 0 || strpos($errorString, 'error') === false)))
                            $bResult = true;
                    }
                }
		}
		catch (\Exception $oException)
		{
			$bResult = false;
		}

		return $bResult;
	}

    /**
     * @param string $path
     * @return string
     */
    public static function get_absolute_path($path) {
        $path = str_replace(array('/', '\\'), DIRECTORY_SEPARATOR, $path);
        $parts = array_filter(explode(DIRECTORY_SEPARATOR, $path), 'strlen');
        $absolutes = array();
        foreach ($parts as $part) {
            if ('.' == $part) continue;
            if ('..' == $part) {
                array_pop($absolutes);
            } else {
                $absolutes[] = $part;
            }
        }
        return implode(DIRECTORY_SEPARATOR, $absolutes);
    }
}
