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
class HtmlUtils
{
	static $KOS = '@@_KOS_@@';

	/**
	 * @access private
	 */
	private function __construct()
	{
	}

	/**
	 * @param string $sText
	 * @param string $sHtmlAttrs = ''
	 * @param string $sBodyAttrs = ''
	 *
	 * @return \DOMDocument|bool
	 */
	public static function GetDomFromText($sText, $sHtmlAttrs = '', $sBodyAttrs = '')
	{
		$bState = true;
		if (\MailSo\Base\Utils::FunctionExistsAndEnabled('libxml_use_internal_errors'))
		{
			$bState = \libxml_use_internal_errors(true);
		}

		$oDom = new \DOMDocument('1.0', 'utf-8');
		$oDom->encoding = 'UTF-8';
		$oDom->strictErrorChecking = false;
		$oDom->formatOutput = false;

		@$oDom->loadHTML('<'.'?xml version="1.0" encoding="utf-8"?'.'>'.
			'<html '.$sHtmlAttrs.'><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body '.$sBodyAttrs.'>'.$sText.'</body></html>');

		@$oDom->normalizeDocument();

		if (\MailSo\Base\Utils::FunctionExistsAndEnabled('libxml_use_internal_errors'))
		{
			@\libxml_clear_errors();
		}

		if (\MailSo\Base\Utils::FunctionExistsAndEnabled('libxml_use_internal_errors'))
		{
			\libxml_use_internal_errors($bState);
		}

		return $oDom;
	}

	/**
	 * @param string $sHtml
	 * @param string $sHtmlAttrs = '
	 * @param string $sBodyAttrs = ''
	 *
	 * @return string
	 */
	public static function ClearBodyAndHtmlTag($sHtml, &$sHtmlAttrs = '', &$sBodyAttrs = '')
	{
		$aMatch = array();
		if (\preg_match('/<html([^>]+)>/im', $sHtml, $aMatch) && !empty($aMatch[1]))
		{
			$sHtmlAttrs = $aMatch[1];
		}

		$aMatch = array();
		if (\preg_match('/<body([^>]+)>/im', $sHtml, $aMatch) && !empty($aMatch[1]))
		{
			$sBodyAttrs = $aMatch[1];
		}

		$sHtml = \preg_replace('/<body([^>]*)>/im', '', $sHtml);
		$sHtml = \preg_replace('/<\/body>/im', '', $sHtml);
		$sHtml = \preg_replace('/<html([^>]*)>/im', '', $sHtml);
		$sHtml = \preg_replace('/<\/html>/im', '', $sHtml);

		$sHtmlAttrs = \preg_replace('/xmlns:[a-z]="[^"]*"/im', '', $sHtmlAttrs);
		$sHtmlAttrs = \preg_replace('/xmlns="[^"]*"/im', '', $sHtmlAttrs);
		$sBodyAttrs = \preg_replace('/xmlns:[a-z]="[^"]*"/im', '', $sBodyAttrs);

		return $sHtml;
	}

	/**
	 * @param string $sHtml
	 * @param bool $bClearEmpty = true
	 *
	 * @return string
	 */
	public static function FixSchemas($sHtml, $bClearEmpty = true)
	{
		if ($bClearEmpty)
		{
			$sHtml = \str_replace('<o:p></o:p>', '', $sHtml);
		}

		$sHtml = \str_replace('<o:p>', '<span data-ms="o:p">', $sHtml);
		$sHtml = \str_replace('</o:p>', '</span>', $sHtml);

		return $sHtml;
	}

	/**
	 * @param string $sHtml
	 * @param bool $bClearStyleAndHead = true
	 *
	 * @return string
	 */
	public static function ClearTags($sHtml, $bClearStyleAndHead = true)
	{
		$aRemoveTags = array(
			'link', 'base', 'meta', 'title', 'script', 'bgsound', 'keygen', 'source',
			'object', 'embed', 'applet', 'mocha', 'iframe', 'frame', 'frameset', 'video', 'audio', 'area', 'map'
		);

		if ($bClearStyleAndHead)
		{
			$aRemoveTags[] = 'head';
			$aRemoveTags[] = 'style';
		}

		$aToRemove = array(
			'/<p[^>]*><\/p>/i',
			'/<!doctype[^>]*>/msi',
			'/<\?xml [^>]*\?>/msi'
		);

		foreach ($aRemoveTags as $sTag)
		{
			$aToRemove[] = '\'<'.$sTag.'[^>]*>.*?</[\s]*'.$sTag.'>\'msi';
			$aToRemove[] = '\'<'.$sTag.'[^>]*>\'msi';
			$aToRemove[] = '\'</[\s]*'.$sTag.'[^>]*>\'msi';
		}

		return \preg_replace($aToRemove, '', $sHtml);
	}

