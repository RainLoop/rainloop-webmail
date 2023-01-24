<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\Capa;
use RainLoop\Notifications;
use RainLoop\Utils;

trait Response
{
	/**
	 * @param mixed $mResult
	 */
	public function DefaultResponse($mResult, array $aAdditionalParams = array(), string $sActionName = '') : array
	{
		if (false === $mResult) {
			if (!isset($aAdditionalParams['ErrorCode'])) {
				$aAdditionalParams['ErrorCode'] = 0;
			}
			if (!isset($aAdditionalParams['ErrorMessage'])) {
				$aAdditionalParams['ErrorMessage'] = '';
			}
		}

		return \array_merge(array(
//			'Version' => APP_VERSION,
			'Action' => $sActionName,
			'Result' => $this->responseObject($mResult)
		), $aAdditionalParams);
	}

	public function TrueResponse(array $aAdditionalParams = array()) : array
	{
		return $this->DefaultResponse(true, $aAdditionalParams);
	}

	public function FalseResponse(int $iErrorCode = 0, string $sErrorMessage = '', string $sAdditionalErrorMessage = '') : array
	{
		return $this->DefaultResponse(false, [
			'ErrorCode' => $iErrorCode,
			'ErrorMessage' => $sErrorMessage,
			'ErrorMessageAdditional' => $sAdditionalErrorMessage
		]);
	}

	public function ExceptionResponse(\Throwable $oException) : array
	{
		$iErrorCode = 0;
		$sErrorMessage = '';
		$sErrorMessageAdditional = '';

		if ($oException instanceof \RainLoop\Exceptions\ClientException) {
			$iErrorCode = $oException->getCode();
			if ($iErrorCode === Notifications::ClientViewError) {
				$sErrorMessage = $oException->getMessage();
			}
			$sErrorMessageAdditional = $oException->getAdditionalMessage();
		} else {
			$iErrorCode = Notifications::UnknownError;
			$sErrorMessage = $oException->getCode().' - '.$oException->getMessage();
		}

		$this->Logger()->WriteException($oException->getPrevious() ?: $oException);

		return $this->DefaultResponse(false, [
			'ErrorCode' => $iErrorCode,
			'ErrorMessage' => $sErrorMessage,
			'ErrorMessageAdditional' => $sErrorMessageAdditional
		]);
	}

	private function isFileHasThumbnail(string $sFileName) : bool
	{
		static $aCache = array();

		$sExt = \MailSo\Base\Utils::GetFileExtension($sFileName);
		if (isset($aCache[$sExt])) {
			return $aCache[$sExt];
		}

		$bResult = (
			\extension_loaded('gd')
			|| \extension_loaded('gmagick')
			|| \extension_loaded('imagick')
		) && \in_array($sExt, ['png', 'gif', 'jpg', 'jpeg']);

		$aCache[$sExt] = $bResult;

		return $bResult;
	}

