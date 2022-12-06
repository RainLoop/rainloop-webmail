<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\Capa;
use RainLoop\Notifications;
use RainLoop\Utils;

trait Response
{
	/**
	 * @param mixed $mResult = false
	 */
	public function DefaultResponse(string $sActionName, $mResult = false, array $aAdditionalParams = array()) : array
	{
		$this->Plugins()->RunHook('main.default-response-data', array($sActionName, &$mResult));
		$aResponseItem = $this->mainDefaultResponse($sActionName, $mResult, $aAdditionalParams);
		$this->Plugins()->RunHook('main.default-response', array($sActionName, &$aResponseItem));
		return $aResponseItem;
	}

	public function TrueResponse(string $sActionName, array $aAdditionalParams = array()) : array
	{
		$mResult = true;
		$this->Plugins()->RunHook('main.default-response-data', array($sActionName, &$mResult));
		$aResponseItem = $this->mainDefaultResponse($sActionName, $mResult, $aAdditionalParams);
		$this->Plugins()->RunHook('main.default-response', array($sActionName, &$aResponseItem));
		return $aResponseItem;
	}

	public function FalseResponse(string $sActionName, ?int $iErrorCode = null, ?string $sErrorMessage = null, ?string $sAdditionalErrorMessage = null) : array
	{
		$mResult = false;
		$this->Plugins()
			->RunHook('main.default-response-data', array($sActionName, &$mResult))
			->RunHook('main.default-response-error-data', array($sActionName, &$iErrorCode, &$sErrorMessage))
		;

		$aAdditionalParams = array();
		if (null !== $iErrorCode)
		{
			$aAdditionalParams['ErrorCode'] = (int) $iErrorCode;
			$aAdditionalParams['ErrorMessage'] = null === $sErrorMessage ? '' : (string) $sErrorMessage;
			$aAdditionalParams['ErrorMessageAdditional'] = null === $sAdditionalErrorMessage ? '' : (string) $sAdditionalErrorMessage;
		}

		$aResponseItem = $this->mainDefaultResponse($sActionName, $mResult, $aAdditionalParams);

		$this->Plugins()->RunHook('main.default-response', array($sActionName, &$aResponseItem));
		return $aResponseItem;
	}

	public function ExceptionResponse(string $sActionName, \Throwable $oException) : array
	{
		$iErrorCode = null;
		$sErrorMessage = null;
		$sErrorMessageAdditional = null;

		if ($oException instanceof \RainLoop\Exceptions\ClientException)
		{
			$iErrorCode = $oException->getCode();
			$sErrorMessage = null;

			if ($iErrorCode === Notifications::ClientViewError)
			{
				$sErrorMessage = $oException->getMessage();
			}

			$sErrorMessageAdditional = $oException->getAdditionalMessage();
			if (empty($sErrorMessageAdditional))
			{
				$sErrorMessageAdditional = null;
			}
		}
		else
		{
			$iErrorCode = Notifications::UnknownError;
			$sErrorMessage = $oException->getCode().' - '.$oException->getMessage();
		}

		$oPrevious = $oException->getPrevious();
		if ($oPrevious)
		{
			$this->Logger()->WriteException($oPrevious);
		}
		else
		{
			$this->Logger()->WriteException($oException);
		}

		return $this->FalseResponse($sActionName, $iErrorCode, $sErrorMessage, $sErrorMessageAdditional);
	}

