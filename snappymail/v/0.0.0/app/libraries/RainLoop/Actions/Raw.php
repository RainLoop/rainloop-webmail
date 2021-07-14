<?php

namespace RainLoop\Actions;

trait Raw
{
	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function RawViewAsPlain() : bool
	{
		$this->initMailClientConnection();

		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		$aValues = $this->getDecodedRawKeyValue($sRawKey);

		$sFolder = isset($aValues['Folder']) ? $aValues['Folder'] : '';
		$iUid = (int) (isset($aValues['Uid']) ? $aValues['Uid'] : 0);
		$sMimeIndex = (string) (isset($aValues['MimeIndex']) ? $aValues['MimeIndex'] : '');

		\header('Content-Type: text/plain', true);

		return $this->MailClient()->MessageMimeStream(function ($rResource) {
			if (\is_resource($rResource))
			{
				\MailSo\Base\Utils::FpassthruWithTimeLimitReset($rResource);
			}
		}, $sFolder, $iUid, true, $sMimeIndex);
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

		if (!empty($sHash))
		{
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
			if (\in_array($sContentType, array('image/png', 'image/jpg', 'image/jpeg')))
			{
				$this->cacheByKey($sRawKey);

				\header('Content-Type: '.$sContentType);
				echo \preg_replace('/^data:[^:]+:/', '', $sData);
				unset($sData);

				return true;
			}
		}

		return false;
	}

	public function RawContactsVcf() : bool
	{
		$oAccount = $this->getAccountFromToken();

		\header('Content-Type: text/x-vcard; charset=UTF-8');
		\header('Content-Disposition: attachment; filename="contacts.vcf"', true);
		\header('Accept-Ranges: none', true);
		\header('Content-Transfer-Encoding: binary');

		$this->oHttp->ServerNoCache();

		return $this->AddressBookProvider($oAccount)->IsActive() ?
			$this->AddressBookProvider($oAccount)->Export($oAccount->ParentEmailHelper(), 'vcf') : false;
	}

	public function RawContactsCsv() : bool
	{
		$oAccount = $this->getAccountFromToken();

		\header('Content-Type: text/csv; charset=UTF-8');
		\header('Content-Disposition: attachment; filename="contacts.csv"', true);
		\header('Accept-Ranges: none', true);
		\header('Content-Transfer-Encoding: binary');

		$this->oHttp->ServerNoCache();

		return $this->AddressBookProvider($oAccount)->IsActive() ?
			$this->AddressBookProvider($oAccount)->Export($oAccount->ParentEmailHelper(), 'csv') : false;
	}

