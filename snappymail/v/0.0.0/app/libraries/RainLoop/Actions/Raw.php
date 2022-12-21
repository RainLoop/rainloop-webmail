<?php

namespace RainLoop\Actions;

trait Raw
{
	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function RawViewAsPlain() : bool
	{
		$this->initMailClientConnection();

		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		$aValues = $this->getDecodedRawKeyValue($sRawKey);

		$sFolder = isset($aValues['Folder']) ? (string) $aValues['Folder'] : '';
		$iUid = isset($aValues['Uid']) ? (int) $aValues['Uid'] : 0;
		$sMimeIndex = isset($aValues['MimeIndex']) ? (string) $aValues['MimeIndex'] : '';

		\header('Content-Type: text/plain');

		return $this->MailClient()->MessageMimeStream(function ($rResource) {
			if (\is_resource($rResource)) {
				\MailSo\Base\Utils::FpassthruWithTimeLimitReset($rResource);
			}
		}, $sFolder, $iUid, $sMimeIndex);
	}

	public function RawDownload() : bool
	{
		return $this->rawSmart(true);
	}

	public function RawView() : bool
	{
		return $this->rawSmart(false);
	}

	public function RawViewThumbnail() : bool
	{
		return $this->rawSmart(false, true);
	}

	public function RawUserBackground() : bool
	{
		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		$this->verifyCacheByKey($sRawKey);

		$oAccount = $this->getAccountFromToken();

		$sData = $this->StorageProvider()->Get($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'background'
		);

		if (!empty($sData))
		{
			$aData = \json_decode($sData, true);
			unset($sData);

			if (!empty($aData['ContentType']) && !empty($aData['Raw']) &&
				\in_array($aData['ContentType'], array('image/png', 'image/jpg', 'image/jpeg')))
			{
				$this->cacheByKey($sRawKey);

				\header('Content-Type: '.$aData['ContentType']);
				echo \base64_decode($aData['Raw']);
				unset($aData);

				return true;
			}
		}

		return false;
	}

	public function RawPublic() : bool
	{
		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		$this->verifyCacheByKey($sRawKey);

		$sHash = $sRawKey;
		$sData = '';

		if (!empty($sHash)) {
			$sData = $this->StorageProvider()->Get(null,
				\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
				\RainLoop\KeyPathHelper::PublicFile($sHash)
			);
		}

		$aMatch = array();
		if (!empty($sData) && 0 === \strpos($sData, 'data:') &&
			\preg_match('/^data:([^:]+):/', $sData, $aMatch) && !empty($aMatch[1]))
		{
			$sContentType = \trim($aMatch[1]);
			if (\in_array($sContentType, array('image/png', 'image/jpg', 'image/jpeg'))) {
				$this->cacheByKey($sRawKey);

				\header('Content-Type: '.$sContentType);
				echo \preg_replace('/^data:[^:]+:/', '', $sData);
				unset($sData);

				return true;
			}
		}

		return false;
	}

