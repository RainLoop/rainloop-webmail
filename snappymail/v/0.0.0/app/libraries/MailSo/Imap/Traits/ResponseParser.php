<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap\Traits;

use \MailSo\Imap\Response;
use \MailSo\Imap\Enumerations\ResponseStatus;
use \MailSo\Imap\Enumerations\ResponseType;
use \MailSo\Imap\Exceptions\ResponseNotFoundException;

/**
 * @category MailSo
 * @package Imap
 */
trait ResponseParser
{
	/**
	 * @var int
	 */
	private $iResponseBufParsedPos;

	/**
	 * @var bool
	 */
	private $bNeedNext = true;

	protected function partialParseResponse() : Response
	{
		$oResponse = new Response;
		$this->partialParseResponseBranch($oResponse);
		if (ResponseType::UNKNOWN === $oResponse->ResponseType) {
			throw new ResponseNotFoundException;
		}
		return $oResponse;
	}

	private function skipBracketParse(?Response $oImapResponse) : bool
	{
		return $oImapResponse &&
			$oImapResponse->ResponseType === ResponseType::UNTAGGED &&
			(
				($oImapResponse->StatusOrIndex === 'STATUS' && 2 === \count($oImapResponse->ResponseList)) ||
				($oImapResponse->StatusOrIndex === 'LIST' && 4 === \count($oImapResponse->ResponseList)) ||
				($oImapResponse->StatusOrIndex === 'LSUB' && 4 === \count($oImapResponse->ResponseList))
			);
	}