	/**
	 * @param mixed $mResult = false
	 */
	private function mainDefaultResponse(string $sActionName, $mResult = false, array $aAdditionalParams = array()) : array
	{
		$sActionName = 'Do' === \substr($sActionName, 0, 2) ? \substr($sActionName, 2) : $sActionName;
		$sActionName = \preg_replace('/[^a-zA-Z0-9_]+/', '', $sActionName);

		$aResult = array(
//			'Version' => APP_VERSION,
			'Action' => $sActionName,
			'Result' => $this->responseObject($mResult, $sActionName)
		);

		foreach ($aAdditionalParams as $sKey => $mValue)
		{
			$aResult[$sKey] = $mValue;
		}

		return $aResult;
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
		if (!($mResponse instanceof \JsonSerializable))
		{
			if (\is_object($mResponse))
			{
				return '["'.\get_class($mResponse).'"]';
			}

			if (\is_array($mResponse))
			{
				foreach ($mResponse as $iKey => $oItem)
				{
					$mResponse[$iKey] = $this->responseObject($oItem, $sParent);
				}
			}

			return $mResponse;
		}

		if ($mResponse instanceof \MailSo\Mail\Message)
		{
			$mResult = $mResponse->jsonSerialize();

			$oAccount = $this->getAccountFromToken();

			if (!$mResult['DateTimeStampInUTC'] || $this->Config()->Get('labs', 'date_from_headers', false)) {
				$iDateTimeStampInUTC = $mResponse->HeaderTimeStampInUTC();
				if ($iDateTimeStampInUTC) {
					$mResult['DateTimeStampInUTC'] = $iDateTimeStampInUTC;
				}
			}

			// \MailSo\Mime\EmailCollection
			foreach (['ReplyTo','From','To','Cc','Bcc','Sender','DeliveredTo'] as $prop) {
				$mResult[$prop] = $this->responseObject($mResult[$prop], $sParent);
			}

			$sSubject = $mResult['subject'];
			$mResult['Hash'] = \md5($mResult['Folder'].$mResult['Uid']);
			$mResult['RequestHash'] = Utils::EncodeKeyValuesQ(array(
				'Account' => $oAccount->Hash(),
				'Folder' => $mResult['Folder'],
				'Uid' => $mResult['Uid'],
				'MimeType' => 'message/rfc822',
				'FileName' => (\strlen($sSubject) ? \MailSo\Base\Utils::SecureFileName($sSubject) : 'message-'.$mResult['Uid']) . '.eml'
			));

			$mResult['Attachments'] = $this->responseObject($mResponse->Attachments(), $sParent);

			if ('Message' === $sParent)
			{
				$mResult['DraftInfo'] = $mResponse->DraftInfo();
				$mResult['InReplyTo'] = $mResponse->InReplyTo();
				$mResult['UnsubsribeLinks'] = $mResponse->UnsubsribeLinks();
				$mResult['References'] = $mResponse->References();

				$mResult['Html'] = $mResponse->Html();
				$mResult['Plain'] = $mResponse->Plain();

//				$this->GetCapa(Capa::OPEN_PGP) || $this->GetCapa(Capa::GNUPG)
				$mResult['PgpSigned'] = $mResponse->PgpSigned();
				$mResult['PgpEncrypted'] = $mResponse->PgpEncrypted();

				$mResult['ReadReceipt'] = $mResponse->ReadReceipt();

				if (\strlen($mResult['ReadReceipt']) && !\in_array('$forwarded', $mResult['Flags']))
				{
					// \in_array('$mdnsent', $mResult['Flags'])
					if (\strlen($mResult['ReadReceipt']))
					{
						try
						{
							$oReadReceipt = \MailSo\Mime\Email::Parse($mResult['ReadReceipt']);
							if (!$oReadReceipt)
							{
								$mResult['ReadReceipt'] = '';
							}
						}
						catch (\Throwable $oException) { unset($oException); }
					}

					if (\strlen($mResult['ReadReceipt']) && '1' === $this->Cacher($oAccount)->Get(
						\RainLoop\KeyPathHelper::ReadReceiptCache($oAccount->Email(), $mResult['Folder'], $mResult['Uid']), '0'))
					{
						$mResult['ReadReceipt'] = '';
					}
				}
			}
			return $mResult;
		}

		if ($mResponse instanceof \MailSo\Mail\Attachment)
		{
			$mResult = $mResponse->jsonSerialize();
			$mResult['IsThumbnail'] = $this->GetCapa(Capa::ATTACHMENT_THUMBNAILS) && $this->isFileHasThumbnail($mResult['FileName']);
			$mResult['Download'] = Utils::EncodeKeyValuesQ(array(
				'Account' => $this->getAccountFromToken()->Hash(),
				'Folder' => $mResult['Folder'],
				'Uid' => $mResult['Uid'],
				'MimeIndex' => $mResult['MimeIndex'],
				'MimeType' => $mResult['MimeType'],
				'FileName' => $mResult['FileName']
			));
			return $mResult;
		}

		if ($mResponse instanceof \MailSo\Mail\Folder)
		{
			$aResult = $mResponse->jsonSerialize();

			$sHash = $mResponse->Hash($this->MailClient()->GenerateImapClientHash());
			if ($sHash) {
				$aResult['Hash'] = $sHash;
			}

			if (null === $this->aCheckableFolder) {
				$aCheckable = \json_decode(
					$this->SettingsProvider(true)
					->Load($this->getAccountFromToken())
					->GetConf('CheckableFolder', '[]')
				);
				$this->aCheckableFolder = \is_array($aCheckable) ? $aCheckable : array();
			}
			$aResult['Checkable'] = \in_array($mResponse->FullName(), $this->aCheckableFolder);

			return $aResult;
		}

		if ($mResponse instanceof \MailSo\Base\Collection)
		{
			$mResult = $mResponse->jsonSerialize();
			$mResult['@Collection'] = $this->responseObject($mResult['@Collection'], $sParent);
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
