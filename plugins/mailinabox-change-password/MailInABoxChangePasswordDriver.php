<?php
/*
 * Mail-in-a-box Password Change Plugin
 *
 * Based on VirtualminChangePasswordDriver
 *
 * Author: Marius Gripsgard
 */
class MailInABoxChangePasswordDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
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
	 * @return \MailInABoxChangePasswordDriver
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
	 * @return \MailInABoxChangePasswordDriver
	 */
	public function SetAllowedEmails($sAllowedEmails)
	{
		$this->sAllowedEmails = $sAllowedEmails;
		return $this;
	}
	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \MailInABoxChangePasswordDriver
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
	 * @return \MailInABoxChangePasswordDriver
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
		$this->WriteLog('Mail-in-a-box: Try to change password for '.$oAccount->Email());
		$bResult = false;
		if (!empty($this->sHost) && !empty($this->sAdminUser) && !empty($this->sAdminPassword) && $oAccount)
		{
			$this->WriteLog('Mail-in-a-box:[Check] Required Fields Present');
			$sEmail = \trim(\strtolower($oAccount->Email()));
			$sHost = \rtrim(\trim($this->sHost), '/');
			$sUrl = $sHost.'/admin/mail/users/password';

			$sAdminUser = $this->sAdminUser;
			$sAdminPassword = $this->sAdminPassword;
			$iCode = 0;
			$aPost = array(
				'email'		=> $sEmail,
				'password'		=> $sNewPassword,
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
				CURLOPT_USERPWD => $sAdminUser.':'.$sAdminPassword,
				CURLOPT_HTTPAUTH => CURLAUTH_BASIC
			);
			$oCurl = \curl_init();
			\curl_setopt_array($oCurl, $aOptions);
			$this->WriteLog('Mail-in-a-box: Send post request: '.$sUrl);
			$mResult = \curl_exec($oCurl);
			$iCode = (int) \curl_getinfo($oCurl, CURLINFO_HTTP_CODE);
			$sContentType = (string) \curl_getinfo($oCurl, CURLINFO_CONTENT_TYPE);
			$this->WriteLog('Mail-in-a-box: Post request result: (Status: '.$iCode.', ContentType: '.$sContentType.')');
			if (false === $mResult || 200 !== $iCode)
			{
				$this->WriteLog('Mail-in-a-box: Error: '.\curl_error($oCurl), \MailSo\Log\Enumerations\Type::WARNING);
			}
			if (\is_resource($oCurl))
			{
				\curl_close($oCurl);
			}
			if (false !== $mResult && 200 === $iCode)
			{
				$this->WriteLog('Mail-in-a-box: Password Change Status: Success');
				$bResult = true;
			}
			else
			{
				$this->WriteLog('Mail-in-a-box[Error]: Empty Response: Code: '.$iCode);
			}
		}
		return $bResult;
	}
}
