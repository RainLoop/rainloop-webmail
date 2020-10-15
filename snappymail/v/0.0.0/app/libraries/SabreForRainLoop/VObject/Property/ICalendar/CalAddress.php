<?php

namespace SabreForRainLoop\VObject\Property\ICalendar;

use
    SabreForRainLoop\VObject\Property\Text;

/**
 * CalAddress property
 *
 * This object encodes CAL-ADDRESS values, as defined in rfc5545
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH. All rights reserved.
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class CalAddress extends Text {

    /**
     * In case this is a multi-value property. This string will be used as a
     * delimiter.
     *
     * @var string|null
     */
    public $delimiter = null;

    /**
     * Returns the type of value.
     *
     * This corresponds to the VALUE= parameter. Every property also has a
     * 'default' valueType.
     *
     * @return string
     */
    public function getValueType() {

        return 'CAL-ADDRESS';

    }

}
