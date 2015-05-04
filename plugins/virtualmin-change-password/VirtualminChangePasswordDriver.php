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
	* @param string $sUrl
	* @param array $aPost = array()
	* @param string $sCustomUserAgent = 'MailSo Http User Agent (v1)'
	* @param int $iCode = 0
	* @param \MailSo\Log\Logger $oLogger = null
	* @param int $iTimeout = 20
	* @param string $sProxy = ''
	* @param string $sProxyAuth = ''
	*
	* @return string|bool
	*
	* Had to costumize use this as the builtin SendPostRequest in \MailSo\Base\Http had no way of setting CURLOPT_USERPWD
	*/
	public function PostRequest($sUrl, $aPost = array(), $sAdminUser, $sAdminPassword, $sCustomUserAgent = 'Rainloop Http User Agent (v1)', &$iCode = 0,
	$oLogger = null, $iTimeout = 20, $sProxy = '', $sProxyAuth = '')
	{
		
		$oLogger->Write('Virtualmin: Inside function: ');
		$aOptions = array(
		CURLOPT_URL => $sUrl,
		CURLOPT_HEADER => false,
		CURLOPT_FAILONERROR => true,
		CURLOPT_SSL_VERIFYPEER => false,
		CURLOPT_RETURNTRANSFER => true,
		CURLOPT_POST => true,
		CURLOPT_POSTFIELDS => \http_build_query($aPost, '', '&'),
		CURLOPT_TIMEOUT => (int) $iTimeout
		);
		
		if ($oLogger)
		{
			$oLogger->Write('Virtualmin: Inside function2: ');
		}

		if (0 < \strlen($sAdminUser) && 0 < \strlen($sAdminPassword))
		{
			$aOptions[CURLOPT_USERPWD] = $sAdminUser.':'.$sAdminPassword;
		}
		
		if (0 < \strlen($sCustomUserAgent))
		{
			$aOptions[CURLOPT_USERAGENT] = $sCustomUserAgent;
		}

		if (0 < \strlen($sProxy))
		{
			$aOptions[CURLOPT_PROXY] = $sProxy;
			if (0 < \strlen($sProxyAuth))
			{
				$aOptions[CURLOPT_PROXYUSERPWD] = $sProxyAuth;
			}
		}
		if ($oLogger)
		{
			$oLogger->Write('Virtualmin: before init: ');
		}
		$oCurl = \curl_init();
		\curl_setopt_array($oCurl, $aOptions);

		if ($oLogger)
		{
			$oLogger->Write('cURL: Send post request: '.$sUrl);
		}

		$mResult = \curl_exec($oCurl);

		$iCode = (int) \curl_getinfo($oCurl, CURLINFO_HTTP_CODE);
		$sContentType = (string) \curl_getinfo($oCurl, CURLINFO_CONTENT_TYPE);

		if ($oLogger)
		{
			$oLogger->Write('cURL: Post request result: (Status: '.$iCode.', ContentType: '.$sContentType.')');
			if (false === $mResult || 200 !== $iCode)
			{
				$oLogger->Write('cURL: Error: '.\curl_error($oCurl), \MailSo\Log\Enumerations\Type::WARNING);
			}
		}

		if (\is_resource($oCurl))
		{
			\curl_close($oCurl);
		}

		return $mResult;
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
				$this->oLogger->Write('Virtualmin:[Check] Required Fields Present');
			}
			$sEmail = \trim(\strtolower($oAccount->Email()));
			$sEmailUser = \MailSo\Base\Utils::GetAccountNameFromEmail($sEmail);
			$sEmailDomain = \MailSo\Base\Utils::GetDomainFromEmail($sEmail);
			$sHost = \trim($this->sHost);
			$sUrl = $sHost.'/virtual-server/remote.cgi';
			$sAdminUser = $this->sAdminUser;
			$sAdminPassword=$this->sAdminPassword;

			$iCode = 0;
			
			$aPost = array(
			'user'         	=> $sEmailUser,
			'pass'   		=> $sNewPassword,
			'domain'  	   	=> $sEmailDomain,
			'program'     	=> 'modify-user'
			);
			
			$aOptions = array(
			CURLOPT_URL => $sUrl,
			CURLOPT_HEADER => false,
			CURLOPT_FAILONERROR => true,
			CURLOPT_SSL_VERIFYPEER => false,
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_POST => true,
			CURLOPT_POSTFIELDS => http_build_query($aPost, '', '&'),
			CURLOPT_TIMEOUT => 20,
			CURLOPT_SSL_VERIFYHOST => false,
			CURLOPT_USERPWD => $sAdminUser.':'.$sAdminPassword
			);
			
			$oCurl = \curl_init();
			\curl_setopt_array($oCurl, $aOptions);
			
			if ($this->oLogger)
			{
				$this->oLogger->Write('Virtualmin: Send post request: '.$sUrl);
			}
			
			$mResult = \curl_exec($oCurl);
			
			$iCode = (int) \curl_getinfo($oCurl, CURLINFO_HTTP_CODE);
			$sContentType = (string) \curl_getinfo($oCurl, CURLINFO_CONTENT_TYPE);
			
			if ($this->oLogger)
			{
				$this->oLogger->Write('Virtualmin: Post request result: (Status: '.$iCode.', ContentType: '.$sContentType.')');
				if (false === $mResult || 200 !== $iCode)
				{
					$this->oLogger->Write('Virtualmin: Error: '.\curl_error($oCurl), \MailSo\Log\Enumerations\Type::WARNING);
				}
			}

			if (\is_resource($oCurl))
			{
				\curl_close($oCurl);
			}
			
			if (false !== $mResult && 200 === $iCode)
			{
				$aRes = null;
				@\parse_str($mResult, $aRes);
				if (is_array($aRes) && (!isset($aRes['error']) || (int) $aRes['error'] !== 1))
				{
					$iPos = strpos($mResult, 'Exit status: ');
					if ($iPos !== false) {
						$sStatus = explode(' ', $mResult);
						$sStatus=\trim(array_pop($sStatus));
						
						if($sStatus=='0'){
							if ($this->oLogger)
							{
								$this->oLogger->Write('Virtualmin: Password Change Status: Success');
							}
							$bResult = true;
						} 
						else
						{
							if ($this->oLogger)
							{
								$this->oLogger->Write('Virtualmin[Error]: Response: '.$mResult);
							}
						}
					}
				}
				else
				{
					if ($this->oLogger)
					{
						$this->oLogger->Write('Virtualmin[Error]: Response: '.$mResult);
					}
				}
			}
			else
			{
				if ($this->oLogger)
				{
					$this->oLogger->Write('Virtualmin[Error]: Empty Response: Code:'.$iCode);
				}
			}
		}
		return $bResult;
	}
}
