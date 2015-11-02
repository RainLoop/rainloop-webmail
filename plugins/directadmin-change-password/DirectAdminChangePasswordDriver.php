<?php

class DirectAdminChangePasswordDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
{
	/**
	 * @var string
	 */
	private $sHost = '';

	/**
	 * @var string
	 */
	private $iPort = 2222;
	
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
	 * @param int $iPort
	 *
	 * @return \DirectAdminChangePasswordDriver
	 */
	public function SetConfig($sHost, $iPort)
	{
		$this->sHost = $sHost;
		$this->iPort = $iPort;

		return $this;
	}

	/**
	 * @param string $sAllowedEmails
	 *
	 * @return \DirectAdminChangePasswordDriver
	 */
	public function SetAllowedEmails($sAllowedEmails)
	{
		$this->sAllowedEmails = $sAllowedEmails;
		return $this;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \DirectAdminChangePasswordDriver
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
			$this->oLogger->Write('DirectAdmin: Try to change password for '.$oAccount->Email());
		}

		$bResult = false;
		if (!empty($this->sHost) && 0 < $this->iPort && $oAccount)
		{
			$sEmail = \trim(\strtolower($oAccount->Email()));

			$sHost = \trim($this->sHost);
			$sHost = \str_replace('{user:host-imap}', $oAccount->Domain()->IncHost(), $sHost);
			$sHost = \str_replace('{user:host-smtp}', $oAccount->Domain()->OutHost(), $sHost);
			$sHost = \str_replace('{user:domain}', \MailSo\Base\Utils::GetDomainFromEmail($sEmail), $sHost);
			$sHost = \rtrim($this->sHost, '/\\');
			
			if (!\preg_match('/^http[s]?:\/\//i', $sHost))
			{
				$sHost = 'http://'.$sHost;
			}

			$sUrl = $sHost.':'.$this->iPort.'/CMD_CHANGE_EMAIL_PASSWORD';

			$iCode = 0;
			$oHttp = \MailSo\Base\Http::SingletonInstance();

			if ($this->oLogger)
			{
				$this->oLogger->Write('DirectAdmin[Api Request]:'.$sUrl);
			}

			$mResult = $oHttp->SendPostRequest($sUrl,
				array(
					'email'         => $sEmail,
					'oldpassword'   => $sPrevPassword,
					'password1'     => $sNewPassword,
					'password2'     => $sNewPassword,
					'api'           => '1'
				), 'MailSo Http User Agent (v1)', $iCode, $this->oLogger);

			if (false !== $mResult && 200 === $iCode)
			{
				$aRes = null;
				@\parse_str($mResult, $aRes);
				if (is_array($aRes) && (!isset($aRes['error']) || (int) $aRes['error'] !== 1))
				{
					$bResult = true;
				}
				else
				{
					if ($this->oLogger)
					{
						$this->oLogger->Write('DirectAdmin[Error]: Response: '.$mResult);
					}
				}
			}
			else
			{
				if ($this->oLogger)
				{
					$this->oLogger->Write('DirectAdmin[Error]: Empty Response: Code:'.$iCode);
				}
			}
		}

		return $bResult;
	}
}