	/**
	 * @param string $sHtml
	 *
	 * @return string
	 */
	public static function ClearOn($sHtml)
	{
		$aToReplace = array(
			'/on(Blur)/si',
			'/on(Change)/si',
			'/on(Click)/si',
			'/on(DblClick)/si',
			'/on(Error)/si',
			'/on(Focus)/si',
			'/on(FormChange)/si',
			'/on(KeyDown)/si',
			'/on(KeyPress)/si',
			'/on(KeyUp)/si',
			'/on(Load)/si',
			'/on(MouseDown)/si',
			'/on(MouseEnter)/si',
			'/on(MouseLeave)/si',
			'/on(MouseMove)/si',
			'/on(MouseOut)/si',
			'/on(MouseOver)/si',
			'/on(MouseUp)/si',
			'/on(Move)/si',
			'/on(Resize)/si',
			'/on(ResizeEnd)/si',
			'/on(ResizeStart)/si',
			'/on(Scroll)/si',
			'/on(Select)/si',
			'/on(Submit)/si',
			'/on(Unload)/si'
		);

		return \preg_replace($aToReplace, 'оn\\1', $sHtml);
	}

//	public static function ClearStyleUrlValueParserHelper($oUrlValue, $oRule, $oRuleSet,
//		$oElem = null,
//		&$bHasExternals = false, &$aFoundCIDs = array(),
//		$aContentLocationUrls = array(), &$aFoundedContentLocationUrls = array(),
//		$bDoNotReplaceExternalUrl = false, $fAdditionalExternalFilter = null
//	)
//	{
//		if ($oUrlValue instanceof \Sabberworm\CSS\Value\URL)
//		{
//			$oNewRule = new \Sabberworm\CSS\Rule\Rule('x-rl-orig-'.$oRule->getRule());
//			$oNewRule->setValue((string) $oRule->getValue());
//			$oNewRule->setIsImportant($oRule->getIsImportant());
//
//			$oRuleSet->addRule($oNewRule);
//
//			$oUrl = $oUrlValue->getURL();
//			$sUrl = $oUrl ? $oUrl->getString() : '';
//
//			if ('cid:' === \strtolower(\substr($sUrl, 0, 4)))
//			{
//				$aFoundCIDs[] = \substr($sUrl, 4);
//
//				$oRule->setRule('x-rl-mod-'.$oRule->getRule());
//
//				if ($oElem)
//				{
//					$oElem->setAttribute('data-x-style-mod', '1');
//				}
//			}
//			else
//			{
//				if (\preg_match('/http[s]?:\/\//i', $sUrl) || '//' === \substr($sUrl, 0, 2))
//				{
//					$oRule->setRule('x-rl-mod-'.$oRule->getRule());
//
//					if (\in_array($sUrl, $aContentLocationUrls))
//					{
//						$aFoundedContentLocationUrls[] = $sUrl;
//					}
//					else
//					{
//						$bHasExternals = true;
//						if (!$bDoNotReplaceExternalUrl)
//						{
//							if ($fAdditionalExternalFilter)
//							{
//								$sAdditionalResult = \call_user_func($fAdditionalExternalFilter, $sUrl);
//								if (0 < \strlen($sAdditionalResult) && $oUrl)
//								{
//									$oUrl->setString($sAdditionalResult);
//								}
//							}
//						}
//					}
//
//					if ($oElem)
//					{
//						$oElem->setAttribute('data-x-style-mod', '1');
//					}
//				}
//				else if ('data:image/' !== \strtolower(\substr(\trim($sUrl), 0, 11)))
//				{
//					$oRuleSet->removeRule($oRule);
//				}
//			}
//		}
//		else if ($oRule instanceof \Sabberworm\CSS\Rule\Rule)
//		{
//			if ('x-rl-' !== \substr($oRule->getRule(), 0, 5))
//			{
//				$oValue = $oRule->getValue();
//				if ($oValue instanceof \Sabberworm\CSS\Value\URL)
//				{
//					\MailSo\Base\HtmlUtils::ClearStyleUrlValueParserHelper($oValue, $oRule, $oRuleSet, $oElem,
//						$bHasExternals, $aFoundCIDs,
//						$aContentLocationUrls, $aFoundedContentLocationUrls,
//						$bDoNotReplaceExternalUrl, $fAdditionalExternalFilter);
//				}
//				else if ($oValue instanceof \Sabberworm\CSS\Value\RuleValueList)
//				{
//					$aComps = $oValue->getListComponents();
//					foreach ($aComps as $oValue)
//					{
//						if ($oValue instanceof \Sabberworm\CSS\Value\URL)
//						{
//							\MailSo\Base\HtmlUtils::ClearStyleUrlValueParserHelper($oValue, $oRule, $oRuleSet, $oElem,
//								$bHasExternals, $aFoundCIDs,
//								$aContentLocationUrls, $aFoundedContentLocationUrls,
//								$bDoNotReplaceExternalUrl, $fAdditionalExternalFilter);
//						}
//					}
//				}
//			}
//		}
//	}
//
//	public static function ClearStyleSmart($sStyle, $oElement = null,
//		&$bHasExternals = false, &$aFoundCIDs = array(),
//		$aContentLocationUrls = array(), &$aFoundedContentLocationUrls = array(),
//		$bDoNotReplaceExternalUrl = false, $fAdditionalExternalFilter = null,
//		$sSelectorPrefix = '')
//	{
//		$mResult = false;
//		$oCss = null;
//
//		if (!\class_exists('Sabberworm\CSS\Parser'))
//		{
//			return $mResult;
//		}
//
//		$sStyle = \trim($sStyle);
//		if (empty($sStyle))
//		{
//			return '';
//		}
//
//		$sStyle = \trim(\preg_replace('/[\r\n\t\s]+/', ' ', $sStyle));
//
//		try
//		{
//			$oSettings = \Sabberworm\CSS\Settings::create();
//			$oSettings->beStrict();
//			$oSettings->withMultibyteSupport(false);
//
//			$oCssParser = new \Sabberworm\CSS\Parser($sStyle, $oSettings);
//			$oCss = $oCssParser->parse();
//		}
//		catch (\Exception $oEception)
//		{
//			unset($oEception);
//			$mResult = false;
//		}
//
//		if ($oCss)
//		{
//			foreach ($oCss->getAllDeclarationBlocks() as $oBlock)
//			{
//				foreach($oBlock->getSelectors() as $oSelector)
//				{
//					$sS = ' '.\trim($oSelector->getSelector()).' ';
//					$sS = \preg_replace('/ body([\.# ])/i', ' [data-x-div-type="body"]$1', $sS);
//					$sS = \preg_replace('/ html([\.# ])/i', ' [data-x-div-type="html"]$1', $sS);
//
//					if (0 < \strlen($sSelectorPrefix))
//					{
//						$sS = \trim($sSelectorPrefix.' '.\trim($sS));
//					}
//
//					$oSelector->setSelector(\trim($sS));
//				}
//			}
//
//			$aRulesToRemove = array(
//				'pointer-events', 'content', 'behavior', 'cursor',
//			);
//
//			foreach($oCss->getAllRuleSets() as $oRuleSet)
//			{
//				foreach ($aRulesToRemove as $sRuleToRemove)
//				{
//					$oRuleSet->removeRule($sRuleToRemove);
//				}
//
//				// position: fixed -> position: fixed -> absolute
//				$aRules = $oRuleSet->getRules('position');
//				if (\is_array($aRules))
//				{
//					foreach ($aRules as $oRule)
//					{
//						$mValue = $oRule->getValue();
//						if (\is_string($mValue) && 'fixed' === \trim(\strtolower($mValue)))
//						{
//							$oRule->setValue('absolute');
//						}
//					}
//				}
//			}
//
//			foreach($oCss->getAllDeclarationBlocks() as $oRuleSet)
//			{
//				if ($oRuleSet instanceof \Sabberworm\CSS\RuleSet\RuleSet)
//				{
//					if ($oRuleSet instanceof \Sabberworm\CSS\RuleSet\DeclarationBlock)
//					{
//						$oRuleSet->expandBackgroundShorthand();
//						$oRuleSet->expandListStyleShorthand();
//					}
//
//					$aRules = $oRuleSet->getRules();
//					if (\is_array($aRules) && 0 < \count($aRules))
//					{
//						foreach ($aRules as $oRule)
//						{
//							if ($oRule instanceof \Sabberworm\CSS\Rule\Rule)
//							{
//								\MailSo\Base\HtmlUtils::ClearStyleUrlValueParserHelper(null, $oRule, $oRuleSet,
//									$oElement,
//									$bHasExternals, $aFoundCIDs,
//									$aContentLocationUrls, $aFoundedContentLocationUrls,
//									$bDoNotReplaceExternalUrl, $fAdditionalExternalFilter
//								);
//							}
//						}
//					}
//				}
//			}
//
//			try
//			{
//				$mResult = $oCss->render(\Sabberworm\CSS\OutputFormat::createCompact());
//			}
//			catch (\Exception $oEception)
//			{
//				unset($oEception);
//				$mResult = false;
//			}
//		}
//
//		return $mResult;
//	}

