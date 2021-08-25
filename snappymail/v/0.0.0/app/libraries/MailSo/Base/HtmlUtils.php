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
abstract class HtmlUtils
{
	static $KOS = '@@_KOS_@@';

	public static function GetElementAttributesAsArray(?\DOMElement $oElement) : array
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

	public static function GetDomFromText(string $sText) : \DOMDocument
	{
		$bState = true;
		if (\MailSo\Base\Utils::FunctionExistsAndEnabled('libxml_use_internal_errors'))
		{
			$bState = \libxml_use_internal_errors(true);
		}

		$sHtmlAttrs = $sBodyAttrs = '';

		$sText = static::FixSchemas($sText);
		$sText = static::ClearFastTags($sText);
		$sText = static::ClearBodyAndHtmlTag($sText, $sHtmlAttrs, $sBodyAttrs);

		$oDom = self::createDOMDocument();
		@$oDom->loadHTML('<'.'?xml version="1.0" encoding="utf-8"?'.'>'.
			'<html '.$sHtmlAttrs.'><head>'.
			'<meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head>'.
			'<body '.$sBodyAttrs.'>'.\MailSo\Base\Utils::Utf8Clear($sText).'</body></html>');

		@$oDom->normalizeDocument();

		if (\MailSo\Base\Utils::FunctionExistsAndEnabled('libxml_clear_errors'))
		{
			\libxml_clear_errors();
		}

		if (\MailSo\Base\Utils::FunctionExistsAndEnabled('libxml_use_internal_errors'))
		{
			\libxml_use_internal_errors($bState);
		}

		return $oDom;
	}

	private static function createDOMDocument() : \DOMDocument
	{
		$oDoc = new \DOMDocument('1.0', 'UTF-8');
		$oDoc->encoding = 'UTF-8';
		$oDoc->strictErrorChecking = false;
		$oDoc->formatOutput = false;
		$oDoc->preserveWhiteSpace = false;

		return $oDoc;
	}

	private static function domToString(\DOMNode $oElem, ?\DOMDocument $oDom = null) : string
	{
		$sResult = '';
		if ($oElem instanceof \DOMDocument)
		{
			if (isset($oElem->documentElement))
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
			if ($oDom)
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

	public static function GetTextFromDom(\DOMDocument $oDom, bool $bWrapByFakeHtmlAndBodyDiv = true) : string
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
			$aHtmlAttrs = static::GetElementAttributesAsArray($oHtml);
			$aBodylAttrs = static::GetElementAttributesAsArray($oBody);

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

		$sResult = \str_replace(static::$KOS, ':', $sResult);
		$sResult = \MailSo\Base\Utils::StripSpaces($sResult);

		return $sResult;
	}

	public static function ClearBodyAndHtmlTag(string $sHtml, string &$sHtmlAttrs = '', string &$sBodyAttrs = '') : string
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

	public static function FixSchemas(string $sHtml, bool $bClearEmpty = true) : string
	{
		if ($bClearEmpty)
		{
			$sHtml = \str_replace('<o:p></o:p>', '', $sHtml);
		}

		$sHtml = \str_replace('<o:p>', '<span>', $sHtml);
		$sHtml = \str_replace('</o:p>', '</span>', $sHtml);

		return $sHtml;
	}

	public static function ClearFastTags(string $sHtml) : string
	{
		return \preg_replace(array(
			'/<p[^>]*><\/p>/i',
			'/<!doctype[^>]*>/i',
			'/<\?xml [^>]*\?>/i'
		), '', $sHtml);
	}

	public static function ClearComments(\DOMDocument $oDom) : void
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

	public static function ClearTags(\DOMDocument $oDom, bool $bClearStyleAndHead = true) : void
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

	/**
	 * @param callback|null $fAdditionalExternalFilter = null
	 */
	public static function ClearStyle(string $sStyle, \DOMElement $oElement, bool &$bHasExternals, array &$aFoundCIDs,
		array $aContentLocationUrls, array &$aFoundedContentLocationUrls, bool $bDoNotReplaceExternalUrl = false, $fAdditionalExternalFilter = null)
	{
		$sStyle = \trim($sStyle, " \n\r\t\v\0;");
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
			else */if (\in_array($sName, array('behavior', 'pointer-events', 'visibility')) ||
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

	public static function FindLinksInDOM(\DOMDocument $oDom) : void
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
						$sText = (new \MailSo\Base\LinkFinder)
							->Text($oTextNode->wholeText)
							->UseDefaultWrappers(true)
							->CompileText()
						;

						$oSubDom = static::GetDomFromText($sText);
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
													\str_replace(':', static::$KOS, \htmlspecialchars($oSubItem->nodeValue)));

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
	 * @param callback|null $fAdditionalExternalFilter = null
	 * @param callback|null $fAdditionalDomReader = null
	 */
	public static function ClearHtml(string $sHtml, bool &$bHasExternals = false, array &$aFoundCIDs = array(),
		array $aContentLocationUrls = array(), array &$aFoundedContentLocationUrls = array(),
		bool $bDoNotReplaceExternalUrl = false, bool $bFindLinksInHtml = false,
		$fAdditionalExternalFilter = null, $fAdditionalDomReader = false,
		bool $bTryToDetectHiddenImages = false, bool $bWrapByFakeHtmlAndBodyDiv = true)
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
		$oDom = static::GetDomFromText($sHtml);
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
			static::FindLinksInDOM($oDom);
		}

		static::ClearComments($oDom);
		static::ClearTags($oDom);

		$sLinkColor = '';
		$aNodes = $oDom->getElementsByTagName('*');
		foreach ($aNodes as /* @var $oElement \DOMElement */ $oElement)
		{
			$aRemovedAttrs = array();
			$sTagNameLower = \strtolower($oElement->tagName);

			$sStyles = $oElement->hasAttribute('style') ? \trim($oElement->getAttribute('style'), " \n\r\t\v\0;") : '';

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
					$sStyles .= $sStyles . '; ' . \implode('; ', $aStyles);
				}
			}

