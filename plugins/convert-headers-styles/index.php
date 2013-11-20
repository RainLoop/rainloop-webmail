<?php

class ConvertHeadersStylesPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	public function Init()
	{
		$this->addHook('filter.result-message', 'FilterResultMessage');
	}

	/**
	 * @param \MailSo\Mail\Message &$oMessage
	 */
	public function FilterResultMessage(&$oMessage)
	{
		if ($oMessage)
		{
			$sHtml = $oMessage->Html();
			if ($sHtml && 0 < strlen($sHtml))
			{
				include_once __DIR__.'/CssToInlineStyles.php';
				
				$oCSSToInlineStyles = new \TijsVerkoyen\CssToInlineStyles\CssToInlineStyles($sHtml);
				$oCSSToInlineStyles->setEncoding('utf-8');
				$oCSSToInlineStyles->setUseInlineStylesBlock(true);
				$oMessage->SetHtml($oCSSToInlineStyles->convert().'<!-- convert-headers-styles-plugin -->');
			}
		}
	}
}
