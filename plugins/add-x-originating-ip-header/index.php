<?php

class AddXOriginatingIpHeaderPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'X-Originating-IP',
		VERSION = '2.0',
		DESCRIPTION = 'Adds X-Originating-IP header to outgoing message, containing sender\'s IP address.';

	public function Init() : void
	{
		$this->addHook('filter.build-message', 'FilterBuildMessage');
	}

	/**
	 * @param \MailSo\Mime\Message $oMessage
	 */
	public function FilterBuildMessage(&$oMessage)
	{
		if ($oMessage instanceof \MailSo\Mime\Message)
		{
			$sIP = $this->Manager()->Actions()->Http()->GetClientIp(
				!!$this->Config()->Get('plugin', 'check_proxy', false));

			$oMessage->SetCustomHeader(
				\MailSo\Mime\Enumerations\Header::X_ORIGINATING_IP,
				$this->Manager()->Actions()->Http()->IsLocalhost($sIP) ? '127.0.0.1' : $sIP
			);
		}
	}

	/**
	 * @return array
	 */
	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('check_proxy')
				->SetLabel('Сheck User Proxy')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDescription('Enable, if you need to check proxy header')
				->SetDefaultValue(false)
		);
	}
}
