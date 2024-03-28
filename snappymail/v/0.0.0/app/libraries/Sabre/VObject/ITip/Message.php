<?php

namespace Sabre\VObject\ITip;

use Sabre\VObject\Component\VCalendar;

/**
 * This class represents an iTip message.
 *
 * A message holds all the information relevant to the message, including the
 * object itself.
 *
 * It should for the most part be treated as immutable.
 *
 * @copyright Copyright (C) fruux GmbH (https://fruux.com/)
 * @author Evert Pot (http://evertpot.com/)
 * @license http://sabre.io/license/ Modified BSD License
 */
class Message
{
    /**
     * The object's UID.
     */
    public string $uid;

    /**
     * The component type, such as VEVENT.
     */
    public string $component;

    /**
     * Contains the ITip method, which is something like REQUEST, REPLY or
     * CANCEL.
     */
    public ?string $method;

    /**
     * The current sequence number for the event.
     */
    public ?int $sequence;

    /**
     * The senders' email address.
     *
     * Note that this does not imply that this has to be used in a From: field
     * if the message is sent by email. It may also be populated in Reply-To:
     * or not at all.
     */
    public string $sender;

    /**
     * The name of the sender. This is often populated from a CN parameter from
     * either the ORGANIZER or ATTENDEE, depending on the message.
     */
    public ?string $senderName;

    /**
     * The recipient's email address.
     */
    public string $recipient;

    /**
     * The name of the recipient. This is usually populated with the CN
     * parameter from the ATTENDEE or ORGANIZER property, if it's available.
     */
    public ?string $recipientName;

    /**
     * After the message has been delivered, this should contain a string such
     * as : 1.1;Sent or 1.2;Delivered.
     *
     * In case of a failure, this will hold the error status code.
     *
     * See:
     * http://tools.ietf.org/html/rfc6638#section-7.3
     */
    public ?string $scheduleStatus = null;

    /**
     * The iCalendar / iTip body.
     */
    public VCalendar $message;

    /**
     * This will be set to true, if the iTip broker considers the change
     * 'significant'.
     *
     * In practice, this means that we'll only mark it true, if for instance
     * DTSTART changed. This allows systems to only send iTip messages when
     * significant changes happened. This is especially useful for iMip, as
     * normally a ton of messages may be generated for normal calendar use.
     *
     * To see the list of properties that are considered 'significant', check
     * out Sabre\VObject\ITip\Broker::$significantChangeProperties.
     */
    public bool $significantChange = true;

    /**
     * Returns the schedule status as a string.
     *
     * For example:
     * 1.2
     *
     * @return mixed bool|string
     */
    public function getScheduleStatus()
    {
        if (!$this->scheduleStatus) {
            return false;
        } else {
            list($scheduleStatus) = explode(';', $this->scheduleStatus);

            return $scheduleStatus;
        }
    }
}