			else if ('iframe' === $sTagNameLower || 'frame' === $sTagNameLower)
			{
				$oElement->setAttribute('src', 'javascript:false');
			}

			else if ('a' === $sTagNameLower && !empty($sLinkColor))
			{
				$sStyles .= '; color: '.$sLinkColor;
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
						if (($aHtmlAllowedAttributes && !\in_array($sAttrNameLower, $aHtmlAllowedAttributes))
						 || 'on' === \substr($sAttrNameLower, 0, 2)
//						 || 'data-' === \substr($sAttrNameLower, 0, 5)
//						 || \strpos($sAttrNameLower, ':')
						 || \in_array($sAttrNameLower, array(
							'id', 'class', 'contenteditable', 'designmode', 'formaction', 'manifest', 'action',
							'data-bind', 'data-reactid', 'xmlns', 'srcset',
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
				if (!\preg_match('/^([a-z]+):/i', $sHref) && '//' !== \substr($sHref, 0, 2))
				{
					$oElement->setAttribute('data-x-broken-href', $sHref);
					$oElement->setAttribute('href', 'javascript:false');
				}

				if ('a' === $sTagNameLower)
				{
					$oElement->setAttribute('rel', 'external nofollow noopener noreferrer');
				}
			}

			$sLinkHref = \trim($oElement->getAttribute('xlink:href'));
			if ($sLinkHref && !\preg_match('/^(http[s]?):/i', $sLinkHref) && '//' !== \substr($sLinkHref, 0, 2))
			{
				$oElement->setAttribute('data-x-blocked-xlink-href', $sLinkHref);
				$oElement->removeAttribute('xlink:href');
			}

			if (\in_array($sTagNameLower, array('a', 'form', 'area')))
			{
				$oElement->setAttribute('target', '_blank');
			}

			if (\in_array($sTagNameLower, array('a', 'form', 'area', 'input', 'button', 'textarea')))
			{
				$oElement->setAttribute('tabindex', '-1');
			}

			$skipStyle = false;
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

//					$sW = $oElement->hasAttribute('width')
//						? \trim($oElement->getAttribute('width')) : '';

					$sSrc = \trim($oElement->getAttribute('src'));

					$bC = \in_array($sH, array('1', '0', '1px', '0px')) ||
						\preg_match('/display:\\s*none|visibility:\\s*hidden|height:\\s*0/i', $sStyles);

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
						$skipStyle = true;
						$oElement->setAttribute('style', 'display:none');
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

				$sStyles .= '; ' . \implode('; ', $aStyles);
			}

			if ($sStyles && !$skipStyle)
			{
				$oElement->setAttribute('style',
					static::ClearStyle($sStyles, $oElement, $bHasExternals,
						$aFoundCIDs, $aContentLocationUrls, $aFoundedContentLocationUrls, $bDoNotReplaceExternalUrl, $fAdditionalExternalFilter));
			}

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

		$sResult = static::GetTextFromDom($oDom, $bWrapByFakeHtmlAndBodyDiv);
		unset($oDom);

		return $sResult;
	}

	public static function BuildHtml(string $sHtml, array &$aFoundCids = array(), &$mFoundDataURL = null, array &$aFoundedContentLocationUrls = array()) : string
	{
		$oDom = static::GetDomFromText($sHtml);

		static::ClearTags($oDom);
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

		$sResult = static::GetTextFromDom($oDom, false);
		unset($oDom);

		return '<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /></head>'.
			'<body>'.$sResult.'</body></html>';
	}

	public static function ConvertPlainToHtml(string $sText, bool $bLinksWithTargetBlank = true) : string
	{
		$sText = \trim($sText);
		if (0 === \strlen($sText))
		{
			return '';
		}

		$sText = (new \MailSo\Base\LinkFinder)
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

	public static function ConvertHtmlToPlain(string $sText) : string
	{
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

		$sText = \preg_replace(array(
			'/&gt;/i',
			'/&lt;/i'
		), array(
			'>',
			'<'
		), $sText);

		return \trim($sText);
	}
}
