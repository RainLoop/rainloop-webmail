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

	protected $sRawHeaders = '';

	/**
	 * @var string
	 */
	protected $sParentCharset = '';

	protected function __construct(string $sRawHeaders = '', bool $bStoreRawHeaders = true)
	{
		parent::__construct();

		if (0 < \strlen($sRawHeaders))
		{
			$this->Parse($sRawHeaders, $bStoreRawHeaders);
		}
	}

	public static function NewInstance(string $sRawHeaders = '', bool $bStoreRawHeaders = true) : self
	{
		return new self($sRawHeaders, $bStoreRawHeaders);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function AddByName(string $sName, string $sValue, bool $bToTop = false) : self
	{
		return $this->Add(Header::NewInstance($sName, $sValue), $bToTop);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function SetByName(string $sName, string $sValue, bool $bToTop = false) : self
	{
		return $this->RemoveByName($sName)->Add(Header::NewInstance($sName, $sValue), $bToTop);
	}

	public function &GetByIndex(int $iIndex) : ?Header
	{
		$mResult = null;
		$mResult =& parent::GetByIndex($iIndex);
		return $mResult;
	}

	public function ValueByName(string $sHeaderName, bool $bCharsetAutoDetect = false) : string
	{
		$oHeader = null;
		$oHeader =& $this->GetByName($sHeaderName);
		return (null !== $oHeader) ? ($bCharsetAutoDetect ? $oHeader->ValueWithCharsetAutoDetect() : $oHeader->Value()) : '';
	}

	public function ValuesByName(string $sHeaderName, bool $bCharsetAutoDetect = false) : array
	{
		$aResult = array();
		$oHeader = null;

		$sHeaderNameLower = \strtolower($sHeaderName);
		$aHeaders =& $this->GetAsArray();
		foreach ($aHeaders as /* @var $oHeader \MailSo\Mime\Header */ $oHeader)
		{
			if ($sHeaderNameLower === \strtolower($oHeader->Name()))
			{
				$aResult[] = $bCharsetAutoDetect ? $oHeader->ValueWithCharsetAutoDetect() : $oHeader->Value();
			}
		}

		return $aResult;
	}

	public function RemoveByName(string $sHeaderName) : self
	{
		$aResult = $this->FilterList(function ($oHeader) use ($sHeaderName) {
			return $oHeader && \strtolower($oHeader->Name()) !== \strtolower($sHeaderName);
		});

		return $this->SetAsArray($aResult);
	}

	public function GetAsEmailCollection(string $sHeaderName, bool $bCharsetAutoDetect = false) : ?EmailCollection
	{
		$oResult = null;
		$sValue = $this->ValueByName($sHeaderName, $bCharsetAutoDetect);
		if (0 < \strlen($sValue))
		{
			$oResult = EmailCollection::NewInstance($sValue);
		}

		return $oResult && 0 < $oResult->Count() ? $oResult : null;
	}

	public function ParametersByName(string $sHeaderName) : ?ParameterCollection
	{
		$oParameters = $oHeader = null;
		$oHeader =& $this->GetByName($sHeaderName);
		if ($oHeader)
		{
			$oParameters = $oHeader->Parameters();
		}

		return $oParameters;
	}

	public function ParameterValue(string $sHeaderName, string $sParamName) : string
	{
		$oParameters = $this->ParametersByName($sHeaderName);
		return (null !== $oParameters) ? $oParameters->ParameterValueByName($sParamName) : '';
	}

	public function &GetByName(string $sHeaderName) : ?Header
	{
		$oResult = $oHeader = null;

		$sHeaderNameLower = \strtolower($sHeaderName);
		$aHeaders =& $this->GetAsArray();
		foreach ($aHeaders as /* @var $oHeader \MailSo\Mime\Header */ $oHeader)
		{
			if ($sHeaderNameLower === \strtolower($oHeader->Name()))
			{
				$oResult =& $oHeader;
				break;
			}
		}

		return $oResult;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function SetAsArray(array $aList) : self
	{
		parent::SetAsArray($aList);

		return $this;
	}

	public function SetParentCharset(string $sParentCharset) : self
	{
		if (0 < \strlen($sParentCharset))
		{
			if ($this->sParentCharset !== $sParentCharset)
			{
				$oHeader = null;
				$aHeaders =& $this->GetAsArray();

				foreach ($aHeaders as /* @var $oHeader \MailSo\Mime\Header */ $oHeader)
				{
					$oHeader->SetParentCharset($sParentCharset);
				}

				$this->sParentCharset = $sParentCharset;
			}
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

		if ($bStoreRawHeaders)
		{
			$this->sRawHeaders = $sRawHeaders;
		}

		if (0 === \strlen($this->sParentCharset))
		{
			$this->sParentCharset = $sParentCharset;
		}

		$aHeaders = \explode("\n", \str_replace("\r", '', $sRawHeaders));

		$sName = null;
		$sValue = null;
		foreach ($aHeaders as $sHeadersValue)
		{
			if (0 === strlen($sHeadersValue))
			{
				continue;
			}

			$sFirstChar = \substr($sHeadersValue, 0, 1);
			if ($sFirstChar !== ' ' && $sFirstChar !== "\t" && false === \strpos($sHeadersValue, ':'))
			{
				continue;
			}
			else if (null !== $sName && ($sFirstChar === ' ' || $sFirstChar === "\t"))
			{
				$sValue = \is_null($sValue) ? '' : $sValue;

				if ('?=' === \substr(\rtrim($sHeadersValue), -2))
				{
					$sHeadersValue = \rtrim($sHeadersValue);
				}

				if ('=?' === \substr(\ltrim($sHeadersValue), 0, 2))
				{
					$sHeadersValue = \ltrim($sHeadersValue);
				}

				if ('=?' === \substr($sHeadersValue, 0, 2))
				{
					$sValue .= $sHeadersValue;
				}
				else
				{
					$sValue .= "\n".$sHeadersValue;
				}
			}
			else
			{
				if (null !== $sName)
				{
					$oHeader = Header::NewInstanceFromEncodedString($sName.': '.$sValue, $this->sParentCharset);
					if ($oHeader)
					{
						$this->Add($oHeader);
					}

					$sName = null;
					$sValue = null;
				}

				$aHeaderParts = \explode(':', $sHeadersValue, 2);
				$sName = $aHeaderParts[0];
				$sValue = isset($aHeaderParts[1]) ? $aHeaderParts[1] : '';

				if ('?=' === \substr(\rtrim($sValue), -2))
				{
					$sValue = \rtrim($sValue);
				}
			}
		}

		if (null !== $sName)
		{
			$oHeader = Header::NewInstanceFromEncodedString($sName.': '.$sValue, $this->sParentCharset);
			if ($oHeader)
			{
				$this->Add($oHeader);
			}
		}

		return $this;
	}

	public function DkimStatuses() : array
	{
		$aResult = array();

		$aHeaders = $this->ValuesByName(Enumerations\Header::AUTHENTICATION_RESULTS);
		if (0 < \count($aHeaders))
		{
			foreach ($aHeaders as $sHeaderValue)
			{
				$sStatus = '';
				$sHeader = '';
				$sDkimLine = '';

				$aMatch = array();

				$sHeaderValue = \preg_replace('/[\r\n\t\s]+/', ' ', $sHeaderValue);

				if (\preg_match('/dkim=.+/i', $sHeaderValue, $aMatch) && !empty($aMatch[0]))
				{
					$sDkimLine = $aMatch[0];

					$aMatch = array();
					if (\preg_match('/dkim=([a-zA-Z0-9]+)/i', $sDkimLine, $aMatch) && !empty($aMatch[1]))
					{
						$sStatus = $aMatch[1];
					}

					$aMatch = array();
					if (\preg_match('/header\.(d|i|from)=([^\s;]+)/i', $sDkimLine, $aMatch) && !empty($aMatch[2]))
					{
						$sHeader = \trim($aMatch[2]);
					}

					if (!empty($sStatus) && !empty($sHeader))
					{
						$aResult[] = array($sStatus, $sHeader, $sDkimLine);
					}
				}
			}
		}
		else
		{
			// X-DKIM-Authentication-Results: signer="hostinger.com" status="pass"
			$aHeaders = $this->ValuesByName(Enumerations\Header::X_DKIM_AUTHENTICATION_RESULTS);
			foreach ($aHeaders as $sHeaderValue)
			{
				$sStatus = '';
				$sHeader = '';

				$aMatch = array();

				$sHeaderValue = \preg_replace('/[\r\n\t\s]+/', ' ', $sHeaderValue);

				if (\preg_match('/status[\s]?=[\s]?"([a-zA-Z0-9]+)"/i', $sHeaderValue, $aMatch) && !empty($aMatch[1]))
				{
					$sStatus = $aMatch[1];
				}

				if (\preg_match('/signer[\s]?=[\s]?"([^";]+)"/i', $sHeaderValue, $aMatch) && !empty($aMatch[1]))
				{
					$sHeader = \trim($aMatch[1]);
				}

				if (!empty($sStatus) && !empty($sHeader))
				{
					$aResult[] = array($sStatus, $sHeader, $sHeaderValue);
				}
			}
		}

		return $aResult;
	}

	public function PopulateEmailColectionByDkim(EmailCollection $oEmails) : void
	{
		$aDkimStatuses = $this->DkimStatuses();
		$oEmails->ForeachList(function (/* @var $oItem \MailSo\Mime\Email */ $oItem) use ($aDkimStatuses) {
			if ($oItem && $oItem instanceof Email)
			{
				$sEmail = $oItem->GetEmail();
				foreach ($aDkimStatuses as $aDkimData)
				{
					if (isset($aDkimData[0], $aDkimData[1]) &&
						$aDkimData[1] === \strstr($sEmail, $aDkimData[1]))
					{
						$oItem->SetDkimStatusAndValue($aDkimData[0], empty($aDkimData[2]) ? '' : $aDkimData[2]);
					}
				}
			}
		});
	}

	public function ToEncodedString() : string
	{
		$aResult = array();
		$aHeaders =& $this->GetAsArray();
		foreach ($aHeaders as /* @var $oHeader \MailSo\Mime\Header */ $oHeader)
		{
			$aResult[] = $oHeader->EncodedValue();
		}

		return \implode(Enumerations\Constants::CRLF, $aResult);
	}
}
