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
class HeaderCollection extends \MailSo\Base\Collection
{

	protected string $sRawHeaders = '';

	protected string $sParentCharset = '';

	function __construct(string $sRawHeaders = '', bool $bStoreRawHeaders = true, string $sParentCharset = '')
	{
		parent::__construct();
		if (\strlen($sRawHeaders)) {
			$this->Parse($sRawHeaders, $bStoreRawHeaders, $sParentCharset);
		}
	}

	public function append($oHeader, bool $bToTop = false) : void
	{
		assert($oHeader instanceof Header);
		parent::append($oHeader, $bToTop);
	}

	public function AddByName(string $sName, string $sValue, bool $bToTop = false) : self
	{
		$this->append(new Header($sName, $sValue), $bToTop);
		return $this;
	}

	public function SetByName(string $sName, string $sValue, bool $bToTop = false) : self
	{
		return $this->RemoveByName($sName)->Add(new Header($sName, $sValue), $bToTop);
	}

	public function ValueByName(string $sHeaderName, bool $bCharsetAutoDetect = false) : string
	{
		$oHeader = $this->GetByName($sHeaderName);
		return $oHeader ? ($bCharsetAutoDetect ? $oHeader->ValueWithCharsetAutoDetect() : $oHeader->Value()) : '';
	}

	public function ValuesByName(string $sHeaderName, bool $bCharsetAutoDetect = false) : array
	{
		$aResult = array();
		$sHeaderNameLower = \strtolower($sHeaderName);
		foreach ($this as $oHeader) {
			if ($sHeaderNameLower === \strtolower($oHeader->Name())) {
				$aResult[] = $bCharsetAutoDetect ? $oHeader->ValueWithCharsetAutoDetect() : $oHeader->Value();
			}
		}
		return $aResult;
	}

	public function RemoveByName(string $sHeaderName) : self
	{
		$sHeaderName = \strtolower($sHeaderName);
		$this->exchangeArray(array_filter($this->getArrayCopy(), function ($oHeader) use ($sHeaderName) {
			return $oHeader && \strtolower($oHeader->Name()) !== $sHeaderName;
		}));
		return $this;
	}

	public function GetAsEmailCollection(string $sHeaderName, bool $bCharsetAutoDetect = false) : ?EmailCollection
	{
		$oResult = null;
		$sValue = $this->ValueByName($sHeaderName, $bCharsetAutoDetect);
		if (\strlen($sValue)) {
			$oResult = new EmailCollection($sValue);
		}
		return $oResult && $oResult->count() ? $oResult : null;
	}

	public function ParametersByName(string $sHeaderName) : ?ParameterCollection
	{
		$oHeader = $this->GetByName($sHeaderName);
		return $oHeader ? $oHeader->Parameters() : null;
	}

	public function ParameterValue(string $sHeaderName, string $sParamName) : string
	{
		$oParameters = $this->ParametersByName($sHeaderName);
		return (null !== $oParameters) ? $oParameters->ParameterValueByName($sParamName) : '';
	}

	public function GetByName(string $sHeaderName) : ?Header
	{
		$sHeaderNameLower = \strtolower($sHeaderName);
		foreach ($this as $oHeader) {
			if ($sHeaderNameLower === \strtolower($oHeader->Name())) {
				return $oHeader;
			}
		}
		return null;
	}

	public function SetParentCharset(string $sParentCharset) : self
	{
		if (\strlen($sParentCharset) && $this->sParentCharset !== $sParentCharset) {
			foreach ($this as $oHeader) {
				$oHeader->SetParentCharset($sParentCharset);
			}
			$this->sParentCharset = $sParentCharset;
		}
		return $this;
	}

	public function Clear() : void
	{
		parent::Clear();
		$this->sRawHeaders = '';
	}

