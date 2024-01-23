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
class Header implements \JsonSerializable
{
	private string $sName;

	private string $sValue;

	private string $sFullValue;

	private string $sEncodedValueForReparse;

	private ?ParameterCollection $oParameters = null;

	private string $sParentCharset;

	function __construct(string $sName, string $sValue = '', string $sEncodedValueForReparse = '', string $sParentCharset = '')
	{
		$this->sParentCharset = $sParentCharset;
		$this->initInputData($sName, $sValue, $sEncodedValueForReparse);
	}

	private function initInputData(string $sName, string $sValue, string $sEncodedValueForReparse) : void
	{
		$this->sName = \trim($sName);
		$this->sFullValue = \trim($sValue);
		$this->sEncodedValueForReparse = '';

		if (\strlen($sEncodedValueForReparse) && ($this->IsEmail() || $this->IsSubject() || $this->IsParameterized())) {
			$this->sEncodedValueForReparse = \trim($sEncodedValueForReparse);
		}

		if (\strlen($this->sFullValue) && $this->IsParameterized()) {
			$aRawExplode = \explode(';', $this->sFullValue, 2);
			if (2 === \count($aRawExplode)) {
				$this->sValue = $aRawExplode[0];
				$this->oParameters = new ParameterCollection($aRawExplode[1]);
			} else {
				$this->sValue = $this->sFullValue;
			}
		} else {
			$this->sValue = $this->sFullValue;
		}

		if (!$this->oParameters) {
			$this->oParameters = new ParameterCollection();
		}
	}

	public static function NewInstanceFromEncodedString(string $sEncodedLines, string $sIncomingCharset = \MailSo\Base\Enumerations\Charset::ISO_8859_1) : Header
	{
		if (empty($sIncomingCharset)) {
			$sIncomingCharset = \MailSo\Base\Enumerations\Charset::ISO_8859_1;
		}

		$aParts = \explode(':', \str_replace("\r", '', $sEncodedLines), 2);
		if (isset($aParts[0]) && isset($aParts[1]) && \strlen($aParts[0]) && \strlen($aParts[1])) {
			return new self(
				\trim($aParts[0]),
				\trim(\MailSo\Base\Utils::DecodeHeaderValue(\trim($aParts[1]), $sIncomingCharset)),
				\trim($aParts[1]),
				$sIncomingCharset
			);
		}

		return false;
	}

	public function Name() : string
	{
		return $this->sName;
	}

	public function NameWithDelimitrom() : string
	{
		return $this->sName . ': ';
	}

	public function Value() : string
	{
		return $this->sValue;
	}

	public function FullValue() : string
	{
		return $this->sFullValue;
	}

	public function SetParentCharset(string $sParentCharset) : Header
	{
		if ($this->sParentCharset !== $sParentCharset && \strlen($this->sEncodedValueForReparse)) {
			$this->initInputData(
				$this->sName,
				\trim(\MailSo\Base\Utils::DecodeHeaderValue($this->sEncodedValueForReparse, $sParentCharset)),
				$this->sEncodedValueForReparse
			);
		}

		$this->sParentCharset = $sParentCharset;

		return $this;
	}

	public function Parameters() : ?ParameterCollection
	{
		return $this->oParameters;
	}

	public function setParameter(string $sName, string $sValue) : void
	{
		$this->oParameters->setParameter($sName, $sValue);
	}

	public function __toString() : string
	{
		$sResult = $this->sFullValue;

		if ($this->IsSubject()) {
			if (!\MailSo\Base\Utils::IsAscii($sResult) && \function_exists('iconv_mime_encode')) {
				return \iconv_mime_encode($this->Name(), $sResult, array(
//					'scheme' => \MailSo\Base\Enumerations\Encoding::QUOTED_PRINTABLE_SHORT,
					'scheme' => \MailSo\Base\Enumerations\Encoding::BASE64_SHORT,
					'input-charset' => \MailSo\Base\Enumerations\Charset::UTF_8,
					'output-charset' => \MailSo\Base\Enumerations\Charset::UTF_8,
					'line-length' => 74,
					'line-break-chars' => "\r\n"
				));
			}
		}
		else if ($this->IsParameterized() && $this->oParameters->count())
		{
			$sResult = $this->sValue.'; '.$this->oParameters->ToString(true);
		}
		else if ($this->IsEmail())
		{
			$oEmailCollection = new EmailCollection($this->sFullValue);
			if ($oEmailCollection && $oEmailCollection->count()) {
				$sResult = $oEmailCollection->ToString(true);
			}
		}

		// https://www.rfc-editor.org/rfc/rfc2822#section-2.1.1, avoid folding immediately after the header name
		return $this->NameWithDelimitrom() . \wordwrap($sResult, 78 - \strlen($this->NameWithDelimitrom()) - 1, "\r\n ");
	}

	private function IsSubject() : bool
	{
		return \strtolower(Enumerations\Header::SUBJECT) === \strtolower($this->Name());
	}

	private function IsParameterized() : bool
	{
		return \in_array(\strtolower($this->sName), array(
			\strtolower(Enumerations\Header::CONTENT_TYPE),
			\strtolower(Enumerations\Header::CONTENT_DISPOSITION)
		));
	}

	private function IsEmail() : bool
	{
		return \in_array(\strtolower($this->sName), array(
			\strtolower(Enumerations\Header::FROM_),
			\strtolower(Enumerations\Header::TO_),
			\strtolower(Enumerations\Header::CC),
			\strtolower(Enumerations\Header::BCC),
			\strtolower(Enumerations\Header::REPLY_TO),
//			\strtolower(Enumerations\Header::RETURN_PATH),
			\strtolower(Enumerations\Header::SENDER)
		));
	}

	public function ValueWithCharsetAutoDetect() : string
	{
		if (!\MailSo\Base\Utils::IsAscii($this->Value())
		 && \strlen($this->sEncodedValueForReparse)
		 && !\MailSo\Base\Utils::IsAscii($this->sEncodedValueForReparse)
		 && ($mEncoding = \mb_detect_encoding($this->sEncodedValueForReparse, 'auto', true))
		) {
			$this->SetParentCharset($mEncoding);
		}
		return $this->Value();
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		$aResult = array(
			'@Object' => 'Object/MimeHeader',
			'name' => $this->sName,
			'value' => $this->sValue
		);
		if ($this->oParameters->count()) {
			$aResult['parameters'] = $this->oParameters;
		}
		return $aResult;
	}
}
