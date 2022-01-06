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
//	use Commands\ACL;
	use Commands\Messages;
	use Commands\Metadata;
	use Commands\Quota;

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
	 * Used by \MailSo\Mail\MailClient::MessageMimeStream
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

	/**
	 * @var bool
	 */
	private $UTF8 = false;

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

		if ($this->IsSupported('STARTTLS') && \MailSo\Net\Enumerations\ConnectionSecurityType::UseStartTLS($this->iSecurityType))
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
			// TODO: RFC 9051
			if ($this->IsSupported('IMAP4rev2')) {
				$this->SendRequestGetResponse('ENABLE', array('IMAP4rev1'));
			}
*/
			// RFC 6855 || RFC 5738
			$this->UTF8 = $this->IsSupported('UTF8=ONLY') || $this->IsSupported('UTF8=ACCEPT');
			if ($this->UTF8) {
				$this->SendRequestGetResponse('ENABLE', array('UTF8=ACCEPT'));
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
		if (!$this->aCapabilityItems) {
			$this->aCapabilityItems = $this->SendRequestGetResponse('CAPABILITY')
				->getCapabilityResult();
		}
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
		return $sExtentionName && \in_array(\strtoupper($sExtentionName), $this->Capability() ?: []);
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function GetNamespace() : ?NamespaceResult
	{
		if (!$this->IsSupported('NAMESPACE')) {
			return null;
		}

		try {
			$oResponseCollection = $this->SendRequestGetResponse('NAMESPACE');
			foreach ($oResponseCollection as $oResponse) {
				if (Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				 && 'NAMESPACE' === $oResponse->StatusOrIndex)
				{
					$oReturn = new NamespaceResult;
					$oReturn->InitByImapResponse($oResponse);
					return $oReturn;
				}
			}
			throw new Exceptions\ResponseException;
		} catch (\Throwable $e) {
			$this->writeLogException($e, \MailSo\Log\Enumerations\Type::ERROR);
			throw $e;
		}
	}

	/**
	 * RFC 7889
	 * APPENDLIMIT=<number> indicates that the IMAP server has the same upload limit for all mailboxes.
	 * APPENDLIMIT without any value indicates that the IMAP server supports this extension,
	 * and that the client will need to discover upload limits for each mailbox,
	 * as they might differ from mailbox to mailbox.
	 */
	public function AppendLimit() : ?int
	{
		if ($this->Capability()) {
			foreach ($this->aCapabilityItems as $string) {
				if ('APPENDLIMIT=' === \substr($string, 0, 12)) {
					return (int) \substr($string, 12);
				}
			}
		}
		return null;
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
			array($this->EscapeFolderName($sFolderName)));
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
			array($this->EscapeFolderName($sFolderName)));
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
			array($this->EscapeFolderName($sFolderName)));
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
			array($this->EscapeFolderName($sFolderName)));
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
			$this->EscapeFolderName($sOldFolderName),
			$this->EscapeFolderName($sNewFolderName)));
		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderStatus(string $sFolderName, array $aStatusItems) : ?array
	{
		if (!\count($aStatusItems)) {
			return null;
		}
		$oFolderInfo = $this->oCurrentFolderInfo;
		$bReselect = false;
		$bWritable = false;
		if ($oFolderInfo && $sFolderName === $oFolderInfo->FolderName) {
			/**
			 * There's a long standing IMAP CLIENTBUG where STATUS command is executed
			 * after SELECT/EXAMINE on same folder (it should not).
			 * So we must unselect the folder to be able to get the APPENDLIMIT and UNSEEN.
			 */
/*
			if ($this->IsSupported('ESEARCH')) {
				$aResult = $oFolderInfo->getStatusItems();
				// SELECT or EXAMINE command then UNSEEN is the message sequence number of the first unseen message
				$aResult['UNSEEN'] = $this->MessageSimpleESearch('UNSEEN', ['COUNT'])['COUNT'];
				return $aResult;
			}
*/
			$bWritable = $oFolderInfo->IsWritable;
			$bReselect = true;
			$this->FolderUnSelect();
		}

		$oInfo = new FolderInformation($sFolderName, false);
		$this->SendRequest('STATUS', array($this->EscapeFolderName($sFolderName), $aStatusItems));
		foreach ($this->yieldUntaggedResponses() as $oResponse) {
			$oInfo->setStatusFromResponse($oResponse);
		}

		if ($bReselect) {
			$this->selectOrExamineFolder($sFolderName, $bWritable, false);
		}
		return $oInfo->getStatusItems();
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	protected function specificFolderList(bool $bIsSubscribeList, string $sParentFolderName = '', string $sListPattern = '*', bool $bUseListStatus = false) : array
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
			// RFC 6154
			if ($this->IsSupported('SPECIAL-USE')) {
				$aReturnParams[] = 'SPECIAL-USE';
			}
		}

		$aParameters[] = $this->EscapeFolderName($sParentFolderName);
		$aParameters[] = $this->EscapeString(\strlen(\trim($sListPattern)) ? $sListPattern : '*');

		// RFC 5819
		if ($bUseListStatus && !$bIsSubscribeList && $this->IsSupported('LIST-STATUS'))
		{
			$aL = array(
				Enumerations\FolderStatus::MESSAGES,
				Enumerations\FolderStatus::UNSEEN,
				Enumerations\FolderStatus::UIDNEXT
			);
			// RFC 4551
			if ($this->IsSupported('CONDSTORE')) {
				$aL[] = Enumerations\FolderStatus::HIGHESTMODSEQ;
			}
			// RFC 7889
			if ($this->IsSupported('APPENDLIMIT')) {
				$aL[] = Enumerations\FolderStatus::APPENDLIMIT;
			}
			// RFC 8474
			if ($this->IsSupported('OBJECTID')) {
				$aTypes[] = Enumerations\FolderStatus::MAILBOXID;
			}

			$aReturnParams[] = 'STATUS';
			$aReturnParams[] = $aL;
		}