	public function Parse(string $sRawHeaders, bool $bStoreRawHeaders = false, string $sParentCharset = '') : self
	{
		$this->Clear();

		if ($bStoreRawHeaders) {
			$this->sRawHeaders = $sRawHeaders;
		}

		if (\strlen($this->sParentCharset)) {
			$this->sParentCharset = $sParentCharset;
		}

		$aHeaders = \explode("\n", \str_replace("\r", '', $sRawHeaders));

		$sName = null;
		$sValue = null;
		foreach ($aHeaders as $sHeadersValue) {
			if (!\strlen($sHeadersValue)) {
				continue;
			}

			$sFirstChar = \substr($sHeadersValue, 0, 1);
			if ($sFirstChar !== ' ' && $sFirstChar !== "\t" && false === \strpos($sHeadersValue, ':')) {
				continue;
			}
			if (null !== $sName && ($sFirstChar === ' ' || $sFirstChar === "\t")) {
				$sValue = \is_null($sValue) ? '' : $sValue;

				if ('?=' === \substr(\rtrim($sHeadersValue), -2)) {
					$sHeadersValue = \rtrim($sHeadersValue);
				}

				if ('=?' === \substr(\ltrim($sHeadersValue), 0, 2)) {
					$sHeadersValue = \ltrim($sHeadersValue);
				}

				if ('=?' === \substr($sHeadersValue, 0, 2)) {
					$sValue .= $sHeadersValue;
				} else {
					$sValue .= "\n".$sHeadersValue;
				}
			} else {
				if (null !== $sName) {
					$oHeader = Header::NewInstanceFromEncodedString($sName.': '.$sValue, $this->sParentCharset);
					if ($oHeader) {
						$this->append($oHeader);
					}

					$sName = null;
					$sValue = null;
				}

				$aHeaderParts = \explode(':', $sHeadersValue, 2);
				$sName = $aHeaderParts[0];
				$sValue = isset($aHeaderParts[1]) ? $aHeaderParts[1] : '';

				if ('?=' === \substr(\rtrim($sValue), -2)) {
					$sValue = \rtrim($sValue);
				}
			}
		}

		if (null !== $sName) {
			$oHeader = Header::NewInstanceFromEncodedString($sName.': '.$sValue, $this->sParentCharset);
			if ($oHeader) {
				$this->append($oHeader);
			}
		}

		return $this;
	}

	public function DkimStatuses() : array
	{
		$aResult = array();

		$aHeaders = $this->ValuesByName(Enumerations\Header::AUTHENTICATION_RESULTS);
		if (\count($aHeaders)) {
			foreach ($aHeaders as $sHeaderValue) {
				$sStatus = '';
				$sHeader = '';
				$sDkimLine = '';

				$aMatch = array();

				$sHeaderValue = \preg_replace('/[\r\n\t\s]+/', ' ', $sHeaderValue);

				if (\preg_match('/dkim=.+/i', $sHeaderValue, $aMatch) && !empty($aMatch[0])) {
					$sDkimLine = $aMatch[0];

					$aMatch = array();
					if (\preg_match('/dkim=([a-zA-Z0-9]+)/i', $sDkimLine, $aMatch) && !empty($aMatch[1])) {
						$sStatus = $aMatch[1];
					}

					$aMatch = array();
					if (\preg_match('/header\.(d|i|from)=([^\s;]+)/i', $sDkimLine, $aMatch) && !empty($aMatch[2])) {
						$sHeader = \trim($aMatch[2]);
					}

					if (!empty($sStatus) && !empty($sHeader)) {
						$aResult[] = array($sStatus, $sHeader, $sDkimLine);
					}
				}
			}
		} else {
			// X-DKIM-Authentication-Results: signer="hostinger.com" status="pass"
			$aHeaders = $this->ValuesByName(Enumerations\Header::X_DKIM_AUTHENTICATION_RESULTS);
			foreach ($aHeaders as $sHeaderValue) {
				$sStatus = '';
				$sHeader = '';

				$aMatch = array();

				$sHeaderValue = \preg_replace('/[\r\n\t\s]+/', ' ', $sHeaderValue);

				if (\preg_match('/status[\s]?=[\s]?"([a-zA-Z0-9]+)"/i', $sHeaderValue, $aMatch) && !empty($aMatch[1])) {
					$sStatus = $aMatch[1];
				}

				if (\preg_match('/signer[\s]?=[\s]?"([^";]+)"/i', $sHeaderValue, $aMatch) && !empty($aMatch[1])) {
					$sHeader = \trim($aMatch[1]);
				}

				if (!empty($sStatus) && !empty($sHeader)) {
					$aResult[] = array($sStatus, $sHeader, $sHeaderValue);
				}
			}
		}

		return $aResult;
	}

	public function PopulateEmailColectionByDkim(EmailCollection $oEmails) : void
	{
		$aDkimStatuses = $this->DkimStatuses();
		foreach ($oEmails as $oEmail) {
			$sEmail = $oEmail->GetEmail();
			foreach ($aDkimStatuses as $aDkimData) {
				if (isset($aDkimData[0], $aDkimData[1]) && $aDkimData[1] === \strstr($sEmail, $aDkimData[1])) {
					$oEmail->SetDkimStatusAndValue($aDkimData[0], empty($aDkimData[2]) ? '' : $aDkimData[2]);
				}
			}
		}
	}

	public function __toString() : string
	{
		return \implode("\r\n", $this->getArrayCopy());
	}
}
