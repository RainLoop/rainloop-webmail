<?php

namespace OCA\SnappyMail\Dashboard;

use OCA\SnappyMail\Util\SnappyMailHelper;

use OCP\AppFramework\Services\IInitialState;
use OCP\Dashboard\IAPIWidget;
use OCP\Dashboard\IIconWidget;
use OCP\Dashboard\IOptionWidget;
use OCP\Dashboard\Model\WidgetItem;
use OCP\Dashboard\Model\WidgetOptions;
use OCP\IL10N;
use OCP\IURLGenerator;

class UnreadMailWidget implements IAPIWidget, IIconWidget/*, IOptionWidget*/
{
	protected IL10N $l10n;
	protected IURLGenerator $urlGenerator;
	protected IInitialState $initialState;

	public function __construct(IL10N $l10n, IURLGenerator $urlGenerator, IInitialState $initialState)
	{
		$this->l10n = $l10n;
		$this->urlGenerator = $urlGenerator;
		$this->initialState = $initialState;
	}

	// IWidget

	/**
	 * @return string Unique id that identifies the widget, e.g. the app id
	 * @since 20.0.0
	 */
	public function getId(): string
	{
		return 'snappymail-unread';
	}

	/**
	 * @return string User facing title of the widget
	 * @since 20.0.0
	 */
	public function getTitle(): string
	{
		return $this->l10n->t('Unread mail');
	}

	/**
	 * @return int Initial order for widget sorting
	 * @since 20.0.0
	 */
	public function getOrder(): int
	{
		return 3;
	}

	/**
	 * @return string css class that displays an icon next to the widget title
	 * @since 20.0.0
	 */
	public function getIconClass(): string
	{
		return 'icon-mail';
	}

	/**
	 * @return string|null The absolute url to the apps own view
	 * @since 20.0.0
	 */
	public function getUrl(): ?string
	{
		return $this->urlGenerator->getAbsoluteURL($this->urlGenerator->linkToRoute('snappymail.page.index'));
	}

	/**
	 * Execute widget bootstrap code like loading scripts and providing initial state
	 * @since 20.0.0
	 */
	public function load(): void
	{
//		SnappyMailHelper::loadApp();
	}

	// IAPIWidget

	/**
	 * @return \OCP\Dashboard\Model\WidgetItem[] The widget items
	 * @since 22.0.0
	 */
	public function getItems(string $userId, ?string $since = null, int $limit = 7): array
	{
		$result = [];
		SnappyMailHelper::startApp();
		$oActions = \RainLoop\Api::Actions();
//		$oAccount = $oActions->getMainAccountFromToken(false); // Issue: when account switched, wrong email is shown
		$oAccount = $oActions->getAccountFromToken(false);
		if ($oAccount) {
			$oConfig = $oActions->Config();

			$oParams = new \MailSo\Mail\MessageListParams;
			$oParams->sFolderName = 'INBOX'; // or \All ?
			$oParams->sSearch = 'unseen';
			$oParams->oCacher = ($oConfig->Get('cache', 'enable', true) && $oConfig->Get('cache', 'server_uids', false))
				? $oActions->Cacher($oAccount) : null;
			$oParams->bUseSortIfSupported = !!$oConfig->Get('labs', 'use_imap_sort', true);
//			$oParams->sSort = 'DATE DESC';
			$oParams->iLimit = $iLimit;

			$oMailClient = $oActions->MailClient();
			if (!$oMailClient->IsLoggined()) {
				$oAccount->ImapConnectAndLogin($oActions->Plugins(), $oMailClient->ImapClient(), $oConfig);
			}

			// instanceof \MailSo\Mail\MessageCollection
			$MessageCollection = $oMailClient->MessageList($oParams);

			$baseURL = $this->urlGenerator->linkToRoute('snappymail.page.index') . '#';

			foreach ($MessageCollection as $Message) {
				$result[] = new WidgetItem(
					// title
					$Message->From()->ToString(),
					// subtitle
					$Message->Subject(),
					// link
					$baseURL . '/mailbox/INBOX/m' . $Message->Uid(),
					// iconUrl use the avatar?
					'',
					// sinceId
					$Message->ETag('')
				);
			}
		}

		return $result;
	}

	// IIconWidget

	/**
	 * Get the absolute url for the widget icon
	 *
	 * @return string
	 * @since 25.0.0
	 */
	public function getIconUrl(): string
	{
		SnappyMailHelper::loadApp();
//		return $this->urlGenerator->getAbsoluteURL(
		return \RainLoop\Utils::WebStaticPath('images/snappymail-logo.png');
	}

	// IOptionWidget

	/**
	 * Get additional options for the widget
	 * @since 25.0.0
	 */
	public function getWidgetOptions(): WidgetOptions
	{
		return new WidgetOptions(true);
	}
}
