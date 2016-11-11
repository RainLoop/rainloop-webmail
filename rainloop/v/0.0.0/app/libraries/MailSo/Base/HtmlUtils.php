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
	 * @param \DOMElement $oElement
	 *
	 * @return array
	 */
	public static function GetElementAttributesAsArray($oElement)
	{
		$aResult = array();
		if ($oElement)
		{
			if ($oElement->hasAttributes() && isset($oElement->attributes) && $oElement->attributes)
			{
				foreach ($oElement->attributes as $oAttr)
				{
					if ($oAttr && !empty($oAttr->nodeName))
					{
						$sAttrName = \trim(\strtolower($oAttr->nodeName));
						$aResult[$sAttrName] = $oAttr->nodeValue;
					}
				}
			}
		}

		return $aResult;
	}

	/**
	 * @param string $sText
	 *
	 * @return \DOMDocument|bool
	 */
	public static function GetDomFromText($sText)
	{
		$bState = true;
		if (\MailSo\Base\Utils::FunctionExistsAndEnabled('libxml_use_internal_errors'))
		{
			$bState = \libxml_use_internal_errors(true);
		}

		$sHtmlAttrs = $sBodyAttrs = '';

		$sText = \MailSo\Base\HtmlUtils::FixSchemas($sText);
		$sText = \MailSo\Base\HtmlUtils::ClearFastTags($sText);
		$sText = \MailSo\Base\HtmlUtils::ClearBodyAndHtmlTag($sText, $sHtmlAttrs, $sBodyAttrs);

		$oDom = self::createDOMDocument();
		@$oDom->loadHTML('<'.'?xml version="1.0" encoding="utf-8"?'.'>'.
			'<html '.$sHtmlAttrs.'><head>'.
			'<meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head>'.
			'<body '.$sBodyAttrs.'>'.\MailSo\Base\Utils::Utf8Clear($sText).'</body></html>');

		@$oDom->normalizeDocument();

		if (\MailSo\Base\Utils::FunctionExistsAndEnabled('libxml_clear_errors'))
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
	 * @return \DOMDocument
	 */
	private static function createDOMDocument()
	{
		$oDoc = new \DOMDocument('1.0', 'UTF-8');
		$oDoc->encoding = 'UTF-8';
		$oDoc->strictErrorChecking = false;
		$oDoc->formatOutput = false;
		$oDoc->preserveWhiteSpace = false;

		return $oDoc;
	}

	/**
	 * @return boolean
	 */
	private static function comparedVersion()
	{
		return \version_compare(PHP_VERSION, '5.3.6') >= 0;
	}

	/**
	 * @param \DOMDocument|\DOMElement $oElem
	 *
	 * @return string
	 */
	private static function domToString($oElem, $oDom = null)
	{
		$sResult = '';
		if ($oElem instanceof \DOMDocument)
		{
			if (isset($oElem->documentElement) && self::comparedVersion())
			{
				$sResult = $oElem->saveHTML($oElem->documentElement);
			}
			else
			{
				$sResult = $oElem->saveHTML();
			}
		}
		else if ($oElem)
		{
			if ($oDom && self::comparedVersion())
			{
				$sResult = $oDom->saveHTML($oElem);
			}
			else
			{
				$oTempDoc = self::createDOMDocument();
				$oTempDoc->appendChild($oTempDoc->importNode($oElem->cloneNode(true), true));
				$sResult = $oTempDoc->saveHTML();
			}
		}

		return \trim($sResult);
	}

	/**
	 * @param \DOMDocument $oDom
	 * @param bool $bWrapByFakeHtmlAndBodyDiv = true
	 *
	 * @return string
	 */
	public static function GetTextFromDom_($oDom, $bWrapByFakeHtmlAndBodyDiv = true)
	{
		$sResult = '';

		$aHtmlAttrs = $aBodylAttrs = array();
		if ($bWrapByFakeHtmlAndBodyDiv)
		{
			$oHtml = $oDom->getElementsByTagName('html')->item(0);
			$oBody = $oDom->getElementsByTagName('body')->item(0);

			$aHtmlAttrs = \MailSo\Base\HtmlUtils::GetElementAttributesAsArray($oHtml);
			$aBodylAttrs = \MailSo\Base\HtmlUtils::GetElementAttributesAsArray($oBody);
		}

		$oDiv = $oDom->getElementsByTagName('div')->item(0);
		if ($oDiv && $oDiv->hasAttribute('data-wrp') && 'rainloop' === $oDiv->getAttribute('data-wrp'))
		{
			$oDiv->removeAttribute('data-wrp');
			if ($bWrapByFakeHtmlAndBodyDiv)
			{
				$oWrap = $oDom->createElement('div');

				$oWrap->setAttribute('data-x-div-type', 'html');
				foreach ($aHtmlAttrs as $sKey => $sValue)
				{
					$oWrap->setAttribute($sKey, $sValue);
				}

				$oDiv->setAttribute('data-x-div-type', 'body');
				foreach ($aBodylAttrs as $sKey => $sValue)
				{
					$oDiv->setAttribute($sKey, $sValue);
				}

				$oWrap->appendChild($oDiv);
				$sResult = self::domToString($oWrap, $oDom);
			}
			else
			{
				$sResult = self::domToString($oDiv, $oDom);
			}
		}
		else
		{
			$sResult = self::domToString($oDom);
		}

		$sResult = \str_replace(\MailSo\Base\HtmlUtils::$KOS, ':', $sResult);
		$sResult = \MailSo\Base\Utils::StripSpaces($sResult);

		return $sResult;
	}

	/**
	 * @param \DOMDocument $oDom
	 * @param bool $bWrapByFakeHtmlAndBodyDiv = true
	 *
	 * @return string
	 */
	public static function GetTextFromDom($oDom, $bWrapByFakeHtmlAndBodyDiv = true)
	{
		$sResult = '';

		$oHtml = $oDom->getElementsByTagName('html')->item(0);
		$oBody = $oDom->getElementsByTagName('body')->item(0);

		foreach ($oBody->childNodes as $oChild)
		{
			$sResult .= $oDom->saveHTML($oChild);
		}

		if ($bWrapByFakeHtmlAndBodyDiv)
		{
			$aHtmlAttrs = \MailSo\Base\HtmlUtils::GetElementAttributesAsArray($oHtml);
			$aBodylAttrs = \MailSo\Base\HtmlUtils::GetElementAttributesAsArray($oBody);

			$oWrapHtml = $oDom->createElement('div');
			$oWrapHtml->setAttribute('data-x-div-type', 'html');
			foreach ($aHtmlAttrs as $sKey => $sValue)
			{
				$oWrapHtml->setAttribute($sKey, $sValue);
			}

			$oWrapDom = $oDom->createElement('div', '___xxx___');
			$oWrapDom->setAttribute('data-x-div-type', 'body');
			foreach ($aBodylAttrs as $sKey => $sValue)
			{
				$oWrapDom->setAttribute($sKey, $sValue);
			}

			$oWrapHtml->appendChild($oWrapDom);

			$sWrp = $oDom->saveHTML($oWrapHtml);

			$sResult = \str_replace('___xxx___', $sResult, $sWrp);
		}

		$sResult = \str_replace(\MailSo\Base\HtmlUtils::$KOS, ':', $sResult);
		$sResult = \MailSo\Base\Utils::StripSpaces($sResult);

		return $sResult;
	}

	/**
	 * @param string $sHtml
	 * @param string $sHtmlAttrs = ''
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

		$sHtml = \preg_replace('/<head([^>]*)>/si', '', $sHtml);
		$sHtml = \preg_replace('/<body([^>]*)>/si', '', $sHtml);
		$sHtml = \preg_replace('/<\/body>/i', '', $sHtml);
		$sHtml = \preg_replace('/<html([^>]*)>/i', '', $sHtml);
		$sHtml = \preg_replace('/<\/html>/i', '', $sHtml);

		$sHtmlAttrs = \preg_replace('/xmlns:[a-z]="[^"]*"/i', '', $sHtmlAttrs);
		$sHtmlAttrs = \preg_replace('/xmlns:[a-z]=\'[^\']*\'/i', '', $sHtmlAttrs);
		$sHtmlAttrs = \preg_replace('/xmlns="[^"]*"/i', '', $sHtmlAttrs);
		$sHtmlAttrs = \preg_replace('/xmlns=\'[^\']*\'/i', '', $sHtmlAttrs);
		$sBodyAttrs = \preg_replace('/xmlns:[a-z]="[^"]*"/i', '', $sBodyAttrs);
		$sBodyAttrs = \preg_replace('/xmlns:[a-z]=\'[^\']*\'/i', '', $sBodyAttrs);

		$sHtmlAttrs = trim($sHtmlAttrs);
		$sBodyAttrs = trim($sBodyAttrs);

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

		$sHtml = \str_replace('<o:p>', '<span>', $sHtml);
		$sHtml = \str_replace('</o:p>', '</span>', $sHtml);

		return $sHtml;
	}

	/**
	 * @param string $sHtml
	 *
	 * @return string
	 */
	public static function ClearFastTags($sHtml)
	{
		return \preg_replace(array(
			'/<p[^>]*><\/p>/i',
			'/<!doctype[^>]*>/i',
			'/<\?xml [^>]*\?>/i'
		), '', $sHtml);
	}

	/**
	 * @param mixed $oDom
	 */
	public static function ClearComments(&$oDom)
	{
		$aRemove = array();

		$oXpath = new \DOMXpath($oDom);
		$oComments = $oXpath->query('//comment()');
		if ($oComments)
		{
			foreach ($oComments as $oComment)
			{
				$aRemove[] = $oComment;
			}
		}

		unset($oXpath, $oComments);

		foreach ($aRemove as /* @var $oElement \DOMElement */ $oElement)
		{
			if (isset($oElement->parentNode))
			{
				@$oElement->parentNode->removeChild($oElement);
			}
		}
	}

	/**
	 * @param mixed $oDom
	 * @param bool $bClearStyleAndHead = true
	 */
	public static function ClearTags(&$oDom, $bClearStyleAndHead = true)
	{
		$aRemoveTags = array(
			'svg', 'link', 'base', 'meta', 'title', 'x-script', 'script', 'bgsound', 'keygen', 'source',
			'object', 'embed', 'applet', 'mocha', 'iframe', 'frame', 'frameset', 'video', 'audio', 'area', 'map'
		);

		if ($bClearStyleAndHead)
		{
			$aRemoveTags[] = 'head';
			$aRemoveTags[] = 'style';
		}

		$aHtmlAllowedTags = isset(\MailSo\Config::$HtmlStrictAllowedTags) &&
			\is_array(\MailSo\Config::$HtmlStrictAllowedTags) && 0 < \count(\MailSo\Config::$HtmlStrictAllowedTags) ?
				\MailSo\Config::$HtmlStrictAllowedTags : null;

		$aRemove = array();
		$aNodes = $oDom->getElementsByTagName('*');
		foreach ($aNodes as /* @var $oElement \DOMElement */ $oElement)
		{
			if ($oElement)
			{
				$sTagNameLower = \trim(\strtolower($oElement->tagName));
				if ('' !== $sTagNameLower)
				{
					if (\in_array($sTagNameLower, $aRemoveTags) || ($aHtmlAllowedTags && !\in_array($sTagNameLower, $aHtmlAllowedTags)))
					{
						$aRemove[] = @$oElement;
					}
				}
			}
		}

		foreach ($aRemove as /* @var $oElement \DOMElement */ $oElement)
		{
			if (isset($oElement->parentNode))
			{
				@$oElement->parentNode->removeChild($oElement);
			}
		}
	}

/*
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
*/

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

						$oSubDom = \MailSo\Base\HtmlUtils::GetDomFromText($sText);
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
	 * @param bool $bWrapByFakeHtmlAndBodyDiv = true
	 *
	 * @return string
	 */
	public static function ClearHtmlSimple($sHtml, $bDoNotReplaceExternalUrl = false, $bFindLinksInHtml = false, $bWrapByFakeHtmlAndBodyDiv = true)
	{
		$bHasExternals = false;
		$aFoundCIDs = array();
		$aContentLocationUrls = array();
		$aFoundedContentLocationUrls = array();
		$fAdditionalExternalFilter = null;
		$fAdditionalDomReader = null;
		$bTryToDetectHiddenImages = false;

		return \MailSo\Base\HtmlUtils::ClearHtml($sHtml, $bHasExternals, $aFoundCIDs,
			$aContentLocationUrls, $aFoundedContentLocationUrls, $bDoNotReplaceExternalUrl, $bFindLinksInHtml,
			$fAdditionalExternalFilter, $fAdditionalDomReader, $bTryToDetectHiddenImages,
			$bWrapByFakeHtmlAndBodyDiv);
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
	 * @param bool $bTryToDetectHiddenImages = false
	 * @param bool $bWrapByFakeHtmlAndBodyDiv = true
	 *
	 * @return string
	 */
	public static function ClearHtml($sHtml, &$bHasExternals = false, &$aFoundCIDs = array(),
		$aContentLocationUrls = array(), &$aFoundedContentLocationUrls = array(),
		$bDoNotReplaceExternalUrl = false, $bFindLinksInHtml = false,
		$fAdditionalExternalFilter = null, $fAdditionalDomReader = false,
		$bTryToDetectHiddenImages = false, $bWrapByFakeHtmlAndBodyDiv = true)
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

		// Dom Part
		$oDom = \MailSo\Base\HtmlUtils::GetDomFromText($sHtml);
		unset($sHtml);

		if (!$oDom)
		{
			return '';
		}

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

		\MailSo\Base\HtmlUtils::ClearComments($oDom);
		\MailSo\Base\HtmlUtils::ClearTags($oDom);

		$sLinkColor = '';
		$aNodes = $oDom->getElementsByTagName('*');
		foreach ($aNodes as /* @var $oElement \DOMElement */ $oElement)
		{
			$aRemovedAttrs = array();
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
					foreach ($oElement->attributes as $sAttrName => /* @var $oAttributeNode \DOMNode */ $oAttributeNode)
					{
						if ($oAttributeNode && isset($oAttributeNode->nodeValue))
						{
							$sAttrNameLower = \trim(\strtolower($sAttrName));
							if (isset($aAttrs[$sAttrNameLower]) && '' === $aAttrs[$sAttrNameLower])
							{
								$aAttrs[$sAttrNameLower] = array($sAttrName, \trim($oAttributeNode->nodeValue));
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

			if ($oElement->hasAttributes() && isset($oElement->attributes) && $oElement->attributes)
			{
				$aHtmlAllowedAttributes = isset(\MailSo\Config::$HtmlStrictAllowedAttributes) &&
					\is_array(\MailSo\Config::$HtmlStrictAllowedAttributes) && 0 < \count(\MailSo\Config::$HtmlStrictAllowedAttributes) ?
						\MailSo\Config::$HtmlStrictAllowedAttributes : null;

				$sAttrsForRemove = array();
				foreach ($oElement->attributes as $sAttrName => $oAttr)
				{
					if ($sAttrName && $oAttr)
					{
						$sAttrNameLower = \trim(\strtolower($sAttrName));
						if ($aHtmlAllowedAttributes && !\in_array($sAttrNameLower, $aHtmlAllowedAttributes))
						{
							$sAttrsForRemove[] = $sAttrName;
						}
						else if ('on' === \substr($sAttrNameLower, 0, 2) || in_array($sAttrNameLower, array(
							'id', 'class', 'contenteditable', 'designmode', 'formaction', 'manifest', 'action',
							'data-bind', 'data-reactid', 'xmlns', 'srcset', 'data-x-skip-style',
							'fscommand', 'seeksegmenttime'
						)))
						{
							$sAttrsForRemove[] = $sAttrName;
						}
					}
				}

				if (0 < \count($sAttrsForRemove))
				{
					foreach ($sAttrsForRemove as $sName)
					{
						@$oElement->removeAttribute($sName);
						$aRemovedAttrs[\trim(\strtolower($sName))] = true;
					}
				}

				unset($sAttrsForRemove);
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
					$oElement->setAttribute('rel', 'external nofollow noopener noreferrer');
				}
			}

			if (\in_array($sTagNameLower, array('a', 'form', 'area')))
			{
				$oElement->setAttribute('target', '_blank');
			}

			if (\in_array($sTagNameLower, array('a', 'form', 'area', 'input', 'button', 'textarea')))
			{
				$oElement->setAttribute('tabindex', '-1');
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

			if (\MailSo\Config::$HtmlStrictDebug && 0 < \count($aRemovedAttrs))
			{
				unset($aRemovedAttrs['class'], $aRemovedAttrs['target'], $aRemovedAttrs['id'], $aRemovedAttrs['name'],
					$aRemovedAttrs['itemprop'], $aRemovedAttrs['itemscope'], $aRemovedAttrs['itemtype']);

				$aRemovedAttrs = \array_keys($aRemovedAttrs);
				if (0 < \count($aRemovedAttrs))
				{
					$oElement->setAttribute('data-removed-attrs', \implode(',', $aRemovedAttrs));
				}
			}
		}

		$sResult = \MailSo\Base\HtmlUtils::GetTextFromDom($oDom, $bWrapByFakeHtmlAndBodyDiv);
		unset($oDom);

		return $sResult;
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

		\MailSo\Base\HtmlUtils::ClearTags($oDom);
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

			foreach (array(
				'data-x-additional-src', 'data-x-additional-style-url', 'data-removed-attrs',
				'data-original', 'data-x-div-type', 'data-wrp', 'data-bind'
			) as $sName)
			{
				if ($oElement->hasAttribute($sName))
				{
					$oElement->removeAttribute($sName);
				}
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

		$sResult = \MailSo\Base\HtmlUtils::GetTextFromDom($oDom, false);
		unset($oDom);

		return '<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /></head>'.
			'<body>'.$sResult.'</body></html>';
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
			->CompileText()
		;

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
