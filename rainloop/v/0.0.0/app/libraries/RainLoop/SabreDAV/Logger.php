<?php

namespace RainLoop\SabreDAV;

class Logger extends \Sabre\DAV\ServerPlugin
{
	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger;

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 */
    public function __construct($oLogger)
    {
		$this->oLogger = null;
		if ($oLogger instanceof \MailSo\Log\Logger)
		{
			$this->oLogger = $oLogger;
		}
    }

	public function initialize(\Sabre\DAV\Server $server)
	{
		$this->server = $server;
		$this->server->subscribeEvent('beforeMethod', array($this, 'beforeMethod'), 30);
	}

    /**
     * Returns a plugin name.
     *
     * Using this name other plugins will be able to access other plugins
     * using \Sabre\DAV\Server::getPlugin
     *
     * @return string
     */
    public function getPluginName()
    {
        return 'logger';
    }

    /**
     * This method is called before any HTTP method, but after authentication.
     *
     * @param string $sMethod
     * @param string $sPath
     * @throws \Sabre\DAV\Exception\NotAuthenticated
     * @return bool
     */
    public function beforeMethod($sMethod, $sPath)
    {
		if ($this->oLogger)
		{
			if (true)
			{
				$body = $this->server->httpRequest->getBody(true);
				$this->server->httpRequest->setBody($body);
				$this->oLogger->Write($body, \MailSo\Log\Enumerations\Type::INFO, 'DAV');
			}
		}

    	return true;
    }
}
