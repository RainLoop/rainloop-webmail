<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Base;

/**
 * @category MailSo
 * @package Base
 */
class LinkFinder
{
	/**
	 * @const
	 */
	const OPEN_LINK = '@#@link{';
	const CLOSE_LINK = '}link@#@';

	/**
	 * @var array
	 */
	private $aPrepearPlainStringUrls;

	/**
	 * @var string
	 */
	private $sText;

	/**
	 * @var mixed
	 */
	private $fLinkWrapper;

	/**
	 * @var int
	 */
	private $iHtmlSpecialCharsFlags;

	/**
	 * @var mixed
	 */
	private $fMailWrapper;

	/**
	 * @var int
	 */
	private $iOptimizationLimit;

	/**
	 * @access private
	 */
	private function __construct()
	{
		$this->iHtmlSpecialCharsFlags = (\defined('ENT_QUOTES') && \defined('ENT_SUBSTITUTE') && \defined('ENT_HTML401'))
			? ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML401 : ENT_QUOTES;

		if (\defined('ENT_IGNORE'))
		{
			$this->iHtmlSpecialCharsFlags |= ENT_IGNORE;
		}

		$this->iOptimizationLimit = 300000;

		$this->Clear();
	}

	/**
	 * @return \MailSo\Base\LinkFinder
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @return \MailSo\Base\LinkFinder
	 */
	public function Clear()
	{
		$this->aPrepearPlainStringUrls = array();
		$this->fLinkWrapper = null;
		$this->fMailWrapper = null;
		$this->sText = '';

		return $this;
	}

	/**
	 * @param string $sText
	 *
	 * @return \MailSo\Base\LinkFinder
	 */
	public function Text($sText)
	{
		$this->sText = $sText;

		return $this;
	}

	/**
	 * @param mixed $fLinkWrapper
	 *
	 * @return \MailSo\Base\LinkFinder
	 */
	public function LinkWrapper($fLinkWrapper)
	{
		$this->fLinkWrapper = $fLinkWrapper;

		return $this;
	}

	/**
	 * @param mixed $fMailWrapper
	 *
	 * @return \MailSo\Base\LinkFinder
	 */
	public function MailWrapper($fMailWrapper)
	{
		$this->fMailWrapper = $fMailWrapper;

		return $this;
	}

	/**
	 * @param bool $bAddTargetBlank = false
	 *
	 * @return \MailSo\Base\LinkFinder
	 */
	public function UseDefaultWrappers($bAddTargetBlank = false)
	{
		$this->fLinkWrapper = function ($sLink) use ($bAddTargetBlank) {
			
			$sNameLink = $sLink;
			if (!\preg_match('/^[a-z]{3,5}\:\/\//i', \ltrim($sLink)))
			{
				$sLink = 'http://'.\ltrim($sLink);
			}

			return '<a '.($bAddTargetBlank ? 'target="_blank" ': '').'href="'.$sLink.'">'.$sNameLink.'</a>';
		};

		$this->fMailWrapper = function ($sEmail) use ($bAddTargetBlank) {
			return '<a '.($bAddTargetBlank ? 'target="_blank" ': '').'href="mailto:'.$sEmail.'">'.$sEmail.'</a>';
		};

		return $this;
	}

	/**
	 * @param bool $bUseHtmlSpecialChars = true
	 *
	 * @return string
	 */
	public function CompileText($bUseHtmlSpecialChars = true)
	{
		$sText = \substr($this->sText, 0, $this->iOptimizationLimit);
		$sSubText = \substr($this->sText, $this->iOptimizationLimit);

		$this->aPrepearPlainStringUrls = array();
		if (null !== $this->fLinkWrapper && \is_callable($this->fLinkWrapper))
		{
			$sText = $this->findLinks($sText, $this->fLinkWrapper);
		}

		if (null !== $this->fMailWrapper && \is_callable($this->fMailWrapper))
		{
			$sText = $this->findMails($sText, $this->fMailWrapper);
		}

		$sResult = '';
		if ($bUseHtmlSpecialChars)
		{
			$sResult = @\htmlentities($sText.$sSubText, $this->iHtmlSpecialCharsFlags, 'UTF-8');
		}
		else
		{
			$sResult = $sText.$sSubText;
		}

		unset($sText, $sSubText);

		if (0 < \count($this->aPrepearPlainStringUrls))
		{
			$aPrepearPlainStringUrls = $this->aPrepearPlainStringUrls;
			$sResult = \preg_replace_callback('/'.\preg_quote(\MailSo\Base\LinkFinder::OPEN_LINK, '/').
				'([\d]+)'.\preg_quote(\MailSo\Base\LinkFinder::CLOSE_LINK, '/').'/',
					function ($aMatches) use ($aPrepearPlainStringUrls) {
						$iIndex = (int) $aMatches[1];
						return isset($aPrepearPlainStringUrls[$iIndex]) ? $aPrepearPlainStringUrls[$iIndex] : '';
					}, $sResult);

			$this->aPrepearPlainStringUrls = array();
		}

		return $sResult;
	}

