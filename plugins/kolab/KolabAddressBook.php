<?php

use RainLoop\Providers\AddressBook\Classes\Contact;

class KolabAddressBook implements \RainLoop\Providers\AddressBook\AddressBookInterface
{
	use \RainLoop\Providers\AddressBook\CardDAV;

	protected
		$oImapClient,
		$sFolderName;

	function __construct(string $sFolderName)
	{
		$metadata = $this->ImapClient()->FolderGetMetadata($sFolderName, [\MailSo\Imap\Enumerations\MetadataKeys::KOLAB_CTYPE]);
		if (!$metadata || 'contact' !== \array_shift($metadata)) {
			$sFolderName = '';
//			throw new \Exception("Invalid kolab contact folder: {$sFolderName}");
		}

		$this->sFolderName = $sFolderName;
	}

	protected function MailClient() : \MailSo\Mail\MailClient
	{
		$oActions = \RainLoop\Api::Actions();
		$oMailClient = $oActions->MailClient();
		if (!$oMailClient->IsLoggined()) {
			$oActions->getAccountFromToken()->ImapConnectAndLoginHelper($oActions->Plugins(), $oMailClient->ImapClient(), $oActions->Config());
		}
		return $oMailClient;
	}

	protected function ImapClient() : \MailSo\Imap\ImapClient
	{
		if (!$this->oImapClient) {
			$this->oImapClient = $this->MailClient()->ImapClient();
		}
		return $this->oImapClient;
	}

	protected function SelectFolder() : bool
	{
		$sFolderName = $this->sFolderName;
		if ($sFolderName) {
			try {
				$this->ImapClient()->FolderSelect($sFolderName);
				return true;
			} catch (\Throwable $e) {
				\trigger_error("KolabAddressBook {$sFolderName} error: {$e->getMessage()}");
			}
		}
		return false;
	}

	protected function fetchXCardFromMessage(\MailSo\Mail\Message $oMessage) : ?\Sabre\VObject\Component\VCard
	{
		$xCard = null;
		try {
			foreach ($oMessage->Attachments() ?: [] as $oAttachment)  {
				if ('application/vcard+xml' === $oAttachment->MimeType()) {
					$result = $this->MailClient()->MessageMimeStream(function ($rResource) use (&$xCard) {
						if (\is_resource($rResource)) {
							$xCard = \Sabre\VObject\Reader::readXML($rResource);
						}
					}, $this->sFolderName, $oMessage->Uid(), $oAttachment->MimeIndex());
					break;
				}
			}
		} catch (\Throwable $e) {
			\error_log("KolabAddressBook message {$oMessage->Uid()} error: {$e->getMessage()}");
		}
		return $xCard;
	}

	protected function MessageAsContact(\MailSo\Mail\Message $oMessage) : Contact
	{
		$oContact = new Contact;
		$oContact->id = $oMessage->Uid();
		$oContact->Changed = $oMessage->HeaderTimeStampInUTC();

		// Fetch xCard attachment and populate $oContact with it
		$xCard = $this->fetchXCardFromMessage($oMessage);
		if ($xCard) {
			$oContact->setVCard($xCard);
		}

		// Reset, else it is 'urn:uuid:01234567-89AB-CDEF-0123-456789ABCDEF'
		$oContact->IdContactStr = $oMessage->Subject();
		$oContact->IdContactStr = \str_replace('urn:uuid:', '', $oContact->IdContactStr);

		return $oContact;
	}

	public function IsSupported() : bool
	{
		// Check $this->ImapClient()->hasCapability('METADATA')
		return true;
	}

	public function SetEmail(string $sEmail) : bool
	{
		return true;
	}

	/**
	 * Sync with davClient
	 */
	public function Sync() : bool
	{
		// TODO
		return false;
	}

	public function Export(string $sType = 'vcf') : bool
	{
		$rCsv = 'csv' === $sType ? \fopen('php://output', 'w') : null;
		$bCsvHeader = true;

		if (!\strlen($this->sFolderName)) {
//			return false;
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantGetMessageList);
		}

		$this->ImapClient();

