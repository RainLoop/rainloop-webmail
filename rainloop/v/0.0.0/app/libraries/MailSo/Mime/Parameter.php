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
class Parameter
{
	/**
	 * @var string
	 */
	private $sName;

	/**
	 * @var string
	 */
	private $sValue;

	private function __construct(string $sName, string $sValue)
	{
		$this->sName = $sName;
		$this->sValue = $sValue;
	}

	public static function NewInstance(string $sName, string $sValue = '') : self
	{
		return new self($sName, $sValue);
	}

	public static function CreateFromParameterLine(string $sRawParam) : self
	{
		$oParameter = self::NewInstance('');
		return $oParameter->Parse($sRawParam);
	}

	public function Reset() : self
	{
		$this->sName = '';
		$this->sValue = '';

		return $this;
	}

	public function Name() : string
	{
		return $this->sName;
	}

	public function Value() : string
	{
		return $this->sValue;
	}

	public function Parse(string $sRawParam, string $sSeparator = '=') : self
	{
		$this->Reset();

		$aParts = explode($sSeparator, $sRawParam, 2);

		$this->sName = trim(trim($aParts[0]), '"\'');
		if (2 === count($aParts))
		{
			$this->sValue = trim(trim($aParts[1]), '"\'');
		}

		return $this;
	}

	public function ToString(bool $bConvertSpecialsName = false) : string
	{
		$sResult = '';
		if (0 < strlen($this->sName))
		{
			$sResult = $this->sName.'=';
			if ($bConvertSpecialsName && in_array(strtolower($this->sName), array(
				strtolower(Enumerations\Parameter::NAME),
				strtolower(Enumerations\Parameter::FILENAME)
			)))
			{
				$sResult .= '"'.\MailSo\Base\Utils::EncodeUnencodedValue(
					\MailSo\Base\Enumerations\Encoding::BASE64_SHORT,
					$this->sValue).'"';
			}
			else
			{
				$sResult .= '"'.$this->sValue.'"';
			}
		}

		return $sResult;
	}
}
