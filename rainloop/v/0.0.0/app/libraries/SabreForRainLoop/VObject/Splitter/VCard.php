<?php

namespace SabreForRainLoop\VObject\Splitter;

use
    SabreForRainLoop\VObject,
    SabreForRainLoop\VObject\Parser\MimeDir;

/**
 * Splitter
 *
 * This class is responsible for splitting up VCard objects.
 *
 * It is assumed that the input stream contains 1 or more VCARD objects. This
 * class checks for BEGIN:VCARD and END:VCARD and parses each encountered
 * component individually.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Dominik Tobschall
 * @author Armin Hackmann
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class VCard implements SplitterInterface {

    /**
     * File handle
     *
     * @var resource
     */
    protected $input;

    /**
     * Persistent parser
     *
     * @var MimeDir
     */
    protected $parser;

    /**
     * Constructor
     *
     * The splitter should receive an readable file stream as it's input.
     *
     * @param resource $input
     * @param int $options Parser options, see the OPTIONS constants.
     */
    public function __construct($input, $options = 0) {

        $this->input = $input;
        $this->parser = new MimeDir($input, $options);

    }

    /**
     * Every time getNext() is called, a new object will be parsed, until we
     * hit the end of the stream.
     *
     * When the end is reached, null will be returned.
     *
     * @return SabreForRainLoop\VObject\Component|null
     */
    public function getNext() {

        try {
            $object = $this->parser->parse();
        } catch (VObject\EofException $e) {
            return null;
        }

        return $object;

    }

}