	/**
	 *
	 * @param string $sStyle
	 * @param \DOMElement $oElement
	 * @param bool $bHasExternals
	 * @param array $aFoundCIDs
	 * @param array $aContentLocationUrls
	 * @param array $aFoundedContentLocationUrls
	 * @param bool $bDoNotReplaceExternalUrl = false
	 * @param callback|null $fAdditionalExternalFilter = null
	 *
	 * @return string
	 */
	public static function ClearStyle($sStyle, $oElement, &$bHasExternals, &$aFoundCIDs,
		$aContentLocationUrls, &$aFoundedContentLocationUrls, $bDoNotReplaceExternalUrl = false, $fAdditionalExternalFilter = null)
	{
		$sStyle = \trim($sStyle);
		$aOutStyles = array();
		$aStyles = \explode(';', $sStyle);

		if ($fAdditionalExternalFilter && !\is_callable($fAdditionalExternalFilter))
		{
			$fAdditionalExternalFilter = null;
		}

		$aMatch = array();
		foreach ($aStyles as $sStyleItem)
		{
			$aStyleValue = \explode(':', $sStyleItem, 2);
			$sName = \trim(\strtolower($aStyleValue[0]));
			$sValue = isset($aStyleValue[1]) ? \trim($aStyleValue[1]) : '';

			if ('position' === $sName && 'fixed' === \strtolower($sValue))
			{
				$sValue = 'absolute';
			}

			if (0 === \strlen($sName) || 0 === \strlen($sValue))
			{
				continue;
			}

			$sStyleItem = $sName.': '.$sValue;
			$aStyleValue = array($sName, $sValue);

			/*if (\in_array($sName, array('position', 'left', 'right', 'top', 'bottom', 'behavior', 'cursor')))
			{
				// skip
			}
			else */if (\in_array($sName, array('behavior', 'pointer-events')) ||
				('cursor' === $sName && !\in_array(\strtolower($sValue), array('none', 'cursor'))) ||
				('display' === $sName && 'none' === \strtolower($sValue)) ||
				\preg_match('/expression/i', $sValue) ||
				('text-indent' === $sName && '-' === \substr(trim($sValue), 0, 1))
			)
			{
				// skip
			}
			else if (\in_array($sName, array('background-image', 'background', 'list-style', 'list-style-image', 'content'))
				&& \preg_match('/url[\s]?\(([^)]+)\)/im', $sValue, $aMatch) && !empty($aMatch[1]))
			{
				$sFullUrl = \trim($aMatch[0], '"\' ');
				$sUrl = \trim($aMatch[1], '"\' ');
				$sStyleValue = \trim(\preg_replace('/[\s]+/', ' ', \str_replace($sFullUrl, '', $sValue)));
				$sStyleItem = empty($sStyleValue) ? '' : $sName.': '.$sStyleValue;

				if ('cid:' === \strtolower(\substr($sUrl, 0, 4)))
				{
					if ($oElement)
					{
						$oElement->setAttribute('data-x-style-cid-name',
							'background' === $sName ? 'background-image' : $sName);

						$oElement->setAttribute('data-x-style-cid', \substr($sUrl, 4));

						$aFoundCIDs[] = \substr($sUrl, 4);
					}
				}
				else
				{
					if ($oElement)
					{
						if (\preg_match('/http[s]?:\/\//i', $sUrl) || '//' === \substr($sUrl, 0, 2))
						{
							$bHasExternals = true;
							if (!$bDoNotReplaceExternalUrl)
							{
								if (\in_array($sName, array('background-image', 'list-style-image', 'content')))
								{
									$sStyleItem = '';
								}

								$sTemp = '';
								if ($oElement->hasAttribute('data-x-style-url'))
								{
									$sTemp = \trim($oElement->getAttribute('data-x-style-url'));
								}

								$sTemp = empty($sTemp) ? '' : (';' === \substr($sTemp, -1) ? $sTemp.' ' : $sTemp.'; ');

								$oElement->setAttribute('data-x-style-url', \trim($sTemp.
									('background' === $sName ? 'background-image' : $sName).': '.$sFullUrl, ' ;'));

								if ($fAdditionalExternalFilter)
								{
									$sAdditionalResult = \call_user_func($fAdditionalExternalFilter, $sUrl);
									if (0 < \strlen($sAdditionalResult))
									{
										$oElement->setAttribute('data-x-additional-style-url',
											('background' === $sName ? 'background-image' : $sName).': url('.$sAdditionalResult.')');
									}
								}
							}
						}
						else if ('data:image/' !== \strtolower(\substr(\trim($sUrl), 0, 11)))
						{
							$oElement->setAttribute('data-x-broken-style-src', $sFullUrl);
						}
					}
				}

				if (!empty($sStyleItem))
				{
					$aOutStyles[] = $sStyleItem;
				}
			}
			else if ('height' === $sName)
			{
//				$aOutStyles[] = 'min-'.ltrim($sStyleItem);
				$aOutStyles[] = $sStyleItem;
			}
			else
			{
				$aOutStyles[] = $sStyleItem;
			}
		}

		return \implode(';', $aOutStyles);
	}

