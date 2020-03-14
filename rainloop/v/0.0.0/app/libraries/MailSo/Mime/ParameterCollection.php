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
class ParameterCollection extends \MailSo\Base\Collection
{
	/**
	 * @access protected
	 *
	 */
	protected function __construct($sRawParams = '')
	{
		parent::__construct();

		if (0 < \strlen($sRawParams))
		{
			$this->Parse($sRawParams);
		}
	}

	/**
	 *
	 * @return \MailSo\Mime\ParameterCollection
	 */
	public static function NewInstance(string $sRawParams = '')
	{
		return new self($sRawParams);
	}

	/**
	 * @return \MailSo\Mime\Parameter|null
	 */
	public function &GetByIndex(int $iIndex)
	{
		$mResult = null;
		$mResult =& parent::GetByIndex($iIndex);
		return $mResult;
	}

	/**
	 *
	 * @return \MailSo\Mime\ParameterCollection
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function SetAsArray(array $aList)
	{
		parent::SetAsArray($aList);

		return $this;
	}

	public function ParameterValueByName(string $sName) : string
	{
		$sResult = '';
		$sName = \trim($sName);

		$aParams =& $this->GetAsArray();
		foreach ($aParams as /* @var $oParam \MailSo\Mime\ParameterCollection */ $oParam)
		{
			if (\strtolower($sName) === \strtolower($oParam->Name()))
			{
				$sResult = $oParam->Value();
				break;
			}
		}

		return $sResult;
	}

	/**
	 *
	 * @return \MailSo\Mime\ParameterCollection
	 */
	public function Parse(string $sRawParams)
	{
		$this->Clear();

		$aDataToParse = \explode(';', $sRawParams);

		foreach ($aDataToParse as $sParam)
		{
			$this->Add(Parameter::CreateFromParameterLine($sParam));
		}

		$this->reParseParameters();

		return $this;
	}

	public function ToString(bool $bConvertSpecialsName = false) : string
	{
		$aResult = array();
		$aParams =& $this->GetAsArray();
		foreach ($aParams as /* @var $oParam \MailSo\Mime\Parameter */ $oParam)
		{
			$sLine = $oParam->ToString($bConvertSpecialsName);
			if (0 < \strlen($sLine))
			{
				$aResult[] = $sLine;
			}
		}

		return 0 < \count($aResult) ? \implode('; ', $aResult) : '';
	}

	private function reParseParameters() : void
	{
		$aDataToReParse = $this->CloneAsArray();
		$sCharset = \MailSo\Base\Enumerations\Charset::UTF_8;

		$this->Clear();

		$aPreParams = array();
		foreach ($aDataToReParse as /* @var $oParam \MailSo\Mime\Parameter */ $oParam)
		{
			$aMatch = array();
			$sParamName = $oParam->Name();

			if (\preg_match('/([^\*]+)\*([\d]{1,2})\*/', $sParamName, $aMatch) && isset($aMatch[1], $aMatch[2])
				&& 0 < \strlen($aMatch[1]) && \is_numeric($aMatch[2]))
			{
				if (!isset($aPreParams[$aMatch[1]]))
				{
					$aPreParams[$aMatch[1]] = array();
				}

				$sValue = $oParam->Value();

				if (false !== \strpos($sValue, "''"))
				{
					$aValueParts = \explode("''", $sValue, 2);
					if (\is_array($aValueParts) && 2 === \count($aValueParts) && 0 < \strlen($aValueParts[1]))
					{
						$sCharset = $aValueParts[0];
						$sValue = $aValueParts[1];
					}
				}

				$aPreParams[$aMatch[1]][(int) $aMatch[2]] = $sValue;
			}
			else if (\preg_match('/([^\*]+)\*/', $sParamName, $aMatch) && isset($aMatch[1]))
			{
				if (!isset($aPreParams[$aMatch[1]]))
				{
					$aPreParams[$aMatch[1]] = array();
				}

				$sValue = $oParam->Value();
				if (false !== \strpos($sValue, "''"))
				{
					$aValueParts = \explode("''", $sValue, 2);
					if (\is_array($aValueParts) && 2 === \count($aValueParts) && 0 < \strlen($aValueParts[1]))
					{
						$sCharset = $aValueParts[0];
						$sValue = $aValueParts[1];
					}
				}

				$aPreParams[$aMatch[1]][0] = $sValue;
			}
			else
			{
				$this->Add($oParam);
			}
		}

		foreach ($aPreParams as $sName => $aValues)
		{
			ksort($aValues);
			$sResult = \implode(\array_values($aValues));
			$sResult = \urldecode($sResult);

			if (0 < \strlen($sCharset))
			{
				$sResult = \MailSo\Base\Utils::ConvertEncoding($sResult,
					$sCharset, \MailSo\Base\Enumerations\Charset::UTF_8);
			}

			$this->Add(Parameter::NewInstance($sName, $sResult));
		}
	}
}
