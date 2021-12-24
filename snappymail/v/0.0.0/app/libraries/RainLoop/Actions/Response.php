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

	private function isFileHasFramedPreview(string $sFileName) : bool
	{
		$sExt = \MailSo\Base\Utils::GetFileExtension($sFileName);
		return \in_array($sExt, array('doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'));
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
	private function responseObject($mResponse, string $sParent = '', array $aParameters = array())
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
					$mResponse[$iKey] = $this->responseObject($oItem, $sParent, $aParameters);
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
			foreach (['ReplyTo','From','To','Cc','Bcc','Sender','DeliveredTo','ReplyTo'] as $prop) {
				$mResult[$prop] = $this->responseObject($mResult[$prop], $sParent, $aParameters);
			}

			$sSubject = $mResult['Subject'];
			$mResult['Hash'] = \md5($mResult['Folder'].$mResult['Uid']);
			$mResult['RequestHash'] = Utils::EncodeKeyValuesQ(array(
				'V' => APP_VERSION,
				'Account' => $oAccount->Hash(),
				'Folder' => $mResult['Folder'],
				'Uid' => $mResult['Uid'],
				'MimeType' => 'message/rfc822',
				'FileName' => (\strlen($sSubject) ? \MailSo\Base\Utils::ClearXss($sSubject) : 'message-'.$mResult['Uid']) . '.eml'
			));

			$sForwardedFlag = \strtolower($this->Config()->Get('labs', 'imap_forwarded_flag', ''));
			$sReadReceiptFlag = \strtolower($this->Config()->Get('labs', 'imap_read_receipt_flag', ''));
			\strlen($sForwardedFlag) && \in_array($sForwardedFlag, $mResult['Flags']) && \array_push($mResult['Flags'], '$forwarded');
			\strlen($sReadReceiptFlag) && \in_array($sReadReceiptFlag, $mResult['Flags']) && \array_push($mResult['Flags'], '$mdnsent');
			$mResult['Flags'] = \array_unique($mResult['Flags']);

			if ('Message' === $sParent)
			{
				$bHasExternals = false;
				$mFoundCIDs = array();
				$aContentLocationUrls = array();
				$mFoundContentLocationUrls = array();

				$oAttachments = /* @var \MailSo\Mail\AttachmentCollection */ $mResponse->Attachments();
				if ($oAttachments && 0 < $oAttachments->count())
				{
					foreach ($oAttachments as /* @var \MailSo\Mail\Attachment */ $oAttachment)
					{
						if ($oAttachment)
						{
							$sContentLocation = $oAttachment->ContentLocation();
							if ($sContentLocation && \strlen($sContentLocation))
							{
								$aContentLocationUrls[] = $sContentLocation;
							}
						}
					}
				}

				$sPlain = '';
				$sHtml = \trim($mResponse->Html());

				if (!\strlen($sHtml))
				{
					$sPlain = \trim($mResponse->Plain());
				}

				$mResult['DraftInfo'] = $mResponse->DraftInfo();
				$mResult['InReplyTo'] = $mResponse->InReplyTo();
				$mResult['UnsubsribeLinks'] = $mResponse->UnsubsribeLinks();
				$mResult['References'] = $mResponse->References();

				$fAdditionalExternalFilter = null;
				if ($this->Config()->Get('labs', 'use_local_proxy_for_external_images', false))
				{
					$fAdditionalExternalFilter = function ($sUrl) {
						return './?/ProxyExternal/'.Utils::EncodeKeyValuesQ(array(
							'Rnd' => \md5(\microtime(true)),
							'Token' => Utils::GetConnectionToken(),
							'Url' => $sUrl
						)).'/';
					};
				}

				$sHtml = \preg_replace_callback('/(<pre[^>]*>)([\s\S\r\n\t]*?)(<\/pre>)/mi', function ($aMatches) {
					return \preg_replace('/[\r\n]+/', '<br />', $aMatches[1].\trim($aMatches[2]).$aMatches[3]);
				}, $sHtml);

				$mResult['Html'] = \strlen($sHtml) ? \MailSo\Base\HtmlUtils::ClearHtml(
					$sHtml, $bHasExternals, $mFoundCIDs, $aContentLocationUrls, $mFoundContentLocationUrls,
					$fAdditionalExternalFilter, !!$this->Config()->Get('labs', 'try_to_detect_hidden_images', false)
				) : '';

				$mResult['ExternalProxy'] = null !== $fAdditionalExternalFilter;

				$mResult['Plain'] = $sPlain;
//				$mResult['Plain'] = \strlen($sPlain) ? \MailSo\Base\HtmlUtils::ConvertPlainToHtml($sPlain) : '';

				$mResult['isPgpSigned'] = $mResponse->isPgpSigned();
				$mResult['isPgpEncrypted'] = $mResponse->isPgpEncrypted();
//				$mResult['PgpSignature'] = $mResponse->PgpSignature();
//				$mResult['PgpSignatureMicAlg'] = $mResponse->PgpSignatureMicAlg();

				unset($sHtml, $sPlain);

				$mResult['HasExternals'] = $bHasExternals;
				$mResult['HasInternals'] = (\is_array($mFoundCIDs) && \count($mFoundCIDs)) ||
					(\is_array($mFoundContentLocationUrls) && \count($mFoundContentLocationUrls));
				$mResult['Attachments'] = $this->responseObject($oAttachments, $sParent, $aParameters);
/*
//				$mResult['FoundCIDs'] = $mFoundCIDs;
				$mResult['Attachments'] = $this->responseObject($oAttachments, $sParent, \array_merge($aParameters, array(
					'FoundCIDs' => $mFoundCIDs,
					'FoundContentLocationUrls' => $mFoundContentLocationUrls
				)));
*/
				$mResult['ReadReceipt'] = $mResponse->ReadReceipt();

				if (\strlen($mResult['ReadReceipt']) && !\in_array('$forwarded', $mResult['Flags']))
				{
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

			$oAccount = $this->getAccountFromToken();

			$mFoundCIDs = isset($aParameters['FoundCIDs']) && \is_array($aParameters['FoundCIDs']) &&
				\count($aParameters['FoundCIDs']) ?
					$aParameters['FoundCIDs'] : null;

			$mFoundContentLocationUrls = isset($aParameters['FoundContentLocationUrls']) &&
				\is_array($aParameters['FoundContentLocationUrls']) &&
				\count($aParameters['FoundContentLocationUrls']) ?
					$aParameters['FoundContentLocationUrls'] : null;

			if ($mFoundCIDs || $mFoundContentLocationUrls)
			{
				$mFoundCIDs = \array_merge($mFoundCIDs ? $mFoundCIDs : array(),
					$mFoundContentLocationUrls ? $mFoundContentLocationUrls : array());

				$mFoundCIDs = \count($mFoundCIDs) ? $mFoundCIDs : null;
			}

			$mResult['IsLinked'] = ($mFoundCIDs && \in_array(\trim(\trim($mResponse->Cid()), '<>'), $mFoundCIDs))
				|| ($mFoundContentLocationUrls && \in_array(\trim($mResponse->ContentLocation()), $mFoundContentLocationUrls));

			$mResult['Framed'] = $this->isFileHasFramedPreview($mResult['FileName']);
			$mResult['IsThumbnail'] = $this->GetCapa(false, Capa::ATTACHMENT_THUMBNAILS) && $this->isFileHasThumbnail($mResult['FileName']);

			$mResult['Download'] = Utils::EncodeKeyValuesQ(array(
				'V' => APP_VERSION,
				'Account' => $oAccount->Hash(),
				'Folder' => $mResult['Folder'],
				'Uid' => $mResult['Uid'],
				'MimeIndex' => $mResult['MimeIndex'],
				'MimeType' => $mResult['MimeType'],
				'FileName' => $mResult['FileName'],
				'Framed' => $mResult['Framed']
			));
			return $mResult;
		}

		if ($mResponse instanceof \MailSo\Mail\Folder)
		{
			$aExtended = null;
			$aStatus = $mResponse->Status();
			if ($aStatus && isset($aStatus['MESSAGES'], $aStatus['UNSEEN'], $aStatus['UIDNEXT'])) {
				$aExtended = array(
					'MessageCount' => (int) $aStatus['MESSAGES'],
					'MessageUnseenCount' => (int) $aStatus['UNSEEN'],
					'UidNext' => (int) $aStatus['UIDNEXT'],
					'Hash' => $this->MailClient()->GenerateFolderHash(
						$mResponse->FullName(), $aStatus['MESSAGES'], $aStatus['UIDNEXT'],
							empty($aStatus['HIGHESTMODSEQ']) ? 0 : $aStatus['HIGHESTMODSEQ'])
				);
			}

			if (null === $this->aCheckableFolder)
			{
				$aCheckable = \json_decode(
					$this->SettingsProvider(true)
					->Load($this->getAccountFromToken())
					->GetConf('CheckableFolder', '[]')
				);
				$this->aCheckableFolder = \is_array($aCheckable) ? $aCheckable : array();
			}

			return \array_merge(
				$mResponse->jsonSerialize(),
				array(
					'Checkable' => \in_array($mResponse->FullName(), $this->aCheckableFolder),
					'Extended' => $aExtended,
				)
			);
		}

		if ($mResponse instanceof \MailSo\Base\Collection)
		{
			$mResult = $mResponse->jsonSerialize();
			$mResult['@Collection'] = $this->responseObject($mResult['@Collection'], $sParent, $aParameters);
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
