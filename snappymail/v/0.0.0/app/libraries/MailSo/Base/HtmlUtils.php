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
	/**
	 * Used by DoSaveMessage() and DoSendMessage()
	 */
	public static function BuildHtml(string $sHtml, array &$aFoundCids, array &$aFoundDataURL, array &$aFoundContentLocationUrls) : string
	{
		$bState = true;
		if (\MailSo\Base\Utils::FunctionCallable('libxml_use_internal_errors'))
		{
			$bState = \libxml_use_internal_errors(true);
		}

		$sHtml = \str_replace('<o:p></o:p>', '', $sHtml);
		$sHtml = \str_replace('<o:p>', '<span>', $sHtml);
		$sHtml = \str_replace('</o:p>', '</span>', $sHtml);
/*
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
			$sHtml = \tidy_repair_string($sHtml, $tidyConfig, 'utf8');
		}
*/
		$sHtml = \preg_replace(array(
			'/<p[^>]*><\/p>/i',
			'/<!doctype[^>]*>/i',
			'/<\?xml [^>]*\?>/i'
		), '', $sHtml);

		$sHtmlAttrs = '';
		$aMatch = array();
		if (\preg_match('/<html([^>]+)>/im', $sHtml, $aMatch) && !empty($aMatch[1])) {
			$sHtmlAttrs = $aMatch[1];
		}

		$sBodyAttrs = '';
		$aMatch = array();
		if (\preg_match('/<body([^>]+)>/im', $sHtml, $aMatch) && !empty($aMatch[1])) {
			$sBodyAttrs = $aMatch[1];
		}

		$sHtml = \preg_replace('/<\/?(head|body|html)(\\s[^>]*)?>/si', '', $sHtml);

		$sHtmlAttrs = \preg_replace('/xmlns:[a-z]="[^"]*"/i', '', $sHtmlAttrs);
		$sHtmlAttrs = \preg_replace('/xmlns:[a-z]=\'[^\']*\'/i', '', $sHtmlAttrs);
		$sHtmlAttrs = \preg_replace('/xmlns="[^"]*"/i', '', $sHtmlAttrs);
		$sHtmlAttrs = \preg_replace('/xmlns=\'[^\']*\'/i', '', $sHtmlAttrs);

		$sBodyAttrs = \preg_replace('/xmlns:[a-z]="[^"]*"/i', '', $sBodyAttrs);
		$sBodyAttrs = \preg_replace('/xmlns:[a-z]=\'[^\']*\'/i', '', $sBodyAttrs);

		$oDoc = new \DOMDocument('1.0', 'UTF-8');
		$oDoc->encoding = 'UTF-8';
		$oDoc->strictErrorChecking = false;
		$oDoc->formatOutput = false;
		$oDoc->preserveWhiteSpace = false;

		@$oDoc->loadHTML('<?xml version="1.0" encoding="utf-8"?>'.
			'<html '.\trim($sHtmlAttrs).'><head>'.
			'<meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head>'.
			'<body '.\trim($sBodyAttrs).'>'.\MailSo\Base\Utils::Utf8Clear($sHtml).'</body></html>');

		$oDoc->normalizeDocument();

		if (\MailSo\Base\Utils::FunctionCallable('libxml_clear_errors'))
		{
			\libxml_clear_errors();
		}

		if (\MailSo\Base\Utils::FunctionCallable('libxml_use_internal_errors'))
		{
			\libxml_use_internal_errors($bState);
		}

		$sHtml = '';
		$oBody = $oDoc->getElementsByTagName('body')->item(0);

		$aRemoveTags = array(
			'svg', 'link', 'base', 'meta', 'title', 'x-script', 'script', 'bgsound', 'keygen', 'source',
			'object', 'embed', 'applet', 'mocha', 'iframe', 'frame', 'frameset', 'video', 'audio', 'area', 'map',
			'head', 'style'
		);

		$aRemove = array();

		$sIdRight = \md5(\microtime());

		$aNodes = $oBody->getElementsByTagName('*');
		foreach ($aNodes as /* @var $oElement \DOMElement */ $oElement)
		{
			$sTagNameLower = \strtolower($oElement->nodeName);

			if (\in_array($sTagNameLower, $aRemoveTags))
			{
				$aRemove[] = $oElement;
				continue;
			}

			// images
			if ($oElement->hasAttribute('data-x-src-broken') || $oElement->hasAttribute('data-x-src-hidden')) {
				$aRemove[] = $oElement;
				continue;
			}
			if ($oElement->hasAttribute('data-x-src-cid')) {
				$sCid = $oElement->getAttribute('data-x-src-cid');
				$oElement->removeAttribute('data-x-src-cid');
				if (!empty($sCid)) {
					$aFoundCids[] = $sCid;
					$oElement->setAttribute('src', 'cid:'.$sCid);
				}
			}
			if ($oElement->hasAttribute('data-x-src')) {
				$oElement->setAttribute('src', $oElement->getAttribute('data-x-src'));
				$oElement->removeAttribute('data-x-src');
			}

			// style attribute images
			$aCid = array();
			if ($oElement->hasAttribute('data-x-style-url')) {
				$aCid = \array_merge($aCid, \json_decode($oElement->getAttribute('data-x-style-url'), true));
				$oElement->removeAttribute('data-x-style-url');
			}
			if ($aCid) {
				foreach ($aCid as $sCidName => $sCid) {
					$sCidName = \strtolower(\preg_replace('/([A-Z])/', '-\1', $sCidName));
					if (\in_array($sCidName, array('background-image', 'list-style-image', 'content')))
					{
						$sStyles = $oElement->hasAttribute('style')
							? \trim(\trim($oElement->getAttribute('style')), ';')
							: '';

						$sBack = $sCidName.':url(cid:'.$sCid.')';
						$sStyles = \preg_replace('/'.\preg_quote($sCidName).'\\s*:\\s*[^;]+/i', $sBack, $sStyles);
						if (false === \strpos($sStyles, $sBack))
						{
							$sStyles .= ";{$sBack}";
						}

						$oElement->setAttribute('style', \trim($sStyles, ';'));
						$aFoundCids[] = $sCid;
					}
				}
			}

			// Remove all remaining data-* attributes
			if ($oElement->hasAttributes()) {
				foreach ($oElement->attributes as $oAttr) {
					if ('data-' === \substr(\strtolower($oAttr->nodeName), 0, 5))
					{
						$oElement->removeAttribute($oAttr->nodeName);
					}
				}
			}

			if ('img' === $sTagNameLower)
			{
				$sSrc = $oElement->getAttribute('src');
				if ('data:image/' === \strtolower(\substr($sSrc, 0, 11)))
				{
					$sHash = \md5($sSrc) . '@' . $sIdRight;
					$aFoundDataURL[$sHash] = $sSrc;

					$oElement->setAttribute('src', 'cid:'.$sHash);
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

		return '<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head>'
			. $oDoc->saveHTML($oBody) . '</html>';
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
