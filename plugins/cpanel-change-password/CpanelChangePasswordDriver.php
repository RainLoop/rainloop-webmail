<?php

class CpanelChangePasswordDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
{
	/**
	 * @var string
	 */
	private $sHost = '';

	/**
	 * @var int
	 */
	private $iPost = 2087;

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
	 * @param string $sHost
	 * @param int $iPost
	 * @param bool $sSsl
	 * @param string $sUser
	 * @param string $sPassword
	 *
	 * @return \CpanelChangePasswordDriver
	 */
	public function SetConfig($sHost, $iPost, $sSsl, $sUser, $sPassword)
	{
		$this->sHost = $sHost;
		$this->iPost = $iPost;
		$this->sSsl = $sSsl;
		$this->sUser = $sUser;
		$this->sPassword = $sPassword;

		return $this;
	}

	/**
	 * @param string $sAllowedEmails
	 *
	 * @return \CpanelChangePasswordDriver
	 */
	public function SetAllowedEmails($sAllowedEmails)
	{
		$this->sAllowedEmails = $sAllowedEmails;
		return $this;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \CpanelChangePasswordDriver
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
			$this->oLogger->Write('Try to change password for '.$oAccount->Email());
		}

		include_once __DIR__.'/xmlapi.php';

		$bResult = false;
		if (!empty($this->sHost) && 0 < $this->iPost &&
			0 < \strlen($this->sUser) && 0 < \strlen($this->sPassword) &&
			$oAccount && \class_exists('xmlapi'))
		{
			try
			{
				$oXmlApi = new \xmlapi($this->sHost);
				$oXmlApi->set_port($this->iPost);
				$oXmlApi->set_protocol($this->sSsl ? 'https' : 'http');
				$oXmlApi->set_debug(false);
				$oXmlApi->set_output('json');
				$oXmlApi->set_http_client('curl');
				$oXmlApi->password_auth($this->sUser, $this->sPassword);

				$sEmail = $oAccount->Email();

				$aArgs = array(
					'email' => \MailSo\Base\Utils::GetAccountNameFromEmail($sEmail),
					'domain' => \MailSo\Base\Utils::GetDomainFromEmail($sEmail),
					'password' => $sNewPassword
				);

				$sResult = $oXmlApi->api2_query($this->sUser, 'Email', 'passwdpop', $aArgs);
				if ($sResult)
				{
					$aResult = @\json_decode($sResult, true);
					$bResult = isset($aResult['cpanelresult']['data'][0]['result']) &&
						!!$aResult['cpanelresult']['data'][0]['result'];
				}

				if (!$bResult && $this->oLogger)
				{
					$this->oLogger->Write('CPANEL: '.$sResult, \MailSo\Log\Enumerations\Type::ERROR);
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