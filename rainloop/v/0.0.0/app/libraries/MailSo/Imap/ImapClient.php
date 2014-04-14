<?php

namespace MailSo\Imap;

/**
 * @category MailSo
 * @package Imap
 */
class ImapClient extends \MailSo\Net\NetClient
{
	/**
	 * @var string
	 */
	const TAG_PREFIX = 'TAG';

	/**
	 * @var int
	 */
	private $iResponseBufParsedPos;

	/**
	 * @var int
	 */
	private $iTagCount;

	/**
	 * @var array
	 */
	private $aCapabilityItems;

	/**
	 * @var \MailSo\Imap\FolderInformation
	 */
	private $oCurrentFolderInfo;

	/**
	 * @var array
	 */
	private $aLastResponse;

	/**
	 * @var array
	 */
	private $aFetchCallbacks;

	/**
	 * @var bool
	 */
	private $bNeedNext;

	/**
	 * @var array
	 */
	private $aPartialResponses;

	/**
	 * @var array
	 */
	private $aTagTimeouts;

	/**
	 * @var bool
	 */
	private $bIsLoggined;

	/**
	 * @var bool
	 */
	private $bIsSelected;

	/**
	 * @var string
	 */
	private $sLogginedUser;

	/**
	 * @var bool
	 */
	public $__FORCE_SELECT_ON_EXAMINE__;

	/**
	 * @access protected
	 */
	protected function __construct()
	{
		parent::__construct();

		$this->iTagCount = 0;
		$this->aCapabilityItems = null;
		$this->oCurrentFolderInfo = null;
		$this->aFetchCallbacks = null;
		$this->iResponseBufParsedPos = 0;

		$this->aLastResponse = array();
		$this->bNeedNext = true;
		$this->aPartialResponses = array();

		$this->aTagTimeouts = array();

		$this->bIsLoggined = false;
		$this->bIsSelected = false;
		$this->sLogginedUser = '';

		$this->__FORCE_SELECT_ON_EXAMINE__ = false;

		@\ini_set('xdebug.max_nesting_level', 500);
	}

	/**
	 * @return \MailSo\Imap\ImapClient
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @return string
	 */
	public function GetLogginedUser()
	{
		return $this->sLogginedUser;
	}

	/**
	 * @param string $sServerName
	 * @param int $iPort = 143
	 * @param int $iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function Connect($sServerName, $iPort = 143,
		$iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT)
	{
		$this->aTagTimeouts['*'] = \microtime(true);

		parent::Connect($sServerName, $iPort, $iSecurityType);

		$this->parseResponseWithValidation('*', true);

		if (\MailSo\Net\Enumerations\ConnectionSecurityType::UseStartTLS(
			$this->IsSupported('STARTTLS'), $this->iSecurityType))
		{
			$this->SendRequestWithCheck('STARTTLS');
			if (!@\stream_socket_enable_crypto($this->rConnect, true, STREAM_CRYPTO_METHOD_TLS_CLIENT))
			{
				$this->writeLogException(
					new \MailSo\Imap\Exceptions\RuntimeException('Cannot enable STARTTLS'),
					\MailSo\Log\Enumerations\Type::ERROR, true);
			}

			$this->aCapabilityItems = null;
		}
		else if (\MailSo\Net\Enumerations\ConnectionSecurityType::STARTTLS === $this->iSecurityType)
		{
			$this->writeLogException(
				new \MailSo\Net\Exceptions\SocketUnsuppoterdSecureConnectionException('STARTTLS is not supported'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		return $this;
	}

	/**
	 * @param string $sLogin
	 * @param string $sPassword
	 * @param string $sProxyAuthUser = ''
	 * @param bool $bUseAuthPlainIfSupported = false
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function Login($sLogin, $sPassword, $sProxyAuthUser = '', $bUseAuthPlainIfSupported = false)
	{
		if (!\MailSo\Base\Validator::NotEmptyString($sLogin, true) ||
			!\MailSo\Base\Validator::NotEmptyString($sPassword, true))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$sLogin = \trim($sLogin);
		$sPassword = $sPassword;

		$this->sLogginedUser = $sLogin;

		try
		{
			if ($bUseAuthPlainIfSupported && $this->IsSupported('AUTH=PLAIN'))
			{
				if ($this->oLogger)
				{
					$this->oLogger->AddSecret(\base64_encode("\0".$sLogin."\0".$sPassword));
				}

				$this->SendRequestWithCheck('AUTHENTICATE',
					array('PLAIN', \base64_encode("\0".$sLogin."\0".$sPassword)));
			}
			else
			{
				if ($this->oLogger)
				{
					$this->oLogger->AddSecret($this->EscapeString($sLogin));
					$this->oLogger->AddSecret($this->EscapeString($sPassword));
				}

				$this->SendRequestWithCheck('LOGIN',
					array(
						$this->EscapeString($sLogin),
						$this->EscapeString($sPassword)
					));
			}
//			else
//			{
//				$this->writeLogException(
//					new \MailSo\Imap\Exceptions\LoginBadMethodException(),
//					\MailSo\Log\Enumerations\Type::NOTICE, true);
//			}

			if (0 < \strlen($sProxyAuthUser))
			{
				$this->SendRequestWithCheck('PROXYAUTH', array($this->EscapeString($sProxyAuthUser)));
			}
		}
		catch (\MailSo\Imap\Exceptions\NegativeResponseException $oException)
		{
			$this->writeLogException(
				new \MailSo\Imap\Exceptions\LoginBadCredentialsException(
					$oException->GetResponses(), '', 0, $oException),
				\MailSo\Log\Enumerations\Type::NOTICE, true);
		}

		$this->bIsLoggined = true;
		$this->aCapabilityItems = null;

		return $this;
	}

	/**
	 * @param string $sXOAuth2Token
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function LoginWithXOauth2($sXOAuth2Token)
	{
		if (!\MailSo\Base\Validator::NotEmptyString($sXOAuth2Token, true))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		if (!$this->IsSupported('AUTH=XOAUTH2'))
		{
			$this->writeLogException(
				new \MailSo\Imap\Exceptions\LoginBadMethodException(),
				\MailSo\Log\Enumerations\Type::NOTICE, true);
		}

		try
		{
			$this->SendRequestWithCheck('AUTHENTICATE', array('XOAUTH2', trim($sXOAuth2Token)));
		}
		catch (\MailSo\Imap\Exceptions\NegativeResponseException $oException)
		{
			$this->writeLogException(
				new \MailSo\Imap\Exceptions\LoginBadCredentialsException(
					$oException->GetResponses(), '', 0, $oException),
				\MailSo\Log\Enumerations\Type::NOTICE, true);
		}

		$this->bIsLoggined = true;
		$this->aCapabilityItems = null;

		return $this;
	}

	/**
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	public function Logout()
	{
		if ($this->bIsLoggined)
		{
			$this->bIsLoggined = false;
			$this->SendRequestWithCheck('LOGOUT', array());
		}

		return $this;
	}

	/**
	 * @return \MailSo\Imap\ImapClient
	 */
	public function ForceCloseConnection()
	{
		$this->Disconnect();

		return $this;
	}

	/**
	 * @return bool
	 */
	public function IsLoggined()
	{
		return $this->IsConnected() && $this->bIsLoggined;
	}

	/**
	 * @return bool
	 */
	public function IsSelected()
	{
		return $this->IsLoggined() && $this->bIsSelected;
	}

