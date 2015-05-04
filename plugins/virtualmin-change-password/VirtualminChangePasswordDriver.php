<?php
/*
This Virtualmin Password Change Plugin was developed by Icedman21 
http://icedman21.com
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
	* @param string $sUser
	* @param string $sPassword
	*
	* @return \DirectAdminChangePasswordDriver
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
	* @return \ChangePasswordExampleDriver
	*/
	public function SetAllowedEmails($sAllowedEmails)
	{
		$this->sAllowedEmails = $sAllowedEmails;
		return $this;
	}
	/**
	* @param \MailSo\Log\Logger $oLogger
	*
	* @return \HmailserverChangePasswordDriver
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
			$this->oLogger->Write('Virtualmin: Try to change password for '.$oAccount->Email());
		}
		
		$bResult = false;
		if (!empty($this->sHost) && !empty($this->sAdminUser) && !empty($this->sAdminPassword) && $oAccount)
		{
			if ($this->oLogger)
			{
				$this->oLogger->Write('Virtualmin: Required Fields Present');
			}
			$sEmail = \trim(\strtolower($oAccount->Email()));
			$sEmailUser = \MailSo\Base\Utils::GetAccountNameFromEmail($sEmail);
			$sEmailDomain = \MailSo\Base\Utils::GetDomainFromEmail($sEmail);
			$sHost = \trim($this->sHost);
			$sUrl = $sHost.'/virtual-server/remote.cgi';

			if ($this->oLogger)
			{
				$this->oLogger->Write('Virtualmin[Api Request]: '.$sUrl);
			}
			$sQuery = "wget -O - --quiet --http-user=$this->sAdminUser --http-passwd=$this->sAdminPassword --no-check-certificate '$sUrl?program=modify-user&domain=$sEmailDomain&pass=$sNewPassword&user=$sEmailUser'";
			//$this->oLogger->Write('Virtualmin[Api Request Call]: '.$sQuery);
			$sResult = shell_exec($sQuery);
			
			$iPos = strpos($sResult, 'Exit status: ');
			if ($iPos !== false) {
				$sStatus = explode(' ', $sResult);
				$sStatus=\trim(array_pop($sStatus));
				if ($this->oLogger)
				{
					$this->oLogger->Write('Virtualmin: Status: '.$sStatus);
				}
				if($sStatus=='0'){
					$bResult = true;
				} 
				else
				{
					if ($this->oLogger)
					{
						$this->oLogger->Write('Virtualmin[Error]: Response: '.$sResult);
					}
				}
			}
		}
		$this->oLogger->Write('Virtualmin: Operation Completed. Check logs for status.');
		return $bResult;
	}
}






