	/**
	 * @param string $sText
	 * @param mixed $fWrapper
	 *
	 * @return string
	 */
	private function findLinks($sText, $fWrapper)
	{
		$sPattern = '/([\W]|^)((?:https?:\/\/)|(?:svn:\/\/)|(?:git:\/\/)|(?:s?ftps?:\/\/)|(?:www\.))'.
			'((\S+?)(\\/)?)((?:&gt;)?|[^\w\=\\/;\(\)\[\]]*?)(?=<|\s|$)/imu';

		$aPrepearPlainStringUrls = $this->aPrepearPlainStringUrls;
		$sText = \preg_replace_callback($sPattern, function ($aMatch) use ($fWrapper, &$aPrepearPlainStringUrls) {

			if (\is_array($aMatch) && 6 < \count($aMatch))
			{
				while (\in_array($sChar = \substr($aMatch[3], -1), array(']', ')')))
				{
					if (\substr_count($aMatch[3], ']' === $sChar ? '[': '(') - \substr_count($aMatch[3], $sChar) < 0)
					{
						$aMatch[3] = \substr($aMatch[3], 0, -1);
						$aMatch[6] = (']' === $sChar ? ']': ')').$aMatch[6];
					}
					else
					{
						break;
					}
				}

				$sLinkWithWrap = \call_user_func($fWrapper, $aMatch[2].$aMatch[3]);
				if (\is_string($sLinkWithWrap) && 0 < \strlen($sLinkWithWrap))
				{
					$aPrepearPlainStringUrls[] = \stripslashes($sLinkWithWrap);
					return $aMatch[1].
						\MailSo\Base\LinkFinder::OPEN_LINK.
						(\count($aPrepearPlainStringUrls) - 1).
						\MailSo\Base\LinkFinder::CLOSE_LINK.
						$aMatch[6];
				}

				return $aMatch[0];
			}

			return '';

		}, $sText);

		if (0 < \count($aPrepearPlainStringUrls))
		{
			$this->aPrepearPlainStringUrls = $aPrepearPlainStringUrls;
		}

		return $sText;
	}

	/**
	 * @param string $sText
	 * @param mixed $fWrapper
	 *
	 * @return string
	 */
	private function findMails($sText, $fWrapper)
	{
		$sPattern = '/([\w\.!#\$%\-+.]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)+)/';

		$aPrepearPlainStringUrls = $this->aPrepearPlainStringUrls;
		$sText = \preg_replace_callback($sPattern, function ($aMatch) use ($fWrapper, &$aPrepearPlainStringUrls) {

			if (\is_array($aMatch) && isset($aMatch[1]))
			{
				$sMailWithWrap = \call_user_func($fWrapper, $aMatch[1]);
				if (\is_string($sMailWithWrap) && 0 < \strlen($sMailWithWrap))
				{
					$aPrepearPlainStringUrls[] = \stripslashes($sMailWithWrap);
					return \MailSo\Base\LinkFinder::OPEN_LINK.
						(\count($aPrepearPlainStringUrls) - 1).
						\MailSo\Base\LinkFinder::CLOSE_LINK;
				}

				return $aMatch[1];
			}

			return '';

		}, $sText);

		if (0 < \count($aPrepearPlainStringUrls))
		{
			$this->aPrepearPlainStringUrls = $aPrepearPlainStringUrls;
		}

		return $sText;
	}
}