		try
		{
			$oParams = new \MailSo\Mail\MessageListParams;
			$oParams->sFolderName = $this->sFolderName;
//			$oParams->iOffset = 0;
			$oParams->iLimit = 999; // Is the max
			$oMessageList = $this->MailClient()->MessageList($oParams);
			foreach ($oMessageList as $oMessage) {
				if ($rCsv) {
					$oContact = $this->MessageAsContact($oMessage);
					\RainLoop\Providers\AddressBook\Utils::VCardToCsv($rCsv, $oContact, $bCsvHeader);
					$bCsvHeader = false;
				} else if ($xCard = $this->fetchXCardFromMessage($oMessage)) {
					echo $xCard->serialize();
				}
			}
		}
		catch (\Throwable $oException)
		{
			throw $oException;
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantGetMessageList, $oException);
		}
		return true;
	}

	public function ContactSave(Contact $oContact) : bool
	{
		if (!$this->SelectFolder()) {
			return false;
		}

		$id = $oContact->id;
		$sUID = '';

		$oVCard = $oContact->vCard;

		$oPrevMessage = $this->MailClient()->Message($this->sFolderName, $id);
		if ($oPrevMessage) {
			$sUID = $oPrevMessage->Subject();
			if (!$sUID) {
				$oVCard = $this->fetchXCardFromMessage($oPrevMessage);
				$sUID = \str_replace('urn:uuid:', '', $oVCard->UID);
			}
		} else {
			$id = 0;
		}

		if (!$sUID || !\SnappyMail\UUID::isValid($sUID)) {
			$sUID = \SnappyMail\UUID::generate();
		}
		$oVCard->UID = new \Sabre\VObject\Property\Uri($oVCard, 'uid', 'urn:uuid:' . $sUID);
		$oContact->IdContactStr = $sUID;

		if (!\count($oVCard->select('x-kolab-version'))) {
			$oVCard->add(new \Sabre\VObject\Property\Text($oVCard, 'x-kolab-version', '3.1.0'));
		}

		$oVCard->VERSION = '3.0';
//		$oVCard->PRODID = 'SnappyMail-'.APP_VERSION;
		$oVCard->KIND = 'individual';

		$oMessage = new \MailSo\Mime\Message();
		$oMessage->DoesNotAddDefaultXMailer();
		$oMessage->messageIdRequired = false;

		$sEmail = '';
		if ($oVCard && isset($oVCard->EMAIL)) {
			foreach ($oVCard->EMAIL as $oProp) {
				$oTypes = $oProp ? $oProp['TYPE'] : null;
				$sValue = $oProp ? \trim($oProp->getValue()) : '';
				if ($sValue && (!$sEmail || ($oTypes && $oTypes->has('PREF')))) {
					$sEmail = $sValue;
				}
			}
			if ($sEmail) {
				$oMessage->SetFrom(new \MailSo\Mime\Email($sEmail, (string) $oVCard->FN));
			}
		}

		$oMessage->SetSubject($sUID);
//		$oMessage->SetDate(\time());
		$oMessage->SetCustomHeader('X-Kolab-Type', 'application/x-vnd.kolab.contact');
		$oMessage->SetCustomHeader('X-Kolab-Mime-Version', '3.0');
		$oMessage->SetCustomHeader('User-Agent', 'SnappyMail');

		$oPart = new \MailSo\Mime\Part;
		$oPart->Headers->AddByName(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE, 'text/plain; charset="us-ascii"');
		$oPart->Headers->AddByName(\MailSo\Mime\Enumerations\Header::CONTENT_TRANSFER_ENCODING, '7Bit');
		$oPart->Body = "This is a Kolab Groupware object.\r\n"
			. "To view this object you will need an email client that can understand the Kolab Groupware format.\r\n"
			. "For a list of such email clients please visit\r\n"
			. "https://en.wikipedia.org/wiki/Kolab\r\n";
		$oMessage->SubParts->append($oPart);

		// Now the vCard
		$oPart = new \MailSo\Mime\Part;
		$oPart->Headers->AddByName(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE, 'application/vcard+xml; name="kolab.xml"');
		$oPart->Headers->AddByName(\MailSo\Mime\Enumerations\Header::CONTENT_TRANSFER_ENCODING, 'quoted-printable');
		$oPart->Headers->AddByName(\MailSo\Mime\Enumerations\Header::CONTENT_DISPOSITION, 'attachment; filename="kolab.xml"');
		$oPart->Body = \quoted_printable_encode(\preg_replace('/\r?\n/s', "\r\n",
			\str_replace('encoding="UTF-8"', 'encoding="UTF-8" standalone="no" ', \Sabre\VObject\Writer::writeXml($oVCard))
		));
		$oMessage->SubParts->append($oPart);

		// Store Message
		$rMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();
		$iMessageStreamSize = \MailSo\Base\Utils::MultipleStreamWriter(
			$oMessage->ToStream(false), array($rMessageStream), 8192, true, true);
		if (false !== $iMessageStreamSize) {
			\rewind($rMessageStream);
			$this->ImapClient()->MessageReplaceStream($this->sFolderName, $id, $rMessageStream, $iMessageStreamSize);
		}

		return true;
	}

	public function DeleteContacts(array $aContactIds) : bool
	{
		try {
			$this->MailClient()->MessageDelete(
				$this->sFolderName,
				new \MailSo\Imap\SequenceSet($aContactIds)
			);
/*
			// Delete remote when Mode = read + write
			if (1 === $oConfig['Mode']) {
				$oClient = $this->getDavClient();
				if ($oClient) {
					$sPath = $oClient->__UrlPath__;
					$aRemoteSyncData = $this->prepareDavSyncData($oClient, $sPath);
					if ($aRemoteSyncData && isset($aRemoteSyncData[$sKey], $aRemoteSyncData[$sKey]['vcf'])) {
						$this->davClientRequest($oClient, 'DELETE', $sPath.$aRemoteSyncData[$sKey]['vcf']);
					}
				}
			}
*/
			return true;
		} catch (\Throwable $e) {
		}
		return false;
	}

	public function DeleteAllContacts(string $sEmail) : bool
	{
		// Called by \RainLoop\Api::ClearUserData()
		// Not needed as the contacts are inside IMAP mailbox
//		$this->MailClient()->FolderClear($this->sFolderName);
		return false;
	}

	public function GetContacts(int $iOffset = 0, int $iLimit = 20, string $sSearch = '', int &$iResultCount = 0) : array
	{
		if (!\strlen($this->sFolderName)) {
//			return [];
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantGetMessageList);
		}

		$this->ImapClient();

		$aResult = [];

		try
		{
			$oParams = new \MailSo\Mail\MessageListParams;
			$oParams->sFolderName = $this->sFolderName;
			$oParams->iOffset = $iOffset;
			$oParams->iLimit = $iLimit;
			if ($sSearch) {
				$oParams->sSearch = 'from='.$sSearch;
			}
			$oParams->sSort = 'FROM';
			$oParams->bUseSortIfSupported = !!\RainLoop\Api::Actions()->Config()->Get('labs', 'use_imap_sort', true);
//			$oParams->iPrevUidNext = $this->GetActionParam('UidNext', 0);
//			$oParams->bUseThreads = false;

			$oMessageList = $this->MailClient()->MessageList($oParams);
			foreach ($oMessageList as $oMessage) {
				$aResult[] = $this->MessageAsContact($oMessage);
			}
		}
		catch (\Throwable $oException)
		{
			throw $oException;
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantGetMessageList, $oException);
		}

		return $aResult;
	}

	public function GetContactByEmail(string $sEmail) : ?Contact;
	{
		// TODO
		return null;
	}

	public function GetContactByID($mID, bool $bIsStrID = false) : ?Contact
	{
		if ($bIsStrID) {
			$oMessage = null;
		} else {
			$oMessage = $this->MailClient()->Message($this->sFolderName, $mID);
		}
		return $oMessage ? $this->MessageAsContact($oMessage) : null;
	}

	public function GetSuggestions(string $sSearch, int $iLimit = 20) : array
	{
		$sSearch = \trim($sSearch);
		if (2 > \strlen($sSearch) || !$this->SelectFolder()) {
			return [];
		}

		$sSearch = \MailSo\Imap\SearchCriterias::escapeSearchString($this->ImapClient(), $sSearch);
		$aUids = \array_slice(
			$this->ImapClient()->MessageSimpleSearch("FROM {$sSearch}"),
			0, $iLimit
		);

		$aResult = [];
		foreach ($this->ImapClient()->Fetch(['BODY.PEEK[HEADER.FIELDS (FROM)]'], \implode(',', $aUids), true) as $oFetchResponse) {
			$oHeaders = new \MailSo\Mime\HeaderCollection($oFetchResponse->GetHeaderFieldsValue());
			$oFrom = $oHeaders->GetAsEmailCollection(\MailSo\Mime\Enumerations\Header::FROM_, true);
			foreach ($oFrom as $oMail) {
				$aResult[] = [$oMail->GetEmail(), $oMail->GetDisplayName()];
			}
		}

		return $aResult;
	}

	public function IncFrec(array $aEmails, bool $bCreateAuto = true) : bool
	{
		return false;
	}

	public function Test() : string
	{
		// Nothing to test
		return '';
	}
}
