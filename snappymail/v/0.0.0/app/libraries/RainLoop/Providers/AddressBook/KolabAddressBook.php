<?php

namespace RainLoop\Providers\AddressBook;

use RainLoop\Providers\AddressBook\Enumerations\PropertyType;

class KolabAddressBook implements AddressBookInterface
{
	use CardDAV;

	protected
		$oImapClient,
		$sFolderName;

	protected function ImapClient() : \MailSo\Imap\ImapClient
	{
		if (!$this->oImapClient /*&&\RainLoop\Api::Config()->Get('labs', 'kolab_enabled', false)*/) {
			$oActions = \RainLoop\Api::Actions();
			$oMailClient = $oActions->MailClient();
			if (!$oMailClient->IsLoggined()) {
				$oActions->getAccountFromToken()->IncConnectAndLoginHelper($oActions->Plugins(), $oMailClient, $oActions->Config());
			}
			$this->oImapClient = $oMailClient->ImapClient();
		}
		return $this->oImapClient;
	}

	public function FolderName() : string
	{
		if (!\is_string($this->sFolderName)) {
			$oActions = \RainLoop\Api::Actions();
			$oAccount = $oActions->getAccountFromToken();
			$this->sFolderName = (string) $oActions->SettingsProvider(true)->Load($oAccount)->GetConf('KolabContactFolder', '');
		}
		return $this->sFolderName;
	}

	public function SelectFolder() : bool
	{
		try {
			$sFolderName = $this->FolderName();
			if (!$sFolderName) {
				return false;
			}

			$metadata = $this->ImapClient()->FolderGetMetadata($sFolderName, [\MailSo\Imap\Enumerations\MetadataKeys::KOLAB_CTYPE]);
			if (!$metadata || 'contact' !== \array_shift($metadata)) {
				throw new \Exception("Invalid kolab contact folder: {$sFolderName}");
			}

			$this->ImapClient()->FolderSelect($sFolderName);
			$this->sFolderName = $sFolderName;
			return true;
		} catch (\Throwable $e) {
			\trigger_error("KolabAddressBook {$sFolderName} error: {$e->getMessage()}");
		}
		return false;
	}

	public function IsSupported() : bool
	{
		// Check $this->ImapClient()->IsSupported('METADATA')
		return true;
	}

	public function IsSharingAllowed() : bool
	{
		return $this->IsSupported() && false; // TODO
	}

	public function Sync(array $oConfig) : bool
	{
		// TODO
		return false;
	}

	public function Export(string $sEmail, string $sType = 'vcf') : bool
	{
		// TODO
		return false;
	}

	public function ContactSave(string $sEmail, Classes\Contact $oContact) : bool
	{
		// TODO
//		$emails = $oContact->GetEmails();

		if (!$this->SelectFolder()) {
			return false;
		}

		$oContact->PopulateDisplayAndFullNameValue();

		$sUID = $oContact->GetUID();

		$oMessage = new \MailSo\Mime\Message();
		$oMessage->SetFrom(new \MailSo\Mime\Email($sEmail, $oContact->Display));
		$oMessage->SetSubject($sUID);
//		$oMessage->SetDate(\time());
		$oMessage->Headers->AddByName('X-Kolab-Type', 'application/x-vnd.kolab.contact');
		$oMessage->Headers->AddByName('X-Kolab-Mime-Version', '3.0');
//		$oMessage->Headers->AddByName('User-Agent', 'SnappyMail');

		$oPart = new \MailSo\Mime\Part;
		$oPart->Headers->AddByName(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE, 'text/plain');
		$oPart->Headers->AddByName(\MailSo\Mime\Enumerations\Header::CONTENT_TRANSFER_ENCODING, '7Bit');
		$oPart->Body = "This is a Kolab Groupware object.\r\n"
			. "To view this object you will need an email client that can understand the Kolab Groupware format.\r\n"
			. "For a list of such email clients please visit\r\n"
			. "http://www.kolab.org/get-kolab";
		$oMessage->SubParts->append($oPart);

		// Now the vCard
		$oPart = new \MailSo\Mime\Part;
		$oPart->Headers->AddByName(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE, 'application/vcard+xml; name="kolab.xml"');
//		$oPart->Headers->AddByName(\MailSo\Mime\Enumerations\Header::CONTENT_TRANSFER_ENCODING, 'quoted-printable');
		$oPart->Headers->AddByName(\MailSo\Mime\Enumerations\Header::CONTENT_DISPOSITION, 'attachment; filename="kolab.xml"');
		$oPart->Body = $oContact->ToXCard($sPreVCard = '', $oLogger);
		$oMessage->SubParts->append($oPart);

		// Search in IMAP folder:
		$aUids = $this->ImapClient()->MessageSimpleSearch("SUBJECT {$sUID}");
/*
		$email = \MailSo\Imap\SearchCriterias::escapeSearchString($this->ImapClient(), $sEmail);
		$aUids = $this->ImapClient()->MessageSimpleSearch("OR SUBJECT {$sUID} FROM {$email}");
		$aUids = $this->ImapClient()->MessageSimpleSearch("OR SUBJECT {$sUID} FROM {$email} BODY {$email}");

		$aUids = $this->ImapClient()->MessageSimpleSearch('HEADER Subject '.$sUID);
		return 1 === \count($aUids) && \is_numeric($aUids[0]) ? (int) $aUids[0] : null;
*/

		if ($aUids) {
			// Replace Message
			if (false && $this->ImapClient()->IsSupported('REPLACE')) {
				// UID REPLACE
			} else {
				$oRange = new \MailSo\Imap\SequenceSet($aUids[0]);
				$this->ImapClient()->MessageStoreFlag($oRange,
					array(\MailSo\Imap\Enumerations\MessageFlag::DELETED),
					\MailSo\Imap\Enumerations\StoreAction::ADD_FLAGS_SILENT
				);
				$this->ImapClient()->FolderExpunge($oRange);
			}
		}

		// Store Message
		$rMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();
		$iMessageStreamSize = \MailSo\Base\Utils::MultipleStreamWriter(
			$oMessage->ToStream(false), array($rMessageStream), 8192, true, true);
		if (false !== $iMessageStreamSize) {
			\rewind($rMessageStream);
			$this->ImapClient()->MessageAppendStream($this->sFolderName, $rMessageStream, $iMessageStreamSize);
		}

		return true;
	}