	private function rawSmart(bool $bDownload, bool $bThumbnail = false) : bool
	{
		$sRawKey = (string) $this->GetActionParam('RawKey', '');

		$aValues = $this->getDecodedRawKeyValue($sRawKey);

		$sRange = \MailSo\Base\Http::GetHeader('Range');

		$aMatch = array();
		$sRangeStart = $sRangeEnd = '';
		$bIsRangeRequest = false;

		if (!empty($sRange) && 'bytes=0-' !== \strtolower($sRange)
		 && \preg_match('/^bytes=([0-9]+)-([0-9]*)/i', \trim($sRange), $aMatch))
		{
			$sRangeStart = $aMatch[1];
			$sRangeEnd = $aMatch[2];

			$bIsRangeRequest = true;
		}

		$sFolder = isset($aValues['Folder']) ? (string) $aValues['Folder'] : '';
		$iUid = isset($aValues['Uid']) ? (int) $aValues['Uid'] : 0;
		$sMimeIndex = isset($aValues['MimeIndex']) ? (string) $aValues['MimeIndex'] : '';

		$sContentTypeIn = isset($aValues['MimeType']) ? (string) $aValues['MimeType'] : '';
		$sFileNameIn = isset($aValues['FileName']) ? (string) $aValues['FileName'] : '';
		$sFileHashIn = isset($aValues['FileHash']) ? (string) $aValues['FileHash'] : '';

		if (!empty($sFileHashIn)) {
			$this->verifyCacheByKey($sRawKey);

			$oAccount = $this->getAccountFromToken();

			// https://github.com/the-djmaze/snappymail/issues/144
			if ('.pdf' === \substr($sFileNameIn,-4)) {
				$sContentTypeOut = 'application/pdf'; // application/octet-stream
			} else {
				$sContentTypeOut = $sContentTypeIn
					?: \SnappyMail\File\MimeType::fromFilename($sFileNameIn)
					?: 'application/octet-stream';
			}

			$sFileNameOut = $this->MainClearFileName($sFileNameIn, $sContentTypeIn, $sMimeIndex);

			$rResource = $this->FilesProvider()->GetFile($oAccount, $sFileHashIn);
			if (\is_resource($rResource))
			{
				\header('Content-Type: '.$sContentTypeOut);
				\header('Content-Disposition: attachment; '.
					\trim(\MailSo\Base\Utils::EncodeHeaderUtf8AttributeValue('filename', $sFileNameOut)));

				\header('Accept-Ranges: none');
				\header('Content-Transfer-Encoding: binary');

				\MailSo\Base\Utils::FpassthruWithTimeLimitReset($rResource);
				return true;
			}

			return false;
		}
		else if (!empty($sFolder) && 0 < $iUid)
		{
			$this->verifyCacheByKey($sRawKey);
		}

		$oAccount = $this->initMailClientConnection();

		$self = $this;
		return $this->MailClient()->MessageMimeStream(
			function($rResource, $sContentType, $sFileName, $sMimeIndex = '') use (
				$self, $oAccount, $sRawKey, $sContentTypeIn, $sFileNameIn, $bDownload, $bThumbnail,
				$bIsRangeRequest, $sRangeStart, $sRangeEnd
			) {
				if ($oAccount && \is_resource($rResource)) {
					\MailSo\Base\Utils::ResetTimeLimit();

					$self->cacheByKey($sRawKey);

					if ($sFileNameIn) {
						$sFileName = $sFileNameIn;
					}
					$sFileName = $self->MainClearFileName($sFileName, $sContentType, $sMimeIndex);

					if ('.pdf' === \substr($sFileName, -4)) {
						// https://github.com/the-djmaze/snappymail/issues/144
						$sContentType = 'application/pdf';
					} else {
						$sContentType = $sContentTypeIn
							?: $sContentType
//							?: \SnappyMail\File\MimeType::fromStream($rResource, $sFileName)
							?: \SnappyMail\File\MimeType::fromFilename($sFileName)
							?: 'application/octet-stream';
					}

					if (!$bDownload) {
						$bDetectImageOrientation = $self->Config()->Get('labs', 'image_exif_auto_rotate', false)
							// Mostly only JPEG has EXIF metadata
							&& 'image/jpeg' == $sContentType;
						try
						{
							if ($bThumbnail) {
								$oImage = static::loadImage($rResource, $bDetectImageOrientation, 48);
								\header('Content-Disposition: inline; '.
									\trim(\MailSo\Base\Utils::EncodeHeaderUtf8AttributeValue('filename', $sFileName.'_thumb60x60.png')));
								$oImage->show('png');
//								$oImage->show('webp'); // Little Britain: "Safari says NO"
								exit;
							} else if ($bDetectImageOrientation) {
								$oImage = static::loadImage($rResource, $bDetectImageOrientation);
								\header('Content-Disposition: inline; '.
									\trim(\MailSo\Base\Utils::EncodeHeaderUtf8AttributeValue('filename', $sFileName)));
								$oImage->show();
//								$oImage->show('webp'); // Little Britain: "Safari says NO"
								exit;
							}
						}
						catch (\Throwable $oException)
						{
							$self->Logger()->WriteExceptionShort($oException);
							\MailSo\Base\Http::StatusHeader(500);
							exit;
						}
					}

					if (!\headers_sent()) {
						\header('Content-Type: '.$sContentType);
						\header('Content-Disposition: '.($bDownload ? 'attachment' : 'inline').'; '.
							\trim(\MailSo\Base\Utils::EncodeHeaderUtf8AttributeValue('filename', $sFileName)));

						\header('Accept-Ranges: bytes');
						\header('Content-Transfer-Encoding: binary');
					}

					$sLoadedData = null;
					if ($bIsRangeRequest || !$bDownload) {
						$sLoadedData = \stream_get_contents($rResource);
					}

					\MailSo\Base\Utils::ResetTimeLimit();

					if ($sLoadedData) {
						if ($bIsRangeRequest && (\strlen($sRangeStart) || \strlen($sRangeEnd))) {
							$iFullContentLength = \strlen($sLoadedData);

							\MailSo\Base\Http::StatusHeader(206);

							$iRangeStart = \max(0, \intval($sRangeStart));
							$iRangeEnd = \max(0, \intval($sRangeEnd));

							if ($iRangeEnd && $iRangeStart < $iRangeEnd) {
								$sLoadedData = \substr($sLoadedData, $iRangeStart, $iRangeEnd - $iRangeStart);
							} else if ($iRangeStart) {
								$sLoadedData = \substr($sLoadedData, $iRangeStart);
							}

							$iContentLength = \strlen($sLoadedData);

							if (0 < $iContentLength) {
								\header('Content-Length: '.$iContentLength);
								\header('Content-Range: bytes '.$sRangeStart.'-'.($iRangeEnd ?: $iFullContentLength - 1).'/'.$iFullContentLength);
							}
						} else {
							\header('Content-Length: '.\strlen($sLoadedData));
						}

						echo $sLoadedData;

						unset($sLoadedData);
					} else {
						\MailSo\Base\Utils::FpassthruWithTimeLimitReset($rResource);
					}
				}
			}, $sFolder, $iUid, $sMimeIndex);
	}

