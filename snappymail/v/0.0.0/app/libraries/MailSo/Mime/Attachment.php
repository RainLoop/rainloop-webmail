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

	private int $iFileSize;

	private string $sCID;

	private bool $bIsInline;

	private bool $bIsLinked;

	private array $aCustomContentTypeParams;

	private string $sContentLocation;

	private string $sContentType;

	/**
	 * @param resource $rResource
	 */
	function __construct($rResource, string $sFileName, int $iFileSize, bool $bIsInline,
		bool $bIsLinked, string $sCID, array $aCustomContentTypeParams = [],
		string $sContentLocation = '', string $sContentType = '')
	{
		$this->rResource = $rResource;
		$this->sFileName = $sFileName;
		$this->iFileSize = $iFileSize;
		$this->bIsInline = $bIsInline;
		$this->bIsLinked = $bIsLinked;
		$this->sCID = $sCID;
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

	public function CID() : string
	{
		return $this->sCID;
	}

	public function ContentLocation() : string
	{
		return $this->sContentLocation;
	}

	public function FileName() : string
	{
		return $this->sFileName;
	}

	public function FileSize() : int
	{
		return $this->iFileSize;
	}

	public function IsInline() : bool
	{
		return $this->bIsInline;
	}

	public function IsImage() : bool
	{
		return 'image' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->sFileName);
	}

	public function IsArchive() : bool
	{
		return 'archive' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->sFileName);
	}

	public function IsPdf() : bool
	{
		return 'pdf' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->sFileName);
	}

	public function IsDoc() : bool
	{
		return 'doc' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->sFileName);
	}

	public function IsLinked() : bool
	{
		return $this->bIsLinked && \strlen($this->sCID);
	}

	public function ToPart() : Part
	{
		$oAttachmentPart = new Part;

		$sFileName = \trim($this->sFileName);
		$sCID = $this->CID();
		$sContentLocation = $this->ContentLocation();

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
				($this->IsInline() ? 'inline' : 'attachment').
				($oContentDispositionParameters ? '; '.$oContentDispositionParameters : '')
			)
		);

		if (\strlen($sCID)) {
			$oAttachmentPart->Headers->append(
				new Header(Enumerations\Header::CONTENT_ID, $sCID)
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
							\MailSo\Base\Enumerations\Encoding::BASE64, false));

				\MailSo\Base\StreamWrappers\Binary::RememberStream($oAttachmentPart->Body);
			}
		}

		return $oAttachmentPart;
	}
}
