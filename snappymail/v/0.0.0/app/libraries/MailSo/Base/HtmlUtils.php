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

	private static function GetElementAttributesAsArray(?\DOMElement $oElement) : array
	{
		$aResult = array();
		if ($oElement && $oElement->hasAttributes() && isset($oElement->attributes) && $oElement->attributes)
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

		return $aResult;
	}

	private static function GetDomFromText(string $sText) : \DOMDocument
	{
		$bState = true;
		if (\MailSo\Base\Utils::FunctionExistsAndEnabled('libxml_use_internal_errors'))
		{
			$bState = \libxml_use_internal_errors(true);
		}

		$sText = \str_replace('<o:p></o:p>', '', $sText);
		$sText = \str_replace('<o:p>', '<span>', $sText);
		$sText = \str_replace('</o:p>', '</span>', $sText);
//		$sText = \preg_replace('#<!--.*?-->#s', '', $sText);

		// https://github.com/the-djmaze/snappymail/issues/187
		$sText = \preg_replace('#<a[^>]*>(((?!</a).)+<a\\s)#si', '$1', $sText);

		if (\function_exists('tidy_repair_string')) {
			# http://tidy.sourceforge.net/docs/quickref.html
			$tidyConfig = array(
				'bare' => 1,
				'join-classes' => 1,
				'newline' => 'LF',
				'numeric-entities' => 1,
				'quote-nbsp' => 0,
				'word-2000' => 1
			);
			$sText = \tidy_repair_string($sText, $tidyConfig, 'utf8');
		}

		$sText = \preg_replace(array(
			'/<p[^>]*><\/p>/i',
			'/<!doctype[^>]*>/i',
			'/<\?xml [^>]*\?>/i'
		), '', $sText);

		$sHtmlAttrs = '';
		$aMatch = array();
		if (\preg_match('/<html([^>]+)>/im', $sText, $aMatch) && !empty($aMatch[1])) {
			$sHtmlAttrs = $aMatch[1];
		}

		$sBodyAttrs = '';
		$aMatch = array();
		if (\preg_match('/<body([^>]+)>/im', $sText, $aMatch) && !empty($aMatch[1])) {
			$sBodyAttrs = $aMatch[1];
		}

//		$sText = \preg_replace('/^.*<body([^>]*)>/si', '', $sText);
		$sText = \preg_replace('/<\/?(head|body|html)(\\s[^>]*)?>/si', '', $sText);

		$sHtmlAttrs = \preg_replace('/xmlns:[a-z]="[^"]*"/i', '', $sHtmlAttrs);
		$sHtmlAttrs = \preg_replace('/xmlns:[a-z]=\'[^\']*\'/i', '', $sHtmlAttrs);
		$sHtmlAttrs = \preg_replace('/xmlns="[^"]*"/i', '', $sHtmlAttrs);
		$sHtmlAttrs = \preg_replace('/xmlns=\'[^\']*\'/i', '', $sHtmlAttrs);
		$sBodyAttrs = \preg_replace('/xmlns:[a-z]="[^"]*"/i', '', $sBodyAttrs);
		$sBodyAttrs = \preg_replace('/xmlns:[a-z]=\'[^\']*\'/i', '', $sBodyAttrs);

		$oDom = self::createDOMDocument();
		@$oDom->loadHTML('<?xml version="1.0" encoding="utf-8"?>'.
			'<html '.\trim($sHtmlAttrs).'><head>'.
			'<meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head>'.
			'<body '.\trim($sBodyAttrs).'>'.\MailSo\Base\Utils::Utf8Clear($sText).'</body></html>');

		$oDom->normalizeDocument();

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
			$sResult = $oElem->saveHTML(isset($oElem->documentElement) ? $oElem->documentElement : null);
		}
		else if ($oDom)
		{
			$sResult = $oDom->saveHTML($oElem);
		}
		else
		{
			$oTempDoc = self::createDOMDocument();
			$oTempDoc->appendChild($oTempDoc->importNode($oElem->cloneNode(true), true));
			$sResult = $oTempDoc->saveHTML();
		}

		return \trim($sResult);
	}

	private static function GetTextFromDom(\DOMDocument $oDom, bool $bWrapByFakeHtmlAndBodyDiv = true) : string
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

	private static function ClearTags(\DOMDocument $oDom, bool $bClearStyleAndHead = true) : void
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
			\is_array(\MailSo\Config::$HtmlStrictAllowedTags) && \count(\MailSo\Config::$HtmlStrictAllowedTags) ?
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
	 * Used by DoSaveMessage() and DoSendMessage()
	 */
	public static function BuildHtml(string $sHtml, array &$aFoundCids, array &$aFoundDataURL, array &$aFoundContentLocationUrls) : string
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
					$aFoundContentLocationUrls[] = $sSrc;

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

			if ('img' === $sTagNameLower)
			{
				$sSrc = $oElement->getAttribute('src');
				if ('data:image/' === \strtolower(\substr($sSrc, 0, 11)))
				{
					$sHash = \md5($sSrc);
					$aFoundDataURL[$sHash] = $sSrc;

					$oElement->setAttribute('src', 'cid:'.$sHash);
				}
			}
		}

		$sResult = static::GetTextFromDom($oDom, false);
		unset($oDom);

		return '<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head>'.
			'<body>'.$sResult.'</body></html>';
	}

	public static function ConvertPlainToHtml(string $sText, bool $bLinksWithTargetBlank = true) : string
	{
		$sText = \trim($sText);
		if (!\strlen($sText))
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
			"\t" => "\xC2\xA0\xC2\xA0\xC2\xA0\xC2\xA0",
			'  ' => "\xC2\xA0\xC2\xA0"
		));

		return \nl2br($sText);
	}

	public static function ConvertHtmlToPlain(string $sText) : string
	{
		$sText = \MailSo\Base\Utils::StripSpaces($sText);

		$sText = \preg_replace_callback('/<h([1-6])[^>]*>/', function($m) {
			return "\n\n" . \str_repeat('#', $m[1]) . ' ';
		}, $sText);

		$sText = \preg_replace(array(
			"/\r/",
			"/[\n\t]+/",
			'/<script[^>]*>.*?<\/script>|<style[^>]*>.*?<\/style>|<title[^>]*>.*?<\/title>/i',
			'/<\/h[1-6]>/i',
			'/<p[^>]*>/i',
			'/<br[^>]*>/i',
			'/<b[^>]*>(.+?)<\/b>/i',
			'/<i[^>]*>(.+?)<\/i>/i',
			'/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/i',
			'/<li[^>]*>/i',
			'/<a[^>]*href="([^"]+)"[^>]*>(.+?)<\/a>/i',
			'/<hr[^>]*>/i',
			'/(<table[^>]*>|<\/table>)/i',
			'/(<tr[^>]*>|<\/tr>)/i',
			'/<td[^>]*>(.+?)<\/td>/i',
			'/<th[^>]*>(.+?)<\/th>/i',
		), array(
			'',
			' ',
			'',
			"\n\n",
			"\n\n\t",
			"\n",
			'\\1',
			'\\1',
			"\n\n",
			"\n\t* ",
			'\\2 (\\1)',
			"\n------------------------------------\n",
			"\n",
			"\n",
			"\t\\1\n",
			"\t\\1\n"
		), $sText);

		$sText = \str_ireplace('<div>',"\n<div>", $sText);
		$sText = \strip_tags($sText, '');
		$sText = \preg_replace("/\n\\s+\n/", "\n", $sText);
		$sText = \preg_replace("/[\n]{3,}/", "\n\n", $sText);

		$sText = \html_entity_decode($sText, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML401, 'UTF-8');

		return \trim($sText);
	}
}
