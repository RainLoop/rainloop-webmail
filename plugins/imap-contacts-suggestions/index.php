<?php

class ImapContactsSuggestionsPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'Contacts suggestions (IMAP folder)',
		VERSION = '1.2',
		RELEASE  = '2023-01-17',
		CATEGORY = 'Contacts',
		DESCRIPTION = 'Get contacts suggestions from IMAP INBOX folder.',
		REQUIRED = '2.24.6';

	public function Init() : void
	{
		$this->addHook('main.fabrica', 'MainFabrica');
	}

	public function Supported() : string
	{
		return '';
	}

	/**
	 * @param mixed $mResult
	 */
	public function MainFabrica(string $sName, &$mResult)
	{
		if ('suggestions' === $sName) {
			if (!\is_array($mResult)) {
				$mResult = array();
			}
//			$sFolder = \trim($this->Config()->Get('plugin', 'mailbox', 'INBOX'));
//			if ($sFolder) {
				include_once __DIR__ . '/ImapContactsSuggestions.php';
				$mResult[] = new ImapContactsSuggestions();
//			}
		}
	}
}