	/**
	 * @param \DOMDocument $oDom
	 */
	public static function FindLinksInDOM(&$oDom)
	{
		$aNodes = $oDom->getElementsByTagName('*');
		foreach ($aNodes as /* @var $oElement \DOMElement */ $oElement)
		{
			$sTagNameLower = \strtolower($oElement->tagName);
			$sParentTagNameLower = isset($oElement->parentNode) && isset($oElement->parentNode->tagName) ?
				\strtolower($oElement->parentNode->tagName) : '';

			if (!\in_array($sTagNameLower, array('html', 'meta', 'head', 'style', 'script', 'img', 'button', 'input', 'textarea', 'a')) &&
				'a' !== $sParentTagNameLower && $oElement->childNodes && 0 < $oElement->childNodes->length)
			{
				$oSubItem = null;
				$aTextNodes = array();
				$iIndex = $oElement->childNodes->length - 1;
				while ($iIndex > -1)
				{
					$oSubItem = $oElement->childNodes->item($iIndex);
					if ($oSubItem && XML_TEXT_NODE === $oSubItem->nodeType)
					{
						$aTextNodes[] = $oSubItem;
					}

					$iIndex--;
				}

				unset($oSubItem);

				foreach ($aTextNodes as $oTextNode)
				{
					if ($oTextNode && 0 < \strlen($oTextNode->wholeText)/* && \preg_match('/http[s]?:\/\//i', $oTextNode->wholeText)*/)
					{
						$sText = \MailSo\Base\LinkFinder::NewInstance()
							->Text($oTextNode->wholeText)
							->UseDefaultWrappers(true)
							->CompileText()
						;

						$oSubDom = \MailSo\Base\HtmlUtils::GetDomFromText('<html><body>'.$sText.'</body></html>');
						if ($oSubDom)
						{
							$oBodyNodes = $oSubDom->getElementsByTagName('body');
							if ($oBodyNodes && 0 < $oBodyNodes->length)
							{
								$oBodyChildNodes = $oBodyNodes->item(0)->childNodes;
								if ($oBodyChildNodes && $oBodyChildNodes->length)
								{
									for ($iIndex = 0, $iLen = $oBodyChildNodes->length; $iIndex < $iLen; $iIndex++)
									{
										$oSubItem = $oBodyChildNodes->item($iIndex);
										if ($oSubItem)
										{
											if (XML_ELEMENT_NODE === $oSubItem->nodeType &&
												'a' === \strtolower($oSubItem->tagName))
											{
												$oLink = $oDom->createElement('a',
													\str_replace(':', \MailSo\Base\HtmlUtils::$KOS, \htmlspecialchars($oSubItem->nodeValue)));

												$sHref = $oSubItem->getAttribute('href');
												if ($sHref)
												{
													$oLink->setAttribute('href', $sHref);
												}

												$oElement->insertBefore($oLink, $oTextNode);
											}
											else
											{
												$oElement->insertBefore($oDom->importNode($oSubItem), $oTextNode);
											}
										}
									}

									$oElement->removeChild($oTextNode);
								}
							}

							unset($oBodyNodes);
						}

						unset($oSubDom, $sText);
					}
				}
			}
		}

		unset($aNodes);
	}

	/**
	 * @param string $sHtml
	 * @param bool $bDoNotReplaceExternalUrl = false
	 * @param bool $bFindLinksInHtml = false
	 *
	 * @return string
	 */
	public static function ClearHtmlSimple($sHtml, $bDoNotReplaceExternalUrl = false, $bFindLinksInHtml = false)
	{
		$bHasExternals = false;
		$aFoundCIDs = array();
		$aContentLocationUrls = array();
		$aFoundedContentLocationUrls = array();

		return \MailSo\Base\HtmlUtils::ClearHtml($sHtml, $bHasExternals, $aFoundCIDs,
			$aContentLocationUrls, $aFoundedContentLocationUrls, $bDoNotReplaceExternalUrl, $bFindLinksInHtml);
	}

