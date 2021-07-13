<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

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
	 * @var FolderInformation
	 */
	private $oCurrentFolderInfo;

	/**
	 * @var ResponseCollection
	 */
	private $oLastResponse;

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

	function __construct()
	{
		parent::__construct();

		$this->iTagCount = 0;
		$this->aCapabilityItems = null;
		$this->oCurrentFolderInfo = null;

		$this->oLastResponse = new ResponseCollection;
		$this->bNeedNext = true;

		$this->aTagTimeouts = array();

		$this->bIsLoggined = false;
		$this->bIsSelected = false;
		$this->sLogginedUser = '';

		$this->__FORCE_SELECT_ON_EXAMINE__ = false;

		\ini_set('xdebug.max_nesting_level', 500);
	}

	public function GetLogginedUser() : string
	{
		return $this->sLogginedUser;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function Connect(string $sServerName, int $iPort = 143,
		int $iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT,
		bool $bVerifySsl = false, bool $bAllowSelfSigned = true,
		string $sClientCert = '') : void
	{
		$this->aTagTimeouts['*'] = \microtime(true);

		parent::Connect($sServerName, $iPort, $iSecurityType, $bVerifySsl, $bAllowSelfSigned, $sClientCert);

		$this->aCapabilityItems = $this->getResponse('*')->getCapabilityResult();

		if (\MailSo\Net\Enumerations\ConnectionSecurityType::UseStartTLS(
			$this->IsSupported('STARTTLS'), $this->iSecurityType))
		{
			$this->SendRequestGetResponse('STARTTLS');
			$this->EnableCrypto();

			$this->aCapabilityItems = null;
		}
		else if (\MailSo\Net\Enumerations\ConnectionSecurityType::STARTTLS === $this->iSecurityType)
		{
			$this->writeLogException(
				new \MailSo\Net\Exceptions\SocketUnsuppoterdSecureConnectionException('STARTTLS is not supported'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function Login(string $sLogin, string $sPassword, string $sProxyAuthUser = '',
		bool $bUseAuthPlainIfSupported = true, bool $bUseAuthCramMd5IfSupported = true) : self
	{
		if (!strlen(\trim($sLogin)) || !strlen(\trim($sPassword)))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$sLogin = \MailSo\Base\Utils::IdnToAscii(\MailSo\Base\Utils::Trim($sLogin));

		$this->sLogginedUser = $sLogin;

//		$encrypted = !empty(\stream_get_meta_data($this->rConnect)['crypto']);
		$type = $this->IsSupported('LOGINDISABLED') ? '' : 'LOGIN'; // RFC3501 6.2.3
		$types = [
//			'SCRAM-SHA-256' => 1, // !$encrypted
//			'SCRAM-SHA-1' => 1, // !$encrypted
			'CRAM-MD5' => $bUseAuthCramMd5IfSupported,
			'PLAIN' => $bUseAuthPlainIfSupported,
			'LOGIN' => 1,
		];
		foreach ($types as $sasl_type => $active) {
			if ($active && $this->IsSupported("AUTH={$sasl_type}") && \SnappyMail\SASL::isSupported($sasl_type)) {
				$type = $sasl_type;
				break;
			}
		}

		$SASL = \SnappyMail\SASL::factory($type);
		$SASL->base64 = true;

		try
		{
			if (0 === \strpos($type, 'SCRAM-SHA-'))
			{
				$sAuthzid = $this->getResponseValue($this->SendRequestGetResponse('AUTHENTICATE', array($type)), Enumerations\ResponseType::CONTINUATION);
				$this->sendRaw($SASL->authenticate($sLogin, $sPassword/*, $sAuthzid*/), true);
				$sChallenge = $SASL->challenge($this->getResponseValue($this->getResponse(), Enumerations\ResponseType::CONTINUATION));
				if ($this->oLogger) {
					$this->oLogger->AddSecret($sChallenge);
				}
				$this->sendRaw($sChallenge, true, '*******');
				$sSignature = $this->getResponseValue($this->getResponse());
				$SASL->verify($sSignature);
			}
			else if ('CRAM-MD5' === $type)
			{
				$sChallenge = $this->getResponseValue($this->SendRequestGetResponse('AUTHENTICATE', array($type)), Enumerations\ResponseType::CONTINUATION);
				$this->oLogger->Write('challenge: '.\base64_decode($sChallenge));
				$sAuth = $SASL->authenticate($sLogin, $sPassword, $sChallenge);
				if ($this->oLogger) {
					$this->oLogger->AddSecret($sAuth);
				}
				$this->sendRaw($sAuth, true, '*******');
				$this->getResponse();
			}
			else if ('PLAIN' === $type)
			{
				$sAuth = $SASL->authenticate($sLogin, $sPassword);
				if ($this->oLogger) {
					$this->oLogger->AddSecret($sAuth);
				}
				if ($this->IsSupported('SASL-IR')) {
					$this->SendRequestGetResponse('AUTHENTICATE', array($type, $sAuth));
				} else {
					$this->SendRequestGetResponse('AUTHENTICATE', array($type));
					$this->sendRaw($sAuth, true, '*******');
					$this->getResponse();
				}
			}
			else if ($this->IsSupported('LOGINDISABLED'))
			{
				$sB64 = $this->getResponseValue($this->SendRequestGetResponse('AUTHENTICATE', array($type)), Enumerations\ResponseType::CONTINUATION);
				$this->sendRaw($SASL->authenticate($sLogin, $sPassword, $sB64), true);
				$this->getResponse();
				$sPass = $SASL->challenge(''/*UGFzc3dvcmQ6*/);
				if ($this->oLogger) {
					$this->oLogger->AddSecret($sPass);
				}
				$this->sendRaw($sPass, true, '*******');
				$this->getResponse();
			}
			else
			{
				if ($this->oLogger)
				{
					$this->oLogger->AddSecret($this->EscapeString($sPassword));
				}
				$this->SendRequestGetResponse('LOGIN',
					array(
						$this->EscapeString($sLogin),
						$this->EscapeString($sPassword)
					));
			}

			if (0 < \strlen($sProxyAuthUser))
			{
				$this->SendRequestGetResponse('PROXYAUTH', array($this->EscapeString($sProxyAuthUser)));
			}
		}
		catch (Exceptions\NegativeResponseException $oException)
		{
			$this->writeLogException(
				new Exceptions\LoginBadCredentialsException(
					$oException->GetResponses(), '', 0, $oException),
				\MailSo\Log\Enumerations\Type::NOTICE, true);
		}

		$this->bIsLoggined = true;
		$this->aCapabilityItems = null;

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	public function Logout() : self
	{
		if ($this->bIsLoggined)
		{
			$this->bIsLoggined = false;
			$this->SendRequestGetResponse('LOGOUT');
		}

		return $this;
	}

	public function IsLoggined() : bool
	{
		return $this->IsConnected() && $this->bIsLoggined;
	}

	public function IsSelected() : bool
	{
		return $this->IsLoggined() && $this->bIsSelected;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function Capability() : ?array
	{
		$this->aCapabilityItems = $this->SendRequestGetResponse('CAPABILITY')
			->getCapabilityResult();
		return $this->aCapabilityItems;
	}

	/**
	 * Test support for things like:
	 *     IMAP4rev1 SASL-IR LOGIN-REFERRALS ID ENABLE IDLE SORT SORT=DISPLAY
	 *     THREAD=REFERENCES THREAD=REFS THREAD=ORDEREDSUBJECT MULTIAPPEND
	 *     URL-PARTIAL CATENATE UNSELECT CHILDREN NAMESPACE UIDPLUS LIST-EXTENDED
	 *     I18NLEVEL=1 CONDSTORE QRESYNC ESEARCH ESORT SEARCHRES WITHIN CONTEXT=SEARCH
	 *     LIST-STATUS BINARY MOVE SNIPPET=FUZZY PREVIEW=FUZZY STATUS=SIZE LITERAL+ NOTIFY SPECIAL-USE
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function IsSupported(string $sExtentionName) : bool
	{
		$bResult = strlen(\trim($sExtentionName));
		if ($bResult && null === $this->aCapabilityItems)
		{
			$this->aCapabilityItems = $this->Capability();
		}

		return $bResult && \is_array($this->aCapabilityItems) &&
			\in_array(\strtoupper($sExtentionName), $this->aCapabilityItems);
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function GetNamespace() : ?NamespaceResult
	{
		if (!$this->IsSupported('NAMESPACE'))
		{
			return null;
		}

		try {
			return $this->SendRequestGetResponse('NAMESPACE')->getNamespaceResult();
		} catch (\Throwable $e) {
			$this->writeLogException($e, \MailSo\Log\Enumerations\Type::ERROR);
			throw $e;
		}
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function Noop() : self
	{
		$this->SendRequestGetResponse('NOOP');
		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderCreate(string $sFolderName) : self
	{
		$this->SendRequestGetResponse('CREATE',
			array($this->EscapeString($sFolderName)));
		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderDelete(string $sFolderName) : self
	{
		$this->SendRequestGetResponse('DELETE',
			array($this->EscapeString($sFolderName)));
		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderSubscribe(string $sFolderName) : self
	{
		$this->SendRequestGetResponse('SUBSCRIBE',
			array($this->EscapeString($sFolderName)));
		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderUnSubscribe(string $sFolderName) : self
	{
		$this->SendRequestGetResponse('UNSUBSCRIBE',
			array($this->EscapeString($sFolderName)));
		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderRename(string $sOldFolderName, string $sNewFolderName) : self
	{
		$this->SendRequestGetResponse('RENAME', array(
			$this->EscapeString($sOldFolderName),
			$this->EscapeString($sNewFolderName)));
		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderStatus(string $sFolderName, array $aStatusItems) : ?array
	{
		return \count($aStatusItems)
			? $this->SendRequestGetResponse('STATUS', array($this->EscapeString($sFolderName), $aStatusItems))
				->getStatusFolderInformationResult()
			: null;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	private function specificFolderList(bool $bIsSubscribeList, string $sParentFolderName = '', string $sListPattern = '*', bool $bUseListStatus = false) : array
	{
		$sCmd = 'LSUB';
		if (!$bIsSubscribeList)
		{
			$sCmd = 'LIST';
		}

		$sListPattern = 0 === strlen(trim($sListPattern)) ? '*' : $sListPattern;

		$aParameters = array(
			$this->EscapeString($sParentFolderName),
			$this->EscapeString($sListPattern)
		);

		if ($bUseListStatus && !$bIsSubscribeList && $this->IsSupported('LIST-STATUS'))
		{
			$aL = array(
				Enumerations\FolderStatus::MESSAGES,
				Enumerations\FolderStatus::UNSEEN,
				Enumerations\FolderStatus::UIDNEXT
			);

//			if ($this->IsSupported('CONDSTORE'))
//			{
//				$aL[] = Enumerations\FolderStatus::HIGHESTMODSEQ;
//			}

			$aParameters[] = 'RETURN';
			$aParameters[] = array('STATUS', $aL);
		}
		else
		{
			$bUseListStatus = false;
		}

		return $this->SendRequestGetResponse($sCmd, $aParameters)->getFoldersResult($sCmd, $bUseListStatus);
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderList(string $sParentFolderName = '', string $sListPattern = '*') : array
	{
		return $this->specificFolderList(false, $sParentFolderName, $sListPattern);
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderSubscribeList(string $sParentFolderName = '', string $sListPattern = '*') : array
	{
		return $this->specificFolderList(true, $sParentFolderName, $sListPattern);
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderStatusList(string $sParentFolderName = '', string $sListPattern = '*') : array
	{
		return $this->specificFolderList(false, $sParentFolderName, $sListPattern, true);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	protected function selectOrExamineFolder(string $sFolderName, bool $bIsWritable, bool $bReSelectSameFolders) : self
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

		if (!strlen(\trim($sFolderName)))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		$this->oCurrentFolderInfo = $this->SendRequestGetResponse($bIsWritable ? 'SELECT' : 'EXAMINE',
			array($this->EscapeString($sFolderName)))
			->getCurrentFolderInformation($sFolderName, $bIsWritable);

		$this->bIsSelected = true;

		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderSelect(string $sFolderName, bool $bReSelectSameFolders = false) : self
	{
		return $this->selectOrExamineFolder($sFolderName, true, $bReSelectSameFolders);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderExamine(string $sFolderName, bool $bReSelectSameFolders = false) : self
	{
		return $this->selectOrExamineFolder($sFolderName, $this->__FORCE_SELECT_ON_EXAMINE__, $bReSelectSameFolders);
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderUnSelect() : self
	{
		if ($this->IsSelected() && $this->IsSupported('UNSELECT'))
		{
			$this->SendRequestGetResponse('UNSELECT');
			$this->bIsSelected = false;
		}

		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function Fetch(array $aInputFetchItems, string $sIndexRange, bool $bIndexIsUid) : array
	{
		if (!strlen(\trim($sIndexRange)))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->aFetchCallbacks = array();
		try {
			$aFetchItems = Enumerations\FetchType::ChangeFetchItemsBefourRequest($aInputFetchItems);
			foreach ($aFetchItems as $sName => $mItem)
			{
				if (0 < \strlen($sName) && '' !== $mItem)
				{
					$this->aFetchCallbacks[$sName] = $mItem;
				}
			}

			$oResult = $this->SendRequestGetResponse(($bIndexIsUid ? 'UID ' : '').'FETCH',
				array($sIndexRange, \array_keys($aFetchItems)));
		} finally {
			$this->aFetchCallbacks = array();
		}

		return $oResult->getFetchResult($this->oLogger);
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function Quota() : ?array
	{
		if ($this->IsSupported('QUOTA'))
		{
			return $this->SendRequestGetResponse('GETQUOTAROOT "INBOX"')->getQuotaResult();
		}

		return null;
	}

	/**
	 * See https://tools.ietf.org/html/rfc5256
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageSimpleSort(array $aSortTypes, string $sSearchCriterias = 'ALL', bool $bReturnUid = true) : array
	{
		$sCommandPrefix = ($bReturnUid) ? 'UID ' : '';
		$sSearchCriterias = !strlen(\trim($sSearchCriterias)) || '*' === $sSearchCriterias
			? 'ALL' : $sSearchCriterias;

		if (!$aSortTypes)
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}
		if (!$this->IsSupported('SORT'))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$aRequest = array();
		$aRequest[] = $aSortTypes;
		$aRequest[] = \MailSo\Base\Utils::IsAscii($sSearchCriterias) ? 'US-ASCII' : 'UTF-8';
		$aRequest[] = $sSearchCriterias;

		$sCmd = 'SORT';

		return $this->SendRequestGetResponse($sCommandPrefix.$sCmd, $aRequest)
			->getMessageSimpleSortResult($sCmd, $bReturnUid);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	private function simpleESearchOrESortHelper(bool $bSort = false, string $sSearchCriterias = 'ALL', array $aSearchOrSortReturn = null, bool $bReturnUid = true, string $sLimit = '', string $sCharset = '', array $aSortTypes = null) : array
	{
		$sCommandPrefix = ($bReturnUid) ? 'UID ' : '';
		$sSearchCriterias = 0 === \strlen($sSearchCriterias) || '*' === $sSearchCriterias
			? 'ALL' : $sSearchCriterias;

		$sCmd = $bSort ? 'SORT': 'SEARCH';
		if ($bSort && (!$aSortTypes || !$this->IsSupported('SORT')))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		if (!$this->IsSupported($bSort ? 'ESORT' : 'ESEARCH'))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		if (!$aSearchOrSortReturn)
		{
			$aSearchOrSortReturn = array('ALL');
		}

		$aRequest = array();
		if ($bSort)
		{
			$aRequest[] = 'RETURN';
			$aRequest[] = $aSearchOrSortReturn;

			$aRequest[] = $aSortTypes;
			$aRequest[] = \MailSo\Base\Utils::IsAscii($sSearchCriterias) ? 'US-ASCII' : 'UTF-8';
		}
		else
		{
			if (0 < \strlen($sCharset))
			{
				$aRequest[] = 'CHARSET';
				$aRequest[] = \strtoupper($sCharset);
			}

			$aRequest[] = 'RETURN';
			$aRequest[] = $aSearchOrSortReturn;
		}

		$aRequest[] = $sSearchCriterias;

		if (0 < \strlen($sLimit))
		{
			$aRequest[] = $sLimit;
		}

		return $this->SendRequestGetResponse($sCommandPrefix.$sCmd, $aRequest)
			->getSimpleESearchOrESortResult($this->getCurrentTag(), $bReturnUid);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageSimpleESearch(string $sSearchCriterias = 'ALL', array $aSearchReturn = null, bool $bReturnUid = true, string $sLimit = '', string $sCharset = '') : array
	{
		return $this->simpleESearchOrESortHelper(false, $sSearchCriterias, $aSearchReturn, $bReturnUid, $sLimit, $sCharset);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageSimpleESort(array $aSortTypes, string $sSearchCriterias = 'ALL', array $aSearchReturn = null, bool $bReturnUid = true, string $sLimit = '') : array
	{
		return $this->simpleESearchOrESortHelper(true, $sSearchCriterias, $aSearchReturn, $bReturnUid, $sLimit, '', $aSortTypes);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageSimpleSearch(string $sSearchCriterias = 'ALL', bool $bReturnUid = true, string $sCharset = '') : array
	{
		$sCommandPrefix = ($bReturnUid) ? 'UID ' : '';
		$sSearchCriterias = 0 === \strlen($sSearchCriterias) || '*' === $sSearchCriterias
			? 'ALL' : $sSearchCriterias;

		$aRequest = array();
		if (0 < \strlen($sCharset))
		{
			$aRequest[] = 'CHARSET';
			$aRequest[] = \strtoupper($sCharset);
		}

		$aRequest[] = $sSearchCriterias;

		$sCmd = 'SEARCH';

		$sCont = $this->SendRequest($sCommandPrefix.$sCmd, $aRequest, true);
		if ('' !== $sCont)
		{
			$oResult = $this->getResponse();
			$oItem = $oResult->getLast();

			if ($oItem && Enumerations\ResponseType::CONTINUATION === $oItem->ResponseType)
			{
				$aParts = explode("\r\n", $sCont);
				foreach ($aParts as $sLine)
				{
					$this->sendRaw($sLine);

					$oResult = $this->getResponse();
					$oItem = $oResult->getLast();
					if ($oItem && Enumerations\ResponseType::CONTINUATION === $oItem->ResponseType)
					{
						continue;
					}
				}
			}
		}
		else
		{
			$oResult = $this->getResponse();
		}

		return $oResult->getMessageSimpleSearchResult($sCmd, $bReturnUid);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageSimpleThread(string $sSearchCriterias = 'ALL', bool $bReturnUid = true, string $sCharset = \MailSo\Base\Enumerations\Charset::UTF_8) : array
	{
		$sCommandPrefix = ($bReturnUid) ? 'UID ' : '';
		$sSearchCriterias = !strlen(\trim($sSearchCriterias)) || '*' === $sSearchCriterias
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
		$aRequest[] = \strtoupper($sCharset);
		$aRequest[] = $sSearchCriterias;

		$sCmd = 'THREAD';

		return $this->SendRequestGetResponse($sCommandPrefix.$sCmd, $aRequest)
			->getMessageSimpleThreadResult($sCmd, $bReturnUid);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageCopy(string $sToFolder, string $sIndexRange, bool $bIndexIsUid) : self
	{
		if (0 === \strlen($sIndexRange))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$sCommandPrefix = ($bIndexIsUid) ? 'UID ' : '';
		$this->SendRequestGetResponse($sCommandPrefix.'COPY',
			array($sIndexRange, $this->EscapeString($sToFolder)));
		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageMove(string $sToFolder, string $sIndexRange, bool $bIndexIsUid) : self
	{
		if (0 === \strlen($sIndexRange))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		if (!$this->IsSupported('MOVE'))
		{
			$this->writeLogException(
				new Exceptions\RuntimeException('Move is not supported'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$sCommandPrefix = ($bIndexIsUid) ? 'UID ' : '';
		$this->SendRequestGetResponse($sCommandPrefix.'MOVE',
			array($sIndexRange, $this->EscapeString($sToFolder)));
		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageExpunge(string $sUidRangeIfSupported = '', bool $bForceUidExpunge = false, bool $bExpungeAll = false) : self
	{
		$sUidRangeIfSupported = \trim($sUidRangeIfSupported);

		$sCmd = 'EXPUNGE';
		$aArguments = array();

		if (!$bExpungeAll && $bForceUidExpunge && 0 < \strlen($sUidRangeIfSupported) && $this->IsSupported('UIDPLUS'))
		{
			$sCmd = 'UID '.$sCmd;
			$aArguments = array($sUidRangeIfSupported);
		}

		$this->SendRequestGetResponse($sCmd, $aArguments);
		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageStoreFlag(string $sIndexRange, bool $bIndexIsUid, array $aInputStoreItems, string $sStoreAction) : self
	{
		if (!strlen(\trim($sIndexRange)) ||
			!strlen(\trim($sStoreAction)) ||
			0 === \count($aInputStoreItems))
		{
			return false;
		}

		$sCmd = ($bIndexIsUid) ? 'UID STORE' : 'STORE';
		$this->SendRequestGetResponse($sCmd, array($sIndexRange, $sStoreAction, $aInputStoreItems));
		return $this;
	}

	/**
	 * @param resource $rMessageAppendStream
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function MessageAppendStream(string $sFolderName, $rMessageAppendStream, int $iStreamSize, array $aAppendFlags = null, int &$iUid = null, int $iDateTime = 0) : self
	{
		$aData = array($this->EscapeString($sFolderName), $aAppendFlags);
		if (0 < $iDateTime)
		{
			$aData[] = $this->EscapeString(\gmdate('d-M-Y H:i:s', $iDateTime).' +0000');
		}

		$aData[] = '{'.$iStreamSize.'}';

		$this->SendRequestGetResponse('APPEND', $aData);

		$this->writeLog('Write to connection stream', \MailSo\Log\Enumerations\Type::NOTE);

		\MailSo\Base\Utils::MultipleStreamWriter($rMessageAppendStream, array($this->rConnect));

		$this->sendRaw('');
		$this->getResponse();

		if (null !== $iUid)
		{
			$oLast = $this->GetLastResponse()->getLast();
			if ($oLast && Enumerations\ResponseType::TAGGED === $oLast->ResponseType && \is_array($oLast->OptionalResponse))
			{
				if (0 < \strlen($oLast->OptionalResponse[0]) &&
					0 < \strlen($oLast->OptionalResponse[2]) &&
					'APPENDUID' === strtoupper($oLast->OptionalResponse[0]) &&
					\is_numeric($oLast->OptionalResponse[2])
				)
				{
					$iUid = (int) $oLast->OptionalResponse[2];
				}
			}
		}

		return $this;
	}

	public function FolderCurrentInformation() : FolderInformation
	{
		return $this->oCurrentFolderInfo;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	public function SendRequest(string $sCommand, array $aParams = array(), bool $bBreakOnLiteral = false) : string
	{
		$sCommand = \trim($sCommand);
		if (!\strlen($sCommand))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->IsConnected(true);

		$sTag = $this->getNewTag();

		$sRealCommand = $sTag.' '.$sCommand.$this->prepareParamLine($aParams);

		$sFakeCommand = '';
		if ($aFakeParams = $this->secureRequestParams($sCommand, $aParams)) {
			$sFakeCommand = $sTag.' '.$sCommand.$this->prepareParamLine($aFakeParams);
		}

		$this->aTagTimeouts[$sTag] = \microtime(true);

		if ($bBreakOnLiteral && !\preg_match('/\d\+\}\r\n/', $sRealCommand))
		{
			$iPos = \strpos($sRealCommand, "}\r\n");
			if (false !== $iPos)
			{
				$iFakePos = \strpos($sFakeCommand, "}\r\n");

				$this->sendRaw(\substr($sRealCommand, 0, $iPos + 1), true,
					false !== $iFakePos ? \substr($sFakeCommand, 0, $iFakePos + 3) : '');

				return \substr($sRealCommand, $iPos + 3);
			}
		}

		$this->sendRaw($sRealCommand, true, $sFakeCommand);
		return '';
	}

	private function secureRequestParams(string $sCommand, array $aParams) : ?array
	{
		if ('LOGIN' === $sCommand && isset($aParams[1])) {
			$aParams[1] = '"********"';
			return $aParams;
		}
		return null;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function SendRequestGetResponse(string $sCommand, array $aParams = array()) : ResponseCollection
	{
		$this->SendRequest($sCommand, $aParams);
		return $this->getResponse();
	}

	private function getResponseValue(ResponseCollection $oResponseCollection, int $type = 0) : string
	{
		$oResponse = $oResponseCollection->getLast();
		if ($oResponse && (!$type || $type === $oResponse->ResponseType)) {
			$sResult = $oResponse->ResponseList[1] ?? null;
			if ($sResult) {
				return $sResult;
			}
			$this->writeLogException(
				new Exceptions\LoginException,
				\MailSo\Log\Enumerations\Type::NOTICE, true);
		}
		$this->writeLogException(
			new Exceptions\LoginException,
			\MailSo\Log\Enumerations\Type::NOTICE, true);
	}

	public function GetLastResponse() : ResponseCollection
	{
		return $this->oLastResponse;
	}

	/**
	 * @throws \MailSo\Imap\Exceptions\ResponseNotFoundException
	 * @throws \MailSo\Imap\Exceptions\InvalidResponseException
	 * @throws \MailSo\Imap\Exceptions\NegativeResponseException
	 */
	private function getResponse(string $sEndTag = null) : ResponseCollection
	{
		try {
			$oResult = new ResponseCollection;

			if (\is_resource($this->rConnect)) {
				$sEndTag = (null === $sEndTag) ? $this->getCurrentTag() : $sEndTag;

				while (true) {
					$oResponse = new Response;

					$this->partialParseResponseBranch($oResponse);

					if (Enumerations\ResponseType::UNKNOWN === $oResponse->ResponseType) {
						throw new Exceptions\ResponseNotFoundException;
					}

					$oResult->append($oResponse);
					if ($sEndTag === $oResponse->Tag || Enumerations\ResponseType::CONTINUATION === $oResponse->ResponseType) {
						if (isset($this->aTagTimeouts[$sEndTag])) {
							$this->writeLog((\microtime(true) - $this->aTagTimeouts[$sEndTag]).' ('.$sEndTag.')',
								\MailSo\Log\Enumerations\Type::TIME);

							unset($this->aTagTimeouts[$sEndTag]);
						}

						break;
					}

					unset($oResponse);
				}
			}

			$this->oLastResponse = $oResult;

			$oResult->validate();

		} catch (\Throwable $e) {
			$this->writeLogException($e, \MailSo\Log\Enumerations\Type::WARNING);
			throw $e;
		}

		return $oResult;
	}

	private function skipBracketParse(?Response $oImapResponse) : bool
	{
		return $oImapResponse &&
			$oImapResponse->ResponseType === \MailSo\Imap\Enumerations\ResponseType::UNTAGGED &&
			(
				($oImapResponse->StatusOrIndex === 'STATUS' && 2 === \count($oImapResponse->ResponseList)) ||
				($oImapResponse->StatusOrIndex === 'LIST' && 4 === \count($oImapResponse->ResponseList)) ||
				($oImapResponse->StatusOrIndex === 'LSUB' && 4 === \count($oImapResponse->ResponseList))
			);
	}

	/**
	 * @return array|string
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	private function partialParseResponseBranch(?Response $oImapResponse,
		bool $bTreatAsAtom = false, string $sParentToken = '', string $sOpenBracket = '')
	{
		if ($oImapResponse) {
			$this->iResponseBufParsedPos = 0;
			$this->bNeedNext = true;
		}

		$iPos = $this->iResponseBufParsedPos;

		$sPreviousAtomUpperCase = null;
		$sClosingBracket = ')';
		$iLiteralLen = 0;
		$iBufferEndIndex = 0;
		$iDebugCount = 0;

		$bIsGotoDefault = false;
		$bIsGotoLiteral = false;
		$bIsGotoLiteralEnd = false;
		$bIsGotoAtomBracket = false;
		$bIsGotoNotAtomBracket = false;

		$bCountOneInited = false;
		$bCountTwoInited = false;

		$sAtomBuilder = $bTreatAsAtom ? '' : null;
		$aList = array();
		if ($oImapResponse)
		{
			$aList =& $oImapResponse->ResponseList;
		}

		while (true)
		{
			if (100000 === ++$iDebugCount)
			{
				$this->Logger()->Write('PartialParseOver: '.$iDebugCount, \MailSo\Log\Enumerations\Type::ERROR);
			}

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
					$sParentToken, null === $sPreviousAtomUpperCase ? '' : \strtoupper($sPreviousAtomUpperCase), $iLiteralLen))
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

						\MailSo\Base\Utils::ResetTimeLimit();
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

							if (\MailSo\Config::$LogSimpleLiterals)
							{
								$this->writeLog('{'.\strlen($sLiteral).'} '.$sLiteral, \MailSo\Log\Enumerations\Type::INFO);
							}
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
				$sPreviousAtomUpperCase = null;
				$this->bNeedNext = true;
				$bIsGotoLiteralEnd = false;

				continue;
			}
			else if ($bIsGotoAtomBracket)
			{
				if ($bTreatAsAtom)
				{
					$sAtomBlock = $this->partialParseResponseBranch(null, true,
						null === $sPreviousAtomUpperCase ? '' : \strtoupper($sPreviousAtomUpperCase),
						$sOpenBracket);

					$sAtomBuilder .= $sAtomBlock;
					$iPos = $this->iResponseBufParsedPos;
					$sAtomBuilder .= $sClosingBracket;
				}

				$sPreviousAtomUpperCase = null;
				$bIsGotoAtomBracket = false;

				continue;
			}
			else if ($bIsGotoNotAtomBracket)
			{
				$aSubItems = $this->partialParseResponseBranch(null, false,
					null === $sPreviousAtomUpperCase ? '' : \strtoupper($sPreviousAtomUpperCase),
					$sOpenBracket);

				$aList[] = $aSubItems;
				$iPos = $this->iResponseBufParsedPos;
				$sPreviousAtomUpperCase = null;
				if ($oImapResponse && $oImapResponse->IsStatusResponse)
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

				if ($iPos > $iBufferEndIndex)
				{
					break;
				}

				$sChar = $this->sResponseBuffer[$iPos];
			}

			switch (true)
			{
				case ']' === $sChar:
				case ')' === $sChar:
					if ($this->skipBracketParse($oImapResponse))
					{
						$bIsGotoDefault = true;
						$bIsGotoNotAtomBracket = false;
					}
					else
					{
						++$iPos;
						$sPreviousAtomUpperCase = null;
					}
					break 2;
				case ' ' === $sChar:
					if ($bTreatAsAtom)
					{
						$sAtomBuilder .= ' ';
					}
					++$iPos;
					break;
				case '[' === $sChar:
				case '(' === $sChar:
					$sOpenBracket = $sChar;
					$sClosingBracket = '[' === $sChar ? ']' : ')';
					if ($bTreatAsAtom)
					{
						$sAtomBuilder .= $sChar;
						$bIsGotoAtomBracket = true;
						$this->iResponseBufParsedPos = ++$iPos;
					}
					else if ($this->skipBracketParse($oImapResponse))
					{
						$sOpenBracket = '';
						$sClosingBracket = '';
						$bIsGotoDefault = true;
						$bIsGotoNotAtomBracket = false;
					}
					else
					{
						$bIsGotoNotAtomBracket = true;
						$this->iResponseBufParsedPos = ++$iPos;
					}
					break;
				case '{' === $sChar:
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
				case '"' === $sChar:
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

							// TODO
							$iClosingPosNext = $iClosingPos + 1;
							if (
								isset($this->sResponseBuffer[$iClosingPosNext]) &&
								' ' !== $this->sResponseBuffer[$iClosingPosNext] &&
								"\r" !== $this->sResponseBuffer[$iClosingPosNext] &&
								"\n" !== $this->sResponseBuffer[$iClosingPosNext] &&
								']' !== $this->sResponseBuffer[$iClosingPosNext] &&
								')' !== $this->sResponseBuffer[$iClosingPosNext]
								)
							{
								++$iClosingPos;
								continue;
							}

							$iSlashCount = 0;
							while ('\\' === $this->sResponseBuffer[$iClosingPos - $iSlashCount - 1])
							{
								++$iSlashCount;
							}

							if ($iSlashCount % 2 == 1)
							{
								++$iClosingPos;
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

				case 'GOTO_DEFAULT' === $sChar:
				default:
					$iCharBlockStartPos = $iPos;

					if ($oImapResponse && $oImapResponse->IsStatusResponse)
					{
						$iPos = $iBufferEndIndex;

						while ($iPos > $iCharBlockStartPos && $this->sResponseBuffer[$iCharBlockStartPos] === ' ')
						{
							++$iCharBlockStartPos;
						}
					}

					$bIsAtomDone = false;
					while (!$bIsAtomDone && ($iPos <= $iBufferEndIndex))
					{
						$sCharDef = $this->sResponseBuffer[$iPos];
						switch (true)
						{
							case ('[' === $sCharDef || ']' === $sCharDef || '(' === $sCharDef || ')' === $sCharDef) &&
								$this->skipBracketParse($oImapResponse):
								++$iPos;
								break;
							case '[' === $sCharDef:
								if (null === $sAtomBuilder)
								{
									$sAtomBuilder = '';
								}

								$sAtomBuilder .= \substr($this->sResponseBuffer, $iCharBlockStartPos, $iPos - $iCharBlockStartPos + 1);

								++$iPos;
								$this->iResponseBufParsedPos = $iPos;

								$sListBlock = $this->partialParseResponseBranch(null, true,
									null === $sPreviousAtomUpperCase ? '' : \strtoupper($sPreviousAtomUpperCase),
									'[');

								if (null !== $sListBlock)
								{
									$sAtomBuilder .= $sListBlock.']';
								}

								$iPos = $this->iResponseBufParsedPos;
								$iCharBlockStartPos = $iPos;
								break;
							case ' ' === $sCharDef:
							case ')' === $sCharDef && '(' === $sOpenBracket:
							case ']' === $sCharDef && '[' === $sOpenBracket:
								$bIsAtomDone = true;
								break;
							default:
								++$iPos;
								break;
						}
					}

					if ($iPos > $iCharBlockStartPos || null !== $sAtomBuilder)
					{
						$sLastCharBlock = \substr($this->sResponseBuffer, $iCharBlockStartPos, $iPos - $iCharBlockStartPos);
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

						if ($oImapResponse)
						{
//							if (1 === \count($aList))
							if (!$bCountOneInited && 1 === \count($aList))
//							if (isset($aList[0]) && !isset($aList[1])) // fast 1 === \count($aList)
							{
								$bCountOneInited = true;

								$oImapResponse->Tag = $aList[0];
								if ('+' === $oImapResponse->Tag)
								{
									$oImapResponse->ResponseType = Enumerations\ResponseType::CONTINUATION;
								}
								else if ('*' === $oImapResponse->Tag)
								{
									$oImapResponse->ResponseType = Enumerations\ResponseType::UNTAGGED;
								}
								else if ($this->getCurrentTag() === $oImapResponse->Tag)
								{
									$oImapResponse->ResponseType = Enumerations\ResponseType::TAGGED;
								}
								else
								{
									$oImapResponse->ResponseType = Enumerations\ResponseType::UNKNOWN;
								}
							}
//							else if (2 === \count($aList))
							else if (!$bCountTwoInited && 2 === \count($aList))
//							else if (isset($aList[1]) && !isset($aList[2])) // fast 2 === \count($aList)
							{
								$bCountTwoInited = true;

								$oImapResponse->StatusOrIndex = strtoupper($aList[1]);

								if ($oImapResponse->StatusOrIndex == Enumerations\ResponseStatus::OK ||
									$oImapResponse->StatusOrIndex == Enumerations\ResponseStatus::NO ||
									$oImapResponse->StatusOrIndex == Enumerations\ResponseStatus::BAD ||
									$oImapResponse->StatusOrIndex == Enumerations\ResponseStatus::BYE ||
									$oImapResponse->StatusOrIndex == Enumerations\ResponseStatus::PREAUTH)
								{
									$oImapResponse->IsStatusResponse = true;
								}
							}
							else if (Enumerations\ResponseType::CONTINUATION === $oImapResponse->ResponseType)
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

		if (100000 < $iDebugCount)
		{
			$this->Logger()->Write('PartialParseOverResult: '.$iDebugCount, \MailSo\Log\Enumerations\Type::ERROR);
		}

		return $bTreatAsAtom ? $sAtomBuilder : $aList;
	}

	private function partialResponseLiteralCallbackCallable(string $sParent, string $sLiteralAtomUpperCase, int $iLiteralLen) : bool
	{
		if (!$this->aFetchCallbacks) {
			return false;
		}

		$sLiteralAtomUpperCasePeek = '';
		if (0 === \strpos($sLiteralAtomUpperCase, 'BODY'))
		{
			$sLiteralAtomUpperCasePeek = \str_replace('BODY', 'BODY.PEEK', $sLiteralAtomUpperCase);
		}

		$sFetchKey = '';
		if (0 < \strlen($sLiteralAtomUpperCasePeek) && isset($this->aFetchCallbacks[$sLiteralAtomUpperCasePeek]))
		{
			$sFetchKey = $sLiteralAtomUpperCasePeek;
		}
		else if (0 < \strlen($sLiteralAtomUpperCase) && isset($this->aFetchCallbacks[$sLiteralAtomUpperCase]))
		{
			$sFetchKey = $sLiteralAtomUpperCase;
		}

		if (empty($this->aFetchCallbacks[$sFetchKey]) || !\is_callable($this->aFetchCallbacks[$sFetchKey])) {
			return false;
		}

		$rImapLiteralStream =
			\MailSo\Base\StreamWrappers\Literal::CreateStream($this->rConnect, $iLiteralLen);

		$this->writeLog('Start Callback for '.$sParent.' / '.$sLiteralAtomUpperCase.
			' - try to read '.$iLiteralLen.' bytes.', \MailSo\Log\Enumerations\Type::NOTE);

		$this->bRunningCallback = true;

		try
		{
			\call_user_func($this->aFetchCallbacks[$sFetchKey],
				$sParent, $sLiteralAtomUpperCase, $rImapLiteralStream);
		}
		catch (\Throwable $oException)
		{
			$this->writeLog('Callback Exception', \MailSo\Log\Enumerations\Type::NOTICE);
			$this->writeLogException($oException);
		}

		if ($rImapLiteralStream)
		{
			$iNotReadLiteralLen = 0;

			$bFeof = \feof($rImapLiteralStream);
			$this->writeLog('End Callback for '.$sParent.' / '.$sLiteralAtomUpperCase.
				' - feof = '.($bFeof ? 'good' : 'BAD'), $bFeof ?
					\MailSo\Log\Enumerations\Type::NOTE : \MailSo\Log\Enumerations\Type::WARNING);

			if (!$bFeof)
			{
				while (!\feof($rImapLiteralStream))
				{
					$sBuf = \fread($rImapLiteralStream, 1024 * 1024);
					if (false === $sBuf || 0 === \strlen($sBuf) ||  null === $sBuf)
					{
						break;
					}

					\MailSo\Base\Utils::ResetTimeLimit();
					$iNotReadLiteralLen += \strlen($sBuf);
				}

				if (!\feof($rImapLiteralStream))
				{
					\stream_get_contents($rImapLiteralStream);
				}
			}

			\fclose($rImapLiteralStream);

			if ($iNotReadLiteralLen > 0)
			{
				$this->writeLog('Not read literal size is '.$iNotReadLiteralLen.' bytes.',
					\MailSo\Log\Enumerations\Type::WARNING);
			}
		}
		else
		{
			$this->writeLog('Literal stream is not resource after callback.',
				\MailSo\Log\Enumerations\Type::WARNING);
		}

		\MailSo\Base\Loader::IncStatistic('NetRead', $iLiteralLen);

		$this->bRunningCallback = false;

		return true;
	}

	private function prepareParamLine(array $aParams = array()) : string
	{
		$sReturn = '';
		foreach ($aParams as $mParamItem)
		{
			if (\is_array($mParamItem) && 0 < \count($mParamItem))
			{
				$sReturn .= ' ('.\trim($this->prepareParamLine($mParamItem)).')';
			}
			else if (\is_string($mParamItem))
			{
				$sReturn .= ' '.$mParamItem;
			}
		}
		return $sReturn;
	}

	private function getNewTag() : string
	{
		++$this->iTagCount;
		return $this->getCurrentTag();
	}

	private function getCurrentTag() : string
	{
		return self::TAG_PREFIX.$this->iTagCount;
	}

	public function EscapeString(string $sStringForEscape) : string
	{
		return '"'.\str_replace(array('\\', '"'), array('\\\\', '\\"'), $sStringForEscape).'"';
	}

	protected function getLogName() : string
	{
		return 'IMAP';
	}
}
