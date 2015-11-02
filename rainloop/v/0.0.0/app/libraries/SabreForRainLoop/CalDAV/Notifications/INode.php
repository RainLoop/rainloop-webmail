<?php

namespace SabreForRainLoop\CalDAV\Notifications;

/**
 * This node represents a single notification.
 *
 * The signature is mostly identical to that of SabreForRainLoop\DAV\IFile, but the get() method
 * MUST return an xml document that matches the requirements of the
 * 'caldav-notifications.txt' spec.
 *
 * For a complete example, check out the Notification class, which contains
 * some helper functions.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
interface INode {

    /**
     * This method must return an xml element, using the
     * SabreForRainLoop\CalDAV\Notifications\INotificationType classes.
     *
     * @return INotificationType
     */
    function getNotificationType();

    /**
     * Returns the etag for the notification.
     *
     * The etag must be surrounded by litteral double-quotes.
     *
     * @return string
     */
    function getETag();

}
