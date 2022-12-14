<?php

declare(strict_types=1);

namespace OCA\SnappyMail\Search;

use OCA\SnappyMail\AppInfo\Application;
use OCA\SnappyMail\Util\SnappyMailHelper;
use OCP\IDateTimeFormatter;
use OCP\IL10N;
use OCP\IURLGenerator;
use OCP\IUser;
use OCP\Search\IProvider;
use OCP\Search\ISearchQuery;
use OCP\Search\SearchResult;
use OCP\Search\SearchResultEntry;

/**
 * https://docs.nextcloud.com/server/latest/developer_manual/digging_deeper/search.html#search-providers
 */
class Provider implements IProvider
{
	/** @var IL10N */
	private $l10n;

	/** @var IURLGenerator */
	private $urlGenerator;

	public function __construct(IL10N $l10n, IURLGenerator $urlGenerator)
	{
		$this->l10n = $l10n;
		$this->urlGenerator = $urlGenerator;
	}

	public function getId(): string
	{
		return Application::APP_ID;
	}

	public function getName(): string
	{
		return 'SnappyMail';
//		return $this->l10n->t('Mails');
	}

	public function getOrder(string $route, array $routeParameters): int
	{
		if (0 === \strpos($route, Application::APP_ID . '.')) {
			// Active app, prefer Mail results
			return -1;
		}
		return 20;
	}

	public function search(IUser $user, ISearchQuery $query): SearchResult
	{
		$result = [];
		if (2 > \strlen(\trim($query->getTerm()))) {
			return SearchResult::complete($this->getName(), $result);
		}
		SnappyMailHelper::startApp();
		$oActions = \RainLoop\Api::Actions();
//		$oAccount = $oActions->getMainAccountFromToken(false); // Issue: when account switched, wrong email is shown
		$oAccount = $oActions->getAccountFromToken(false);
		$iCursor = (int) $query->getCursor();
		$iLimit = $query->getLimit();
		if ($oAccount) {
			$oConfig = $oActions->Config();

			$oParams = new \MailSo\Mail\MessageListParams;
			$oParams->sFolderName = 'INBOX'; // or \All ?
			$oParams->sSearch = $query->getTerm();
			$oParams->oCacher = ($oConfig->Get('cache', 'enable', true) && $oConfig->Get('cache', 'server_uids', false))
				? $oActions->Cacher($oAccount) : null;
			$oParams->bUseSortIfSupported = !!$oConfig->Get('labs', 'use_imap_sort', true);
//			$oParams->bUseThreads = $oConfig->Get('labs', 'use_imap_thread', false);
//			$oParams->bHideDeleted = false;
//			$oParams->sSort = (string) $aValues['Sort'];
//				ISearchQuery::SORT_DATE_DESC == $query->getSortOrder(): int;
			$oParams->iOffset = $iCursor;
			$oParams->iLimit = $iLimit;
//			$oParams->iPrevUidNext = 0, // used to check for new messages
//			$oParams->iThreadUid = 0;

			$oMailClient = $oActions->MailClient();
			if (!$oMailClient->IsLoggined()) {
				$oAccount->ImapConnectAndLoginHelper($oActions->Plugins(), $oMailClient->ImapClient(), $oConfig);
			}

			// instanceof \MailSo\Mail\MessageCollection
			$MessageCollection = $oMailClient->MessageList($oParams);

			$baseURL = $this->urlGenerator->linkToRoute('snappymail.page.index');
			$config = \OC::$server->getConfig();
			if ($config->getAppValue('snappymail', 'snappymail-no-embed')) {
				$baseURL .= '?target=';
			} else {
				$baseURL .= '#';
			}
			$search = \rawurlencode($oParams->sSearch);

//			$MessageCollection->MessageResultCount;
			foreach ($MessageCollection as $Message) {
				// $Message instanceof \MailSo\Mail\Message
				$result[] = new SearchResultEntry(
					// thumbnailUrl
					'',
					// title
					$Message->Subject(),
					// subline
					$Message->From()->ToString(),
					// resourceUrl /index.php/apps/snappymail/#/mailbox/INBOX/p2/text=an&unseen
					$baseURL . '/mailbox/INBOX/m' . $Message->Uid() . '/' . $search,
					// icon
					'icon-mail',
					// rounded
					false
				);
			}
		} else {
			\error_log('SnappyMail not logged in to use unified search');
		}

		if ($iLimit > \count($result)) {
			return SearchResult::complete($this->getName(), $result);
		}
		return SearchResult::paginated($this->getName(), $result, $iCursor + $iLimit);
	}
}