	/**
	 * @param string $sHtml
	 * @param bool $bHasExternals = false
	 * @param array $aFoundCIDs = array()
	 * @param array $aContentLocationUrls = array()
	 * @param array $aFoundedContentLocationUrls = array()
	 * @param bool $bDoNotReplaceExternalUrl = false
	 * @param bool $bFindLinksInHtml = false
	 * @param callback|null $fAdditionalExternalFilter = null
	 * @param callback|null $fAdditionalDomReader = null
	 *
	 * @return string
	 */
	public static function ClearHtml($sHtml, &$bHasExternals = false, &$aFoundCIDs = array(),
		$aContentLocationUrls = array(), &$aFoundedContentLocationUrls = array(),
		$bDoNotReplaceExternalUrl = false, $bFindLinksInHtml = false,
		$fAdditionalExternalFilter = null, $fAdditionalDomReader = false,
		$bTryToDetectHiddenImages = false)
	{
		$sResult = '';

		$sHtml = null === $sHtml ? '' : (string) $sHtml;
		$sHtml = \trim($sHtml);
		if (0 === \strlen($sHtml))
		{
			return '';
		}

		if ($fAdditionalExternalFilter && !\is_callable($fAdditionalExternalFilter))
		{
			$fAdditionalExternalFilter = null;
		}

		if ($fAdditionalDomReader && !\is_callable($fAdditionalDomReader))
		{
			$fAdditionalDomReader = null;
		}

		$bHasExternals = false;

		$sHtml = \MailSo\Base\HtmlUtils::FixSchemas($sHtml);

		$sHtml = \MailSo\Base\HtmlUtils::ClearTags($sHtml, false);
		$sHtml = \MailSo\Base\HtmlUtils::ClearOn($sHtml);

		$sHtmlAttrs = $sBodyAttrs = '';
		$sHtml = \MailSo\Base\HtmlUtils::ClearBodyAndHtmlTag($sHtml, $sHtmlAttrs, $sBodyAttrs);

		// Dom Part
		$oDom = \MailSo\Base\HtmlUtils::GetDomFromText($sHtml, $sHtmlAttrs, $sBodyAttrs);
		unset($sHtml);

		if ($oDom)
		{
			if ($fAdditionalDomReader)
			{
				$oResDom = \call_user_func($fAdditionalDomReader, $oDom);
				if ($oResDom)
				{
					$oDom = $oResDom;
				}

				unset($oResDom);
			}

			if ($bFindLinksInHtml)
			{
				\MailSo\Base\HtmlUtils::FindLinksInDOM($oDom);
			}

			$oXpath = new \DOMXpath($oDom);
			$oComments = $oXpath->query('//comment()');
			if ($oComments)
			{
				foreach ($oComments as $oComment)
				{
					if (isset($oComment->parentNode))
					{
						@$oComment->parentNode->removeChild($oComment);
					}
				}
			}

			unset($oXpath, $oComments);

			$aNodes = $oDom->getElementsByTagName('*');
			foreach ($aNodes as /* @var $oElement \DOMElement */ $oElement)
			{
				if ($oElement)
				{
					$sTagNameLower = \strtolower($oElement->tagName);

					if ('' !== $sTagNameLower && \in_array($sTagNameLower, array('svg', 'head', 'link',
						'base', 'meta', 'title', 'style', 'x-script', 'script', 'bgsound', 'keygen', 'source',
						'object', 'embed', 'applet', 'mocha', 'iframe', 'frame', 'frameset',
						'video', 'audio', 'area', 'map')))
					{
						if (isset($oElement->parentNode))
						{
							@$oElement->parentNode->removeChild($oElement);
						}
					}
				}
			}

			$sLinkColor = '';
			$aNodes = $oDom->getElementsByTagName('*');
			foreach ($aNodes as /* @var $oElement \DOMElement */ $oElement)
			{
				$sTagNameLower = \strtolower($oElement->tagName);

				// convert body attributes to styles
				if ('body' === $sTagNameLower)
				{
					$aAttrs = array(
						'link' => '',
						'text' => '',
						'topmargin' => '',
						'leftmargin' => '',
						'bottommargin' => '',
						'rightmargin' => ''
					);

					if (isset($oElement->attributes))
					{
						foreach ($oElement->attributes as $sAttributeName => /* @var $oAttributeNode \DOMNode */ $oAttributeNode)
						{
							if ($oAttributeNode && isset($oAttributeNode->nodeValue))
							{
								$sAttributeNameLower = \strtolower($sAttributeName);
								if (isset($aAttrs[$sAttributeNameLower]) && '' === $aAttrs[$sAttributeNameLower])
								{
									$aAttrs[$sAttributeNameLower] = array($sAttributeName, \trim($oAttributeNode->nodeValue));
								}
							}
						}
					}

					$aStyles = array();
					foreach ($aAttrs as $sIndex => $aItem)
					{
						if (\is_array($aItem))
						{
							$oElement->removeAttribute($aItem[0]);

							switch ($sIndex)
							{
								case 'link':
									$sLinkColor = \trim($aItem[1]);
									if (!\preg_match('/^#[abcdef0-9]{3,6}$/i', $sLinkColor))
									{
										$sLinkColor = '';
									}
									break;
								case 'text':
									$aStyles[] = 'color: '.$aItem[1];
									break;
								case 'topmargin':
									$aStyles[] = 'margin-top: '.((int) $aItem[1]).'px';
									break;
								case 'leftmargin':
									$aStyles[] = 'margin-left: '.((int) $aItem[1]).'px';
									break;
								case 'bottommargin':
									$aStyles[] = 'margin-bottom: '.((int) $aItem[1]).'px';
									break;
								case 'rightmargin':
									$aStyles[] = 'margin-right: '.((int) $aItem[1]).'px';
									break;
							}
						}
					}

					if (0 < \count($aStyles))
					{
						$sStyles = $oElement->hasAttribute('style') ? \trim(\trim(\trim($oElement->getAttribute('style')), ';')) : '';
						$oElement->setAttribute('style', (empty($sStyles) ? '' : $sStyles.'; ').\implode('; ', $aStyles));
					}
				}

				if ('iframe' === $sTagNameLower || 'frame' === $sTagNameLower)
				{
					$oElement->setAttribute('src', 'javascript:false');
				}

				if ('a' === $sTagNameLower && !empty($sLinkColor))
				{
					$sStyles = $oElement->hasAttribute('style')
						?  \trim(\trim(\trim($oElement->getAttribute('style')), ';')) : '';

					$oElement->setAttribute('style',
						'color: '.$sLinkColor.\trim((empty($sStyles) ? '' : '; '.$sStyles)));
				}

				if (\in_array($sTagNameLower, array('a', 'form', 'area')))
				{
					$oElement->setAttribute('target', '_blank');
				}

				if (\in_array($sTagNameLower, array('a', 'form', 'area', 'input', 'button', 'textarea')))
				{
					$oElement->setAttribute('tabindex', '-1');
				}

				foreach (array(
					'id', 'class',
					'contenteditable', 'designmode', 'formaction',
					'data-bind', 'data-reactid', 'xmlns', 'srcset',
					'data-x-skip-style'
				) as $sAttr)
				{
					@$oElement->removeAttribute($sAttr);
				}

				foreach (array(
					'load', 'blur', 'error', 'focus', 'formchange', 'change',
					'click', 'dblclick', 'keydown', 'keypress', 'keyup',
					'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover', 'mouseup',
					'move', 'resize', 'resizeend', 'resizestart', 'scroll', 'select', 'submit', 'upload'
				) as $sAttr)
				{
					@$oElement->removeAttribute('on'.$sAttr);
				}

				if ($oElement->hasAttribute('href'))
				{
					$sHref = \trim($oElement->getAttribute('href'));
					if (!\preg_match('/^(http[s]?|ftp|skype|mailto):/i', $sHref) && '//' !== \substr($sHref, 0, 2))
					{
						$oElement->setAttribute('data-x-broken-href', $sHref);
						$oElement->setAttribute('href', 'javascript:false');
					}

					if ('a' === $sTagNameLower)
					{
						$oElement->setAttribute('rel', 'external nofollow');
					}
				}

				if ($bTryToDetectHiddenImages && 'img' === $sTagNameLower)
				{
					$sAlt = $oElement->hasAttribute('alt')
						? \trim($oElement->getAttribute('alt')) : '';

					if ($oElement->hasAttribute('src') && '' === $sAlt)
					{
						$aH = array(
							'email.microsoftemail.com/open',
							'github.com/notifications/beacon/',
							'mandrillapp.com/track/open',
							'list-manage.com/track/open'
						);

						$sH = $oElement->hasAttribute('height')
							? \trim($oElement->getAttribute('height')) : '';

//						$sW = $oElement->hasAttribute('width')
//							? \trim($oElement->getAttribute('width')) : '';

						$sStyles = $oElement->hasAttribute('style')
							? \preg_replace('/[\s]+/', '', \trim(\trim(\trim($oElement->getAttribute('style')), ';'))) : '';

						$sSrc = \trim($oElement->getAttribute('src'));

						$bC = \in_array($sH, array('1', '0', '1px', '0px')) ||
							\preg_match('/(display:none|visibility:hidden|height:0|height:[01][a-z][a-z])/i', $sStyles);

						if (!$bC)
						{
							$sSrcLower = \strtolower($sSrc);
							foreach ($aH as $sLine)
							{
								if (false !== \strpos($sSrcLower, $sLine))
								{
									$bC = true;
									break;
								}
							}
						}

						if ($bC)
						{
							$oElement->setAttribute('style', 'display:none');
							$oElement->setAttribute('data-x-skip-style', 'true');
							$oElement->setAttribute('data-x-hidden-src', $sSrc);

							$oElement->removeAttribute('src');
						}
					}
				}

				if ($oElement->hasAttribute('src'))
				{
					$sSrc = \trim($oElement->getAttribute('src'));
					$oElement->removeAttribute('src');

					if (\in_array($sSrc, $aContentLocationUrls))
					{
						$oElement->setAttribute('data-x-src-location', $sSrc);
						$aFoundedContentLocationUrls[] = $sSrc;
					}
					else if ('cid:' === \strtolower(\substr($sSrc, 0, 4)))
					{
						$oElement->setAttribute('data-x-src-cid', \substr($sSrc, 4));
						$aFoundCIDs[] = \substr($sSrc, 4);
					}
					else
					{
						if (\preg_match('/^http[s]?:\/\//i', $sSrc) || '//' === \substr($sSrc, 0, 2))
						{
							if ($bDoNotReplaceExternalUrl)
							{
								$oElement->setAttribute('src', $sSrc);
							}
							else
							{
								$oElement->setAttribute('data-x-src', $sSrc);
								if ($fAdditionalExternalFilter)
								{
									$sCallResult = \call_user_func($fAdditionalExternalFilter, $sSrc);
									if (0 < \strlen($sCallResult))
									{
										$oElement->setAttribute('data-x-additional-src', $sCallResult);
									}
								}
							}

							$bHasExternals = true;
						}
						else if ('data:image/' === \strtolower(\substr($sSrc, 0, 11)))
						{
							$oElement->setAttribute('src', $sSrc);
						}
						else
						{
							$oElement->setAttribute('data-x-broken-src', $sSrc);
						}
					}
				}

				$sBackground = $oElement->hasAttribute('background')
					? \trim($oElement->getAttribute('background')) : '';
				$sBackgroundColor = $oElement->hasAttribute('bgcolor')
					? \trim($oElement->getAttribute('bgcolor')) : '';

				if (!empty($sBackground) || !empty($sBackgroundColor))
				{
					$aStyles = array();
					$sStyles = $oElement->hasAttribute('style')
						? \trim(\trim(\trim($oElement->getAttribute('style')), ';')) : '';

					if (!empty($sBackground))
					{
						$aStyles[] = 'background-image: url(\''.$sBackground.'\')';
						$oElement->removeAttribute('background');
					}

					if (!empty($sBackgroundColor))
					{
						$aStyles[] = 'background-color: '.$sBackgroundColor;
						$oElement->removeAttribute('bgcolor');
					}

					$oElement->setAttribute('style', (empty($sStyles) ? '' : $sStyles.'; ').\implode('; ', $aStyles));
				}

				if ($oElement->hasAttribute('style') && !$oElement->hasAttribute('data-x-skip-style'))
				{
					$oElement->setAttribute('style',
						\MailSo\Base\HtmlUtils::ClearStyle($oElement->getAttribute('style'), $oElement, $bHasExternals,
							$aFoundCIDs, $aContentLocationUrls, $aFoundedContentLocationUrls, $bDoNotReplaceExternalUrl, $fAdditionalExternalFilter));
				}

				$oElement->removeAttribute('data-x-skip-style');
			}

			$sResult = $oDom->saveHTML();
		}

		unset($oDom);

		$sResult = \MailSo\Base\HtmlUtils::ClearTags($sResult);

		$sHtmlAttrs = $sBodyAttrs = '';
		$sResult = \MailSo\Base\HtmlUtils::ClearBodyAndHtmlTag($sResult, $sHtmlAttrs, $sBodyAttrs);
		$sResult = '<div data-x-div-type="body" '.$sBodyAttrs.'>'.$sResult.'</div>';
		$sResult = '<div data-x-div-type="html" '.$sHtmlAttrs.'>'.$sResult.'</div>';

		$sResult = \str_replace(\MailSo\Base\HtmlUtils::$KOS, ':', $sResult);
		$sResult = \MailSo\Base\Utils::StripSpaces($sResult);

		return \trim($sResult);
	}

