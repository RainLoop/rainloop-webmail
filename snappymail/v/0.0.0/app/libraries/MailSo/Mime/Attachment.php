<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mime;

/**
 * @category MailSo
 * @package Mime
 */
class Attachment
{
	/**
	 * @var resource
	 */
	private $rResource;

	private string $sFileName;

//	private int $iFileSize;

	private string $sContentID;

	private bool $bIsInline;

	private bool $bIsLinked;

	private array $aCustomContentTypeParams;

	private string $sContentLocation;

	private string $sContentType;

	/**
	 * @param resource $rResource
	 */
	function __construct($rResource, string $sFileName, int $iFileSize, bool $bIsInline,
		bool $bIsLinked, string $sContentID, array $aCustomContentTypeParams = [],
		string $sContentLocation = '', string $sContentType = '')
	{
		$this->rResource = $rResource;
		$this->sFileName = $sFileName;
//		$this->iFileSize = $iFileSize;
		$this->bIsInline = $bIsInline;
		$this->bIsLinked = $bIsLinked;
		$this->sContentID = $sContentID;
		$this->aCustomContentTypeParams = $aCustomContentTypeParams;
		$this->sContentLocation = $sContentLocation;
		$this->sContentType = $sContentType
			?: \SnappyMail\File\MimeType::fromStream($rResource, $sFileName)
			?: \SnappyMail\File\MimeType::fromFilename($sFileName)
			?: 'application/octet-stream';
	}

	/**
	 * @return resource
	 */
	public function Resource()
	{
		return $this->rResource;
	}

	public function ContentType() : string
	{
		return $this->sContentType;
	}

	public function CustomContentTypeParams() : array
	{
		return $this->aCustomContentTypeParams;
	}

	public function FileName() : string
	{
		return $this->sFileName;
	}

	public function isInline() : bool
	{
		return $this->bIsInline;
	}

	public function isLinked() : bool
	{
		return $this->bIsLinked && \strlen($this->sContentID);
	}

	public function ToPart() : Part
	{
		$oAttachmentPart = new Part;

		$sFileName = \trim($this->sFileName);
		$sContentID = $this->sContentID;
		$sContentLocation = $this->sContentLocation;

		$oContentTypeParameters = null;
		$oContentDispositionParameters = null;

		if (\strlen($sFileName)) {
			$oContentTypeParameters =
				(new ParameterCollection)->Add(new Parameter(
					Enumerations\Parameter::NAME, $sFileName));

			$oContentDispositionParameters =
				(new ParameterCollection)->Add(new Parameter(
					Enumerations\Parameter::FILENAME, $sFileName));
		}

		$oAttachmentPart->Headers->append(
			new Header(Enumerations\Header::CONTENT_TYPE,
				$this->ContentType().
				($oContentTypeParameters ? '; '.$oContentTypeParameters : '')
			)
		);

		$oAttachmentPart->Headers->append(
			new Header(Enumerations\Header::CONTENT_DISPOSITION,
				($this->isInline() ? 'inline' : 'attachment').
				($oContentDispositionParameters ? '; '.$oContentDispositionParameters : '')
			)
		);

		if (\strlen($sContentID)) {
			$oAttachmentPart->Headers->append(
				new Header(Enumerations\Header::CONTENT_ID, $sContentID)
			);
		}

		if (\strlen($sContentLocation)) {
			$oAttachmentPart->Headers->append(
				new Header(Enumerations\Header::CONTENT_LOCATION, $sContentLocation)
			);
		}

		$oAttachmentPart->Body = $this->Resource();

		if ('message/rfc822' !== \strtolower($this->ContentType())) {
			$oAttachmentPart->Headers->append(
				new Header(
					Enumerations\Header::CONTENT_TRANSFER_ENCODING,
					\MailSo\Base\Enumerations\Encoding::BASE64_LOWER
				)
			);

			if (\is_resource($oAttachmentPart->Body) && !\MailSo\Base\StreamWrappers\Binary::IsStreamRemembed($oAttachmentPart->Body)) {
				$oAttachmentPart->Body =
					\MailSo\Base\StreamWrappers\Binary::CreateStream($oAttachmentPart->Body,
						\MailSo\Base\StreamWrappers\Binary::GetInlineDecodeOrEncodeFunctionName(
							\MailSo\Base\Enumerations\Encoding::BASE64_LOWER, false));

				\MailSo\Base\StreamWrappers\Binary::RememberStream($oAttachmentPart->Body);
			}
		}

		return $oAttachmentPart;
	}
}
