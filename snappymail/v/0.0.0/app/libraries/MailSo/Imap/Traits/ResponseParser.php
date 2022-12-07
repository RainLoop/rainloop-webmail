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

use MailSo\Imap\Response;
use MailSo\Imap\Enumerations\ResponseType;
use MailSo\Imap\Exceptions\ResponseNotFoundException;

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
		$this->iResponseBufParsedPos = 0;
		$this->bNeedNext = true;
		$oResponse = new Response;
		$this->partialParseResponseBranch($oResponse, false, '', '', true);
		if (ResponseType::UNKNOWN === $oResponse->ResponseType) {
			throw new ResponseNotFoundException;
		}
		return $oResponse;
	}

	/**
	 * A bug in the parser converts folder names that start with '[' into arrays.
	 * https://github.com/the-djmaze/snappymail/issues/1
	 * https://github.com/the-djmaze/snappymail/issues/70
	 * The fix RainLoop implemented isn't correct either.
	 * This one should as RFC 3501 only mentions:
	 *
	 * 	Status responses are OK, NO, BAD, PREAUTH and BYE.
	 *
	 *	Status responses MAY include an OPTIONAL "response code".  A response
	 *	code consists of data inside square brackets in the form of an atom,
	 *	possibly followed by a space and arguments.
	 *
	 * Like:
	 *  * OK [HIGHESTMODSEQ 11102]
	 *  * OK [PERMANENTFLAGS (\Answered $FORWARDED $SENT $SIGNED $TODO \*)]
	 *  TAG1 OK [READ-WRITE]
	 */
	private static function skipSquareBracketParse(Response $oImapResponse) : bool
	{
		return !$oImapResponse->IsStatusResponse || 2 < \count($oImapResponse->ResponseList);
	}

	/**
	 * @return array|string
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 * @throws \MailSo\Imap\Exceptions\*
	 */
	private function partialParseResponseBranch(Response $oImapResponse,
		bool $bTreatAsAtom,
		?string $sParentToken,
		string $sOpenBracket,
		bool $bRoot = false)
	{
		$iPos = $this->iResponseBufParsedPos;

		$sPreviousAtomUpperCase = null;
		$iBufferEndIndex = 0;

		$bIsGotoDefault = false;

		$sAtomBuilder = $bTreatAsAtom ? '' : null;
		$aList = array();
		if ($bRoot)
		{
			$aList =& $oImapResponse->ResponseList;
		}

		while (true)
		{
			if ($this->bNeedNext)
			{
				/**
				 * $this->sResponseBuffer is a single fgets() that ends with \r\n
				 */
				$iPos = 0;
				$this->getNextBuffer();
				$this->iResponseBufParsedPos = $iPos;
				$this->bNeedNext = false;
			}

			$sChar = null;
			if ($bIsGotoDefault)
			{
				$bIsGotoDefault = false;
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

			switch ($sChar)
			{
				case ']':
					if ($bRoot && static::skipSquareBracketParse($oImapResponse)) {
						$bIsGotoDefault = true;
						break 2;
					}
				case ')':
					++$iPos;
					$sPreviousAtomUpperCase = null;
					break 2;

				case ' ':
					if ($bTreatAsAtom)
					{
						$sAtomBuilder .= ' ';
					}
					++$iPos;
					break;

				case '[':
					if ($bRoot && static::skipSquareBracketParse($oImapResponse)) {
						$bIsGotoDefault = true;
						break;
					}
				case '(':
					$this->iResponseBufParsedPos = ++$iPos;
					$mResult = $this->partialParseResponseBranch(
						$oImapResponse, $bTreatAsAtom, $sPreviousAtomUpperCase, $sChar
					);
					$sPreviousAtomUpperCase = null;
					$iPos = $this->iResponseBufParsedPos;
					if ($bTreatAsAtom) {
						$sAtomBuilder .= $sChar . $mResult . ('[' === $sChar ? ']' : ')');
					} else {
						$aList[] = $mResult;
						if ($bRoot && $oImapResponse->IsStatusResponse) {
							$oImapResponse->OptionalResponse = $mResult;
							$bIsGotoDefault = true;
						}
					}
					unset($mResult);
					continue 2;

				case '~': // literal8
					if ('{' !== $this->sResponseBuffer[++$iPos]) {
						break;
					}
				case '{':
					$iLength = \strspn($this->sResponseBuffer, '0123456789', $iPos + 1);
					if ($iLength && "}\r\n" === \substr($this->sResponseBuffer, $iPos + 1 + $iLength, 3)) {
						$iLiteralLen = (int) \substr($this->sResponseBuffer, $iPos + 1, $iLength);
						$iPos += 4 + $iLength;

						if ($this->partialResponseLiteralCallbacks($sParentToken, $sPreviousAtomUpperCase, $iLiteralLen)) {
							if (!$bTreatAsAtom) {
								$aList[] = '';
							}
						} else {
							$sLiteral = $this->partialResponseLiteral($iLiteralLen);
							if (null !== $sLiteral) {
								if (!$bTreatAsAtom) {
									$aList[] = $sLiteral;
									if (\MailSo\Config::$LogSimpleLiterals) {
										$this->writeLog('{'.$iLiteralLen.'} '.$sLiteral, \LOG_INFO);
									}
								} else {
									\SnappyMail\Log::notice('IMAP', 'Literal treated as atom and skipped');
								}
								unset($sLiteral);
							} else {
								$this->writeLog('Can\'t read imap stream', \LOG_WARNING);
							}
						}

						$sPreviousAtomUpperCase = null;
						$this->bNeedNext = true;

						continue 2;
					} else {
						$iPos = $iBufferEndIndex;
						$sPreviousAtomUpperCase = null;
					}
					break;

				/**
				 * A quoted string is a sequence of zero or more 7-bit characters,
				 * excluding CR and LF, with double quote (<">) characters at each end.
				 */
				case '"':
					$iOffset = $iPos + 1;
					while (true) {
						if ($iOffset > $iBufferEndIndex) {
							// need more data
							$iPos = $iBufferEndIndex;
							break;
						}
						$iLength = \strcspn($this->sResponseBuffer, "\r\n\\\"", $iOffset);
						$sSpecial = $this->sResponseBuffer[$iOffset + $iLength];
						switch ($sSpecial)
						{
						case '\\':
							// Is escaped character \ or "?
							if (!\in_array($this->sResponseBuffer[$iOffset + $iLength + 1], ['\\','"'])) {
								// No, not allowed in quoted string
								break 2;
							}
							$iOffset += $iLength + 2;
							break;

						case '"':
							if ($bTreatAsAtom) {
								$sAtomBuilder .= \stripslashes(\substr($this->sResponseBuffer, $iPos, $iOffset + $iLength - $iPos + 1));
							} else {
								$aList[] = \stripslashes(\substr($this->sResponseBuffer, $iPos + 1, $iOffset + $iLength - $iPos - 1));
							}
							$iPos = $iOffset + $iLength + 1;
							break 2;

						default:
						case "\r":
						case "\n":
							\SnappyMail\Log::notice('IMAP', 'Invalid char in quoted string: "' . \substr($this->sResponseBuffer, $iPos, $iOffset + $iLength - $iPos) . '"');
							// Not allowed in quoted string
							break 2;
						}
					}
					$sPreviousAtomUpperCase = null;
					break;

				default:
					$iCharBlockStartPos = $iPos;

					if ($bRoot && $oImapResponse->IsStatusResponse)
					{
						$iPos = $iBufferEndIndex;
						if ($iPos > $iCharBlockStartPos) {
							$iCharBlockStartPos += \strspn($this->sResponseBuffer, ' ', $iCharBlockStartPos, $iPos - $iCharBlockStartPos);
						}
					}

					while ($iPos <= $iBufferEndIndex)
					{
						$sCharDef = $this->sResponseBuffer[$iPos];
						switch (true)
						{
							case $bRoot && ('[' === $sCharDef || ']' === $sCharDef) && static::skipSquareBracketParse($oImapResponse):
								++$iPos;
								break;
							case '[' === $sCharDef:
								if (null === $sAtomBuilder)
								{
									$sAtomBuilder = '';
								}

								$sAtomBuilder .= \substr($this->sResponseBuffer, $iCharBlockStartPos, $iPos - $iCharBlockStartPos + 1);

								$this->iResponseBufParsedPos = ++$iPos;

								$sListBlock = $this->partialParseResponseBranch(
									$oImapResponse, true, $sPreviousAtomUpperCase, '['
								);

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
								break 2;
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
							$aList[] = 'NIL' === $sLastCharBlock ? null : $sLastCharBlock;
							$sPreviousAtomUpperCase = \strtoupper($sLastCharBlock);
						}
						else
						{
							$sAtomBuilder .= $sLastCharBlock;

							if (!$bTreatAsAtom)
							{
								$aList[] = $sAtomBuilder;
								$sPreviousAtomUpperCase = \strtoupper($sAtomBuilder);
								$sAtomBuilder = null;
							}
						}

						if ($bRoot)
						{
							if (!isset($oImapResponse->Tag) && 1 === \count($aList))
							{
								$oImapResponse->setTag($aList[0]);
								if ($this->getCurrentTag() === $oImapResponse->Tag)
								{
									$oImapResponse->ResponseType = ResponseType::TAGGED;
								}
							}
							else if (!isset($oImapResponse->StatusOrIndex) && 2 === \count($aList))
							{
								$oImapResponse->setStatus($aList[1]);
							}
							else if (ResponseType::CONTINUATION === $oImapResponse->ResponseType
								|| $oImapResponse->IsStatusResponse)
							{
								$oImapResponse->HumanReadable = $sLastCharBlock;
							}
						}
					}
			}
		}

		$this->iResponseBufParsedPos = $iPos;

		return $bTreatAsAtom ? $sAtomBuilder : $aList;
	}

	private function partialResponseLiteral($iLiteralLen) : ?string
	{
		$sLiteral = '';
		$iRead = $iLiteralLen;
		while (0 < $iRead) {
			$sAddRead = \fread($this->ConnectionResource(), $iRead);
			$iBLen = \strlen($sAddRead);
			if (!$iBLen) {
				$this->writeLog('Literal stream read warning "read '.\strlen($sLiteral).' of '.
					$iLiteralLen.'" bytes', \LOG_WARNING);
				return null;
			}
			$sLiteral .= $sAddRead;
			$iRead -= $iBLen;
			if ($iRead > 16384) {
//				\set_time_limit(10);
				\MailSo\Base\Utils::ResetTimeLimit();
			}
		}

		$iLiteralSize = \strlen($sLiteral);
		if ($iLiteralLen !== $iLiteralSize) {
			$this->writeLog('Literal stream read warning "read '.$iLiteralSize.' of '.
				$iLiteralLen.'" bytes', \LOG_WARNING);
		}
		return $sLiteral;
	}

	private function partialResponseLiteralCallbacks(?string $sParent, ?string $sLiteralAtomUpperCase, int $iLiteralLen) : bool
	{
		if (!$this->aFetchCallbacks || !$sLiteralAtomUpperCase || 'FETCH' !== $sParent) {
			return false;
		}

		$sLiteralAtomUpperCasePeek = '';
		if (0 === \strpos($sLiteralAtomUpperCase, 'BODY')) {
			$sLiteralAtomUpperCasePeek = \str_replace('BODY', 'BODY.PEEK', $sLiteralAtomUpperCase);
		} else if (0 === \strpos($sLiteralAtomUpperCase, 'BINARY')) {
			$sLiteralAtomUpperCasePeek = \str_replace('BINARY', 'BINARY.PEEK', $sLiteralAtomUpperCase);
		}

		$sFetchKey = $sLiteralAtomUpperCase;
		if ($sLiteralAtomUpperCasePeek && isset($this->aFetchCallbacks[$sLiteralAtomUpperCasePeek])) {
			$sFetchKey = $sLiteralAtomUpperCasePeek;
		}
		if (empty($this->aFetchCallbacks[$sFetchKey]) || !\is_callable($this->aFetchCallbacks[$sFetchKey])) {
			return false;
		}

		$rImapLiteralStream = \MailSo\Base\StreamWrappers\Literal::CreateStream($this->ConnectionResource(), $iLiteralLen);

		$this->writeLog('Start Callback for '.$sParent.' / '.$sLiteralAtomUpperCase.
			' - try to read '.$iLiteralLen.' bytes.', \LOG_INFO);

		$this->bRunningCallback = true;

		try
		{
			$this->aFetchCallbacks[$sFetchKey]($sParent, $sLiteralAtomUpperCase, $rImapLiteralStream, $iLiteralLen);
		}
		catch (\Throwable $oException)
		{
			$this->writeLogException($oException);
		}

		if ($rImapLiteralStream) {
			$iNotReadLiteralLen = 0;

			$bFeof = \feof($rImapLiteralStream);
			$this->writeLog('End Callback for '.$sParent.' / '.$sLiteralAtomUpperCase.
				' - feof = '.($bFeof ? 'good' : 'BAD'), $bFeof ?
					\LOG_INFO : \LOG_WARNING);

			if (!$bFeof) {
				while (!\feof($rImapLiteralStream)) {
					$sBuf = \fread($rImapLiteralStream, 1024 * 1024);
					if (!\strlen($sBuf)) {
						break;
					}

					\MailSo\Base\Utils::ResetTimeLimit();
					$iNotReadLiteralLen += \strlen($sBuf);
				}

				if (!\feof($rImapLiteralStream)) {
					\stream_get_contents($rImapLiteralStream);
				}
			}

			\fclose($rImapLiteralStream);

			if (0 < $iNotReadLiteralLen) {
				$this->writeLog('Not read literal size is '.$iNotReadLiteralLen.' bytes.', \LOG_WARNING);
			}
		} else {
			$this->writeLog('Literal stream is not resource after callback.', \LOG_WARNING);
		}

		$this->bRunningCallback = false;

		return true;
	}

}
