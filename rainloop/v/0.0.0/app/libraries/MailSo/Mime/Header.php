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

	/**
	 * @access private
	 *
	 * @param string $sName
	 * @param string $sValue
	 * @param string $sEncodedValueForReparse
	 * @param string $sParentCharset = ''
	 */
	private function __construct($sName, $sValue, $sEncodedValueForReparse, $sParentCharset = '')
	{
		$this->sParentCharset = $sParentCharset;

		$this->initInputData($sName, $sValue, $sEncodedValueForReparse);
	}

	/**
	 * @param string $sName
	 * @param string $sValue
	 * @param string $sEncodedValueForReparse
	 *
	 * @return void
	 */
	private function initInputData($sName, $sValue, $sEncodedValueForReparse)
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
				$this->oParameters =
					\MailSo\Mime\ParameterCollection::NewInstance($aRawExplode[1]);
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

	/**
	 * @param string $sName
	 * @param string $sValue = ''
	 * @param string $sEncodedValueForReparse = ''
	 * @param string $sParentCharset = ''
	 *
	 * @return \MailSo\Mime\Header
	 */
	public static function NewInstance($sName, $sValue = '', $sEncodedValueForReparse = '', $sParentCharset = '')
	{
		return new self($sName, $sValue, $sEncodedValueForReparse, $sParentCharset);
	}

	/**
	 * @param string $sEncodedLines
	 * @param string $sIncomingCharset = \MailSo\Base\Enumerations\Charset::ISO_8859_1
	 *
	 * @return \MailSo\Mime\Header | false
	 */
	public static function NewInstanceFromEncodedString($sEncodedLines, $sIncomingCharset = \MailSo\Base\Enumerations\Charset::ISO_8859_1)
	{
		if (empty($sIncomingCharset))
		{
			$sIncomingCharset = \MailSo\Base\Enumerations\Charset::ISO_8859_1;
		}

		$aParts = \explode(':', \str_replace("\r", '', $sEncodedLines), 2);
		if (isset($aParts[0]) && isset($aParts[1]) && 0 < \strlen($aParts[0]) && 0 < \strlen($aParts[1]))
		{
			return self::NewInstance(
				\trim($aParts[0]),
				\trim(\MailSo\Base\Utils::DecodeHeaderValue(\trim($aParts[1]), $sIncomingCharset)),
				\trim($aParts[1]),
				$sIncomingCharset
			);
		}

		return false;
	}

	/**
	 * @return string
	 */
	public function Name()
	{
		return $this->sName;
	}

	/**
	 * @return string
	 */
	public function NameWithDelimitrom()
	{
		return $this->Name().': ';
	}

	/**
	 * @return string
	 */
	public function Value()
	{
		return $this->sValue;
	}

	/**
	 * @return string
	 */
	public function FullValue()
	{
		return $this->sFullValue;
	}

	/**
	 * @param string $sParentCharset
	 * @return \MailSo\Mime\Header
	 */
	public function SetParentCharset($sParentCharset)
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

	/**
	 * @return \MailSo\Mime\ParameterCollection | null
	 */
	public function Parameters()
	{
		return $this->oParameters;
	}

	/**
	 * @param string $sValue
	 * @return string
	 */
	private function wordWrapHelper($sValue, $sGlue = "\r\n ")
	{
		return \trim(substr(wordwrap($this->NameWithDelimitrom().$sValue,
			\MailSo\Mime\Enumerations\Constants::LINE_LENGTH, $sGlue
		), \strlen($this->NameWithDelimitrom())));
	}

	/**
	 * @return string
	 */
	public function EncodedValue()
	{
		$sResult = $this->sFullValue;

		if ($this->IsSubject())
		{
			if (!\MailSo\Base\Utils::IsAscii($sResult) && 
				\MailSo\Base\Utils::IsIconvSupported() &&
				\function_exists('iconv_mime_encode'))
			{
				$aPreferences = array(
//					'scheme' => \MailSo\Base\Enumerations\Encoding::QUOTED_PRINTABLE_SHORT,
					'scheme' => \MailSo\Base\Enumerations\Encoding::BASE64_SHORT,
					'input-charset' => \MailSo\Base\Enumerations\Charset::UTF_8,
					'output-charset' => \MailSo\Base\Enumerations\Charset::UTF_8,
					'line-length' => \MailSo\Mime\Enumerations\Constants::LINE_LENGTH,
					'line-break-chars' => \MailSo\Mime\Enumerations\Constants::CRLF
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
			$oEmailCollection = \MailSo\Mime\EmailCollection::NewInstance($this->sFullValue);
			if ($oEmailCollection && 0 < $oEmailCollection->Count())
			{
				$sResult = $oEmailCollection->ToString(true, false);
			}
		}

		return $this->NameWithDelimitrom().$this->wordWrapHelper($sResult);
	}

	/**
	 * @return bool
	 */
	public function IsSubject()
	{
		return \strtolower(\MailSo\Mime\Enumerations\Header::SUBJECT) === \strtolower($this->Name());
	}

	/**
	 * @return bool
	 */
	public function IsParameterized()
	{
		return \in_array(\strtolower($this->sName), array(
			\strtolower(\MailSo\Mime\Enumerations\Header::CONTENT_TYPE),
			\strtolower(\MailSo\Mime\Enumerations\Header::CONTENT_DISPOSITION)
		));
	}

	/**
	 * @return bool
	 */
	public function IsEmail()
	{
		return \in_array(\strtolower($this->sName), array(
			\strtolower(\MailSo\Mime\Enumerations\Header::FROM_),
			\strtolower(\MailSo\Mime\Enumerations\Header::TO_),
			\strtolower(\MailSo\Mime\Enumerations\Header::CC),
			\strtolower(\MailSo\Mime\Enumerations\Header::BCC),
			\strtolower(\MailSo\Mime\Enumerations\Header::REPLY_TO),
			\strtolower(\MailSo\Mime\Enumerations\Header::RETURN_PATH),
			\strtolower(\MailSo\Mime\Enumerations\Header::SENDER)
		));
	}

	/**
	 * @return string
	 */
	public function ValueWithCharsetAutoDetect()
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

	/**
	 * @return bool
	 */
	public function IsReparsed()
	{
		return $this->IsEmail() || $this->IsSubject() || $this->IsParameterized();
	}
}
