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
	use Traits\ResponseParser;

	const
		TAG_PREFIX = 'TAG';

	/**
	 * @var int
	 */
	private $iTagCount = 0;

	/**
	 * @var array
	 */
	private $aCapabilityItems = null;

	/**
	 * @var FolderInformation
	 */
	private $oCurrentFolderInfo = null;

	/**
	 * @var array
	 */
	private $aFetchCallbacks;

	/**
	 * @var array
	 */
	private $aTagTimeouts = array();

	/**
	 * @var bool
	 */
	private $bIsLoggined = false;

	/**
	 * @var string
	 */
	private $sLogginedUser = '';

	/**
	 * @var bool
	 */
	public $__FORCE_SELECT_ON_EXAMINE__ = false;

	function __construct()
	{
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
	public function Login(array $aCredentials) : self
	{
		if (!empty($aCredentials['ProxyAuthUser']) && !empty($aCredentials['ProxyAuthPassword'])) {
			$sLogin = \MailSo\Base\Utils::IdnToAscii(\MailSo\Base\Utils::Trim($aCredentials['ProxyAuthUser']));
			$sPassword = $aCredentials['ProxyAuthPassword'];
			$sProxyAuthUser = $aCredentials['Login'];
		} else {
			$sLogin = \MailSo\Base\Utils::IdnToAscii(\MailSo\Base\Utils::Trim($aCredentials['Login']));
			$sPassword = $aCredentials['Password'];
			$sProxyAuthUser = '';
		}

		if (!\strlen($sLogin) || !\strlen($sPassword))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->sLogginedUser = $sLogin;

//		$encrypted = !empty(\stream_get_meta_data($this->ConnectionResource())['crypto']);
		$type = $this->IsSupported('LOGINDISABLED') ? '' : 'LOGIN'; // RFC3501 6.2.3
		$types = [
			// if !$encrypted:
//			'SCRAM-SHA-256' => 1,
//			'SCRAM-SHA-1' => 1,
			// if $encrypted:
			'CRAM-MD5' => $aCredentials['UseAuthCramMd5IfSupported'],
			'PLAIN' => $aCredentials['UseAuthPlainIfSupported'],
			'OAUTHBEARER' => $aCredentials['UseAuthOAuth2IfSupported'],
			'XOAUTH2' => $aCredentials['UseAuthOAuth2IfSupported'],
			'LOGIN' => 1
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
			if (0 === \strpos($type, 'SCRAM-'))
			{
				$sAuthzid = $this->getResponseValue($this->SendRequestGetResponse('AUTHENTICATE', array($type)), Enumerations\ResponseType::CONTINUATION);
				$this->sendRaw($SASL->authenticate($sLogin, $sPassword/*, $sAuthzid*/), true);
				$sChallenge = $SASL->challenge($this->getResponseValue($this->getResponse(), Enumerations\ResponseType::CONTINUATION));
				if ($this->oLogger) {
					$this->oLogger->AddSecret($sChallenge);
				}
				$this->sendRaw($sChallenge, true, '*******');
				$oResponse = $this->getResponse();
				$sSignature = $this->getResponseValue($oResponse);
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
				$oResponse = $this->getResponse();
			}
			else if ('PLAIN' === $type || 'OAUTHBEARER' === $type)
			{
				$sAuth = $SASL->authenticate($sLogin, $sPassword);
				if ($this->oLogger) {
					$this->oLogger->AddSecret($sAuth);
				}
				if ($this->IsSupported('SASL-IR')) {
					$oResponse = $this->SendRequestGetResponse('AUTHENTICATE', array($type, $sAuth));
				} else {
					$this->SendRequestGetResponse('AUTHENTICATE', array($type));
					$this->sendRaw($sAuth, true, '*******');
					$oResponse = $this->getResponse();
				}
			}
			else if ('XOAUTH2' === $type)
			{
				$sAuth = $SASL->authenticate($sLogin, $sPassword);
				$this->SendRequest('AUTHENTICATE', array($type, $sAuth));
				$oResponse = $this->getResponse();
				$oR = $oResponse->getLast();
				if ($oR && Enumerations\ResponseType::CONTINUATION === $oR->ResponseType) {
					if (!empty($oR->ResponseList[1]) && preg_match('/^[a-zA-Z0-9=+\/]+$/', $oR->ResponseList[1])) {
						$this->Logger()->Write(\base64_decode($oR->ResponseList[1]),
							\MailSo\Log\Enumerations\Type::WARNING);
					}
					$this->sendRaw('');
					$oResponse = $this->getResponse();
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
				$oResponse = $this->getResponse();
			}
			else
			{
				if ($this->oLogger)
				{
					$this->oLogger->AddSecret($this->EscapeString($sPassword));
				}
				$oResponse = $this->SendRequestGetResponse('LOGIN',
					array(
						$this->EscapeString($sLogin),
						$this->EscapeString($sPassword)
					));
			}

			$this->aCapabilityItems = $oResponse->getCapabilityResult();

			if (\strlen($sProxyAuthUser))
			{
				$this->SendRequestGetResponse('PROXYAUTH', array($this->EscapeString($sProxyAuthUser)));
			}
/*
			// RFC 9051
			if ($this->IsSupported('IMAP4rev2')) {
				$this->SendRequestGetResponse('ENABLE', array('IMAP4rev1'));
			}
*/
		}
		catch (Exceptions\NegativeResponseException $oException)
		{
			$this->writeLogException(
				new Exceptions\LoginBadCredentialsException(
					$oException->GetResponses(), '', 0, $oException),
				\MailSo\Log\Enumerations\Type::NOTICE, true);
		}

		$this->bIsLoggined = true;

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	public function Logout() : void
	{
		if ($this->bIsLoggined)
		{
			$this->bIsLoggined = false;
			$this->SendRequestGetResponse('LOGOUT');
		}
	}

	public function IsLoggined() : bool
	{
		return $this->IsConnected() && $this->bIsLoggined;
	}

	public function IsSelected() : bool
	{
		return $this->IsLoggined() && $this->oCurrentFolderInfo;
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
	 *     IMAP4rev1 IMAP4rev2 SASL-IR LOGIN-REFERRALS ID ENABLE IDLE SORT SORT=DISPLAY
	 *     THREAD=REFERENCES THREAD=REFS THREAD=ORDEREDSUBJECT MULTIAPPEND
	 *     URL-PARTIAL CATENATE UNSELECT CHILDREN NAMESPACE UIDPLUS LIST-EXTENDED
	 *     I18NLEVEL=1 CONDSTORE QRESYNC ESEARCH ESORT SEARCHRES WITHIN CONTEXT=SEARCH
	 *     LIST-STATUS BINARY MOVE SNIPPET=FUZZY PREVIEW=FUZZY STATUS=SIZE LITERAL+ NOTIFY SPECIAL-USE
	 *     STARTTLS AUTH= LOGIN LOGINDISABLED QUOTA
	 *     METADATA METADATA-SERVER
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function IsSupported(string $sExtentionName) : bool
	{
		$sExtentionName = \trim($sExtentionName);
		if ($sExtentionName && null === $this->aCapabilityItems) {
			$this->aCapabilityItems = $this->Capability();
		}

		return $sExtentionName && \in_array(\strtoupper($sExtentionName), $this->aCapabilityItems ?: []);
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
		// Uncomment will work issue #124 ?
//		$this->selectOrExamineFolder($sFolderName, true);
		$this->SendRequestGetResponse('DELETE',
			array($this->EscapeString($sFolderName)));
//		$this->FolderCheck();
//		$this->FolderUnSelect();
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
		$oFolderInfo = $this->oCurrentFolderInfo;
		if ($oFolderInfo && $sFolderName === $oFolderInfo->FolderName) {
			$aResult = $oFolderInfo->getStatusItems();
			// SELECT or EXAMINE command then UNSEEN is the message sequence number of the first unseen message
			$aResult['UNSEEN'] = $this->simpleESearchOrESortHelper(false, 'UNSEEN', ['COUNT'])['COUNT'];
		} else {
			$aResult = \count($aStatusItems)
				? $this->SendRequestGetResponse('STATUS', array($this->EscapeString($sFolderName), $aStatusItems))
					->getStatusFolderInformationResult()
				: null;
		}
		return $aResult;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	private function specificFolderList(bool $bIsSubscribeList, string $sParentFolderName = '', string $sListPattern = '*', bool $bUseListStatus = false) : array
	{
		$sCmd = 'LIST';

		$aParameters = array();
		$aReturnParams = array();

		if ($bIsSubscribeList) {
			// IMAP4rev2 deprecated
			$sCmd = 'LSUB';
		} else if ($this->IsSupported('LIST-EXTENDED')) {
			// RFC 5258
			$aReturnParams[] = 'SUBSCRIBED';
//			$aReturnParams[] = 'CHILDREN';
			if ($bIsSubscribeList) {
				$aParameters[] = ['SUBSCRIBED'/*,'REMOTE','RECURSIVEMATCH'*/];
			} else {
//				$aParameters[0] = '()';
			}
		}

		$aParameters[] = $this->EscapeString($sParentFolderName);
		$aParameters[] = $this->EscapeString(\strlen(\trim($sListPattern)) ? $sListPattern : '*');

		if ($bUseListStatus && !$bIsSubscribeList && $this->IsSupported('LIST-STATUS'))
		{
			// RFC 5819
			$aL = array(
				Enumerations\FolderStatus::MESSAGES,
				Enumerations\FolderStatus::UNSEEN,
				Enumerations\FolderStatus::UIDNEXT
			);

			if ($this->IsSupported('CONDSTORE')) {
				$aL[] = Enumerations\FolderStatus::HIGHESTMODSEQ;
			}

			$aReturnParams[] = 'STATUS';
			$aReturnParams[] = $aL;
		}

		if ($aReturnParams) {
			$aParameters[] = 'RETURN';
			$aParameters[] = $aReturnParams;
		}

		$aReturn = $this->SendRequestGetResponse($sCmd, $aParameters)->getFoldersResult($sCmd);

		// RFC 5464
		if (!$bIsSubscribeList && $this->IsSupported('METADATA')) {
			foreach ($aReturn as $oFolder) {
				try {
					foreach ($this->getMetadata($oFolder->FullNameRaw(), ['/shared', '/private'], ['DEPTH'=>'infinity']) as $key => $value) {
						$oFolder->SetMetadata($key, $value);
					}
				} catch (\Throwable $e) {
					// Ignore error
				}
			}
		}

		return $aReturn;
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
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderHierarchyDelimiter(string $sFolderName = '') : ?string
	{
		$oResponse = $this->SendRequestGetResponse('LIST', ['""', $this->EscapeString($sParentFolderName)]);
		return ('LIST' === $oResponse[0]->ResponseList[1]) ? $oResponse[0]->ResponseList[3] : null;
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

		if (!\strlen(\trim($sFolderName)))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}

		/**
		 * IMAP4rev2 SELECT/EXAMINE are now required to return an untagged LIST response.
		 */
		$this->oCurrentFolderInfo = $this->SendRequestGetResponse($bIsWritable ? 'SELECT' : 'EXAMINE',
			array($this->EscapeString($sFolderName)))
			->getCurrentFolderInformation($sFolderName, $bIsWritable);

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
	 * The EXAMINE command is identical to SELECT and returns the same output;
	 * however, the selected mailbox is identified as read-only.
	 * No changes to the permanent state of the mailbox, including per-user state,
	 * are permitted; in particular, EXAMINE MUST NOT cause messages to lose the \Recent flag.
	 *
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
	public function FolderCheck() : self
	{
		if ($this->IsSelected()) {
			$this->SendRequestGetResponse('CHECK');
		}
		return $this;
	}

	/**
	 * This also expunge the mailbox
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderClose() : self
	{
		if ($this->IsSelected()) {
			$this->SendRequestGetResponse('CLOSE');
			$this->oCurrentFolderInfo = null;
		}
		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderUnSelect() : self
	{
		if ($this->IsSelected()) {
			if ($this->IsSupported('UNSELECT')) {
				$this->SendRequestGetResponse('UNSELECT');
				$this->oCurrentFolderInfo = null;
			} else {
				try {
					$this->SendRequestGetResponse('SELECT', '""');
					// * OK [CLOSED] Previous mailbox closed.
					// 3 NO [CANNOT] Invalid mailbox name: Name is empty
				} catch (Exceptions\NegativeResponseException $e) {
					if ('NO' === $e->GetResponseStatus()) {
						$this->oCurrentFolderInfo = null;
					}
				}
			}
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
		if (!\strlen(\trim($sIndexRange)))
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
				if (\strlen($sName) && '' !== $mItem)
				{
					$this->aFetchCallbacks[$sName] = $mItem;
				}
			}

			$aParams = array($sIndexRange, \array_keys($aFetchItems));
			/**
			 * TODO:
			 *   https://datatracker.ietf.org/doc/html/rfc4551#section-3.3.1
			 *     $aParams[1][] = FLAGS
			 *     $aParams[] = (CHANGEDSINCE $modsequence)
			 *   https://datatracker.ietf.org/doc/html/rfc4551#section-3.3.2
			 *     $aParams[1][] = MODSEQ
			 */

			$oResult = $this->SendRequestGetResponse(($bIndexIsUid ? 'UID ' : '').'FETCH', $aParams);
		} finally {
			$this->aFetchCallbacks = array();
		}

		return $oResult->getFetchResult($this->oLogger);
	}

	/**
	 * https://datatracker.ietf.org/doc/html/rfc2087#section-4.2
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 * /
	public function Quota(string $sRootName = '') : ?array
	{
		if ($this->IsSupported('QUOTA'))
		{
			return $this->SendRequestGetResponse("GETQUOTA {$this->EscapeString($sRootName)}")->getQuotaResult();
		}

		return null;
	}
*/

	/**
	 * https://datatracker.ietf.org/doc/html/rfc2087#section-4.3
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function QuotaRoot(string $sFolderName = 'INBOX') : ?array
	{
		if ($this->IsSupported('QUOTA'))
		{
			return $this->SendRequestGetResponse("GETQUOTAROOT {$this->EscapeString($sFolderName)}")->getQuotaResult();
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
		$sSearchCriterias = !\strlen(\trim($sSearchCriterias)) || '*' === $sSearchCriterias
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
		$sSearchCriterias = !\strlen($sSearchCriterias) || '*' === $sSearchCriterias
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
			// ALL OR COUNT | MIN | MAX
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
/*
			TODO: https://github.com/the-djmaze/snappymail/issues/154
			https://datatracker.ietf.org/doc/html/rfc6237
			$sCmd = 'ESEARCH';
			$aReques[] = 'IN';
			$aReques[] = ['mailboxes', '"folder1"', 'subtree', '"folder2"'];
			$aReques[] = ['mailboxes', '"folder1"', 'subtree-one', '"folder2"'];
*/

			if (\strlen($sCharset))
			{
				$aRequest[] = 'CHARSET';
				$aRequest[] = \strtoupper($sCharset);
			}

			$aRequest[] = 'RETURN';
			$aRequest[] = $aSearchOrSortReturn;
		}

		$aRequest[] = $sSearchCriterias;

		if (\strlen($sLimit))
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

		$aRequest = array();
		if (\strlen($sCharset))
		{
			$aRequest[] = 'CHARSET';
			$aRequest[] = \strtoupper($sCharset);
		}

		$aRequest[] = !\strlen($sSearchCriterias) || '*' === $sSearchCriterias ? 'ALL' : $sSearchCriterias;

		$sCmd = 'SEARCH';

		$sCont = $this->SendRequest($sCommandPrefix.$sCmd, $aRequest, true);
		$oResult = $this->getResponse();
		if ('' !== $sCont)
		{
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
		$sSearchCriterias = !\strlen(\trim($sSearchCriterias)) || '*' === $sSearchCriterias
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
		if (!\strlen($sIndexRange))
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
		if (!\strlen($sIndexRange))
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

		if (!$bExpungeAll && $bForceUidExpunge && \strlen($sUidRangeIfSupported) && $this->IsSupported('UIDPLUS'))
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
		if (!\strlen(\trim($sIndexRange)) ||
			!\strlen(\trim($sStoreAction)) ||
			!\count($aInputStoreItems))
		{
			return false;
		}

		/**
		 * TODO:
		 *   https://datatracker.ietf.org/doc/html/rfc4551#section-3.2
		 *     $sStoreAction[] = (UNCHANGEDSINCE $modsequence)
		 */

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

		\MailSo\Base\Utils::MultipleStreamWriter($rMessageAppendStream, array($this->ConnectionResource()));

		$this->sendRaw('');
		$oResponse = $this->getResponse();

		if (null !== $iUid)
		{
			$oLast = $oResponse->getLast();
			if ($oLast && Enumerations\ResponseType::TAGGED === $oLast->ResponseType && \is_array($oLast->OptionalResponse))
			{
				if (\strlen($oLast->OptionalResponse[0]) &&
					\strlen($oLast->OptionalResponse[2]) &&
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

	public function FolderCurrentInformation() : ?FolderInformation
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

//		$this->lastCommand = $sFakeCommand ?: $sRealCommand;

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

	/**
	 * @throws \MailSo\Imap\Exceptions\ResponseNotFoundException
	 * @throws \MailSo\Imap\Exceptions\InvalidResponseException
	 * @throws \MailSo\Imap\Exceptions\NegativeResponseException
	 */
	private function getResponse(string $sEndTag = null) : ResponseCollection
	{
		try {
			$oResult = new ResponseCollection;

			if (\is_resource($this->ConnectionResource())) {
				$sEndTag = $sEndTag ?: $this->getCurrentTag();

				while (true) {
					$oResponse = $this->partialParseResponse();
					$oResult->append($oResponse);

					// RFC 5530
					if ($sEndTag === $oResponse->Tag && \is_array($oResponse->OptionalResponse) && 'CLIENTBUG' === $oResponse->OptionalResponse[0]) {
						// The server has detected a client bug.
//						\error_log("IMAP {$oResponse->OptionalResponse[0]}: {$this->lastCommand}");
					}

					if ($sEndTag === $oResponse->Tag || Enumerations\ResponseType::CONTINUATION === $oResponse->ResponseType) {
						if (isset($this->aTagTimeouts[$sEndTag])) {
							$this->writeLog((\microtime(true) - $this->aTagTimeouts[$sEndTag]).' ('.$sEndTag.')',
								\MailSo\Log\Enumerations\Type::TIME);

							unset($this->aTagTimeouts[$sEndTag]);
						}

						break;
					}
				}
			}

			$oResult->validate();

		} catch (\Throwable $e) {
			$this->writeLogException($e, \MailSo\Log\Enumerations\Type::WARNING);
			throw $e;
		}

		return $oResult;
	}

	private function prepareParamLine(array $aParams = array()) : string
	{
		$sReturn = '';
		foreach ($aParams as $mParamItem)
		{
			if (\is_array($mParamItem) && \count($mParamItem))
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

	public function EscapeString(?string $sStringForEscape) : string
	{
		if (null === $sStringForEscape) {
			return 'NIL';
		}
/*
		// literal-string
		if (\preg_match('/[\r\n\x00\x80-\xFF]/', $sStringForEscape)) {
			return \sprintf("{%d}\r\n%s", \strlen($sStringForEscape), $sStringForEscape);
		}
*/
		// quoted-string
		return '"' . \addcslashes($sStringForEscape, '\\"') . '"';
	}

	public function getLogName() : string
	{
		return 'IMAP';
	}

	/**
	 * RFC 5464
	 */

	private function getMetadata(string $sFolderName, array $aEntries, array $aOptions = []) : array
	{
		$arguments = [];

		if ($aOptions) {
			$options = [];
			$aOptions = \array_intersect_key(
				\array_change_key_case($aOptions, CASE_UPPER),
				['MAXSIZE' => 0, 'DEPTH' => 0]
			);
			if (isset($aOptions['MAXSIZE']) && 0 < \intval($aOptions['MAXSIZE'])) {
				$options[] = 'MAXSIZE ' . \intval($aOptions['MAXSIZE']);
			}
			if (isset($aOptions['DEPTH']) && (1 == $aOptions['DEPTH'] || 'infinity' === $aOptions['DEPTH'])) {
				$options[] = "DEPTH {$aOptions['DEPTH']}";
			}
			if ($options) {
				$arguments[] = '(' . \implode(' ', $options) . ')';
			}
		}

		$arguments[] = $this->EscapeString($sFolderName);

		$arguments[] = '(' . \implode(' ', \array_map([$this, 'EscapeString'], $aEntries)) . ')';
		return $this->SendRequestGetResponse('GETMETADATA', $arguments)->getFolderMetadataResult();
	}

	/**
	 * Don't have to be logged in to call this command
	 */
	public function ServerID() : string
	{
		if ($this->IsSupported('ID')) {
			foreach ($this->SendRequestGetResponse('ID', [null]) as $oResponse) {
				if ('ID' === $oResponse->ResponseList[1] && \is_array($oResponse->ResponseList[2])) {
					$c = \count($oResponse->ResponseList[2]);
					$aResult = [];
					for ($i = 0; $i < $c; $i += 2) {
						$aResult[] = $oResponse->ResponseList[2][$i] . '=' . $oResponse->ResponseList[2][$i+1];
					}
					return \implode(' ', $aResult);
				}
			}
		}
		return 'UNKNOWN';
	}

	public function ServerGetMetadata(array $aEntries, array $aOptions = []) : array
	{
		return $this->IsSupported('METADATA-SERVER')
			? $this->getMetadata('', $aEntries, $aOptions)
			: [];
	}

	public function FolderGetMetadata(string $sFolderName, array $aEntries, array $aOptions = []) : array
	{
		return $this->IsSupported('METADATA')
			? $this->getMetadata($sFolderName, $aEntries, $aOptions)
			: [];
	}

	public function FolderSetMetadata(string $sFolderName, array $aEntries) : void
	{
		if ($this->IsSupported('METADATA')) {
			if (!$aEntries) {
				throw new \MailSo\Base\Exceptions\InvalidArgumentException("Wrong argument for SETMETADATA command");
			}

			$arguments = [$this->EscapeString($sFolderName)];

			\array_walk($aEntries, function(&$v, $k){
				$v = $this->EscapeString($k) . ' ' . $this->EscapeString($v);
			});
			$arguments[] = '(' . \implode(' ', $aEntries) . ')';

			$this->SendRequestGetResponse('SETMETADATA', $arguments);
		}
	}

}