	/**
	 * @param string $sHtml
	 * @param array $aFoundCids = array()
	 * @param array|null $mFoundDataURL = null
	 * @param array $aFoundedContentLocationUrls = array()
	 *
	 * @return string
	 */
	public static function BuildHtml($sHtml, &$aFoundCids = array(), &$mFoundDataURL = null, &$aFoundedContentLocationUrls = array())
	{
		$oDom = \MailSo\Base\HtmlUtils::GetDomFromText($sHtml);
		unset($sHtml);

		$aNodes = $oDom->getElementsByTagName('*');
		foreach ($aNodes as /* @var $oElement \DOMElement */ $oElement)
		{
			$sTagNameLower = \strtolower($oElement->tagName);

			if ($oElement->hasAttribute('data-x-src-cid'))
			{
				$sCid = $oElement->getAttribute('data-x-src-cid');
				$oElement->removeAttribute('data-x-src-cid');

				if (!empty($sCid))
				{
					$aFoundCids[] = $sCid;

					@$oElement->removeAttribute('src');
					$oElement->setAttribute('src', 'cid:'.$sCid);
				}
			}

			if ($oElement->hasAttribute('data-x-src-location'))
			{
				$sSrc = $oElement->getAttribute('data-x-src-location');
				$oElement->removeAttribute('data-x-src-location');

				if (!empty($sSrc))
				{
					$aFoundedContentLocationUrls[] = $sSrc;

					@$oElement->removeAttribute('src');
					$oElement->setAttribute('src', $sSrc);
				}
			}

			if ($oElement->hasAttribute('data-x-broken-src'))
			{
				$oElement->setAttribute('src', $oElement->getAttribute('data-x-broken-src'));
				$oElement->removeAttribute('data-x-broken-src');
			}

			if ($oElement->hasAttribute('data-x-src'))
			{
				$oElement->setAttribute('src', $oElement->getAttribute('data-x-src'));
				$oElement->removeAttribute('data-x-src');
			}

			if ($oElement->hasAttribute('data-x-href'))
			{
				$oElement->setAttribute('href', $oElement->getAttribute('data-x-href'));
				$oElement->removeAttribute('data-x-href');
			}

			if ($oElement->hasAttribute('data-x-additional-src'))
			{
				$oElement->removeAttribute('data-x-additional-src');
			}

			if ($oElement->hasAttribute('data-x-additional-style-url'))
			{
				$oElement->removeAttribute('data-x-additional-style-url');
			}

			if ($oElement->hasAttribute('data-x-style-cid-name') && $oElement->hasAttribute('data-x-style-cid'))
			{
				$sCidName = $oElement->getAttribute('data-x-style-cid-name');
				$sCid = $oElement->getAttribute('data-x-style-cid');

				$oElement->removeAttribute('data-x-style-cid-name');
				$oElement->removeAttribute('data-x-style-cid');
				if (!empty($sCidName) && !empty($sCid) && \in_array($sCidName,
					array('background-image', 'background', 'list-style-image', 'content')))
				{
					$sStyles = '';
					if ($oElement->hasAttribute('style'))
					{
						$sStyles = \trim(\trim($oElement->getAttribute('style')), ';');
					}

					$sBack = $sCidName.': url(cid:'.$sCid.')';
					$sStyles = \preg_replace('/'.\preg_quote($sCidName, '/').':\s?[^;]+/i', $sBack, $sStyles);
					if (false === \strpos($sStyles, $sBack))
					{
						$sStyles .= empty($sStyles) ? '': '; ';
						$sStyles .= $sBack;
					}

					$oElement->setAttribute('style', $sStyles);
					$aFoundCids[] = $sCid;
				}
			}

			if ($oElement->hasAttribute('data-original'))
			{
				$oElement->removeAttribute('data-original');
			}

			if ($oElement->hasAttribute('data-x-div-type'))
			{
				$oElement->removeAttribute('data-x-div-type');
			}

			if ($oElement->hasAttribute('data-x-style-url'))
			{
				$sAddStyles = $oElement->getAttribute('data-x-style-url');
				$oElement->removeAttribute('data-x-style-url');

				if (!empty($sAddStyles))
				{
					$sStyles = '';
					if ($oElement->hasAttribute('style'))
					{
						$sStyles = \trim(\trim($oElement->getAttribute('style')), ';');
					}

					$oElement->setAttribute('style', (empty($sStyles) ? '' : $sStyles.'; ').$sAddStyles);
				}
			}

			if ('img' === $sTagNameLower && \is_array($mFoundDataURL))
			{
				$sSrc = $oElement->getAttribute('src');
				if ('data:image/' === \strtolower(\substr($sSrc, 0, 11)))
				{
					$sHash = \md5($sSrc);
					$mFoundDataURL[$sHash] = $sSrc;

					$oElement->setAttribute('src', 'cid:'.$sHash);
				}
			}
		}

		$sResult = $oDom->saveHTML();
		unset($oDom);

		$sResult = \MailSo\Base\HtmlUtils::ClearTags($sResult);
		$sResult = \MailSo\Base\HtmlUtils::ClearBodyAndHtmlTag($sResult);

		return '<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /></head>'.
			'<body>'.\trim($sResult).'</body></html>';
	}

