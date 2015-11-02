<?php

namespace SabreForRainLoop\CalDAV\Backend;

/**
 * Adds caldav notification support to a backend.
 *
 * Note: This feature is experimental, and may change in between different
 * SabreDAV versions.
 *
 * Notifications are defined at:
 * http://svn.calendarserver.org/repository/calendarserver/CalendarServer/trunk/doc/Extensions/caldav-notifications.txt
 *
 * These notifications are basically a list of server-generated notifications
 * displayed to the user. Users can dismiss notifications by deleting them.
 *
 * The primary usecase is to allow for calendar-sharing.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
interface NotificationSupport extends BackendInterface {

    /**
     * Returns a list of notifications for a given principal url.
     *
     * The returned array should only consist of implementations of
     * \SabreForRainLoop\CalDAV\Notifications\INotificationType.
     *
     * @param string $principalUri
     * @return array
     */
    public function getNotificationsForPrincipal($principalUri);

    /**
     * This deletes a specific notifcation.
     *
     * This may be called by a client once it deems a notification handled.
     *
     * @param string $principalUri
     * @param \SabreForRainLoop\CalDAV\Notifications\INotificationType $notification
     * @return void
     */
    public function deleteNotification($principalUri, \SabreForRainLoop\CalDAV\Notifications\INotificationType $notification);

}