	/**
	 * @param mixed $mResponse
	 *
	 * @return mixed
	 */
	private $aCheckableFolder = null;
	private function responseObject($mResponse, string $sParent = '')
	{
		if (!($mResponse instanceof \JsonSerializable)) {
			if (\is_object($mResponse)) {
				return '["'.\get_class($mResponse).'"]';
			}

			if (\is_array($mResponse)) {
				foreach ($mResponse as $iKey => $oItem) {
					$mResponse[$iKey] = $this->responseObject($oItem, 'Array');
				}
			}

			return $mResponse;
		}

		if ($mResponse instanceof \MailSo\Mail\Message) {
			$mResult = $mResponse->jsonSerialize();

			$oAccount = $this->getAccountFromToken();

			if (!$mResult['dateTimeStampInUTC'] || $this->Config()->Get('labs', 'date_from_headers', true)) {
				$iDateTimeStampInUTC = $mResponse->HeaderTimeStampInUTC;
				if ($iDateTimeStampInUTC) {
					$mResult['dateTimeStampInUTC'] = $iDateTimeStampInUTC;
				}
			}

			// \MailSo\Mime\EmailCollection
			foreach (['replyTo','from','to','cc','bcc','sender','deliveredTo'] as $prop) {
				$mResult[$prop] = $this->responseObject($mResult[$prop], $prop);
			}

			$sSubject = $mResult['subject'];
			$mResult['hash'] = \md5($mResult['folder'].$mResult['uid']);
			$mResult['requestHash'] = $this->encodeRawKey($oAccount, array(
				'folder' => $mResult['folder'],
				'uid' => $mResult['uid'],
				'mimeType' => 'message/rfc822',
				'fileName' => (\strlen($sSubject) ? \MailSo\Base\Utils::SecureFileName($sSubject) : 'message-'.$mResult['uid']) . '.eml'
			));

			$mResult['attachments'] = $this->responseObject($mResponse->Attachments, 'attachments');

			if (!$sParent) {
				$mResult['draftInfo'] = $mResponse->DraftInfo;
				$mResult['unsubsribeLinks'] = $mResponse->UnsubsribeLinks;
				$mResult['references'] = $mResponse->References;

				$mResult['html'] = $mResponse->Html();
				$mResult['plain'] = $mResponse->Plain();

//				$this->GetCapa(Capa::OPEN_PGP) || $this->GetCapa(Capa::GNUPG)
				$mResult['pgpSigned'] = $mResponse->pgpSigned;
				$mResult['pgpEncrypted'] = $mResponse->pgpEncrypted;

				$mResult['readReceipt'] = $mResponse->ReadReceipt;
				if (\strlen($mResult['readReceipt']) && !\in_array('$forwarded', $mResult['flags'])) {
					// \in_array('$mdnsent', $mResult['flags'])
					if (\strlen($mResult['readReceipt'])) {
						try
						{
							$oReadReceipt = \MailSo\Mime\Email::Parse($mResult['readReceipt']);
							if (!$oReadReceipt) {
								$mResult['readReceipt'] = '';
							}
						}
						catch (\Throwable $oException) { unset($oException); }
					}

					if (\strlen($mResult['readReceipt']) && '1' === $this->Cacher($oAccount)->Get(
						\RainLoop\KeyPathHelper::ReadReceiptCache($oAccount->Email(), $mResult['folder'], $mResult['uid']), '0'))
					{
						$mResult['readReceipt'] = '';
					}
				}
			}
			return $mResult;
		}

		if ($mResponse instanceof \MailSo\Mail\Attachment) {
			$mResult = $mResponse->jsonSerialize();
			$mResult['isThumbnail'] = $this->GetCapa(Capa::ATTACHMENT_THUMBNAILS) && $this->isFileHasThumbnail($mResult['fileName']);
			$mResult['download'] = $this->encodeRawKey($this->getAccountFromToken(), array(
				'folder' => $mResult['folder'],
				'uid' => $mResult['uid'],
				'mimeIndex' => $mResult['mimeIndex'],
				'mimeType' => $mResult['mimeType'],
				'fileName' => $mResult['fileName']
			));
			return $mResult;
		}

		if ($mResponse instanceof \MailSo\Imap\Folder) {
			$aResult = $mResponse->jsonSerialize();

			$sHash = $mResponse->Hash($this->MailClient()->ImapClient()->Hash());
			if ($sHash) {
				$aResult['hash'] = $sHash;
			}

			if (null === $this->aCheckableFolder) {
				$aCheckable = \json_decode(
					$this->SettingsProvider(true)
					->Load($this->getAccountFromToken())
					->GetConf('CheckableFolder', '[]')
				);
				$this->aCheckableFolder = \is_array($aCheckable) ? $aCheckable : array();
			}
			$aResult['checkable'] = \in_array($mResponse->FullName(), $this->aCheckableFolder);

			return $aResult;
		}

		if ($mResponse instanceof \MailSo\Base\Collection) {
			$mResult = $mResponse->jsonSerialize();
			$mResult['@Collection'] = $this->responseObject($mResult['@Collection'], 'Collection');
			if ($mResponse instanceof \MailSo\Mail\EmailCollection) {
				return \array_slice($mResult['@Collection'], 0, 100);
			}
			if ($mResponse instanceof \MailSo\Mail\AttachmentCollection
			 || $mResponse instanceof \MailSo\Mail\FolderCollection
			 || $mResponse instanceof \MailSo\Mail\MessageCollection
			) {
				return $mResult;
			}
			return $mResult['@Collection'];
		}

		return $mResponse;
	}
}
