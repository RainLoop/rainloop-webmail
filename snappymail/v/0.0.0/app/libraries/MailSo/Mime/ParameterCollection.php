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
	function __construct(string $sRawParams = '')
	{
		parent::__construct();

		\strlen($sRawParams) && $this->Parse($sRawParams);
	}

	public function append($oParameter, bool $bToTop = false) : void
	{
		assert($oParameter instanceof Parameter);
		parent::append($oParameter, $bToTop);
	}

	public function ParameterValueByName(string $sName) : string
	{
		$oParam = $this->getParameter($sName);
		return $oParam ? $oParam->Value() : '';
	}

	public function getParameter(string $sName) : ?Parameter
	{
		$sName = \strtolower(\trim($sName));
		foreach ($this as $oParam) {
			if ($sName === \strtolower($oParam->Name())) {
				return $oParam;
			}
		}
		return null;
	}

	public function setParameter(string $sName, string $sValue) : void
	{
		$oParam = $this->getParameter($sName);
		if ($oParam) {
			$oParam->setValue($sValue);
		} else {
			parent::append(new Parameter(\trim($sName), $sValue));
		}
	}

	public function Parse(string $sRawParams) : self
	{
		$this->Clear();

		$aDataToParse = \explode(';', $sRawParams);

		foreach ($aDataToParse as $sParam) {
			$this->append(Parameter::CreateFromParameterLine($sParam));
		}

		$this->reParseParameters();

		return $this;
	}

	public function ToString(bool $bConvertSpecialsName = false) : string
	{
		$aResult = array();
		foreach ($this as $oParam) {
			$sLine = $oParam->ToString($bConvertSpecialsName);
			if (\strlen($sLine)) {
				$aResult[] = $sLine;
			}
		}
		return \count($aResult) ? \implode('; ', $aResult) : '';
	}

	public function __toString() : string
	{
		return $this->ToString();
	}

/*
	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		$aResult = array();
		foreach ($this as $oParam) {
			$aResult[$oParam->Name()] = $oParam->Value();
		}
		return array(
			'@Object' => 'Collection/ParameterCollection',
			'@Collection' => $aResult
		);
	}
*/

	private function reParseParameters() : void
	{
		$aDataToReParse = $this->getArrayCopy();
		$sCharset = \MailSo\Base\Enumerations\Charset::UTF_8;

		$this->Clear();

		$aPreParams = array();
		foreach ($aDataToReParse as $oParam) {
			$aMatch = array();
			$sParamName = $oParam->Name();

			if (\preg_match('/([^\*]+)\*([\d]{1,2})\*/', $sParamName, $aMatch) && isset($aMatch[1], $aMatch[2])
				&& \strlen($aMatch[1]) && \is_numeric($aMatch[2]))
			{
				if (!isset($aPreParams[$aMatch[1]])) {
					$aPreParams[$aMatch[1]] = array();
				}

				$sValue = $oParam->Value();

				if (false !== \strpos($sValue, "''")) {
					$aValueParts = \explode("''", $sValue, 2);
					if (\is_array($aValueParts) && 2 === \count($aValueParts) && \strlen($aValueParts[1])) {
						$sCharset = $aValueParts[0];
						$sValue = $aValueParts[1];
					}
				}

				$aPreParams[$aMatch[1]][(int) $aMatch[2]] = $sValue;
			}
			else if (\preg_match('/([^\*]+)\*/', $sParamName, $aMatch) && isset($aMatch[1]))
			{
				if (!isset($aPreParams[$aMatch[1]])) {
					$aPreParams[$aMatch[1]] = array();
				}

				$sValue = $oParam->Value();
				if (false !== \strpos($sValue, "''")) {
					$aValueParts = \explode("''", $sValue, 2);
					if (\is_array($aValueParts) && 2 === \count($aValueParts) && \strlen($aValueParts[1])) {
						$sCharset = $aValueParts[0];
						$sValue = $aValueParts[1];
					}
				}

				$aPreParams[$aMatch[1]][0] = $sValue;
			}
			else
			{
				$this->append($oParam);
			}
		}

		foreach ($aPreParams as $sName => $aValues) {
			\ksort($aValues);
			$sResult = \implode(\array_values($aValues));
			$sResult = \urldecode($sResult);

			if (\strlen($sCharset)) {
				$sResult = \MailSo\Base\Utils::ConvertEncoding($sResult,
					$sCharset, \MailSo\Base\Enumerations\Charset::UTF_8);
			}

			$this->append(new Parameter($sName, $sResult));
		}
	}
}
