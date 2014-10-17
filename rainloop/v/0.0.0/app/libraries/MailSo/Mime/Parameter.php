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

	/**
	 * @access private
	 *
	 * @param string $sName
	 * @param string $sValue
	 */
	private function __construct($sName, $sValue)
	{
		$this->sName = $sName;
		$this->sValue = $sValue;
	}

	/**
	 * @param string $sName
	 * @param string $sValue = ''
	 *
	 * @return \MailSo\Mime\Parameter
	 */
	public static function NewInstance($sName, $sValue = '')
	{
		return new self($sName, $sValue);
	}

	/**
	 * @param string $sName
	 * @param string $sValue = ''
	 *
	 * @return \MailSo\Mime\Parameter
	 */
	public static function CreateFromParameterLine($sRawParam)
	{
		$oParameter = self::NewInstance('');
		return $oParameter->Parse($sRawParam);
	}

	/**
	 * @return \MailSo\Mime\Parameter
	 */
	public function Reset()
	{
		$this->sName = '';
		$this->sValue = '';

		return $this;
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
	public function Value()
	{
		return $this->sValue;
	}

	/**
	 * @param string $sRawParam
	 * @param string $sSeparator = '='
	 *
	 * @return \MailSo\Mime\Parameter
	 */
	public function Parse($sRawParam, $sSeparator = '=')
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

	/**
	 * @param bool $bConvertSpecialsName = false
	 *
	 * @return string
	 */
	public function ToString($bConvertSpecialsName = false)
	{
		$sResult = '';
		if (0 < strlen($this->sName))
		{
			$sResult = $this->sName.'=';
			if ($bConvertSpecialsName && in_array(strtolower($this->sName), array(
				strtolower(\MailSo\Mime\Enumerations\Parameter::NAME),
				strtolower(\MailSo\Mime\Enumerations\Parameter::FILENAME)
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
