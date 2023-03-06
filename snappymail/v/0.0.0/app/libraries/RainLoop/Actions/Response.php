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
//			'version' => APP_VERSION,
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
			$aResult = $mResponse->jsonSerialize();

			$oAccount = $this->getAccountFromToken();

			if (!$aResult['dateTimeStampInUTC'] || $this->Config()->Get('labs', 'date_from_headers', true)) {
				$iDateTimeStampInUTC = $mResponse->HeaderTimeStampInUTC;
				if ($iDateTimeStampInUTC) {
					$aResult['dateTimeStampInUTC'] = $iDateTimeStampInUTC;
				}
			}

			// \MailSo\Mime\EmailCollection
			foreach (['replyTo','from','to','cc','bcc','sender','deliveredTo'] as $prop) {
				$aResult[$prop] = $this->responseObject($aResult[$prop], $prop);
			}

			$sSubject = $aResult['subject'];
			$aResult['requestHash'] = $this->encodeRawKey($oAccount, array(
				'folder' => $aResult['folder'],
				'uid' => $aResult['uid'],
				'mimeType' => 'message/rfc822',
				'fileName' => (\strlen($sSubject) ? \MailSo\Base\Utils::SecureFileName($sSubject) : 'message-'.$aResult['uid']) . '.eml'
			));

			if (!$sParent) {
				$aResult['draftInfo'] = $mResponse->DraftInfo;
				$aResult['unsubsribeLinks'] = $mResponse->UnsubsribeLinks;
				$aResult['references'] = $mResponse->References;

				$aResult['html'] = $mResponse->Html();
				$aResult['plain'] = $mResponse->Plain();

//				$this->GetCapa(Capa::OPEN_PGP) || $this->GetCapa(Capa::GNUPG)
				$aResult['pgpSigned'] = $mResponse->pgpSigned;
				$aResult['pgpEncrypted'] = $mResponse->pgpEncrypted;

				$aResult['readReceipt'] = $mResponse->ReadReceipt;
				if (\strlen($aResult['readReceipt']) && !\in_array('$forwarded', $aResult['flags'])) {
					// \in_array('$mdnsent', $aResult['flags'])
					if (\strlen($aResult['readReceipt'])) {
						try
						{
							$oReadReceipt = \MailSo\Mime\Email::Parse($aResult['readReceipt']);
							if (!$oReadReceipt) {
								$aResult['readReceipt'] = '';
							}
						}
						catch (\Throwable $oException) { unset($oException); }
					}

					if (\strlen($aResult['readReceipt']) && '1' === $this->Cacher($oAccount)->Get(
						\RainLoop\KeyPathHelper::ReadReceiptCache($oAccount->Email(), $aResult['folder'], $aResult['uid']), '0'))
					{
						$aResult['readReceipt'] = '';
					}
				}
			}
			return $aResult;
		}

		if ($mResponse instanceof \MailSo\Imap\Folder) {
			$aResult = $mResponse->jsonSerialize();

			$sHash = $mResponse->ETag($this->ImapClient()->Hash());
			if ($sHash) {
				$aResult['etag'] = $sHash;
			}

			if (null === $this->aCheckableFolder) {
				$aCheckable = \json_decode(
					$this->SettingsProvider(true)
					->Load($this->getAccountFromToken())
					->GetConf('CheckableFolder', '[]')
				);
				$this->aCheckableFolder = \is_array($aCheckable) ? $aCheckable : array();
			}
			$aResult['checkable'] = \in_array($mResponse->FullName, $this->aCheckableFolder);

			return $aResult;
		}

		return $mResponse;
	}
}
