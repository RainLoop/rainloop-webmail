<?php

namespace RainLoop\Actions;

use SnappyMail\SMime\OpenSSL;
use SnappyMail\SMime\Certificate;
use MailSo\Imap\Enumerations\FetchType;

trait SMime
{
	private $SMIME = null;
	public function SMIME() : OpenSSL
	{
		if (!$this->SMIME) {
			$oAccount = $this->getMainAccountFromToken();
			if (!$oAccount) {
				return null;
			}

			$homedir = \rtrim($this->StorageProvider()->GenerateFilePath(
				$oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::ROOT
			), '/') . '/.smime';

			if (!\is_dir($homedir)) {
				\mkdir($homedir, 0700, true);
			}
			if (!\is_writable($homedir)) {
				throw new \Exception("smime homedir '{$homedir}' not writable");
			}

			$this->SMIME = new OpenSSL($homedir);
		}
		return $this->SMIME;
	}

	public function DoGetSMimeCertificate() : array
	{
		$result = [
			'key' => '',
			'pkey' => '',
			'cert' => ''
		];
		return $this->DefaultResponse(\array_values(\array_unique($result)));
	}

	// Like DoGnupgGetKeys
	public function DoSMimeGetCertificates() : array
	{
		return $this->DefaultResponse(
			$this->SMIME()->certificates()
		);
	}

	/**
	 * Can be use by Identity
	 */
	public function DoSMimeCreateCertificate() : array
	{
		$oAccount = $this->getAccountFromToken();

		$sName = $this->GetActionParam('name', '') ?: $oAccount->Name();
		$sEmail = $this->GetActionParam('email', '') ?: $oAccount->Email();
		$sPassphrase = $this->GetActionParam('passphrase', '');
		$this->logMask($sPassphrase);

		$cert = new Certificate();
		$cert->distinguishedName['commonName'] = $sName;
		$cert->distinguishedName['emailAddress'] = $sEmail;
		$result = $cert->createSelfSigned($sPassphrase);
		return $this->DefaultResponse($result ?: false);
	}

	public function DoSMimeVerifyMessage() : array
	{
		$sFolderName = $this->GetActionParam('folder', '');
		$iUid = (int) $this->GetActionParam('uid', 0);
		$sPartId = $this->GetActionParam('partId', '');
		$sMicAlg = $this->GetActionParam('micAlg', '');
		$bDetached = !empty($this->GetActionParam('detached', 0));

		$this->initMailClientConnection();
		$oImapClient = $this->ImapClient();
		$oImapClient->FolderExamine($sFolderName);

		if ('TEXT' === $sPartId) {
			$oFetchResponse = $oImapClient->Fetch([
				FetchType::BODY_PEEK.'['.$sPartId.']',
				// An empty section specification refers to the entire message, including the header.
				// But Dovecot does not return it with BODY.PEEK[1], so we also use BODY.PEEK[1.MIME].
				FetchType::BODY_HEADER_PEEK
			], $iUid, true)[0];
			$sBody = $oFetchResponse->GetFetchValue(FetchType::BODY_HEADER);
		} else {
			$oFetchResponse = $oImapClient->Fetch([
				FetchType::BODY_PEEK.'['.$sPartId.']',
				// An empty section specification refers to the entire message, including the header.
				// But Dovecot does not return it with BODY.PEEK[1], so we also use BODY.PEEK[1.MIME].
				FetchType::BODY_PEEK.'['.$sPartId.'.MIME]'
			], $iUid, true)[0];
			$sBody = $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$sPartId.'.MIME]');
		}
		$sBody .= $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$sPartId.']');

		$result = $this->SMIME()->verify($sBody, null, !$bDetached);

		return $this->DefaultResponse($result);
	}
}
