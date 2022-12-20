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
abstract class Parser
{
	const
		POS_HEADERS = 1,
		POS_BODY = 2,
		POS_SUBPARTS = 3,
		POS_CLOSE_BOUNDARY = 4;

	private static array $LineParts = [];

	protected static function writeBody(Part $oPart, string $sBuffer) : void
	{
		if (null === $oPart->Body) {
			$oPart->Body = \MailSo\Base\ResourceRegistry::CreateMemoryResource();
		}
		if (\is_resource($oPart->Body)) {
			\fwrite($oPart->Body, $sBuffer);
		}
	}

	/**
	 * @param resource $rStreamHandle
	 */
	public static function parseStream($rStreamHandle) : ?Part
	{
		if (!\is_resource($rStreamHandle)) {
			return null;
		}

		$oPart = new Part;

		$bIsOef = false;
		$iOffset = 0;
		$sBuffer = '';
		$sPrevBuffer = '';
		$aBoundaryStack = array();

		static::$LineParts = [$oPart];

		static::parseStreamRecursive($oPart, $rStreamHandle, $iOffset,
			$sPrevBuffer, $sBuffer, $aBoundaryStack, $bIsOef);

		$oMimePart = null;
		$sFirstNotNullCharset = null;
		foreach (static::$LineParts as /* @var $oMimePart Part */ $oMimePart) {
			$sCharset = $oMimePart->HeaderCharset();
			if (\strlen($sCharset)) {
				$sFirstNotNullCharset = $sCharset;
				break;
			}
		}

		$sFirstNotNullCharset = (null !== $sFirstNotNullCharset)
			? $sFirstNotNullCharset : \MailSo\Base\Enumerations\Charset::ISO_8859_1;

		foreach (static::$LineParts as /* @var $oMimePart Part */ $oMimePart) {
			$sHeaderCharset = $oMimePart->HeaderCharset();
			$oMimePart->Headers->SetParentCharset($sHeaderCharset);
		}

		static::$LineParts = [];
		return $oPart;
	}