	/**
	 * @return array|null
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function Capability()
	{
		$this->SendRequestWithCheck('CAPABILITY', array(), true);
		return $this->aCapabilityItems;
	}

	/**
	 * @param string $sExtentionName
	 * @return bool
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function IsSupported($sExtentionName)
	{
		$bResult = \MailSo\Base\Validator::NotEmptyString($sExtentionName, true);
		if ($bResult && null === $this->aCapabilityItems)
		{
			$this->aCapabilityItems = $this->Capability();
		}

		return $bResult && is_array($this->aCapabilityItems) &&
			in_array(strtoupper($sExtentionName), $this->aCapabilityItems);
	}

	/**
	 * @return \MailSo\Imap\NamespaceResult|null
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function GetNamespace()
	{
		if (!$this->IsSupported('NAMESPACE'))
		{
			return null;
		}

		$oReturn = false;

		$this->SendRequest('NAMESPACE');
		$aResult = $this->parseResponseWithValidation();

		$oImapResponse = null;
		foreach ($aResult as /* @var $oImapResponse \MailSo\Imap\Response */ $oImapResponse)
		{
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oImapResponse->ResponseType &&
				'NAMESPACE' === $oImapResponse->StatusOrIndex)
			{
				$oReturn = NamespaceResult::NewInstance();
				$oReturn->InitByImapResponse($oImapResponse);
				break;
			}
		}

		if (false === $oReturn)
		{
			$this->writeLogException(
				new \MailSo\Imap\Exceptions\ResponseException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		return $oReturn;
	}

	/**
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function Noop()
	{
		return $this->SendRequestWithCheck('NOOP');
	}

	/**
	 * @param string $sFolderName
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderCreate($sFolderName)
	{
		return $this->SendRequestWithCheck('CREATE',
			array($this->EscapeString($sFolderName)));
	}

	/**
	 * @param string $sFolderName
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderDelete($sFolderName)
	{
		return $this->SendRequestWithCheck('DELETE',
			array($this->EscapeString($sFolderName)));
	}

	/**
	 * @param string $sFolderName
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderSubscribe($sFolderName)
	{
		return $this->SendRequestWithCheck('SUBSCRIBE',
			array($this->EscapeString($sFolderName)));
	}

	/**
	 * @param string $sFolderName
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderUnSubscribe($sFolderName)
	{
		return $this->SendRequestWithCheck('UNSUBSCRIBE',
			array($this->EscapeString($sFolderName)));
	}

	/**
	 * @param string $sOldFolderName
	 * @param string $sNewFolderName
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderRename($sOldFolderName, $sNewFolderName)
	{
		return $this->SendRequestWithCheck('RENAME', array(
			$this->EscapeString($sOldFolderName),
			$this->EscapeString($sNewFolderName)));
	}

	/**
	 * @param array $aResult
	 *
	 * @return array
	 */
	protected function getStatusFolderInformation($aResult)
	{
		$aReturn = array();

		if (is_array($aResult))
		{
			$oImapResponse = null;
			foreach ($aResult as /* @var $oImapResponse \MailSo\Imap\Response */ $oImapResponse)
			{
				if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oImapResponse->ResponseType &&
					'STATUS' === $oImapResponse->StatusOrIndex && isset($oImapResponse->ResponseList[3]) &&
					is_array($oImapResponse->ResponseList[3]))
				{
					$sName = null;
					foreach ($oImapResponse->ResponseList[3] as $sArrayItem)
					{
						if (null === $sName)
						{
							$sName = $sArrayItem;
						}
						else
						{
							$aReturn[$sName] = $sArrayItem;
							$sName = null;
						}
					}
				}
			}
		}

		return $aReturn;
	}

	/**
	 * @param string $sFolderName
	 * @param array $aStatusItems
	 *
	 * @return array|bool
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderStatus($sFolderName, array $aStatusItems)
	{
		$aResult = false;
		if (count($aStatusItems) > 0)
		{
			$this->SendRequest('STATUS',
				array($this->EscapeString($sFolderName), $aStatusItems));

			$aResult = $this->getStatusFolderInformation(
				$this->parseResponseWithValidation());
		}

		return $aResult;
	}

	/**
	 * @param array $aResult
	 * @param bool $bIsSubscribeList
	 *
	 * @return array
	 */
	private function getFoldersFromResult(array $aResult, $sStatus, $bUseListStatus = false)
	{
		$aReturn = array();

		$oImapResponse = null;
		foreach ($aResult as /* @var $oImapResponse \MailSo\Imap\Response */ $oImapResponse)
		{
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oImapResponse->ResponseType &&
				$sStatus === $oImapResponse->StatusOrIndex && 5 === count($oImapResponse->ResponseList))
			{
				try
				{
					$oFolder = Folder::NewInstance($oImapResponse->ResponseList[4],
						$oImapResponse->ResponseList[3], $oImapResponse->ResponseList[2]);

					$aReturn[] = $oFolder;
				}
				catch (\MailSo\Base\Exceptions\InvalidArgumentException $oException)
				{
					$this->writeLogException($oException, \MailSo\Log\Enumerations\Type::WARNING, false);
				}
			}
		}
		
		if ($bUseListStatus)
		{
			foreach ($aResult as /* @var $oImapResponse \MailSo\Imap\Response */ $oImapResponse)
			{
				if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oImapResponse->ResponseType &&
					'STATUS' === $oImapResponse->StatusOrIndex && 
					isset($oImapResponse->ResponseList[2]) &&
					isset($oImapResponse->ResponseList[3]) &&
					\is_array($oImapResponse->ResponseList[3]))
				{
					$sFolderNameRaw = $oImapResponse->ResponseList[2];
					
					$oCurrentFolder = null;
					foreach ($aReturn as &$oFolder)
					{
						if ($oFolder && $sFolderNameRaw === $oFolder->FullNameRaw())
						{
							$oCurrentFolder =& $oFolder;
							break;
						}
					}
					
					if (null !== $oCurrentFolder)
					{
						$sName = null;
						$aStatus = array();
						foreach ($oImapResponse->ResponseList[3] as $sArrayItem)
						{
							if (null === $sName)
							{
								$sName = $sArrayItem;
							}
							else
							{
								$aStatus[$sName] = $sArrayItem;
								$sName = null;
							}
						}
						
						if (0 < count($aStatus))
						{
							$oCurrentFolder->SetExtended('STATUS', $aStatus);
						}
					}
					
					unset($oCurrentFolder);
				}
			}
		}

		return $aReturn;
	}

	/**
	 * @param bool $bIsSubscribeList
	 * @param string $sParentFolderName = ''
	 * @param string $sListPattern = '*'
	 *
	 * @return array
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	private function specificFolderList($bIsSubscribeList, $sParentFolderName = '', $sListPattern = '*', $bUseListStatus = false)
	{
		$sCmd = 'LSUB';
		if (!$bIsSubscribeList)
		{
			if ($bUseListStatus)
			{
				$bUseListStatus = $this->IsSupported('LIST-STATUS');
			}

			$sCmd = (!$bUseListStatus && $this->IsSupported('XLIST') && !$this->IsSupported('LIST-EXTENDED')) ? 'XLIST' : 'LIST';
		}
		
		$sListPattern = 0 === strlen(trim($sListPattern)) ? '*' : $sListPattern;
		
		$aParameters = array(
			$this->EscapeString($sParentFolderName),
			$this->EscapeString($sListPattern)
		);
		
		if ($bUseListStatus)
		{
			$aParameters[] = 'RETURN';
			$aParameters[] = array(
				 'STATUS',
				 array(
					\MailSo\Imap\Enumerations\FolderStatus::MESSAGES,
					\MailSo\Imap\Enumerations\FolderStatus::UNSEEN,
					\MailSo\Imap\Enumerations\FolderStatus::UIDNEXT
				 )
			);
		}
		
		$this->SendRequest($sCmd, $aParameters);

		return $this->getFoldersFromResult(
			$this->parseResponseWithValidation(), $sCmd, $bUseListStatus);
	}

	/**
	 * @param string $sParentFolderName = ''
	 * @param string $sListPattern = '*'
	 *
	 * @return array
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderList($sParentFolderName = '', $sListPattern = '*')
	{
		return $this->specificFolderList(false, $sParentFolderName, $sListPattern);
	}

	/**
	 * @param string $sParentFolderName = ''
	 * @param string $sListPattern = '*'
	 *
	 * @return array
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderSubscribeList($sParentFolderName = '', $sListPattern = '*')
	{
		return $this->specificFolderList(true, $sParentFolderName, $sListPattern);
	}

	/**
	 * @param string $sParentFolderName = ''
	 * @param string $sListPattern = '*'
	 *
	 * @return array
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderStatusList($sParentFolderName = '', $sListPattern = '*')
	{
		return $this->specificFolderList(false, $sParentFolderName, $sListPattern, true);
	}

	/**
	 * @param array $aResult
	 * @param string $sFolderName
	 * @param bool $bIsWritable
	 *
	 * @return void
	 */
	protected function initCurrentFolderInformation($aResult, $sFolderName, $bIsWritable)
	{
		if (is_array($aResult))
		{
			$oImapResponse = null;
			$oResult = FolderInformation::NewInstance($sFolderName, $bIsWritable);

			foreach ($aResult as /* @var $oImapResponse \MailSo\Imap\Response */ $oImapResponse)
			{
				if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oImapResponse->ResponseType)
				{
					if (count($oImapResponse->ResponseList) > 2 &&
						'FLAGS' === $oImapResponse->ResponseList[1] && is_array($oImapResponse->ResponseList[2]))
					{
						$oResult->Flags = $oImapResponse->ResponseList[2];
					}

					if (is_array($oImapResponse->OptionalResponse) && count($oImapResponse->OptionalResponse) > 1)
					{
						if ('PERMANENTFLAGS' === $oImapResponse->OptionalResponse[0] &&
							is_array($oImapResponse->OptionalResponse[1]))
						{
							$oResult->PermanentFlags = $oImapResponse->OptionalResponse[1];
						}
						else if ('UIDVALIDITY' === $oImapResponse->OptionalResponse[0] &&
							isset($oImapResponse->OptionalResponse[1]))
						{
							$oResult->Uidvalidity = $oImapResponse->OptionalResponse[1];
						}
						else if ('UNSEEN' === $oImapResponse->OptionalResponse[0] &&
							isset($oImapResponse->OptionalResponse[1]) &&
							is_numeric($oImapResponse->OptionalResponse[1]))
						{
							$oResult->Unread = (int) $oImapResponse->OptionalResponse[1];
						}
						else if ('UIDNEXT' === $oImapResponse->OptionalResponse[0] &&
							isset($oImapResponse->OptionalResponse[1]))
						{
							$oResult->Uidnext = $oImapResponse->OptionalResponse[1];
						}
					}

					if (count($oImapResponse->ResponseList) > 2 &&
						is_string($oImapResponse->ResponseList[2]) &&
						is_numeric($oImapResponse->ResponseList[1]))
					{
						switch($oImapResponse->ResponseList[2])
						{
							case 'EXISTS':
								$oResult->Exists = (int) $oImapResponse->ResponseList[1];
								break;
							case 'RECENT':
								$oResult->Recent = (int) $oImapResponse->ResponseList[1];
								break;
						}
					}
				}
			}

			$this->oCurrentFolderInfo = $oResult;
		}
	}

	/**
	 * @param string $sFolderName
	 * @param bool $bIsWritable
	 * @param bool $bReSelectSameFolders
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	protected function selectOrExamineFolder($sFolderName, $bIsWritable, $bReSelectSameFolders)
	{
		if (!$bReSelectSameFolders)
		{
			if ($this->oCurrentFolderInfo &&
				$sFolderName === $this->oCurrentFolderInfo->FolderName &&
				$bIsWritable === $this->oCurrentFolderInfo->IsWritable)
			{
				return $this;
			}
		}

		if (!\MailSo\Base\Validator::NotEmptyString($sFolderName, true))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException();
		}

		$this->SendRequest(($bIsWritable) ? 'SELECT' : 'EXAMINE',
			array($this->EscapeString($sFolderName)));

		$this->initCurrentFolderInformation(
			$this->parseResponseWithValidation(), $sFolderName, $bIsWritable);

		$this->bIsSelected = true;

		return $this;
	}

	/**
	 * @param string $sFolderName
	 * @param bool $bReSelectSameFolders = false
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderSelect($sFolderName, $bReSelectSameFolders = false)
	{
		return $this->selectOrExamineFolder($sFolderName, true, $bReSelectSameFolders);
	}

	/**
	 * @param string $sFolderName
	 * @param bool $bReSelectSameFolders = false
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderExamine($sFolderName, $bReSelectSameFolders = false)
	{
		return $this->selectOrExamineFolder($sFolderName, $this->__FORCE_SELECT_ON_EXAMINE__, $bReSelectSameFolders);
	}

	/**
	 * @param array $aInputFetchItems
	 * @param string $sIndexRange
	 * @param bool $bIndexIsUid
	 *
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function Fetch(array $aInputFetchItems, $sIndexRange, $bIndexIsUid)
	{
		$sIndexRange = (string) $sIndexRange;
		if (!\MailSo\Base\Validator::NotEmptyString($sIndexRange, true))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$aFetchItems = \MailSo\Imap\Enumerations\FetchType::ChangeFetchItemsBefourRequest($aInputFetchItems);
		foreach ($aFetchItems as $sName => $mItem)
		{
			if (0 < strlen($sName) && '' !== $mItem)
			{
				if (null === $this->aFetchCallbacks)
				{
					$this->aFetchCallbacks = array();
				}

				$this->aFetchCallbacks[$sName] = $mItem;
			}
		}

		$this->SendRequest((($bIndexIsUid) ? 'UID ' : '').'FETCH', array($sIndexRange, array_keys($aFetchItems)));
		$aResult = $this->validateResponse($this->parseResponse());
		$this->aFetchCallbacks = null;

		$aReturn = array();
		$oImapResponse = null;
		foreach ($aResult as $oImapResponse)
		{
			if (FetchResponse::IsValidFetchImapResponse($oImapResponse))
			{
				$aReturn[] = FetchResponse::NewInstance($oImapResponse);
			}
		}

		return $aReturn;
	}


	/**
	 * @return array|false
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function Quota()
	{
		$aReturn = false;
		if ($this->IsSupported('QUOTA'))
		{
			$this->SendRequest('GETQUOTAROOT "INBOX"');
			$aResult = $this->parseResponseWithValidation();

			$aReturn = array(0, 0);
			$oImapResponse = null;
			foreach ($aResult as /* @var $oImapResponse \MailSo\Imap\Response */ $oImapResponse)
			{
				if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oImapResponse->ResponseType
					&& 'QUOTA' === $oImapResponse->StatusOrIndex
					&& is_array($oImapResponse->ResponseList)
					&& isset($oImapResponse->ResponseList[3])
					&& is_array($oImapResponse->ResponseList[3])
					&& 2 < count($oImapResponse->ResponseList[3])
					&& 'STORAGE' === strtoupper($oImapResponse->ResponseList[3][0])
					&& is_numeric($oImapResponse->ResponseList[3][1])
					&& is_numeric($oImapResponse->ResponseList[3][2])
				)
				{
					$aReturn = array(
						(int) $oImapResponse->ResponseList[3][1],
						(int) $oImapResponse->ResponseList[3][2],
						0,
						0
					);

					if (5 < count($oImapResponse->ResponseList[3])
						&& 'MESSAGE' === strtoupper($oImapResponse->ResponseList[3][3])
						&& is_numeric($oImapResponse->ResponseList[3][4])
						&& is_numeric($oImapResponse->ResponseList[3][5])
					)
					{
						$aReturn[2] = (int) $oImapResponse->ResponseList[3][4];
						$aReturn[3] = (int) $oImapResponse->ResponseList[3][5];
					}
				}
			}
		}

		return $aReturn;
	}

	/**
	 * @param array $aSortTypes
	 * @param string $sSearchCriterias
	 * @param bool $bReturnUid
	 *
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageSimpleSort($aSortTypes, $sSearchCriterias = 'ALL', $bReturnUid = true)
	{
		$sCommandPrefix = ($bReturnUid) ? 'UID ' : '';
		$sSearchCriterias = !\MailSo\Base\Validator::NotEmptyString($sSearchCriterias, true) || '*' === $sSearchCriterias
			? 'ALL' : $sSearchCriterias;

		if (!is_array($aSortTypes) || 0 === count($aSortTypes))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}
		else if (!$this->IsSupported('SORT'))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$aRequest = array();
		$aRequest[] = $aSortTypes;
		$aRequest[] = \MailSo\Base\Utils::IsAscii($sSearchCriterias) ? 'US-ASCII' : 'UTF-8';
		$aRequest[] = $sSearchCriterias;

		$sCmd = 'SORT';

		$this->SendRequest($sCommandPrefix.$sCmd, $aRequest);
		$aResult = $this->parseResponseWithValidation();

		$aReturn = array();
		$oImapResponse = null;
		foreach ($aResult as /* @var $oImapResponse \MailSo\Imap\Response */ $oImapResponse)
		{
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oImapResponse->ResponseType
				&& ($sCmd === $oImapResponse->StatusOrIndex ||
					($bReturnUid && 'UID' === $oImapResponse->StatusOrIndex) && !empty($oImapResponse->ResponseList[2]) &&
						$sCmd === $oImapResponse->ResponseList[2])
				&& is_array($oImapResponse->ResponseList)
				&& 2 < count($oImapResponse->ResponseList))
			{
				$iStart = 2;
				if ($bReturnUid && 'UID' === $oImapResponse->StatusOrIndex &&
					!empty($oImapResponse->ResponseList[2]) &&
					$sCmd === $oImapResponse->ResponseList[2])
				{
					$iStart = 3;
				}
				
				for ($iIndex = $iStart, $iLen = count($oImapResponse->ResponseList); $iIndex < $iLen; $iIndex++)
				{
					$aReturn[] = (int) $oImapResponse->ResponseList[$iIndex];
				}
			}
		}

		$aReturn = array_reverse($aReturn);
		return $aReturn;
	}

	/**
	 * @param string $sSearchCriterias
	 * @param bool $bReturnUid
	 * @param string $sCharset = ''
	 *
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageSimpleSearch($sSearchCriterias = 'ALL', $bReturnUid = true, $sCharset = '')
	{
		$sCommandPrefix = ($bReturnUid) ? 'UID ' : '';
		$sSearchCriterias = 0 === strlen($sSearchCriterias) || '*' === $sSearchCriterias
			? 'ALL' : $sSearchCriterias;

		$aRequest = array();
		if (0 < strlen($sCharset))
		{
			$aRequest[] = 'CHARSET';
			$aRequest[] = strtoupper($sCharset);
		}

		$aRequest[] = $sSearchCriterias;

		$sCmd = 'SEARCH';

		$this->SendRequest($sCommandPrefix.$sCmd, $aRequest);
		$aResult = $this->parseResponseWithValidation();

		$aReturn = array();
		$oImapResponse = null;
		foreach ($aResult as /* @var $oImapResponse \MailSo\Imap\Response */ $oImapResponse)
		{
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oImapResponse->ResponseType
				&& ($sCmd === $oImapResponse->StatusOrIndex ||
					($bReturnUid && 'UID' === $oImapResponse->StatusOrIndex) && !empty($oImapResponse->ResponseList[2]) &&
						$sCmd === $oImapResponse->ResponseList[2])
				&& is_array($oImapResponse->ResponseList)
				&& 2 < count($oImapResponse->ResponseList))
			{
				$iStart = 2;
				if ($bReturnUid && 'UID' === $oImapResponse->StatusOrIndex &&
					!empty($oImapResponse->ResponseList[2]) &&
					$sCmd === $oImapResponse->ResponseList[2])
				{
					$iStart = 3;
				}

				for ($iIndex = $iStart, $iLen = count($oImapResponse->ResponseList); $iIndex < $iLen; $iIndex++)
				{
					$aReturn[] = (int) $oImapResponse->ResponseList[$iIndex];
				}
			}
		}

		$aReturn = array_reverse($aReturn);
		return $aReturn;
	}

	/**
	 * @param mixed $aValue
	 *
	 * @return mixed
	 */
	private function validateThreadItem($aValue)
	{
		$mResult = false;
		if (\is_numeric($aValue))
		{
			$mResult = (int) $aValue;
			if (0 >= $mResult)
			{
				$mResult = false;
			}
		}
		else if (\is_array($aValue))
		{
			if (1 === \count($aValue) && \is_numeric($aValue[0]))
			{
				$mResult = (int) $aValue[0];
				if (0 >= $mResult)
				{
					$mResult = false;
				}
			}
			else
			{
				$mResult = array();
				foreach ($aValue as $aValueItem)
				{
					$mTemp = $this->validateThreadItem($aValueItem);
					if (false !== $mTemp)
					{
						$mResult[] = $mTemp;
					}
				}
			}
		}

		return $mResult;
	}

	/**
	 * @param string $sSearchCriterias = 'ALL'
	 * @param bool $bReturnUid = true
	 * @param string $sCharset = \MailSo\Base\Enumerations\Charset::UTF_8
	 *
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageSimpleThread($sSearchCriterias = 'ALL', $bReturnUid = true, $sCharset = \MailSo\Base\Enumerations\Charset::UTF_8)
	{
		$sCommandPrefix = ($bReturnUid) ? 'UID ' : '';
		$sSearchCriterias = !\MailSo\Base\Validator::NotEmptyString($sSearchCriterias, true) || '*' === $sSearchCriterias
			? 'ALL' : $sSearchCriterias;

		$sThreadType = '';
		switch (true)
		{
			case $this->IsSupported('THREAD=REFS'):
				$sThreadType = 'REFS';
				break;
			case $this->IsSupported('THREAD=REFERENCES'):
				$sThreadType = 'REFERENCES';
				break;
			case $this->IsSupported('THREAD=ORDEREDSUBJECT'):
				$sThreadType = 'ORDEREDSUBJECT';
				break;
			default:
				$this->writeLogException(
					new Exceptions\RuntimeException('Thread is not supported'),
					\MailSo\Log\Enumerations\Type::ERROR, true);
				break;
		}

		$aRequest = array();
		$aRequest[] = $sThreadType;
		$aRequest[] = strtoupper($sCharset);
		$aRequest[] = $sSearchCriterias;

		$sCmd = 'THREAD';

		$this->SendRequest($sCommandPrefix.$sCmd, $aRequest);
		$aResult = $this->parseResponseWithValidation();

		$aReturn = array();
		$oImapResponse = null;

		foreach ($aResult as /* @var $oImapResponse \MailSo\Imap\Response */ $oImapResponse)
		{
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oImapResponse->ResponseType
				&& ($sCmd === $oImapResponse->StatusOrIndex ||
					($bReturnUid && 'UID' === $oImapResponse->StatusOrIndex) && !empty($oImapResponse->ResponseList[2]) &&
						$sCmd === $oImapResponse->ResponseList[2])
				&& is_array($oImapResponse->ResponseList)
				&& 2 < count($oImapResponse->ResponseList))
			{
				$iStart = 2;
				if ($bReturnUid && 'UID' === $oImapResponse->StatusOrIndex &&
					!empty($oImapResponse->ResponseList[2]) &&
					$sCmd === $oImapResponse->ResponseList[2])
				{
					$iStart = 3;
				}
				
				for ($iIndex = $iStart, $iLen = count($oImapResponse->ResponseList); $iIndex < $iLen; $iIndex++)
				{
					$aNewValue = $this->validateThreadItem($oImapResponse->ResponseList[$iIndex]);
					if (false !== $aNewValue)
					{
						$aReturn[] = $aNewValue;
					}
				}
			}
		}

		return $aReturn;
	}

	/**
	 * @param string $sToFolder
	 * @param string $sIndexRange
	 * @param bool $bIndexIsUid
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageCopy($sToFolder, $sIndexRange, $bIndexIsUid)
	{
		if (0 === strlen($sIndexRange))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$sCommandPrefix = ($bIndexIsUid) ? 'UID ' : '';
		return $this->SendRequestWithCheck($sCommandPrefix.'COPY',
			array($sIndexRange, $this->EscapeString($sToFolder)));
	}
	
	/**
	 * @param string $sToFolder
	 * @param string $sIndexRange
	 * @param bool $bIndexIsUid
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageMove($sToFolder, $sIndexRange, $bIndexIsUid)
	{
		if (0 === strlen($sIndexRange))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		if (!$this->IsSupported('MOVE'))
		{
			$this->writeLogException(
				new Exceptions\RuntimeException('Move is not supported'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$sCommandPrefix = ($bIndexIsUid) ? 'UID ' : '';
		return $this->SendRequestWithCheck($sCommandPrefix.'MOVE',
			array($sIndexRange, $this->EscapeString($sToFolder)));
	}

	/**
	 * @param string $sUidRangeIfSupported
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageExpunge($sUidRangeIfSupported = '', $bForceUidExpunge = false)
	{
		$sUidRangeIfSupported = trim($sUidRangeIfSupported);

		$sCmd = 'EXPUNGE';
		$aArguments = array();

		if ($bForceUidExpunge && 0 < strlen($sUidRangeIfSupported) && $this->IsSupported('UIDPLUS'))
		{
			$sCmd = 'UID '.$sCmd;
			$aArguments = array($sUidRangeIfSupported);
		}

		return $this->SendRequestWithCheck($sCmd, $aArguments);
	}

	/**
	 * @param string $sIndexRange
	 * @param bool $bIndexIsUid
	 * @param array $aInputStoreItems
	 * @param string $sStoreAction
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageStoreFlag($sIndexRange, $bIndexIsUid, $aInputStoreItems, $sStoreAction)
	{
		if (!\MailSo\Base\Validator::NotEmptyString($sIndexRange, true) ||
			!\MailSo\Base\Validator::NotEmptyString($sStoreAction, true) ||
			0 === count($aInputStoreItems))
		{
			return false;
		}

		$sCmd = ($bIndexIsUid) ? 'UID STORE' : 'STORE';
		return $this->SendRequestWithCheck($sCmd,
			array($sIndexRange, $sStoreAction, $aInputStoreItems));
	}

	/**
	 * @param string $sFolderName
	 * @param resource $rMessageAppendStream
	 * @param int $iStreamSize
	 * @param array	$aAppendFlags = null
	 * @param int $iUid = null
	 * @param int $sDateTime = 0
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageAppendStream($sFolderName, $rMessageAppendStream, $iStreamSize, $aAppendFlags = null, &$iUid = null, $sDateTime = 0)
	{
		$aData = array($this->EscapeString($sFolderName), $aAppendFlags);
		if (0 < $sDateTime)
		{
			$aData[] = $this->EscapeString(\gmdate('d-M-Y H:i:s', $sDateTime).' +0000');
		}

		$aData[] = '{'.$iStreamSize.'}';

		$this->SendRequest('APPEND', $aData);
		$this->parseResponseWithValidation();

		$this->writeLog('Write to connection stream', \MailSo\Log\Enumerations\Type::NOTE);

		\MailSo\Base\Utils::MultipleStreamWriter($rMessageAppendStream, array($this->rConnect));

		$this->sendRaw('');
		$this->parseResponseWithValidation();

		if (null !== $iUid)
		{
			$aLastResponse = $this->GetLastResponse();
			if (is_array($aLastResponse) && 0 < count($aLastResponse) && $aLastResponse[count($aLastResponse) - 1])
			{
				$oLast = $aLastResponse[count($aLastResponse) - 1];
				if ($oLast && \MailSo\Imap\Enumerations\ResponseType::TAGGED === $oLast->ResponseType && is_array($oLast->OptionalResponse))
				{
					if (0 < strlen($oLast->OptionalResponse[0]) &&
						0 < strlen($oLast->OptionalResponse[2]) &&
						'APPENDUID' === strtoupper($oLast->OptionalResponse[0]) &&
						is_numeric($oLast->OptionalResponse[2])
					)
					{
						$iUid = (int) $oLast->OptionalResponse[2];
					}
				}
			}
		}

		return $this;
	}

	/**
	 * @return \MailSo\Imap\FolderInformation
	 */
	public function FolderCurrentInformation()
	{
		return $this->oCurrentFolderInfo;
	}

	/**
	 * @param string $sCommand
	 * @param array $aParams = array()
	 *
	 * @return void
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	public function SendRequest($sCommand, $aParams = array())
	{
		if (!\MailSo\Base\Validator::NotEmptyString($sCommand, true) || !is_array($aParams))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->IsConnected(true);

		$sTag = $this->getNewTag();

		$sCommand = trim($sCommand);
		$sRealCommand = $sTag.' '.$sCommand.$this->prepearParamLine($aParams);

		$sFakeCommand = '';
		$aFakeParams = $this->secureRequestParams($sCommand, $aParams);
		if (null !== $aFakeParams)
		{
			$sFakeCommand = $sTag.' '.$sCommand.$this->prepearParamLine($aFakeParams);
		}

		$this->aTagTimeouts[$sTag] = microtime(true);
		$this->sendRaw($sRealCommand, true, $sFakeCommand);
	}

	/**
	 * @param string $sCommand
	 * @param array $aParams
	 *
	 * @return array|null
	 */
	private function secureRequestParams($sCommand, $aParams)
	{
		$aResult = null;
		switch ($sCommand)
		{
			case 'LOGIN':
				$aResult = $aParams;
				if (is_array($aResult) && 2 === count($aResult))
				{
					$aResult[1] = '"*******"';
				}
				break;
		}

		return $aResult;
	}

	/**
	 * @param string $sCommand
	 * @param array $aParams = array()
	 * @param bool $bFindCapa = false
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function SendRequestWithCheck($sCommand, $aParams = array(), $bFindCapa = false)
	{
		$this->SendRequest($sCommand, $aParams);
		$this->parseResponseWithValidation(null, $bFindCapa);

		return $this;
	}

	/**
	 * @return array
	 */
	public function GetLastResponse()
	{
		return $this->aLastResponse;
	}

	/**
	 * @param mixed $aResult
	 *
	 * @return array
	 *
	 * @throws \MailSo\Imap\Exceptions\ResponseNotFoundException
	 * @throws \MailSo\Imap\Exceptions\InvalidResponseException
	 * @throws \MailSo\Imap\Exceptions\NegativeResponseException
	 */
	private function validateResponse($aResult)
	{
		if (!is_array($aResult) || 0 === $iCnt = count($aResult))
		{
			$this->writeLogException(
				new Exceptions\ResponseNotFoundException(),
				\MailSo\Log\Enumerations\Type::WARNING, true);
		}

		if ($aResult[$iCnt - 1]->ResponseType !== \MailSo\Imap\Enumerations\ResponseType::CONTINUATION)
		{
			if (!$aResult[$iCnt - 1]->IsStatusResponse)
			{
				$this->writeLogException(
					new Exceptions\InvalidResponseException($aResult),
					\MailSo\Log\Enumerations\Type::WARNING, true);
			}

			if (\MailSo\Imap\Enumerations\ResponseStatus::OK !== $aResult[$iCnt - 1]->StatusOrIndex)
			{
				$this->writeLogException(
					new Exceptions\NegativeResponseException($aResult),
					\MailSo\Log\Enumerations\Type::WARNING, true);
			}
		}

		return $aResult;
	}

	/**
	 * @param string $sEndTag = null
	 * @param bool $bFindCapa = false
	 *
	 * @return array|bool
	 */
	protected function parseResponse($sEndTag = null, $bFindCapa = false)
	{
		if (is_resource($this->rConnect))
		{
			$oImapResponse = null;
			$sEndTag = (null === $sEndTag) ? $this->getCurrentTag() : $sEndTag;
			while (true)
			{
				$oImapResponse = Response::NewInstance();

				$this->partialParseResponseBranch($oImapResponse);

				if ($oImapResponse)
				{
					if (\MailSo\Imap\Enumerations\ResponseType::UNKNOWN === $oImapResponse->ResponseType)
					{
						return false;
					}

					if ($bFindCapa)
					{
//						$this->oLogger->WriteDump($oImapResponse);
						$this->initCapabilityImapResponse($oImapResponse);
					}

					$this->aPartialResponses[] = $oImapResponse;
					if ($sEndTag === $oImapResponse->Tag || \MailSo\Imap\Enumerations\ResponseType::CONTINUATION === $oImapResponse->ResponseType)
					{
						if (isset($this->aTagTimeouts[$sEndTag]))
						{
							$this->writeLog((microtime(true) - $this->aTagTimeouts[$sEndTag]).' ('.$sEndTag.')',
								\MailSo\Log\Enumerations\Type::TIME);

							unset($this->aTagTimeouts[$sEndTag]);
						}

						break;
					}
				}
				else
				{
					return false;
				}

				unset($oImapResponse);
			}
		}

		$this->iResponseBufParsedPos = 0;
		$this->aLastResponse = $this->aPartialResponses;
		$this->aPartialResponses = array();

		return $this->aLastResponse;
	}

	/**
	 * @param string $sEndTag = null
	 * @param bool $bFindCapa = false
	 *
	 * @return array
	 */
	private function parseResponseWithValidation($sEndTag = null, $bFindCapa = false)
	{
		return $this->validateResponse($this->parseResponse($sEndTag, $bFindCapa));
	}

	/**
	 * @param \MailSo\Imap\Response $oImapResponse
	 *
	 * @return void
	 */
	private function initCapabilityImapResponse($oImapResponse)
	{
		if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oImapResponse->ResponseType
			&& is_array($oImapResponse->ResponseList))
		{
			$aList = null;
			if (isset($oImapResponse->ResponseList[1]) && is_string($oImapResponse->ResponseList[1]) &&
				'CAPABILITY' === strtoupper($oImapResponse->ResponseList[1]))
			{
				$aList = array_slice($oImapResponse->ResponseList, 2);
			}
			else if ($oImapResponse->OptionalResponse && is_array($oImapResponse->OptionalResponse) &&
				1 < count($oImapResponse->OptionalResponse) && is_string($oImapResponse->OptionalResponse[0]) &&
				'CAPABILITY' === strtoupper($oImapResponse->OptionalResponse[0]))
			{
				$aList = array_slice($oImapResponse->OptionalResponse, 1);
			}

			if (is_array($aList) && 0 < count($aList))
			{
				$this->aCapabilityItems = array_map('strtoupper', $aList);
			}
		}
	}

	/**
	 * @return array|string
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	private function partialParseResponseBranch(&$oImapResponse, $iStackIndex = -1,
		$bTreatAsAtom = false, $sParentToken = '')
	{
		$mNull = null;

		$iStackIndex++;
		$iPos = $this->iResponseBufParsedPos;

		$sPreviousAtomUpperCase = null;
		$bIsEndOfList = false;
		$bIsClosingBracketSquare = false;
		$iLiteralLen = 0;
		$iBufferEndIndex = 0;
		$iTimer = 0;

		$rImapLiteralStream = null;

		$bIsGotoDefault = false;
		$bIsGotoLiteral = false;
		$bIsGotoLiteralEnd = false;
		$bIsGotoAtomBracket = false;
		$bIsGotoNotAtomBracket = false;

		$bCountOneInited = false;
		$bCountTwoInited = false;

		$sAtomBuilder = $bTreatAsAtom ? '' : null;
		$aList = array();
		if (null !== $oImapResponse)
		{
			$aList =& $oImapResponse->ResponseList;
		}

		while (!$bIsEndOfList)
		{
			if ($this->bNeedNext)
			{
				$iPos = 0;
				$this->getNextBuffer();
				$this->iResponseBufParsedPos = $iPos;
				$this->bNeedNext = false;
			}

			$sChar = null;
			if ($bIsGotoDefault)
			{
				$sChar = 'GOTO_DEFAULT';
				$bIsGotoDefault = false;
			}
			else if ($bIsGotoLiteral)
			{
				$bIsGotoLiteral = false;
				$bIsGotoLiteralEnd = true;

				if ($this->partialResponseLiteralCallbackCallable(
					$sParentToken, null === $sPreviousAtomUpperCase ? '' : \strtoupper($sPreviousAtomUpperCase), $this->rConnect, $iLiteralLen))
				{
					if (!$bTreatAsAtom)
					{
						$aList[] = '';
					}
				}
				else
				{
					$sLiteral = '';
					$iRead = $iLiteralLen;

					while (0 < $iRead)
					{
						$sAddRead = \fread($this->rConnect, $iRead);
						if (false === $sAddRead)
						{
							$sLiteral = false;
							break;
						}

						$sLiteral .= $sAddRead;
						$iRead -= \strlen($sAddRead);

						\MailSo\Base\Utils::ResetTimeLimit($iTimer);
					}

					if (false !== $sLiteral)
					{
						$iLiteralSize = \strlen($sLiteral);
						\MailSo\Base\Loader::IncStatistic('NetRead', $iLiteralSize);
						if ($iLiteralLen !== $iLiteralSize)
						{
							$this->writeLog('Literal stream read warning "read '.$iLiteralSize.' of '.
								$iLiteralLen.'" bytes', \MailSo\Log\Enumerations\Type::WARNING);
						}

						if (!$bTreatAsAtom)
						{
							$aList[] = $sLiteral;
						}
					}
					else
					{
						$this->writeLog('Can\'t read imap stream', \MailSo\Log\Enumerations\Type::NOTE);
					}

					unset($sLiteral);
				}

				continue;
			}
			else if ($bIsGotoLiteralEnd)
			{
				$rImapLiteralStream = null;
				$sPreviousAtomUpperCase = null;
				$this->bNeedNext = true;
				$bIsGotoLiteralEnd = false;

				continue;
			}
			else if ($bIsGotoAtomBracket)
			{
				if ($bTreatAsAtom)
				{
					$sAtomBlock = $this->partialParseResponseBranch($mNull, $iStackIndex, true,
						null === $sPreviousAtomUpperCase ? '' : \strtoupper($sPreviousAtomUpperCase));
					
					$sAtomBuilder .= $sAtomBlock;
					$iPos = $this->iResponseBufParsedPos;
					$sAtomBuilder .= ($bIsClosingBracketSquare) ? ']' : ')';
				}

				$sPreviousAtomUpperCase = null;
				$bIsGotoAtomBracket = false;

				continue;
			}
			else if ($bIsGotoNotAtomBracket)
			{
				$aSubItems = $this->partialParseResponseBranch($mNull, $iStackIndex, false,
					null === $sPreviousAtomUpperCase ? '' : \strtoupper($sPreviousAtomUpperCase));

				$aList[] = $aSubItems;
				$iPos = $this->iResponseBufParsedPos;
				$sPreviousAtomUpperCase = null;
				if (null !== $oImapResponse && $oImapResponse->IsStatusResponse)
				{
					$oImapResponse->OptionalResponse = $aSubItems;
					
					$bIsGotoDefault = true;
					$bIsGotoNotAtomBracket = false;
					continue;
				}
				$bIsGotoNotAtomBracket = false;

				continue;
			}
			else
			{
				$iBufferEndIndex = \strlen($this->sResponseBuffer) - 3;
				$this->bResponseBufferChanged = false;

				if ($iPos > $iBufferEndIndex)
				{
					break;
				}

				$sChar = $this->sResponseBuffer[$iPos];
			}

			switch ($sChar)
			{
				case ']':
				case ')':
					$iPos++;
					$sPreviousAtomUpperCase = null;
					$bIsEndOfList = true;
					break;
				case ' ':
					if ($bTreatAsAtom)
					{
						$sAtomBuilder .= ' ';
					}
					$iPos++;
					break;
				case '[':
					$bIsClosingBracketSquare = true;
				case '(':
					if ($bTreatAsAtom)
					{
						$sAtomBuilder .= ($bIsClosingBracketSquare) ? '[' : '(';
					}
					$iPos++;

					$this->iResponseBufParsedPos = $iPos;
					if ($bTreatAsAtom)
					{
						$bIsGotoAtomBracket = true;
					}
					else
					{
						$bIsGotoNotAtomBracket = true;
					}
					break;
				case '{':
					$bIsLiteralParsed = false;
					$mLiteralEndPos = \strpos($this->sResponseBuffer, '}', $iPos);
					if (false !== $mLiteralEndPos && $mLiteralEndPos > $iPos)
					{
						$sLiteralLenAsString = \substr($this->sResponseBuffer, $iPos + 1, $mLiteralEndPos - $iPos - 1);
						if (\is_numeric($sLiteralLenAsString))
						{
							$iLiteralLen = (int) $sLiteralLenAsString;
							$bIsLiteralParsed = true;
							$iPos = $mLiteralEndPos + 3;
							$bIsGotoLiteral = true;
							break;
						}
					}
					if (!$bIsLiteralParsed)
					{
						$iPos = $iBufferEndIndex;
					}
					$sPreviousAtomUpperCase = null;
					break;
				case '"':
					$bIsQuotedParsed = false;
					while (true)
					{
						$iClosingPos = $iPos + 1;
						if ($iClosingPos > $iBufferEndIndex)
						{
							break;
						}

						while (true)
						{
							$iClosingPos = \strpos($this->sResponseBuffer, '"', $iClosingPos);
							if (false === $iClosingPos)
							{
								break;
							}

							$iSlashCount = 0;
							while ('\\' === $this->sResponseBuffer[$iClosingPos - $iSlashCount - 1])
							{
								$iSlashCount++;
							}

							if ($iSlashCount % 2 == 1)
							{
								$iClosingPos++;
								continue;
							}
							else
							{
								break;
							}
						}

						if (false === $iClosingPos)
						{
							break;
						}
						else
						{
//							$iSkipClosingPos = 0;
							$bIsQuotedParsed = true;
							if ($bTreatAsAtom)
							{
								$sAtomBuilder .= \strtr(
									\substr($this->sResponseBuffer, $iPos, $iClosingPos - $iPos + 1),
									array('\\\\' => '\\', '\\"' => '"')
								);
							}
							else
							{
								$aList[] = \strtr(
									\substr($this->sResponseBuffer, $iPos + 1, $iClosingPos - $iPos - 1),
									array('\\\\' => '\\', '\\"' => '"')
								);
							}

							$iPos = $iClosingPos + 1;
							break;
						}
					}

					if (!$bIsQuotedParsed)
					{
						$iPos = $iBufferEndIndex;
					}

					$sPreviousAtomUpperCase = null;
					break;

				case 'GOTO_DEFAULT':
				default:
					$iCharBlockStartPos = $iPos;

					if (null !== $oImapResponse && $oImapResponse->IsStatusResponse)
					{
						$iPos = $iBufferEndIndex;

						while ($iPos > $iCharBlockStartPos && $this->sResponseBuffer[$iCharBlockStartPos] == ' ')
						{
							$iCharBlockStartPos++;
						}
					}

					$bIsAtomDone = false;
					while (!$bIsAtomDone && ($iPos <= $iBufferEndIndex))
					{
						$sCharDef = $this->sResponseBuffer[$iPos];
						switch ($sCharDef)
						{
							case '[':
								if (null === $sAtomBuilder)
								{
									$sAtomBuilder = '';
								}

								$sAtomBuilder .= substr($this->sResponseBuffer, $iCharBlockStartPos, $iPos - $iCharBlockStartPos + 1);

								$iPos++;
								$this->iResponseBufParsedPos = $iPos;

								$sListBlock = $this->partialParseResponseBranch($mNull, $iStackIndex, true,
									null === $sPreviousAtomUpperCase ? '' : strtoupper($sPreviousAtomUpperCase));

								if (null !== $sListBlock)
								{
									$sAtomBuilder .= $sListBlock.']';
								}

								$iPos = $this->iResponseBufParsedPos;
								$iCharBlockStartPos = $iPos;
								break;
							case ' ':
							case ']':
							case ')':
								$bIsAtomDone = true;
								break;
							default:
								$iPos++;
								break;
						}
					}

					if ($iPos > $iCharBlockStartPos || null !== $sAtomBuilder)
					{
						$sLastCharBlock = substr($this->sResponseBuffer, $iCharBlockStartPos, $iPos - $iCharBlockStartPos);
						if (null === $sAtomBuilder)
						{
							$aList[] = $sLastCharBlock;
							$sPreviousAtomUpperCase = $sLastCharBlock;
						}
						else
						{
							$sAtomBuilder .= $sLastCharBlock;

							if (!$bTreatAsAtom)
							{
								$aList[] = $sAtomBuilder;
								$sPreviousAtomUpperCase = $sAtomBuilder;
								$sAtomBuilder = null;
							}
						}

						if (null !== $oImapResponse)
						{
//							if (1 === count($aList))
							if (!$bCountOneInited && 1 === count($aList))
//							if (isset($aList[0]) && !isset($aList[1])) // fast 1 === count($aList)
							{
								$bCountOneInited = true;

								$oImapResponse->Tag = $aList[0];
								if ('+' === $oImapResponse->Tag)
								{
									$oImapResponse->ResponseType = \MailSo\Imap\Enumerations\ResponseType::CONTINUATION;
								}
								else if ('*' === $oImapResponse->Tag)
								{
									$oImapResponse->ResponseType = \MailSo\Imap\Enumerations\ResponseType::UNTAGGED;
								}
								else if ($this->getCurrentTag() === $oImapResponse->Tag)
								{
									$oImapResponse->ResponseType = \MailSo\Imap\Enumerations\ResponseType::TAGGED;
								}
								else
								{
									$oImapResponse->ResponseType = \MailSo\Imap\Enumerations\ResponseType::UNKNOWN;
								}
							}
//							else if (2 === count($aList))
							else if (!$bCountTwoInited && 2 === count($aList))
//							else if (isset($aList[1]) && !isset($aList[2])) // fast 2 === count($aList)
							{
								$bCountTwoInited = true;

								$oImapResponse->StatusOrIndex = strtoupper($aList[1]);

								if ($oImapResponse->StatusOrIndex == \MailSo\Imap\Enumerations\ResponseStatus::OK ||
									$oImapResponse->StatusOrIndex == \MailSo\Imap\Enumerations\ResponseStatus::NO ||
									$oImapResponse->StatusOrIndex == \MailSo\Imap\Enumerations\ResponseStatus::BAD ||
									$oImapResponse->StatusOrIndex == \MailSo\Imap\Enumerations\ResponseStatus::BYE ||
									$oImapResponse->StatusOrIndex == \MailSo\Imap\Enumerations\ResponseStatus::PREAUTH)
								{
									$oImapResponse->IsStatusResponse = true;
								}
							}
							else if (\MailSo\Imap\Enumerations\ResponseType::CONTINUATION === $oImapResponse->ResponseType)
							{
								$oImapResponse->HumanReadable = $sLastCharBlock;
							}
							else if ($oImapResponse->IsStatusResponse)
							{
								$oImapResponse->HumanReadable = $sLastCharBlock;
							}
						}
					}
			}
		}

		$this->iResponseBufParsedPos = $iPos;
		if (null !== $oImapResponse)
		{
			$this->bNeedNext = true;
			$this->iResponseBufParsedPos = 0;
		}

		return $bTreatAsAtom ? $sAtomBuilder : $aList;
	}

	/**
	 * @param string $sParent
	 * @param string $sLiteralAtomUpperCase
	 * @param resource $rImapStream
	 * @param int $iLiteralLen
	 *
	 * @return bool
	 */
	private function partialResponseLiteralCallbackCallable($sParent, $sLiteralAtomUpperCase, $rImapStream, $iLiteralLen)
	{
		$sLiteralAtomUpperCasePeek = '';
		if (0 === strpos($sLiteralAtomUpperCase, 'BODY'))
		{
			$sLiteralAtomUpperCasePeek = str_replace('BODY', 'BODY.PEEK', $sLiteralAtomUpperCase);
		}

		$sFetchKey = '';
		if (is_array($this->aFetchCallbacks))
		{
			if (0 < strlen($sLiteralAtomUpperCasePeek) && isset($this->aFetchCallbacks[$sLiteralAtomUpperCasePeek]))
			{
				$sFetchKey = $sLiteralAtomUpperCasePeek;
			}
			else if (0 < strlen($sLiteralAtomUpperCase) && isset($this->aFetchCallbacks[$sLiteralAtomUpperCase]))
			{
				$sFetchKey = $sLiteralAtomUpperCase;
			}
		}

		$bResult = false;
		if (0 < \strlen($sFetchKey) && '' !== $this->aFetchCallbacks[$sFetchKey] &&
			\is_callable($this->aFetchCallbacks[$sFetchKey]))
		{
			$rImapLiteralStream =
				\MailSo\Base\StreamWrappers\Literal::CreateStream($rImapStream, $iLiteralLen);

			$bResult = true;
			$this->writeLog('Callback for '.$sParent.' / '.$sLiteralAtomUpperCase.
				' - try to read '.$iLiteralLen.' bytes.', \MailSo\Log\Enumerations\Type::NOTE);

			\call_user_func($this->aFetchCallbacks[$sFetchKey],
				$sParent, $sLiteralAtomUpperCase, $rImapLiteralStream);

			$iTimer = 0;
			$iNotReadLiteralLen = 0;
			while (!\feof($rImapLiteralStream))
			{
				$sBuf = \fread($rImapLiteralStream, 8192);
				if (false !== $sBuf)
				{
					\MailSo\Base\Utils::ResetTimeLimit($iTimer);
					$iNotReadLiteralLen += \strlen($sBuf);
					continue;
				}
				break;
			}

			if ($iNotReadLiteralLen > 0)
			{
				$this->writeLog('Not read literal size '.$iNotReadLiteralLen.' bytes.',
					\MailSo\Log\Enumerations\Type::WARNING);
			}

			\MailSo\Base\Loader::IncStatistic('NetRead', $iLiteralLen);

			if (\is_resource($rImapLiteralStream))
			{
				\fclose($rImapLiteralStream);
			}
		}

		return $bResult;
	}

	/**
	 * @param array $aParams = null
	 *
	 * @return string
	 */
	private function prepearParamLine($aParams = array())
	{
		$sReturn = '';
		if (\is_array($aParams) && 0 < \count($aParams))
		{
			foreach ($aParams as $mParamItem)
			{
				if (\is_array($mParamItem) && 0 < \count($mParamItem))
				{
					$sReturn .= ' ('.\trim($this->prepearParamLine($mParamItem)).')';
				}
				else if (\is_string($mParamItem))
				{
					$sReturn .= ' '.$mParamItem;
				}
			}
		}
		return $sReturn;
	}

	/**
	 * @return string
	 */
	private function getNewTag()
	{
		$this->iTagCount++;
		return $this->getCurrentTag();
	}

	/**
	 * @return string
	 */
	private function getCurrentTag()
	{
		return self::TAG_PREFIX.$this->iTagCount;
	}

	/**
	 * @param string $sStringForEscape
	 *
	 * @return string
	 */
	public function EscapeString($sStringForEscape)
	{
		return '"'.str_replace(array('\\', '"'), array('\\\\', '\\"'), $sStringForEscape).'"';
	}

	/**
	 * @return string
	 */
	protected function getLogName()
	{
		return 'IMAP';
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \MailSo\Imap\ImapClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function SetLogger($oLogger)
	{
		parent::SetLogger($oLogger);

		return $this;
	}

	/**
	 * @param resource $rConnect
	 * @param array $aCapabilityItems = array()
	 *
	 * @return \MailSo\Imap\ImapClient
	 */
	public function TestSetValues($rConnect, $aCapabilityItems = array())
	{
		$this->rConnect = $rConnect;
		$this->aCapabilityItems = $aCapabilityItems;

		return $this;
	}

	/**
	 * @param string $sEndTag = null
	 * @param string $bFindCapa = false
	 *
	 * @return array
	 */
	public function TestParseResponseWithValidationProxy($sEndTag = null, $bFindCapa = false)
	{
		return $this->parseResponseWithValidation($sEndTag, $bFindCapa);
	}
}
