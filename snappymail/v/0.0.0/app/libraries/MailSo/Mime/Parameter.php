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
class Parameter implements \JsonSerializable
{
	private string $sName;

	private string $sValue;

	function __construct(string $sName, string $sValue)
	{
		$this->sName = $sName;
		$this->sValue = $sValue;
	}

	public static function FromString(string $sRawParam) : self
	{
		$oParameter = new self('', '');

		$aParts = \explode('=', $sRawParam, 2);
		$oParameter->sName = \trim(\trim($aParts[0]), '"\'');
		if (2 === \count($aParts)) {
			$oParameter->sValue = \trim(\trim($aParts[1]), '"\'');
		}

		return $oParameter;
	}

	public function Name() : string
	{
		return $this->sName;
	}

	public function Value() : string
	{
		return $this->sValue;
	}

	public function setValue(string $sValue) : void
	{
		$this->sValue = $sValue;
	}

	public function ToString(bool $bConvertSpecialsName = false) : string
	{
		if (!\strlen($this->sName)) {
			return '';
		}

		if ($bConvertSpecialsName && \in_array(\strtolower($this->sName), array(
			\strtolower(Enumerations\Parameter::NAME),
			\strtolower(Enumerations\Parameter::FILENAME)
		)))
		{
			return $this->sName . '="' . \MailSo\Base\Utils::EncodeHeaderValue($this->sValue) . '"';
		}

		return $this->sName . '="' . $this->sValue . '"';
	}

	public function __toString() : string
	{
		return $this->ToString();
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return array(
			'name' => $this->sName,
			'value' => $this->sValue
		);
	}
}