	public function DeleteContacts(string $sEmail, array $aContactIds) : bool
	{
		// TODO
		return false;
	}

	public function DeleteAllContacts(string $sEmail) : bool
	{
		// TODO
		return false;
	}

	public function GetContacts(string $sEmail, int $iOffset = 0, int $iLimit = 20, string $sSearch = '', int &$iResultCount = 0) : array
	{
		$oParams = new \MailSo\Mail\MessageListParams;
		$oParams->sFolderName = $this->FolderName();
		$oParams->iOffset = $iOffset;
		$oParams->iLimit = $iLimit;
		if ($sSearch) {
			$oParams->sSearch = 'from='.$sSearch;
		}
		$oParams->sSort = 'FROM';
//		$oParams->iPrevUidNext = $this->GetActionParam('UidNext', 0);
//		$oParams->bUseThreads = false;

		if (!\strlen($oParams->sFolderName)) {
//			return [];
			throw new ClientException(Notifications::CantGetMessageList);
		}

		$this->ImapClient();

		$aResult = [];

		try
		{
			$oMessageList = \RainLoop\Api::Actions()->MailClient()->MessageList($oParams);
			foreach ($oMessageList as $oMessage) {
				$oContact = new Classes\Contact;
				$oContact->IdContact = $oMessage->Uid();
				$oContact->IdContactStr = $oMessage->Subject();
//				$oContact->Display = isset($aItem['display']) ? (string) $aItem['display'] : '';
				$oContact->Changed = $oMessage->HeaderTimeStampInUTC();

				$oFrom = $oMessage->From();
				if ($oFrom) {
					$oMail = $oFrom[0];
					$oProperty = new Classes\Property(PropertyType::EMAIl, $oMail->GetEmail());
					$oContact->Properties[] = $oProperty;
					$oProperty = new Classes\Property(PropertyType::FULLNAME, $oMail->GetDisplayName());
//					$oProperty = new Classes\Property(PropertyType::FULLNAME, $oMail->ToString());
					$oContact->Properties[] = $oProperty;
//					$oProperty = new Classes\Property(PropertyType::NICK_NAME, $oMail->GetDisplayName());
//					$oContact->Properties[] = $oProperty;

					$oContact->UpdateDependentValues();
					$aResult[] = $oContact;
	/*
					// TODO extract xCard attachment
					$oMessage->ContentType() = multipart/mixed
					$oMessage->Attachments() : ?AttachmentCollection
						[0] => MailSo\Mail\Attachment(
							[oBodyStructure:MailSo\Mail\Attachment:private] => MailSo\Imap\BodyStructure(
								[sContentType:MailSo\Imap\BodyStructure:private] => application/vcard+xml
								[sCharset:MailSo\Imap\BodyStructure:private] =>
								[aBodyParams:MailSo\Imap\BodyStructure:private] => Array(
									[name] => kolab.xml
								)
								[sMailEncodingName:MailSo\Imap\BodyStructure:private] => quoted-printable
								[sDisposition:MailSo\Imap\BodyStructure:private] => attachment
								[sFileName:MailSo\Imap\BodyStructure:private] => kolab.xml
								[iSize:MailSo\Imap\BodyStructure:private] => 1043
								[sPartID:MailSo\Imap\BodyStructure:private] => 2
	*/
				}
			}
		}
		catch (\Throwable $oException)
		{
			throw $oException;
			throw new ClientException(Notifications::CantGetMessageList, $oException);
		}

		return $aResult;
	}

	public function GetContactByID(string $sEmail, $mID, bool $bIsStrID = false) : ?Classes\Contact
	{
		// TODO
		return null;
	}

	public function GetSuggestions(string $sEmail, string $sSearch, int $iLimit = 20) : array
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

	public function IncFrec(string $sEmail, array $aEmails, bool $bCreateAuto = true) : bool
	{
		return false;
	}

	public function Test() : string
	{
		$sResult = '';
		try
		{
//			$sResult = 'Unknown error';
		}
		catch (\Throwable $oException)
		{
			$sResult = $oException->getMessage();
			if (!\is_string($sResult) || empty($sResult)) {
				$sResult = 'Unknown error';
			}
		}

		return $sResult;
	}
}
