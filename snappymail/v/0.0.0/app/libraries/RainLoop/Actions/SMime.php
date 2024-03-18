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
	 * Can be used by Identity
	 */
	public function DoSMimeCreateCertificate() : array
	{
		$oAccount = $this->getAccountFromToken();

		$oPassphrase = new \SnappyMail\SensitiveString($this->GetActionParam('passphrase', ''));

		$cert = new Certificate();
		$cert->distinguishedName['commonName'] = $this->GetActionParam('name', '') ?: $oAccount->Name();
		$cert->distinguishedName['emailAddress'] = $this->GetActionParam('email', '') ?: $oAccount->Email();
		$result = $cert->createSelfSigned($oPassphrase, $this->GetActionParam('privateKey', ''));
		return $this->DefaultResponse($result ?: false);
	}

	public function DoSMimeExportPrivateKey() : array
	{
		$SMIME = $this->SMIME();
		$SMIME->setPrivateKey(
			$this->GetActionParam('privateKey'),
			new \SnappyMail\SensitiveString($this->GetActionParam('oldPassphrase', ''))
		);
		$result = $SMIME->exportPrivateKey(
			new \SnappyMail\SensitiveString($this->GetActionParam('newPassphrase', ''))
		);

		return $this->DefaultResponse($result);
	}

	public function DoSMimeDecryptMessage() : array
	{
		$sFolderName = $this->GetActionParam('folder', '');
		$iUid = (int) $this->GetActionParam('uid', 0);
		$sPartId = $this->GetActionParam('partId', '');
		$sCertificate = $this->GetActionParam('certificate', '');
		$sPrivateKey = $this->GetActionParam('privateKey', '');
		$oPassphrase = new \SnappyMail\SensitiveString($this->GetActionParam('passphrase', ''));

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

		$SMIME = $this->SMIME();
		$SMIME->setCertificate($sCertificate);
		$SMIME->setPrivateKey($sPrivateKey, $oPassphrase);
		$result = $SMIME->decrypt($sBody);
		if ($result) {
			$result = ['data' => $result];
			if (\str_contains($result['data'], 'multipart/signed')
			  || \preg_match('/smime-type=["\']?signed-data/', $result['data'])
			) {
				$signed = $SMIME->verify($result['data'], null, true);
				$result['signed'] = [
					'success' => !empty($signed['success'])
				];
				if (!empty($signed['body'])) {
					$result['data'] = $signed['body'];
				}
			}
		}

		return $this->DefaultResponse($result ?: false);
	}

	public function DoSMimeVerifyMessage() : array
	{
		$sBody = $this->GetActionParam('bodyPart', '');
		$sPartId = $this->GetActionParam('partId', '');
		$bDetached = !empty($this->GetActionParam('detached', 0));
		if (!$sBody && $sPartId) {
			$iUid = (int) $this->GetActionParam('uid', 0);
//			$sMicAlg = $this->GetActionParam('micAlg', '');
			$this->initMailClientConnection();
			$oImapClient = $this->ImapClient();
			$oImapClient->FolderExamine($this->GetActionParam('folder', ''));
			$sBody = $oImapClient->FetchMessagePart($iUid, $sPartId);
		}

		$result = $this->SMIME()->verify($sBody, null, !$bDetached);

		// Import the certificates automatically
		$sBody = $this->GetActionParam('sigPart', '');
		$sPartId = $this->GetActionParam('sigPartId', '') ?: $sPartId;
		if (!$sBody && $sPartId && $oImapClient) {
			$sBody = $oImapClient->Fetch(
				[FetchType::BODY_PEEK.'['.$sPartId.']'],
				$iUid,
				true
			)[0]->GetFetchValue(FetchType::BODY.'['.$sPartId.']');
		}
		if ($sBody) {
			$sBody = \trim($sBody);
			$certificates = [];
			\openssl_pkcs7_read(
				"-----BEGIN PKCS7-----\n\n{$sBody}\n-----END PKCS7-----",
				$certificates
			) || $this->logWrite("openssl_pkcs7_read: " . \openssl_error_string(), \LOG_ERR, 'OpenSSL');
			foreach ($certificates as $certificate) {
				$this->SMIME()->storeCertificate($certificate);
			}
		}

		return $this->DefaultResponse($result);
	}

	public function DoSMimeImportCertificate() : array
	{
		return $this->DefaultResponse(
			$this->SMIME()->storeCertificate(
				$this->GetActionParam('pem', '')
			)
		);
	}

	public function DoSMimeImportCertificatesFromMessage() : array
	{
/*
		$sBody = $this->GetActionParam('sigPart', '');
		if (!$sBody) {
			$sPartId = $this->GetActionParam('sigPartId', '') ?: $this->GetActionParam('partId', '');
			$this->initMailClientConnection();
			$oImapClient = $this->ImapClient();
			$oImapClient->FolderExamine($this->GetActionParam('folder', ''));
			$sBody = $oImapClient->Fetch([
				FetchType::BODY_PEEK.'['.$sPartId.']'
			], (int) $this->GetActionParam('uid', 0), true)[0]
			->GetFetchValue(FetchType::BODY.'['.$sPartId.']');
		}
		$sBody = \trim($sBody);
		$certificates = [];
		\openssl_pkcs7_read(
			"-----BEGIN PKCS7-----\n\n{$sBody}\n-----END PKCS7-----",
			$certificates
		);

		foreach ($certificates as $certificate) {
			$this->SMIME()->storeCertificate($certificate);
		}

		return $this->DefaultResponse($certificates);
*/
	}
}
