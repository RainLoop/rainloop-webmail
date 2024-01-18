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
class Part
{
	public HeaderCollection $Headers;

	/**
	 * @var resource
	 */
	public $Body = null;

	/**
	 * @var resource
	 */
	public $Raw = null;

	public PartCollection $SubParts;

	function __construct()
	{
		$this->Headers = new HeaderCollection;
		$this->SubParts = new PartCollection;
	}

	public function HeaderCharset() : string
	{
		return \trim(\strtolower($this->Headers->ParameterValue(Enumerations\Header::CONTENT_TYPE, Enumerations\Parameter::CHARSET)));
	}

	public function HeaderBoundary() : string
	{
		return \trim($this->Headers->ParameterValue(Enumerations\Header::CONTENT_TYPE, Enumerations\Parameter::BOUNDARY));
	}

	public function ContentType() : string
	{
		return \trim(\strtolower($this->Headers->ValueByName(Enumerations\Header::CONTENT_TYPE)));
	}

	public function IsFlowedFormat() : bool
	{
		$bResult = 'flowed' === \trim(\strtolower($this->Headers->ParameterValue(
			Enumerations\Header::CONTENT_TYPE,
			Enumerations\Parameter::FORMAT)));

		if ($bResult && \in_array($this->MailEncodingName(), array('base64', 'quoted-printable'))) {
			$bResult = false;
		}

		return $bResult;
	}

	public function FileName() : string
	{
		$sResult = \trim($this->Headers->ParameterValue(
			Enumerations\Header::CONTENT_DISPOSITION,
			Enumerations\Parameter::FILENAME));

		if (!\strlen($sResult)) {
			$sResult = \trim($this->Headers->ParameterValue(
				Enumerations\Header::CONTENT_TYPE,
				Enumerations\Parameter::NAME));
		}

		return $sResult;
	}

	public function IsPgpSigned() : bool
	{
		// https://datatracker.ietf.org/doc/html/rfc3156#section-5
		$header = $this->Headers->GetByName(Enumerations\Header::CONTENT_TYPE);
		return $header
		 && \preg_match('#multipart/signed.+protocol=["\']?application/pgp-signature#si', $header->FullValue())
		 // The multipart/signed body MUST consist of exactly two parts.
		 && 2 === \count($this->SubParts)
		 && $this->SubParts[1]->IsPgpSignature();
	}

	public function IsPgpSignature() : bool
	{
		return \in_array($this->ContentType(), array('application/pgp-signature', 'application/pkcs7-signature'));
	}

	public static function FromFile(string $sFileName) : ?self
	{
		$rStreamHandle = \file_exists($sFileName) ? \fopen($sFileName, 'rb') : false;
		if ($rStreamHandle) {
			try {
				return Parser::parseStream($rStreamHandle);
			} finally {
				\fclose($rStreamHandle);
			}
		}
		return null;
	}

	public static function FromString(string $sRawMessage) : ?self
	{
		$rStreamHandle = \strlen($sRawMessage) ?
			\MailSo\Base\ResourceRegistry::CreateMemoryResource() : false;
		if ($rStreamHandle) {
			\fwrite($rStreamHandle, $sRawMessage);
			unset($sRawMessage);
			\fseek($rStreamHandle, 0);

			try {
				return Parser::parseStream($rStreamHandle);
			} finally {
				\MailSo\Base\ResourceRegistry::CloseMemoryResource($rStreamHandle);
			}
		}
		return null;
	}

	/**
	 * @param resource $rStreamHandle
	 */
	public static function FromStream($rStreamHandle) : ?Part
	{
		return Parser::parseStream($rStreamHandle);
	}

	/**
	 * @return resource|bool
	 */
	public function ToStream()
	{
		if ($this->Raw) {
			$aSubStreams = array(
				$this->Raw
			);
		} else {
			if ($this->SubParts->count()) {
				$sBoundary = $this->HeaderBoundary();
				if (!\strlen($sBoundary)) {
					$this->Headers->GetByName(Enumerations\Header::CONTENT_TYPE)->setParameter(
						Enumerations\Parameter::BOUNDARY,
						$this->SubParts->Boundary()
					);
				} else {
					$this->SubParts->SetBoundary($sBoundary);
				}
			}

			$aSubStreams = array(
				$this->Headers . "\r\n"
			);

			if ($this->Body) {
				$aSubStreams[0] .= "\r\n";
				if (\is_resource($this->Body)) {
					$aMeta = \stream_get_meta_data($this->Body);
					if (!empty($aMeta['seekable'])) {
						\rewind($this->Body);
					}
				}
				$aSubStreams[] = $this->Body;
			}

			if ($this->SubParts->count()) {
				$rSubPartsStream = $this->SubParts->ToStream();
				if (\is_resource($rSubPartsStream)) {
					$aSubStreams[] = $rSubPartsStream;
				}
			}
		}

		return \MailSo\Base\StreamWrappers\SubStreams::CreateStream($aSubStreams);
	}

	public function addPgpEncrypted(string $sEncrypted)
	{
		$oPart = new MimePart;
		$oPart->Headers->AddByName(Enumerations\Header::CONTENT_TYPE, 'multipart/encrypted; protocol="application/pgp-encrypted"');
		$this->SubParts->append($oPart);

		$oSubPart = new MimePart;
		$oSubPart->Headers->AddByName(Enumerations\Header::CONTENT_TYPE, 'application/pgp-encrypted');
		$oSubPart->Headers->AddByName(Enumerations\Header::CONTENT_DISPOSITION, 'attachment');
		$oSubPart->Headers->AddByName(Enumerations\Header::CONTENT_TRANSFER_ENCODING, '7Bit');
		$oSubPart->Body = \MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString('Version: 1');
		$oPart->SubParts->append($oSubPart);

		$oSubPart = new MimePart;
		$oSubPart->Headers->AddByName(Enumerations\Header::CONTENT_TYPE, 'application/octet-stream');
		$oSubPart->Headers->AddByName(Enumerations\Header::CONTENT_DISPOSITION, 'inline; filename="msg.asc"');
		$oSubPart->Headers->AddByName(Enumerations\Header::CONTENT_TRANSFER_ENCODING, '7Bit');
		$oSubPart->Body = \MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString($sEncrypted);
		$oPart->SubParts->append($oSubPart);
	}

	public function addPlain(string $sPlain)
	{
		$oPart = new MimePart;
		$oPart->Headers->AddByName(Enumerations\Header::CONTENT_TYPE, 'text/plain; charset=utf-8');
		$oPart->Headers->AddByName(Enumerations\Header::CONTENT_TRANSFER_ENCODING, 'quoted-printable');
		$oPart->Body = \MailSo\Base\StreamWrappers\Binary::CreateStream(
			\MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString(\preg_replace('/\\r?\\n/su', "\r\n", \trim($sPlain))),
			'convert.quoted-printable-encode'
		);
		$this->SubParts->append($oPart);
	}

}
