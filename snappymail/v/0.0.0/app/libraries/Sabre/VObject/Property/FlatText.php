<?php

namespace Sabre\VObject\Property;

use Sabre\VObject\InvalidDataException;

/**
 * FlatText property.
 *
 * This object represents certain TEXT values.
 *
 * Specifically, this property is used for text values where there is only 1
 * part. Semicolons and colons will be de-escaped when deserializing, but if
 * any semicolons or commas appear without a backslash, we will not assume
 * that they are delimiters.
 *
 * vCard 2.1 specifically has a bunch of properties where this may
 * happen, as it only defines a delimiter for a few properties.
 *
 * vCard 4.0 states something similar. An unescaped semicolon _may_ be a
 * delimiter, depending on the property.
 *
 * @copyright Copyright (C) fruux GmbH (https://fruux.com/)
 * @author Evert Pot (http://evertpot.com/)
 * @license http://sabre.io/license/ Modified BSD License
 */
class FlatText extends Text
{
    /**
     * Field separator.
     */
    public string $delimiter = ',';

    /**
     * Sets the value as a quoted-printable encoded string.
     *
     * Overriding this so that we're not splitting on a semicolon delimiter.
     *
     * @throws InvalidDataException
     */
    public function setQuotedPrintableValue(string $val): void
    {
        $val = quoted_printable_decode($val);
        $this->setValue($val);
    }
}
