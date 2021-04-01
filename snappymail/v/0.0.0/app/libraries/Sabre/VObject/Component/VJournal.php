<?php

namespace Sabre\VObject\Component;

use Sabre\VObject;

/**
 * VJournal component
 *
 * This component contains some additional functionality specific for VJOURNALs.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class VJournal extends VObject\Component {

    /**
     * Returns true or false depending on if the event falls in the specified
     * time-range. This is used for filtering purposes.
     *
     * The rules used to determine if an event falls within the specified
     * time-range is based on the CalDAV specification.
     *
     * @param DateTime $start
     * @param DateTime $end
     * @return bool
     */
    public function isInTimeRange(\DateTime $start, \DateTime $end) {

        $dtstart = isset($this->DTSTART)?$this->DTSTART->getDateTime():null;
        if ($dtstart) {
            $effectiveEnd = clone $dtstart;
            if (!$this->DTSTART->hasTime()) {
                $effectiveEnd->modify('+1 day');
            }

            return ($start <= $effectiveEnd && $end > $dtstart);

        }
        return false;


    }

}