	private function rawSmart(bool $bDownload, bool $bThumbnail = false) : bool
	{
		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		$aValues = $this->getDecodedRawKeyValue($sRawKey);

		$sRange = $this->Http()->GetHeader('Range');

		$aMatch = array();
		$sRangeStart = $sRangeEnd = '';
		$bIsRangeRequest = false;

		if (!empty($sRange) && 'bytes=0-' !== \strtolower($sRange) && \preg_match('/^bytes=([0-9]+)-([0-9]*)/i', \trim($sRange), $aMatch))
		{
			$sRangeStart = $aMatch[1];
			$sRangeEnd = $aMatch[2];

			$bIsRangeRequest = true;
		}

		$sFolder = isset($aValues['Folder']) ? $aValues['Folder'] : '';
		$iUid = isset($aValues['Uid']) ? (int) $aValues['Uid'] : 0;
		$sMimeIndex = isset($aValues['MimeIndex']) ? (string) $aValues['MimeIndex'] : '';

		$sContentTypeIn = isset($aValues['MimeType']) ? (string) $aValues['MimeType'] : '';
		$sFileNameIn = isset($aValues['FileName']) ? (string) $aValues['FileName'] : '';
		$sFileHashIn = isset($aValues['FileHash']) ? (string) $aValues['FileHash'] : '';

		$bDetectImageOrientation = !!$this->Config()->Get('labs', 'detect_image_exif_orientation', true);

		if (!empty($sFileHashIn))
		{
			$this->verifyCacheByKey($sRawKey);

			$oAccount = $this->getAccountFromToken();

			$sContentTypeOut = empty($sContentTypeIn) ?
				\MailSo\Base\Utils::MimeContentType($sFileNameIn) : $sContentTypeIn;

			$sFileNameOut = $this->MainClearFileName($sFileNameIn, $sContentTypeIn, $sMimeIndex);

			$rResource = $this->FilesProvider()->GetFile($oAccount, $sFileHashIn);
			if (\is_resource($rResource))
			{
				\header('Content-Type: '.$sContentTypeOut);
				\header('Content-Disposition: attachment; '.
					\trim(\MailSo\Base\Utils::EncodeHeaderUtf8AttributeValue('filename', $sFileNameOut)), true);

				\header('Accept-Ranges: none', true);
				\header('Content-Transfer-Encoding: binary');

				\MailSo\Base\Utils::FpassthruWithTimeLimitReset($rResource);
				return true;
			}

			return false;
		}
		else
		{
			if (!empty($sFolder) && 0 < $iUid)
			{
				$this->verifyCacheByKey($sRawKey);
			}
		}

		$oAccount = $this->initMailClientConnection();

		$self = $this;
		return $this->MailClient()->MessageMimeStream(
			function($rResource, $sContentType, $sFileName, $sMimeIndex = '') use (
				$self, $oAccount, $sRawKey, $sContentTypeIn, $sFileNameIn, $bDownload, $bThumbnail, $bDetectImageOrientation,
				$bIsRangeRequest, $sRangeStart, $sRangeEnd
			) {
				if ($oAccount && \is_resource($rResource))
				{
					\MailSo\Base\Utils::ResetTimeLimit();

					$sContentTypeOut = $sContentTypeIn;
					if (empty($sContentTypeOut))
					{
						$sContentTypeOut = $sContentType;
						if (empty($sContentTypeOut))
						{
							$sContentTypeOut = (empty($sFileName)) ? 'text/plain' : \MailSo\Base\Utils::MimeContentType($sFileName);
						}
					}

					$sFileNameOut = $sFileNameIn;
					if (empty($sFileNameOut))
					{
						$sFileNameOut = $sFileName;
					}

					$sFileNameOut = $self->MainClearFileName($sFileNameOut, $sContentTypeOut, $sMimeIndex);

					$self->cacheByKey($sRawKey);

					$sLoadedData = null;
					if (!$bDownload)
					{
						if ($bThumbnail)
						{
							try
							{
								$oImage = static::loadImage(\stream_get_contents($rResource), $bDetectImageOrientation, 60);
								\header('Content-Disposition: inline; '.
									\trim(\MailSo\Base\Utils::EncodeHeaderUtf8AttributeValue('filename', $sFileNameOut.'_thumb60x60.png')), true);
								$oImage->show('png');
//								$oImage->show('webp'); // Little Britain: "Safari says NO"
								exit;
							}
							catch (\Throwable $oException)
							{
								$self->Logger()->WriteExceptionShort($oException);
							}
						}
						else if ($bDetectImageOrientation &&
							\in_array($sContentTypeOut, array('image/png', 'image/jpeg', 'image/jpg', 'image/webp')))
						{
							try
							{
								$sLoadedData = \stream_get_contents($rResource);
								$oImage = static::loadImage($sLoadedData, $bDetectImageOrientation);
								\header('Content-Disposition: inline; '.
									\trim(\MailSo\Base\Utils::EncodeHeaderUtf8AttributeValue('filename', $sFileNameOut)), true);
								$oImage->show();
							}
							catch (\Throwable $oException)
							{
								$self->Logger()->WriteExceptionShort($oException);
							}
						}
						else
						{
							$sLoadedData = \stream_get_contents($rResource);
						}
					}

					if ($bDownload || $sLoadedData)
					{
						if (!headers_sent()) {
							\header('Content-Type: '.$sContentTypeOut);
							\header('Content-Disposition: '.($bDownload ? 'attachment' : 'inline').'; '.
							\trim(\MailSo\Base\Utils::EncodeHeaderUtf8AttributeValue('filename', $sFileNameOut)), true);

							\header('Accept-Ranges: bytes');
							\header('Content-Transfer-Encoding: binary');
						}

						if ($bIsRangeRequest && !$sLoadedData)
						{
							$sLoadedData = \stream_get_contents($rResource);
						}

						\MailSo\Base\Utils::ResetTimeLimit();

						if ($sLoadedData)
						{
							if ($bIsRangeRequest && (0 < \strlen($sRangeStart) || 0 < \strlen($sRangeEnd)))
							{
								$iFullContentLength = \strlen($sLoadedData);

								\MailSo\Base\Http::StatusHeader(206);

								$iRangeStart = (int) $sRangeStart;
								$iRangeEnd = (int) $sRangeEnd;

								if ('' === $sRangeEnd)
								{
									$sLoadedData = 0 < $iRangeStart ? \substr($sLoadedData, $iRangeStart) : $sLoadedData;
								}
								else
								{
									if ($iRangeStart < $iRangeEnd)
									{
										$sLoadedData = \substr($sLoadedData, $iRangeStart, $iRangeEnd - $iRangeStart);
									}
									else
									{
										$sLoadedData = 0 < $iRangeStart ? \substr($sLoadedData, $iRangeStart) : $sLoadedData;
									}
								}

								$iContentLength = \strlen($sLoadedData);

								if (0 < $iContentLength)
								{
									\header('Content-Length: '.$iContentLength, true);
									\header('Content-Range: bytes '.$sRangeStart.'-'.(0 < $iRangeEnd ? $iRangeEnd : $iFullContentLength - 1).'/'.$iFullContentLength);
								}

								echo $sLoadedData;
							}
							else
							{
								echo $sLoadedData;
							}

							unset($sLoadedData);
						}
						else
						{
							\MailSo\Base\Utils::FpassthruWithTimeLimitReset($rResource);
						}
					}
				}
			}, $sFolder, $iUid, true, $sMimeIndex);
	}

	private static function loadImage(string $data, bool $bDetectImageOrientation = true, int $iThumbnailBoxSize = 0) : \SnappyMail\Image
	{
		if (\extension_loaded('gmagick'))      { $handler = 'gmagick'; }
		else if (\extension_loaded('imagick')) { $handler = 'imagick'; }
		else if (\extension_loaded('gd'))      { $handler = 'gd2'; }
		else { return null; }
		$handler = 'SnappyMail\\Image\\'.$handler.'::createFromString';
		$oImage = $handler($data);

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
