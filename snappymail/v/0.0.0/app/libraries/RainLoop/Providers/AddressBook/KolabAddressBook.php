<?php

namespace RainLoop\Providers\AddressBook;

use RainLoop\Providers\AddressBook\Enumerations\PropertyType;

class KolabAddressBook implements \RainLoop\Providers\AddressBook\AddressBookInterface
{
	use CardDAV;

	protected $sFolderName;

	function __construct(\MailSo\Imap\ImapClient $oImapClient)
	{
		$this->oImapClient = $oImapClient;
	}

	public function SetFolder(string $sFolderName) : bool
	{
		$metadata = $this->oImapClient->FolderGetMetadata($sFolderName, [\MailSo\Imap\Enumerations\MetadataKeys::KOLAB_CTYPE]);
		if ($metadata && 'contact' !== \array_shift($metadata)) {
			// Throw error
//			$this->oImapClient->FolderList() : array
		}
		$this->oImapClient->FolderSelect($sFolderName);
		$this->sFolderName = $sFolderName;
	}

	public function IsSupported() : bool
	{
		// Check $this->oImapClient->IsSupported('METADATA')
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
		$email = \MailSo\Imap\SearchCriterias::escapeSearchString($sEmail);
		$aUids = $this->oImapClient->MessageSimpleSearch("SUBJECT {$sUID}");
//		$aUids = $this->oImapClient->MessageSimpleSearch("OR SUBJECT {$sUID} FROM {$email}");
//		$aUids = $this->oImapClient->MessageSimpleSearch("OR SUBJECT {$sUID} FROM {$email} BODY {$email}");

		if ($aUids) {
			// Replace Message
			if (false && $this->oImapClient->IsSupported('REPLACE')) {
				// UID REPLACE
			} else {
				$oRange = new \MailSo\Imap\SequenceSet($aUids[0]);
				$this->oImapClient->MessageStoreFlag($oRange,
					array(\MailSo\Imap\Enumerations\MessageFlag::DELETED),
					\MailSo\Imap\Enumerations\StoreAction::ADD_FLAGS_SILENT
				);
				$this->oImapClient->FolderExpunge($oRange);
			}
		}

		// Store Message
		$rMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();
		$iMessageStreamSize = \MailSo\Base\Utils::MultipleStreamWriter(
			$oMessage->ToStream(false), array($rMessageStream), 8192, true, true);
		if (false !== $iMessageStreamSize) {
			\rewind($rMessageStream);
			$this->oImapClient->MessageAppendStream($this->sFolderName, $rMessageStream, $iMessageStreamSize);
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
		// TODO
		return [];
	}

	public function GetContactByID(string $sEmail, $mID, bool $bIsStrID = false) : ?Classes\Contact
	{
		// TODO
		return null;
	}

	public function GetSuggestions(string $sEmail, string $sSearch, int $iLimit = 20) : array
	{
		// TODO
		return [];
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
