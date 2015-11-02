<?php

namespace SabreForRainLoop\CalDAV;

use SabreForRainLoop\DAV;
use SabreForRainLoop\DAVACL;

/**
 * The UserCalenders class contains all calendars associated to one user
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class UserCalendars implements DAV\IExtendedCollection, DAVACL\IACL {

    /**
     * CalDAV backend
     *
     * @var SabreForRainLoop\CalDAV\Backend\BackendInterface
     */
    protected $caldavBackend;

    /**
     * Principal information
     *
     * @var array
     */
    protected $principalInfo;

    /**
     * Constructor
     *
     * @param Backend\BackendInterface $caldavBackend
     * @param mixed $userUri
     */
    public function __construct(Backend\BackendInterface $caldavBackend, $principalInfo) {

        $this->caldavBackend = $caldavBackend;
        $this->principalInfo = $principalInfo;

    }

    /**
     * Returns the name of this object
     *
     * @return string
     */
    public function getName() {

        list(,$name) = DAV\URLUtil::splitPath($this->principalInfo['uri']);
        return $name;

    }

    /**
     * Updates the name of this object
     *
     * @param string $name
     * @return void
     */
    public function setName($name) {

        throw new DAV\Exception\Forbidden();

    }

    /**
     * Deletes this object
     *
     * @return void
     */
    public function delete() {

        throw new DAV\Exception\Forbidden();

    }

    /**
     * Returns the last modification date
     *
     * @return int
     */
    public function getLastModified() {

        return null;

    }

    /**
     * Creates a new file under this object.
     *
     * This is currently not allowed
     *
     * @param string $filename
     * @param resource $data
     * @return void
     */
    public function createFile($filename, $data=null) {

        throw new DAV\Exception\MethodNotAllowed('Creating new files in this collection is not supported');

    }

    /**
     * Creates a new directory under this object.
     *
     * This is currently not allowed.
     *
     * @param string $filename
     * @return void
     */
    public function createDirectory($filename) {

        throw new DAV\Exception\MethodNotAllowed('Creating new collections in this collection is not supported');

    }

    /**
     * Returns a single calendar, by name
     *
     * @param string $name
     * @todo needs optimizing
     * @return Calendar
     */
    public function getChild($name) {

        foreach($this->getChildren() as $child) {
            if ($name==$child->getName())
                return $child;

        }
        throw new DAV\Exception\NotFound('Calendar with name \'' . $name . '\' could not be found');

    }

    /**
     * Checks if a calendar exists.
     *
     * @param string $name
     * @todo needs optimizing
     * @return bool
     */
    public function childExists($name) {

        foreach($this->getChildren() as $child) {
            if ($name==$child->getName())
                return true;

        }
        return false;

    }

    /**
     * Returns a list of calendars
     *
     * @return array
     */
    public function getChildren() {

        $calendars = $this->caldavBackend->getCalendarsForUser($this->principalInfo['uri']);
        $objs = array();
        foreach($calendars as $calendar) {
            if ($this->caldavBackend instanceof Backend\SharingSupport) {
                if (isset($calendar['{http://calendarserver.org/ns/}shared-url'])) {
                    $objs[] = new SharedCalendar($this->caldavBackend, $calendar);
                } else {
                    $objs[] = new ShareableCalendar($this->caldavBackend, $calendar);
                }
            } else {
                $objs[] = new Calendar($this->caldavBackend, $calendar);
            }
        }
        $objs[] = new Schedule\Outbox($this->principalInfo['uri']);

        // We're adding a notifications node, if it's supported by the backend.
        if ($this->caldavBackend instanceof Backend\NotificationSupport) {
            $objs[] = new Notifications\Collection($this->caldavBackend, $this->principalInfo['uri']);
        }
        return $objs;

    }

    /**
     * Creates a new calendar
     *
     * @param string $name
     * @param array $resourceType
     * @param array $properties
     * @return void
     */
    public function createExtendedCollection($name, array $resourceType, array $properties) {

        $isCalendar = false;
        foreach($resourceType as $rt) {
            switch ($rt) {
                case '{DAV:}collection' :
                case '{http://calendarserver.org/ns/}shared-owner' :
                    // ignore
                    break;
                case '{urn:ietf:params:xml:ns:caldav}calendar' :
                    $isCalendar = true;
                    break;
                default :
                    throw new DAV\Exception\InvalidResourceType('Unknown resourceType: ' . $rt);
            }
        }
        if (!$isCalendar) {
            throw new DAV\Exception\InvalidResourceType('You can only create calendars in this collection');
        }
        $this->caldavBackend->createCalendar($this->principalInfo['uri'], $name, $properties);

    }

    /**
     * Returns the owner principal
     *
     * This must be a url to a principal, or null if there's no owner
     *
     * @return string|null
     */
    public function getOwner() {

        return $this->principalInfo['uri'];

    }

    /**
     * Returns a group principal
     *
     * This must be a url to a principal, or null if there's no owner
     *
     * @return string|null
     */
    public function getGroup() {

        return null;

    }

    /**
     * Returns a list of ACE's for this node.
     *
     * Each ACE has the following properties:
     *   * 'privilege', a string such as {DAV:}read or {DAV:}write. These are
     *     currently the only supported privileges
     *   * 'principal', a url to the principal who owns the node
     *   * 'protected' (optional), indicating that this ACE is not allowed to
     *      be updated.
     *
     * @return array
     */
    public function getACL() {

        return array(
            array(
                'privilege' => '{DAV:}read',
                'principal' => $this->principalInfo['uri'],
                'protected' => true,
            ),
            array(
                'privilege' => '{DAV:}write',
                'principal' => $this->principalInfo['uri'],
                'protected' => true,
            ),
            array(
                'privilege' => '{DAV:}read',
                'principal' => $this->principalInfo['uri'] . '/calendar-proxy-write',
                'protected' => true,
            ),
            array(
                'privilege' => '{DAV:}write',
                'principal' => $this->principalInfo['uri'] . '/calendar-proxy-write',
                'protected' => true,
            ),
            array(
                'privilege' => '{DAV:}read',
                'principal' => $this->principalInfo['uri'] . '/calendar-proxy-read',
                'protected' => true,
            ),

        );

    }

    /**
     * Updates the ACL
     *
     * This method will receive a list of new ACE's.
     *
     * @param array $acl
     * @return void
     */
    public function setACL(array $acl) {

        throw new DAV\Exception\MethodNotAllowed('Changing ACL is not yet supported');

    }

    /**
     * Returns the list of supported privileges for this node.
     *
     * The returned data structure is a list of nested privileges.
     * See SabreForRainLoop\DAVACL\Plugin::getDefaultSupportedPrivilegeSet for a simple
     * standard structure.
     *
     * If null is returned from this method, the default privilege set is used,
     * which is fine for most common usecases.
     *
     * @return array|null
     */
    public function getSupportedPrivilegeSet() {

        return null;

    }

    /**
     * This method is called when a user replied to a request to share.
     *
     * This method should return the url of the newly created calendar if the
     * share was accepted.
     *
     * @param string href The sharee who is replying (often a mailto: address)
     * @param int status One of the SharingPlugin::STATUS_* constants
     * @param string $calendarUri The url to the calendar thats being shared
     * @param string $inReplyTo The unique id this message is a response to
     * @param string $summary A description of the reply
     * @return null|string
     */
    public function shareReply($href, $status, $calendarUri, $inReplyTo, $summary = null) {

        if (!$this->caldavBackend instanceof Backend\SharingSupport) {
            throw new DAV\Exception\NotImplemented('Sharing support is not implemented by this backend.');
        }

        return $this->caldavBackend->shareReply($href, $status, $calendarUri, $inReplyTo, $summary);

    }

}
