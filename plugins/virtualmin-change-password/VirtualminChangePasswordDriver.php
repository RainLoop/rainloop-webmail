<?php

/*
 * This Virtualmin Password Change Plugin was developed by Icedman21
 * http://icedman21.com
 */
class VirtualminChangePasswordDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
{
	/**
	 * @var string
	 */
	private $sAllowedEmails = '';

	/**
	 * @var string
	 */
	private $sHost = '';

	/**
	 * @var string
	 */
	private $sAdminUser = '';

	/**
	 * @var string
	 */
	private $sAdminPassword = '';

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	/**
	 * @param string $sHost
	 * @param string $sAdminUser
	 * @param string $sAdminPassword
	 *
	 * @return \VirtualminChangePasswordDriver
	 */
	public function SetConfig($sHost, $sAdminUser, $sAdminPassword)
	{
		$this->sHost = $sHost;
		$this->sAdminUser = $sAdminUser;
		$this->sAdminPassword = $sAdminPassword;

		return $this;
	}

	/**
	 * @param string $sAllowedEmails
	 *
	 * @return \VirtualminChangePasswordDriver
	 */
	public function SetAllowedEmails($sAllowedEmails)
	{
		$this->sAllowedEmails = $sAllowedEmails;

		return $this;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \VirtualminChangePasswordDriver
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
	 * @param string $sDesc
	 * @param int $iType = \MailSo\Log\Enumerations\Type::INFO
	 *
	 * @return \VirtualminChangePasswordDriver
	 */
	public function WriteLog($sDesc, $iType = \MailSo\Log\Enumerations\Type::INFO)
	{
		if ($this->oLogger)
		{
			$this->oLogger->Write($sDesc, $iType);
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
		$this->WriteLog('Virtualmin: Try to change password for '.$oAccount->Email());

		$bResult = false;
		if (!empty($this->sHost) && !empty($this->sAdminUser) && !empty($this->sAdminPassword) && $oAccount)
		{
			$this->WriteLog('Virtualmin:[Check] Required Fields Present');

			$sEmail = \trim(\strtolower($oAccount->Email()));
			$sEmailUser = \MailSo\Base\Utils::GetAccountNameFromEmail($sEmail);
			$sEmailDomain = \MailSo\Base\Utils::GetDomainFromEmail($sEmail);

			$sHost = \rtrim(\trim($this->sHost), '/');
			$sUrl = $sHost.'/virtual-server/remote.cgi';

			$sAdminUser = $this->sAdminUser;
			$sAdminPassword = $this->sAdminPassword;

			$iCode = 0;

			$aPost = array(
				'user'		=> $sEmailUser,
				'pass'		=> $sNewPassword,
				'domain'	=> $sEmailDomain,
				'program'	=> 'modify-user'
			);

			$aOptions = array(
				CURLOPT_URL => $sUrl,
				CURLOPT_HEADER => false,
				CURLOPT_FAILONERROR => true,
				CURLOPT_SSL_VERIFYPEER => false,
				CURLOPT_RETURNTRANSFER => true,
				CURLOPT_POST => true,
				CURLOPT_POSTFIELDS => \http_build_query($aPost, '', '&'),
				CURLOPT_TIMEOUT => 20,
				CURLOPT_SSL_VERIFYHOST => false,
				CURLOPT_USERPWD => $sAdminUser.':'.$sAdminPassword
			);

			$oCurl = \curl_init();
			\curl_setopt_array($oCurl, $aOptions);

			$this->WriteLog('Virtualmin: Send post request: '.$sUrl);

			$mResult = \curl_exec($oCurl);

			$iCode = (int) \curl_getinfo($oCurl, CURLINFO_HTTP_CODE);
			$sContentType = (string) \curl_getinfo($oCurl, CURLINFO_CONTENT_TYPE);

			$this->WriteLog('Virtualmin: Post request result: (Status: '.$iCode.', ContentType: '.$sContentType.')');
			if (false === $mResult || 200 !== $iCode)
			{
				$this->WriteLog('Virtualmin: Error: '.\curl_error($oCurl), \MailSo\Log\Enumerations\Type::WARNING);
			}

			if (\is_resource($oCurl))
			{
				\curl_close($oCurl);
			}

			if (false !== $mResult && 200 === $iCode)
			{
				$aRes = null;
				@\parse_str($mResult, $aRes);
				if (\is_array($aRes) && (!isset($aRes['error']) || (int) $aRes['error'] !== 1))
				{
					$iPos = \strpos($mResult, 'Exit status: ');

					if ($iPos !== false)
					{
						$aStatus = \explode(' ', $mResult);
						$sStatus = \trim(\array_pop($aStatus));

						if ('0' === $sStatus)
						{
							$this->WriteLog('Virtualmin: Password Change Status: Success');
							$bResult = true;
						}
						else
						{
							$this->WriteLog('Virtualmin[Error]: Response: '.$mResult);
						}
					}
				}
				else
				{
					$this->WriteLog('Virtualmin[Error]: Response: '.$mResult);
				}
			}
			else
			{
				$this->WriteLog('Virtualmin[Error]: Empty Response: Code: '.$iCode);
			}
		}

		return $bResult;
	}
}