	/**
	 * @param string $sText
	 * @param bool $bLinksWithTargetBlank = true
	 *
	 * @return string
	 */
	public static function ConvertPlainToHtml($sText, $bLinksWithTargetBlank = true)
	{
		$sText = \trim($sText);
		if (0 === \strlen($sText))
		{
			return '';
		}

		$sText = \MailSo\Base\LinkFinder::NewInstance()
			->Text($sText)
			->UseDefaultWrappers($bLinksWithTargetBlank)
			->CompileText();

		$sText = \str_replace("\r", '', $sText);

		$aText = \explode("\n", $sText);
		unset($sText);

		$bIn = false;
		$bDo = true;
		do
		{
			$bDo = false;
			$aNextText = array();
			foreach ($aText as $sTextLine)
			{
				$bStart = 0 === \strpos(\ltrim($sTextLine), '&gt;');
				if ($bStart && !$bIn)
				{
					$bDo = true;
					$bIn = true;
					$aNextText[] = '<blockquote>';
					$aNextText[] = \substr(\ltrim($sTextLine), 4);
				}
				else if (!$bStart && $bIn)
				{
					$bIn = false;
					$aNextText[] = '</blockquote>';
					$aNextText[] = $sTextLine;
				}
				else if ($bStart && $bIn)
				{
					$aNextText[] = \substr(\ltrim($sTextLine), 4);
				}
				else
				{
					$aNextText[] = $sTextLine;
				}
			}

			if ($bIn)
			{
				$bIn = false;
				$aNextText[] = '</blockquote>';
			}

			$aText = $aNextText;
		}
		while ($bDo);

		$sText = \join("\n", $aText);
		unset($aText);

		$sText = \preg_replace('/[\n][ ]+/', "\n", $sText);
//		$sText = \preg_replace('/[\s]+([\s])/', '\\1', $sText);

		$sText = \preg_replace('/<blockquote>[\s]+/i', '<blockquote>', $sText);
		$sText = \preg_replace('/[\s]+<\/blockquote>/i', '</blockquote>', $sText);

		$sText = \preg_replace('/<\/blockquote>([\n]{0,2})<blockquote>/i', '\\1', $sText);
		$sText = \preg_replace('/[\n]{3,}/', "\n\n", $sText);

		$sText = \strtr($sText, array(
			"\n" => "<br />",
			"\t" => '&nbsp;&nbsp;&nbsp;',
			'  ' => '&nbsp;&nbsp;'
		));

		return $sText;
	}