	/**
	 * @param resource $rStreamHandle
	 */
	public static function parseStreamRecursive(Part $oPart, $rStreamHandle, int &$iOffset,
		string &$sPrevBuffer, string &$sBuffer, array &$aBoundaryStack, bool &$bIsOef, bool $bNotFirstRead = false) : void
	{
		$iPos = 0;
		$iParsePosition = self::POS_HEADERS;
		$sCurrentBoundary = '';
		$bIsBoundaryCheck = false;
		$aHeadersLines = array();
		while (true) {
			if (!$bNotFirstRead) {
				$sPrevBuffer = $sBuffer;
				$sBuffer = '';
			}

			if (!$bIsOef && !\feof($rStreamHandle)) {
				if (!$bNotFirstRead) {
					$sBuffer = \fread($rStreamHandle, 8192);
					if (false === $sBuffer) {
						break;
					}
				} else {
					$bNotFirstRead = false;
				}
			} else if ($bIsOef && !\strlen($sBuffer)) {
				break;
			} else {
				$bIsOef = true;
			}

			while (true) {
				$sCurrentLine = $sPrevBuffer.$sBuffer;
				if (self::POS_HEADERS === $iParsePosition) {
					$iEndLen = 4;
					$iPos = \strpos($sCurrentLine, "\r\n\r\n", $iOffset);
					if (false === $iPos) {
						$iEndLen = 2;
						$iPos = \strpos($sCurrentLine, "\n\n", $iOffset);
					}

					if (false !== $iPos) {
						$aHeadersLines[] = \substr($sCurrentLine, $iOffset, $iPos + $iEndLen - $iOffset);

						$oPart->Headers->Parse(\implode($aHeadersLines))->SetParentCharset($oPart->HeaderCharset());
						$aHeadersLines = array();

						$sBoundary = $oPart->HeaderBoundary();
						if (\strlen($sBoundary))
						{
							$sBoundary = '--'.$sBoundary;
							$sCurrentBoundary = $sBoundary;
							\array_unshift($aBoundaryStack, $sBoundary);
						}

						$iOffset = $iPos + $iEndLen;
						$iParsePosition = self::POS_BODY;
						continue;
					} else {
						$iBufferLen = \strlen($sPrevBuffer);
						if ($iBufferLen > $iOffset) {
							$aHeadersLines[] = \substr($sPrevBuffer, $iOffset);
							$iOffset = 0;
						} else {
							$iOffset -= $iBufferLen;
						}
						break;
					}
				} else if (self::POS_BODY === $iParsePosition) {
					$iPos = false;
					$sBoundaryLen = 0;
					$bIsBoundaryEnd = false;
					$bCurrentPartBody = false;
					$bIsBoundaryCheck = \count($aBoundaryStack);

					foreach ($aBoundaryStack as $sKey => $sBoundary) {
						if (false !== ($iPos = \strpos($sCurrentLine, $sBoundary, $iOffset))) {
							if ($sCurrentBoundary === $sBoundary) {
								$bCurrentPartBody = true;
							}

							$sBoundaryLen = \strlen($sBoundary);
							if ('--' === \substr($sCurrentLine, $iPos + $sBoundaryLen, 2)) {
								$sBoundaryLen += 2;
								$bIsBoundaryEnd = true;
								unset($aBoundaryStack[$sKey]);
								$sCurrentBoundary = (isset($aBoundaryStack[$sKey + 1]))
									? $aBoundaryStack[$sKey + 1] : '';
							}

							break;
						}
					}

					if (false !== $iPos) {
						static::writeBody($oPart, \substr($sCurrentLine, $iOffset, $iPos - $iOffset));
						$iOffset = $iPos;

						if ($bCurrentPartBody) {
							$iParsePosition = self::POS_SUBPARTS;
							continue;
						}

						return;
					} else {
						$iBufferLen = \strlen($sPrevBuffer);
						if ($iBufferLen > $iOffset) {
							static::writeBody($oPart, \substr($sPrevBuffer, $iOffset));
							$iOffset = 0;
						} else {
							$iOffset -= $iBufferLen;
						}
						break;
					}
				} else if (self::POS_SUBPARTS === $iParsePosition) {
					$iPos = false;
					$iBoundaryLen = 0;
					$bIsBoundaryEnd = false;
					$bCurrentPartBody = false;
					$bIsBoundaryCheck = \count($aBoundaryStack);

					foreach ($aBoundaryStack as $sKey => $sBoundary) {
						$iPos = \strpos($sCurrentLine, $sBoundary, $iOffset);
						if (false !== $iPos) {
							if ($sCurrentBoundary === $sBoundary) {
								$bCurrentPartBody = true;
							}

							$iBoundaryLen = \strlen($sBoundary);
							if ('--' === \substr($sCurrentLine, $iPos + $iBoundaryLen, 2)) {
								$iBoundaryLen += 2;
								$bIsBoundaryEnd = true;
								unset($aBoundaryStack[$sKey]);
								$sCurrentBoundary = (isset($aBoundaryStack[$sKey + 1]))
									? $aBoundaryStack[$sKey + 1] : '';
							}
							break;
						}
					}

					if (false !== $iPos && $bCurrentPartBody) {
						$iOffset = $iPos + $iBoundaryLen;

						$oSubPart = new Part;

						$oSubPart->parseStreamRecursive($rStreamHandle,
							$iOffset, $sPrevBuffer, $sBuffer, $aBoundaryStack, $bIsOef, true);

						$oPart->SubParts->append($oSubPart);
						static::$LineParts[] = $oSubPart;
						//$iParsePosition = self::POS_HEADERS;
						unset($oSubPart);
					} else {
						return;
					}
				}
			}
		}

		if (\strlen($sPrevBuffer)) {
			if (self::POS_HEADERS === $iParsePosition) {
				$aHeadersLines[] = ($iOffset < \strlen($sPrevBuffer))
					? \substr($sPrevBuffer, $iOffset)
					: $sPrevBuffer;

				$oPart->Headers->Parse(\implode($aHeadersLines))->SetParentCharset($oPart->HeaderCharset());
				$aHeadersLines = array();
			} else if (!$bIsBoundaryCheck && self::POS_BODY === $iParsePosition) {
				static::writeBody($oPart, ($iOffset < \strlen($sPrevBuffer))
					? \substr($sPrevBuffer, $iOffset) : $sPrevBuffer);
			}
		} else {
			if (self::POS_HEADERS === $iParsePosition && \count($aHeadersLines)) {
				$oPart->Headers->Parse(\implode($aHeadersLines))->SetParentCharset($oPart->HeaderCharset());
				$aHeadersLines = array();
			}
		}

		return;
	}

}