	/**
	 * @return array|string
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	private function partialParseResponseBranch(?Response $oImapResponse,
		bool $bTreatAsAtom = false, string $sParentToken = '', string $sOpenBracket = '')
	{
		if ($oImapResponse) {
			$this->iResponseBufParsedPos = 0;
			$this->bNeedNext = true;
		}

		$iPos = $this->iResponseBufParsedPos;

		$sPreviousAtomUpperCase = null;
		$sClosingBracket = ')';
		$iLiteralLen = 0;
		$iBufferEndIndex = 0;
		$iDebugCount = 0;

		$bIsGotoDefault = false;
		$bIsGotoLiteral = false;
		$bIsGotoLiteralEnd = false;
		$bIsGotoAtomBracket = false;
		$bIsGotoNotAtomBracket = false;

		$bCountOneInited = false;
		$bCountTwoInited = false;

		$sAtomBuilder = $bTreatAsAtom ? '' : null;
		$aList = array();
		if ($oImapResponse)
		{
			$aList =& $oImapResponse->ResponseList;
		}

		while (true)
		{
			if (100000 === ++$iDebugCount)
			{
				$this->Logger()->Write('PartialParseOver: '.$iDebugCount, \MailSo\Log\Enumerations\Type::ERROR);
			}

			if ($this->bNeedNext)
			{
				$iPos = 0;
				$this->getNextBuffer();
				$this->iResponseBufParsedPos = $iPos;
				$this->bNeedNext = false;
			}

			$sChar = null;
			if ($bIsGotoDefault)
			{
				$sChar = 'GOTO_DEFAULT';
				$bIsGotoDefault = false;
			}
			else if ($bIsGotoLiteral)
			{
				$bIsGotoLiteral = false;
				$bIsGotoLiteralEnd = true;

				if ($this->partialResponseLiteralCallbackCallable(
					$sParentToken, null === $sPreviousAtomUpperCase ? '' : \strtoupper($sPreviousAtomUpperCase), $iLiteralLen))
				{
					if (!$bTreatAsAtom)
					{
						$aList[] = '';
					}
				}
				else
				{
					$sLiteral = '';
					$iRead = $iLiteralLen;

					while (0 < $iRead)
					{
						$sAddRead = \fread($this->ConnectionResource(), $iRead);
						if (false === $sAddRead)
						{
							$sLiteral = false;
							break;
						}

						$sLiteral .= $sAddRead;
						$iRead -= \strlen($sAddRead);

						\MailSo\Base\Utils::ResetTimeLimit();
					}

					if (false !== $sLiteral)
					{
						$iLiteralSize = \strlen($sLiteral);
						if ($iLiteralLen !== $iLiteralSize)
						{
							$this->writeLog('Literal stream read warning "read '.$iLiteralSize.' of '.
								$iLiteralLen.'" bytes', \MailSo\Log\Enumerations\Type::WARNING);
						}

						if (!$bTreatAsAtom)
						{
							$aList[] = $sLiteral;

							if (\MailSo\Config::$LogSimpleLiterals)
							{
								$this->writeLog('{'.\strlen($sLiteral).'} '.$sLiteral, \MailSo\Log\Enumerations\Type::INFO);
							}
						}
					}
					else
					{
						$this->writeLog('Can\'t read imap stream', \MailSo\Log\Enumerations\Type::NOTE);
					}

					unset($sLiteral);
				}

				continue;
			}
			else if ($bIsGotoLiteralEnd)
			{
				$sPreviousAtomUpperCase = null;
				$this->bNeedNext = true;
				$bIsGotoLiteralEnd = false;

				continue;
			}
			else if ($bIsGotoAtomBracket)
			{
				if ($bTreatAsAtom)
				{
					$sAtomBlock = $this->partialParseResponseBranch(null, true,
						null === $sPreviousAtomUpperCase ? '' : \strtoupper($sPreviousAtomUpperCase),
						$sOpenBracket);

					$sAtomBuilder .= $sAtomBlock;
					$iPos = $this->iResponseBufParsedPos;
					$sAtomBuilder .= $sClosingBracket;
				}

				$sPreviousAtomUpperCase = null;
				$bIsGotoAtomBracket = false;

				continue;
			}
			else if ($bIsGotoNotAtomBracket)
			{
				$aSubItems = $this->partialParseResponseBranch(null, false,
					null === $sPreviousAtomUpperCase ? '' : \strtoupper($sPreviousAtomUpperCase),
					$sOpenBracket);

				$aList[] = $aSubItems;
				$iPos = $this->iResponseBufParsedPos;
				$sPreviousAtomUpperCase = null;
				if ($oImapResponse && $oImapResponse->IsStatusResponse)
				{
					$oImapResponse->OptionalResponse = $aSubItems;

					$bIsGotoDefault = true;
					$bIsGotoNotAtomBracket = false;
					continue;
				}
				$bIsGotoNotAtomBracket = false;

				continue;
			}
			else
			{
				$iBufferEndIndex = \strlen($this->sResponseBuffer) - 3;

				if ($iPos > $iBufferEndIndex)
				{
					break;
				}

				$sChar = $this->sResponseBuffer[$iPos];
			}

			switch (true)
			{
				case ']' === $sChar:
				case ')' === $sChar:
					if ($this->skipBracketParse($oImapResponse))
					{
						$bIsGotoDefault = true;
						$bIsGotoNotAtomBracket = false;
					}
					else
					{
						++$iPos;
						$sPreviousAtomUpperCase = null;
					}
					break 2;
				case ' ' === $sChar:
					if ($bTreatAsAtom)
					{
						$sAtomBuilder .= ' ';
					}
					++$iPos;
					break;
				case '[' === $sChar:
				case '(' === $sChar:
					$sOpenBracket = $sChar;
					$sClosingBracket = '[' === $sChar ? ']' : ')';
					if ($bTreatAsAtom)
					{
						$sAtomBuilder .= $sChar;
						$bIsGotoAtomBracket = true;
						$this->iResponseBufParsedPos = ++$iPos;
					}
					else if ($this->skipBracketParse($oImapResponse))
					{
						$sOpenBracket = '';
						$sClosingBracket = '';
						$bIsGotoDefault = true;
						$bIsGotoNotAtomBracket = false;
					}
					else
					{
						$bIsGotoNotAtomBracket = true;
						$this->iResponseBufParsedPos = ++$iPos;
					}
					break;
				case '{' === $sChar:
					$bIsLiteralParsed = false;
					$mLiteralEndPos = \strpos($this->sResponseBuffer, '}', $iPos);
					if (false !== $mLiteralEndPos && $mLiteralEndPos > $iPos)
					{
						$sLiteralLenAsString = \substr($this->sResponseBuffer, $iPos + 1, $mLiteralEndPos - $iPos - 1);
						if (\is_numeric($sLiteralLenAsString))
						{
							$iLiteralLen = (int) $sLiteralLenAsString;
							$bIsLiteralParsed = true;
							$iPos = $mLiteralEndPos + 3;
							$bIsGotoLiteral = true;
							break;
						}
					}
					if (!$bIsLiteralParsed)
					{
						$iPos = $iBufferEndIndex;
					}
					$sPreviousAtomUpperCase = null;
					break;
				case '"' === $sChar:
					$bIsQuotedParsed = false;
					while (true)
					{
						$iClosingPos = $iPos + 1;
						if ($iClosingPos > $iBufferEndIndex)
						{
							break;
						}

						while (true)
						{
							$iClosingPos = \strpos($this->sResponseBuffer, '"', $iClosingPos);
							if (false === $iClosingPos)
							{
								break;
							}

							// TODO
							$iClosingPosNext = $iClosingPos + 1;
							if (
								isset($this->sResponseBuffer[$iClosingPosNext]) &&
								' ' !== $this->sResponseBuffer[$iClosingPosNext] &&
								"\r" !== $this->sResponseBuffer[$iClosingPosNext] &&
								"\n" !== $this->sResponseBuffer[$iClosingPosNext] &&
								']' !== $this->sResponseBuffer[$iClosingPosNext] &&
								')' !== $this->sResponseBuffer[$iClosingPosNext]
								)
							{
								++$iClosingPos;
								continue;
							}

							$iSlashCount = 0;
							while ('\\' === $this->sResponseBuffer[$iClosingPos - $iSlashCount - 1])
							{
								++$iSlashCount;
							}

							if ($iSlashCount % 2 == 1)
							{
								++$iClosingPos;
								continue;
							}
							else
							{
								break;
							}
						}

						if (false === $iClosingPos)
						{
							break;
						}
						else
						{
							$bIsQuotedParsed = true;
							if ($bTreatAsAtom)
							{
								$sAtomBuilder .= \strtr(
									\substr($this->sResponseBuffer, $iPos, $iClosingPos - $iPos + 1),
									array('\\\\' => '\\', '\\"' => '"')
								);
							}
							else
							{
								$aList[] = \strtr(
									\substr($this->sResponseBuffer, $iPos + 1, $iClosingPos - $iPos - 1),
									array('\\\\' => '\\', '\\"' => '"')
								);
							}

							$iPos = $iClosingPos + 1;
							break;
						}
					}

					if (!$bIsQuotedParsed)
					{
						$iPos = $iBufferEndIndex;
					}

					$sPreviousAtomUpperCase = null;
					break;

				case 'GOTO_DEFAULT' === $sChar:
				default:
					$iCharBlockStartPos = $iPos;

					if ($oImapResponse && $oImapResponse->IsStatusResponse)
					{
						$iPos = $iBufferEndIndex;

						while ($iPos > $iCharBlockStartPos && $this->sResponseBuffer[$iCharBlockStartPos] === ' ')
						{
							++$iCharBlockStartPos;
						}
					}

					$bIsAtomDone = false;
					while (!$bIsAtomDone && ($iPos <= $iBufferEndIndex))
					{
						$sCharDef = $this->sResponseBuffer[$iPos];
						switch (true)
						{
							case ('[' === $sCharDef || ']' === $sCharDef || '(' === $sCharDef || ')' === $sCharDef) &&
								$this->skipBracketParse($oImapResponse):
								++$iPos;
								break;
							case '[' === $sCharDef:
								if (null === $sAtomBuilder)
								{
									$sAtomBuilder = '';
								}

								$sAtomBuilder .= \substr($this->sResponseBuffer, $iCharBlockStartPos, $iPos - $iCharBlockStartPos + 1);

								++$iPos;
								$this->iResponseBufParsedPos = $iPos;

								$sListBlock = $this->partialParseResponseBranch(null, true,
									null === $sPreviousAtomUpperCase ? '' : \strtoupper($sPreviousAtomUpperCase),
									'[');

								if (null !== $sListBlock)
								{
									$sAtomBuilder .= $sListBlock.']';
								}

								$iPos = $this->iResponseBufParsedPos;
								$iCharBlockStartPos = $iPos;
								break;
							case ' ' === $sCharDef:
							case ')' === $sCharDef && '(' === $sOpenBracket:
							case ']' === $sCharDef && '[' === $sOpenBracket:
								$bIsAtomDone = true;
								break;
							default:
								++$iPos;
								break;
						}
					}

					if ($iPos > $iCharBlockStartPos || null !== $sAtomBuilder)
					{
						$sLastCharBlock = \substr($this->sResponseBuffer, $iCharBlockStartPos, $iPos - $iCharBlockStartPos);
						if (null === $sAtomBuilder)
						{
							$aList[] = $sLastCharBlock;
							$sPreviousAtomUpperCase = $sLastCharBlock;
						}
						else
						{
							$sAtomBuilder .= $sLastCharBlock;

							if (!$bTreatAsAtom)
							{
								$aList[] = $sAtomBuilder;
								$sPreviousAtomUpperCase = $sAtomBuilder;
								$sAtomBuilder = null;
							}
						}

						if ($oImapResponse)
						{
//							if (1 === \count($aList))
							if (!$bCountOneInited && 1 === \count($aList))
//							if (isset($aList[0]) && !isset($aList[1])) // fast 1 === \count($aList)
							{
								$bCountOneInited = true;

								$oImapResponse->Tag = $aList[0];
								if ('+' === $oImapResponse->Tag)
								{
									$oImapResponse->ResponseType = ResponseType::CONTINUATION;
								}
								else if ('*' === $oImapResponse->Tag)
								{
									$oImapResponse->ResponseType = ResponseType::UNTAGGED;
								}
								else if ($this->getCurrentTag() === $oImapResponse->Tag)
								{
									$oImapResponse->ResponseType = ResponseType::TAGGED;
								}
								else
								{
									$oImapResponse->ResponseType = ResponseType::UNKNOWN;
								}
							}
//							else if (2 === \count($aList))
							else if (!$bCountTwoInited && 2 === \count($aList))
//							else if (isset($aList[1]) && !isset($aList[2])) // fast 2 === \count($aList)
							{
								$bCountTwoInited = true;

								$oImapResponse->StatusOrIndex = \strtoupper($aList[1]);

								if ($oImapResponse->StatusOrIndex == ResponseStatus::OK ||
									$oImapResponse->StatusOrIndex == ResponseStatus::NO ||
									$oImapResponse->StatusOrIndex == ResponseStatus::BAD ||
									$oImapResponse->StatusOrIndex == ResponseStatus::BYE ||
									$oImapResponse->StatusOrIndex == ResponseStatus::PREAUTH)
								{
									$oImapResponse->IsStatusResponse = true;
								}
							}
							else if (ResponseType::CONTINUATION === $oImapResponse->ResponseType)
							{
								$oImapResponse->HumanReadable = $sLastCharBlock;
							}
							else if ($oImapResponse->IsStatusResponse)
							{
								$oImapResponse->HumanReadable = $sLastCharBlock;
							}
						}
					}
			}
		}

		$this->iResponseBufParsedPos = $iPos;

		if (100000 < $iDebugCount)
		{
			$this->Logger()->Write('PartialParseOverResult: '.$iDebugCount, \MailSo\Log\Enumerations\Type::ERROR);
		}

		return $bTreatAsAtom ? $sAtomBuilder : $aList;
	}

	private function partialResponseLiteralCallbackCallable(string $sParent, string $sLiteralAtomUpperCase, int $iLiteralLen) : bool
	{
		if (!$this->aFetchCallbacks) {
			return false;
		}

		$sLiteralAtomUpperCasePeek = '';
		if (0 === \strpos($sLiteralAtomUpperCase, 'BODY'))
		{
			$sLiteralAtomUpperCasePeek = \str_replace('BODY', 'BODY.PEEK', $sLiteralAtomUpperCase);
		}

		$sFetchKey = '';
		if (\strlen($sLiteralAtomUpperCasePeek) && isset($this->aFetchCallbacks[$sLiteralAtomUpperCasePeek]))
		{
			$sFetchKey = $sLiteralAtomUpperCasePeek;
		}
		else if (\strlen($sLiteralAtomUpperCase) && isset($this->aFetchCallbacks[$sLiteralAtomUpperCase]))
		{
			$sFetchKey = $sLiteralAtomUpperCase;
		}

		if (empty($this->aFetchCallbacks[$sFetchKey]) || !\is_callable($this->aFetchCallbacks[$sFetchKey])) {
			return false;
		}

		$rImapLiteralStream =
			\MailSo\Base\StreamWrappers\Literal::CreateStream($this->ConnectionResource(), $iLiteralLen);

		$this->writeLog('Start Callback for '.$sParent.' / '.$sLiteralAtomUpperCase.
			' - try to read '.$iLiteralLen.' bytes.', \MailSo\Log\Enumerations\Type::NOTE);

		$this->bRunningCallback = true;

		try
		{
			\call_user_func($this->aFetchCallbacks[$sFetchKey],
				$sParent, $sLiteralAtomUpperCase, $rImapLiteralStream);
		}
		catch (\Throwable $oException)
		{
			$this->writeLog('Callback Exception', \MailSo\Log\Enumerations\Type::NOTICE);
			$this->writeLogException($oException);
		}

		if ($rImapLiteralStream)
		{
			$iNotReadLiteralLen = 0;

			$bFeof = \feof($rImapLiteralStream);
			$this->writeLog('End Callback for '.$sParent.' / '.$sLiteralAtomUpperCase.
				' - feof = '.($bFeof ? 'good' : 'BAD'), $bFeof ?
					\MailSo\Log\Enumerations\Type::NOTE : \MailSo\Log\Enumerations\Type::WARNING);

			if (!$bFeof)
			{
				while (!\feof($rImapLiteralStream))
				{
					$sBuf = \fread($rImapLiteralStream, 1024 * 1024);
					if (false === $sBuf || 0 === \strlen($sBuf) ||  null === $sBuf)
					{
						break;
					}

					\MailSo\Base\Utils::ResetTimeLimit();
					$iNotReadLiteralLen += \strlen($sBuf);
				}

				if (!\feof($rImapLiteralStream))
				{
					\stream_get_contents($rImapLiteralStream);
				}
			}

			\fclose($rImapLiteralStream);

			if ($iNotReadLiteralLen > 0)
			{
				$this->writeLog('Not read literal size is '.$iNotReadLiteralLen.' bytes.',
					\MailSo\Log\Enumerations\Type::WARNING);
			}
		}
		else
		{
			$this->writeLog('Literal stream is not resource after callback.',
				\MailSo\Log\Enumerations\Type::WARNING);
		}

		$this->bRunningCallback = false;

		return true;
	}

}
