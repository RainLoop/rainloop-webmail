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
class Header
{
	/**
	 * @var string
	 */
	private $sName;

	/**
	 * @var string
	 */
	private $sValue;

	/**
	 * @var string
	 */
	private $sFullValue;

	/**
	 * @var string
	 */
	private $sEncodedValueForReparse;

	/**
	 * @var ParameterCollection
	 */
	private $oParameters;

	/**
	 * @var strign
	 */
	private $sParentCharset;

	function __construct(string $sName, string $sValue = '', string $sEncodedValueForReparse = '', string $sParentCharset = '')
	{
		$this->sParentCharset = $sParentCharset;

		$this->initInputData($sName, $sValue, $sEncodedValueForReparse);
	}

	private function initInputData(string $sName, string $sValue, string $sEncodedValueForReparse) : void
	{
		$this->sName = trim($sName);
		$this->sFullValue = trim($sValue);
		$this->sEncodedValueForReparse = '';

		$this->oParameters = null;
		if (0 < \strlen($sEncodedValueForReparse) && $this->IsReparsed())
		{
			$this->sEncodedValueForReparse = \trim($sEncodedValueForReparse);
		}

		if (0 < \strlen($this->sFullValue) && $this->IsParameterized())
		{
			$aRawExplode = \explode(';', $this->sFullValue, 2);
			if (2 === \count($aRawExplode))
			{
				$this->sValue = $aRawExplode[0];
				$this->oParameters = new ParameterCollection($aRawExplode[1]);
			}
			else
			{
				$this->sValue = $this->sFullValue;
			}
		}
		else
		{
			$this->sValue = $this->sFullValue;
		}
	}

	public static function NewInstanceFromEncodedString(string $sEncodedLines, string $sIncomingCharset = \MailSo\Base\Enumerations\Charset::ISO_8859_1) : Header
	{
		if (empty($sIncomingCharset))
		{
			$sIncomingCharset = \MailSo\Base\Enumerations\Charset::ISO_8859_1;
		}

		$aParts = \explode(':', \str_replace("\r", '', $sEncodedLines), 2);
		if (isset($aParts[0]) && isset($aParts[1]) && 0 < \strlen($aParts[0]) && 0 < \strlen($aParts[1]))
		{
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
		return $this->Name().': ';
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
		if ($this->sParentCharset !== $sParentCharset && $this->IsReparsed() && 0 < \strlen($this->sEncodedValueForReparse))
		{
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

	private function wordWrapHelper(string $sValue, string $sGlue = "\r\n ") : string
	{
		return \trim(substr(wordwrap($this->NameWithDelimitrom().$sValue,
			Enumerations\Constants::LINE_LENGTH, $sGlue
		), \strlen($this->NameWithDelimitrom())));
	}

	public function EncodedValue() : string
	{
		$sResult = $this->sFullValue;

		if ($this->IsSubject())
		{
			if (!\MailSo\Base\Utils::IsAscii($sResult) &&
				\function_exists('iconv_mime_encode'))
			{
				$aPreferences = array(
//					'scheme' => \MailSo\Base\Enumerations\Encoding::QUOTED_PRINTABLE_SHORT,
					'scheme' => \MailSo\Base\Enumerations\Encoding::BASE64_SHORT,
					'input-charset' => \MailSo\Base\Enumerations\Charset::UTF_8,
					'output-charset' => \MailSo\Base\Enumerations\Charset::UTF_8,
					'line-length' => Enumerations\Constants::LINE_LENGTH,
					'line-break-chars' => Enumerations\Constants::CRLF
				);

				return \iconv_mime_encode($this->Name(), $sResult, $aPreferences);
			}
		}
		else if ($this->IsParameterized() && $this->oParameters && 0 < $this->oParameters->Count())
		{
			$sResult = $this->sValue.'; '.$this->oParameters->ToString(true);
		}
		else if ($this->IsEmail())
		{
			$oEmailCollection = new EmailCollection($this->sFullValue);
			if ($oEmailCollection && 0 < $oEmailCollection->Count())
			{
				$sResult = $oEmailCollection->ToString(true, false);
			}
		}

		return $this->NameWithDelimitrom().$this->wordWrapHelper($sResult);
	}

	public function IsSubject() : bool
	{
		return \strtolower(Enumerations\Header::SUBJECT) === \strtolower($this->Name());
	}

	public function IsParameterized() : bool
	{
		return \in_array(\strtolower($this->sName), array(
			\strtolower(Enumerations\Header::CONTENT_TYPE),
			\strtolower(Enumerations\Header::CONTENT_DISPOSITION)
		));
	}

	public function IsEmail() : bool
	{
		return \in_array(\strtolower($this->sName), array(
			\strtolower(Enumerations\Header::FROM_),
			\strtolower(Enumerations\Header::TO_),
			\strtolower(Enumerations\Header::CC),
			\strtolower(Enumerations\Header::BCC),
			\strtolower(Enumerations\Header::REPLY_TO),
			\strtolower(Enumerations\Header::RETURN_PATH),
			\strtolower(Enumerations\Header::SENDER)
		));
	}

	public function ValueWithCharsetAutoDetect() : string
	{
		$sValue = $this->Value();
		if (!\MailSo\Base\Utils::IsAscii($sValue) &&
			0 < \strlen($this->sEncodedValueForReparse) &&
			!\MailSo\Base\Utils::IsAscii($this->sEncodedValueForReparse))
		{
			$sValueCharset = \MailSo\Base\Utils::CharsetDetect($this->sEncodedValueForReparse);
			if (0 < \strlen($sValueCharset))
			{
				$this->SetParentCharset($sValueCharset);
				$sValue = $this->Value();
			}
		}

		return $sValue;
	}

	public function IsReparsed() : bool
	{
		return $this->IsEmail() || $this->IsSubject() || $this->IsParameterized();
	}
}