/*
		// RFC 5738
		if ($this->UTF8) {
			$aReturnParams[] = 'UTF8'; // 'UTF8ONLY';
		}
*/
		if ($aReturnParams) {
			$aParameters[] = 'RETURN';
			$aParameters[] = $aReturnParams;
		}

		$bPassthru = false;
		$aReturn = array();

		// RFC 5464
		$bMetadata = !$bIsSubscribeList && $this->IsSupported('METADATA');
		$aMetadata = null;
		if ($bMetadata) {
			// Dovecot supports fetching all METADATA at once
			$aMetadata = $this->getAllMetadata();
		}

		$this->SendRequest($sCmd, $aParameters);
		if ($bPassthru) {
			$this->streamResponse();
		} else {
			$sDelimiter = '';
			$bInbox = false;
			foreach ($this->yieldUntaggedResponses() as $oResponse) {
				if ('STATUS' === $oResponse->StatusOrIndex && isset($oResponse->ResponseList[2])) {
					$sFullName = $this->toUTF8($oResponse->ResponseList[2]);
					if (!isset($aReturn[$sFullName])) {
						$aReturn[$sFullName] = new Folder($sFullName);
					}
					$aReturn[$sFullName]->setStatusFromResponse($oResponse);
				}
				else if ($sCmd === $oResponse->StatusOrIndex && 5 === \count($oResponse->ResponseList)) {
					try
					{
						$sFullName = $this->toUTF8($oResponse->ResponseList[4]);

						/**
						 * $oResponse->ResponseList[0] = *
						 * $oResponse->ResponseList[1] = LIST (all) | LSUB (subscribed)
						 * $oResponse->ResponseList[2] = Flags
						 * $oResponse->ResponseList[3] = Delimiter
						 * $oResponse->ResponseList[4] = FullName
						 */
						if (!isset($aReturn[$sFullName])) {
							$oFolder = new Folder($sFullName,
								$oResponse->ResponseList[3], $oResponse->ResponseList[2]);
							$aReturn[$sFullName] = $oFolder;
						} else {
							$oFolder = $aReturn[$sFullName];
							$oFolder->setDelimiter($oResponse->ResponseList[3]);
							$oFolder->setFlags($oResponse->ResponseList[2]);
						}

						if ($oFolder->IsInbox()) {
							$bInbox = true;
						}

						if (!$sDelimiter) {
							$sDelimiter = $oFolder->Delimiter();
						}

						if (isset($aMetadata[$oResponse->ResponseList[4]])) {
							$oFolder->SetAllMetadata($aMetadata[$oResponse->ResponseList[4]]);
						}

						$aReturn[$sFullName] = $oFolder;
					}
					catch (\MailSo\Base\Exceptions\InvalidArgumentException $oException)
					{
						$this->writeLogException($oException, \MailSo\Log\Enumerations\Type::WARNING, false);
					}
					catch (\Throwable $oException)
					{
						$this->writeLogException($oException, \MailSo\Log\Enumerations\Type::WARNING, false);
					}
				}
			}

			if (!$bInbox && !$sParentFolderName && !isset($aReturn['INBOX'])) {
				$aReturn['INBOX'] = new Folder('INBOX', $sDelimiter);
			}
		}

		// RFC 5464
		if ($bMetadata && !$aMetadata) {
			foreach ($aReturn as $oFolder) {
				try {
					$oFolder->SetAllMetadata(
						$this->getMetadata($oFolder->FullName(), ['/shared', '/private'], ['DEPTH'=>'infinity'])
					);
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
		$oResponse = $this->SendRequestGetResponse('LIST', ['""', $this->EscapeFolderName($sFolderName)]);
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

		$aSelectParams = array();
/*
		if ($this->IsSupported('CONDSTORE')) {
			$aSelectParams[] = 'CONDSTORE';
		}
		// RFC 5738
		if ($this->UTF8) {
			$aSelectParams[] = 'UTF8';
		}
*/

		$aParams = array(
			$this->EscapeFolderName($sFolderName)
		);
		if ($aSelectParams) {
			$aParams[] = $aSelectParams;
		}

		/**
		 * IMAP4rev2 SELECT/EXAMINE are now required to return an untagged LIST response.
		 */
		$oResponseCollection = $this->SendRequestGetResponse($bIsWritable ? 'SELECT' : 'EXAMINE', $aParams);
		$oResult = new FolderInformation($sFolderName, $bIsWritable);

		$this->SendRequest($bIsWritable ? 'SELECT' : 'EXAMINE', $aParams);
		foreach ($this->yieldUntaggedResponses() as $oResponse) {
			if (!$oResult->setStatusFromResponse($oResponse)) {
				// OK untagged responses
				if (\is_array($oResponse->OptionalResponse)) {
					$key = $oResponse->OptionalResponse[0];
					if (\count($oResponse->OptionalResponse) > 1) {
						if ('PERMANENTFLAGS' === $key && \is_array($oResponse->OptionalResponse[1])) {
							$oResult->PermanentFlags = $oResponse->OptionalResponse[1];
						}
					} else if ('READ-ONLY' === $key) {
//						$oResult->IsWritable = false;
					} else if ('READ-WRITE' === $key) {
//						$oResult->IsWritable = true;
					} else if ('NOMODSEQ' === $key) {
						// https://datatracker.ietf.org/doc/html/rfc4551#section-3.1.2
					}
				}

				// untagged responses
				else if (\count($oResponse->ResponseList) > 2
				 && 'FLAGS' === $oResponse->ResponseList[1]
				 && \is_array($oResponse->ResponseList[2])) {
					$oResult->Flags = $oResponse->ResponseList[2];
				}
			}
		}

		$this->oCurrentFolderInfo = $oResult;

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
					$this->SendRequestGetResponse('SELECT', ['""']);
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

		$aReturn = array();
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

			$this->SendRequest($bIndexIsUid ? 'UID FETCH' : 'FETCH', $aParams);
			foreach ($this->yieldUntaggedResponses() as $oResponse) {
				if (FetchResponse::isValidImapResponse($oResponse)) {
					if (FetchResponse::hasUidAndSize($oResponse)) {
						$aReturn[] = new FetchResponse($oResponse);
					} else if ($this->oLogger) {
						$this->oLogger->Write('Skipped Imap Response! ['.$oResponse->ToLine().']', \MailSo\Log\Enumerations\Type::NOTICE);
					}
				}
			}
		} finally {
			$this->aFetchCallbacks = array();
		}

		return $aReturn;
	}

	/**
	 * The EXPUNGE command permanently removes all messages that have the
	 * \Deleted flag set from the currently selected mailbox.
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Imap\Exceptions\Exception
	 */
	public function FolderExpunge(SequenceSet $oUidRange = null) : self
	{
		$sCmd = 'EXPUNGE';
		$aArguments = array();

		if ($oUidRange && \count($oUidRange) && $oUidRange->UID && $this->IsSupported('UIDPLUS')) {
			$sCmd = 'UID '.$sCmd;
			$aArguments = array((string) $oUidRange);
		}

		$this->SendRequestGetResponse($sCmd, $aArguments);
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

	protected function secureRequestParams(string $sCommand, array $aParams) : ?array
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

	protected function getResponseValue(ResponseCollection $oResponseCollection, int $type = 0) : string
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
	 * TODO: passthru to parse response in JavaScript
	 * This will reduce CPU time on server and moves it to the client
	 * And can be used with the new JavaScript AbstractFetchRemote.streamPerLine(fCallback, sGetAdd)
	 *
	 * @throws \MailSo\Imap\Exceptions\ResponseNotFoundException
	 * @throws \MailSo\Imap\Exceptions\InvalidResponseException
	 * @throws \MailSo\Imap\Exceptions\NegativeResponseException
	 */
	protected function streamResponse(string $sEndTag = null) : void
	{
		try {
			if (\is_resource($this->ConnectionResource())) {
				\SnappyMail\HTTP\Stream::start();
				$sEndTag = ($sEndTag ?: $this->getCurrentTag()) . ' ';
				$sLine = \fgets($this->ConnectionResource());
				do {
					if (\str_starts_with($sLine, $sEndTag)) {
						echo 'T '.\substr($sLine, \strlen($sEndTag));
						break;
					}
					echo $sLine;
					$sLine = \fgets($this->ConnectionResource());
				} while (\strlen($sLine));
				exit;
			}
		} catch (\Throwable $e) {
			$this->writeLogException($e, \MailSo\Log\Enumerations\Type::WARNING);
			throw $e;
		}
	}

	protected function getResponse(string $sEndTag = null) : ResponseCollection
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
//						\SnappyMail\Log::warning('IMAP', "{$oResponse->OptionalResponse[0]}: {$this->lastCommand}");
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

//	public function yieldUntaggedResponses(string $sEndTag = null) : \Generator
	public function yieldUntaggedResponses(string $sEndTag = null) : iterable
	{
		try {
			$oResult = new ResponseCollection;

			if (\is_resource($this->ConnectionResource())) {
				$sEndTag = $sEndTag ?: $this->getCurrentTag();

				while (true) {
					$oResponse = $this->partialParseResponse();
					if (Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType) {
						yield $oResponse;
					} else {
						$oResult->append($oResponse);
					}

					// RFC 5530
					if ($sEndTag === $oResponse->Tag && \is_array($oResponse->OptionalResponse) && 'CLIENTBUG' === $oResponse->OptionalResponse[0]) {
						// The server has detected a client bug.
//						\SnappyMail\Log::warning('IMAP', "{$oResponse->OptionalResponse[0]}: {$this->lastCommand}");
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
	}

	protected function prepareParamLine(array $aParams = array()) : string
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

	protected function getNewTag() : string
	{
		++$this->iTagCount;
		return $this->getCurrentTag();
	}

	protected function getCurrentTag() : string
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
	 * RFC 2971
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

	public function EscapeFolderName(string $sFolderName) : string
	{
		return $this->EscapeString($this->UTF8 ? $sFolderName : \MailSo\Base\Utils::Utf8ToUtf7Modified($sFolderName));
	}

	public function toUTF8(string $sText) : string
	{
		return $this->UTF8 ? $sText : \MailSo\Base\Utils::Utf7ModifiedToUtf8($sText);
	}

}
