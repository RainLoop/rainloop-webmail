<?php

declare(strict_types=1);

namespace OCA\SnappyMail\Search;

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
	public function getId(): string
	{
		return Application::APP_ID;
	}

	public function getName(): string
	{
		return $this->l10n->t('Mails');
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
		/**
		 * TODO
		 * And use \MailSo\Imap\SearchCriterias
		 */

		return SearchResult::complete(
			$this->getName(),
			[
/*
				new SearchResultEntry(
					// thumbnailUrl
					'',
					// title
					\MailSo\Mail\Message->sSubject,
					// subline
					\MailSo\Mail\Message->oFrom->ToString(),
					// resourceUrl
					$this->urlGenerator->linkToRouteAbsolute(),
					// icon
					'icon-mail',
					// rounded
					false
				),
*/
			]
		);
	}
}