	private static function loadImage($resource, bool $bDetectImageOrientation = false, int $iThumbnailBoxSize = 0) : \SnappyMail\Image
	{
		if (\extension_loaded('gmagick'))      { $handler = 'gmagick'; }
		else if (\extension_loaded('imagick')) { $handler = 'imagick'; }
		else if (\extension_loaded('gd'))      { $handler = 'gd2'; }
		else { return null; }
		$handler = 'SnappyMail\\Image\\'.$handler.'::createFromStream';
		$oImage = $handler($resource);

		if (!$oImage->valid()) {
			throw new \Exception('Loading image failed');
		}

		// rotateImageByOrientation
		if ($bDetectImageOrientation) {
			switch ($oImage->getOrientation())
			{
				case 2: // flip horizontal
					$oImage->flopImage();
					break;

				case 3: // rotate 180
					$oImage->rotate(180);
					break;

				case 4: // flip vertical
					$oImage->flipImage();
					break;

				case 5: // vertical flip + 90 rotate
					$oImage->flipImage();
					$oImage->rotate(90);
					break;

				case 6: // rotate 90
					$oImage->rotate(90);
					break;

				case 7: // horizontal flip + 90 rotate
					$oImage->flopImage();
					$oImage->rotate(90);
					break;

				case 8: // rotate 270
					$oImage->rotate(270);
					break;
			}
		}

		if (0 < $iThumbnailBoxSize) {
			$oImage->cropThumbnailImage($iThumbnailBoxSize, $iThumbnailBoxSize);
		}

		$oImage->stripImage();

		return $oImage;
	}

}