	/**
	 * @param string $sText
	 *
	 * @return string
	 */
	public static function ConvertHtmlToPlain($sText)
	{
		$sText = \trim(\stripslashes($sText));
		$sText = \MailSo\Base\Utils::StripSpaces($sText);

		$sText = \preg_replace(array(
			"/\r/",
			"/[\n\t]+/",
			'/<script[^>]*>.*?<\/script>/i',
			'/<style[^>]*>.*?<\/style>/i',
			'/<title[^>]*>.*?<\/title>/i',
			'/<h[123][^>]*>(.+?)<\/h[123]>/i',
			'/<h[456][^>]*>(.+?)<\/h[456]>/i',
			'/<p[^>]*>/i',
			'/<br[^>]*>/i',
			'/<b[^>]*>(.+?)<\/b>/i',
			'/<i[^>]*>(.+?)<\/i>/i',
			'/(<ul[^>]*>|<\/ul>)/i',
			'/(<ol[^>]*>|<\/ol>)/i',
			'/<li[^>]*>/i',
			'/<a[^>]*href="([^"]+)"[^>]*>(.+?)<\/a>/i',
			'/<hr[^>]*>/i',
			'/(<table[^>]*>|<\/table>)/i',
			'/(<tr[^>]*>|<\/tr>)/i',
			'/<td[^>]*>(.+?)<\/td>/i',
			'/<th[^>]*>(.+?)<\/th>/i',
			'/&nbsp;/i',
			'/&quot;/i',
			'/&gt;/i',
			'/&lt;/i',
			'/&amp;/i',
			'/&copy;/i',
			'/&trade;/i',
			'/&#8220;/',
			'/&#8221;/',
			'/&#8211;/',
			'/&#8217;/',
			'/&#38;/',
			'/&#169;/',
			'/&#8482;/',
			'/&#151;/',
			'/&#147;/',
			'/&#148;/',
			'/&#149;/',
			'/&reg;/i',
			'/&bull;/i',
			'/&[&;]+;/i',
			'/&#39;/',
			'/&#160;/'
		), array(
			'',
			' ',
			'',
			'',
			'',
			"\n\n\\1\n\n",
			"\n\n\\1\n\n",
			"\n\n\t",
			"\n",
			'\\1',
			'\\1',
			"\n\n",
			"\n\n",
			"\n\t* ",
			'\\2 (\\1)',
			"\n------------------------------------\n",
			"\n",
			"\n",
			"\t\\1\n",
			"\t\\1\n",
			' ',
			'"',
			'>',
			'<',
			'&',
			'(c)',
			'(tm)',
			'"',
			'"',
			'-',
			"'",
			'&',
			'(c)',
			'(tm)',
			'--',
			'"',
			'"',
			'*',
			'(R)',
			'*',
			'',
			'\'',
			''
		), $sText);

		$sText = \str_ireplace('<div>',"\n<div>", $sText);
		$sText = \strip_tags($sText, '');
		$sText = \preg_replace("/\n\\s+\n/", "\n", $sText);
		$sText = \preg_replace("/[\n]{3,}/", "\n\n", $sText);

		return \trim($sText);
	}
}
