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
	 * @var bool
	 */
	private $bSsl = true;

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
	 * @param bool $bSsl
	 * @param string $sUser
	 * @param string $sPassword
	 *
	 * @return \CpanelChangePasswordDriver
	 */
	public function SetConfig($sHost, $iPost, $bSsl, $sUser, $sPassword)
	{
		$this->sHost = $sHost;
		$this->iPost = $iPost;
		$this->bSsl = !!$bSsl;
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

		if (!\class_exists('xmlapi'))
		{
			include_once __DIR__.'/xmlapi.php';
		}

		$bResult = false;
		if (!empty($this->sHost) && 0 < $this->iPost &&
			0 < \strlen($this->sUser) && 0 < \strlen($this->sPassword) &&
			$oAccount && \class_exists('xmlapi'))
		{
			$sEmail = $oAccount->Email();
			$sEmailUser = \MailSo\Base\Utils::GetAccountNameFromEmail($sEmail);
			$sEmailDomain = \MailSo\Base\Utils::GetDomainFromEmail($sEmail);

			$sHost = $this->sHost;
			$sHost = \str_replace('{user:domain}', $sEmailDomain, $sHost);

			$sUser = $this->sUser;
			$sUser = \str_replace('{user:email}', $sEmail, $sUser);
			$sUser = \str_replace('{user:login}', $sEmailUser, $sUser);

			$sPassword = $this->sPassword;
			$sPassword = \str_replace('{user:password}', $oAccount->Password(), $sPassword);

			try
			{
				$oXmlApi = new \xmlapi($sHost);
				$oXmlApi->set_port($this->iPost);
				$oXmlApi->set_protocol($this->bSsl ? 'https' : 'http');
				$oXmlApi->set_debug(false);
				$oXmlApi->set_output('json');
//				$oXmlApi->set_http_client('fopen');
				$oXmlApi->set_http_client('curl');
				$oXmlApi->password_auth($sUser, $sPassword);

				$aArgs = array(
					'email' => $sEmailUser,
					'domain' => $sEmailDomain,
					'password' => $sNewPassword
				);

				$sResult = $oXmlApi->api2_query($sUser, 'Email', 'passwdpop', $aArgs);
				if ($sResult)
				{
					if ($this->oLogger)
					{
						$this->oLogger->Write('CPANEL: '.$sResult, \MailSo\Log\Enumerations\Type::INFO);
					}

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
		else
		{
			if ($this->oLogger)
			{
				$this->oLogger->Write('CPANEL: Incorrent configuration data', \MailSo\Log\Enumerations\Type::ERROR);
			}
		}

		return $bResult;
	}
}