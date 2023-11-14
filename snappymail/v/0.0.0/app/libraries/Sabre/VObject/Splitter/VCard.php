<?php

namespace Sabre\VObject\Splitter;

use Sabre\VObject;
use Sabre\VObject\Component;
use Sabre\VObject\Parser\MimeDir;

/**
 * Splitter.
 *
 * This class is responsible for splitting up VCard objects.
 *
 * It is assumed that the input stream contains 1 or more VCARD objects. This
 * class checks for BEGIN:VCARD and END:VCARD and parses each encountered
 * component individually.
 *
 * @copyright Copyright (C) fruux GmbH (https://fruux.com/)
 * @author Dominik Tobschall (http://tobschall.de/)
 * @author Armin Hackmann
 * @license http://sabre.io/license/ Modified BSD License
 */
class VCard implements SplitterInterface
{
    /**
     * File handle.
     *
     * @var resource
     */
    protected $input;

    /**
     * Persistent parser.
     */
    protected MimeDir $parser;

    /**
     * Constructor.
     *
     * The splitter should receive a readable file stream as its input.
     *
     * @param resource $input
     * @param int      $options parser options, see the OPTIONS constants
     */
    public function __construct($input, int $options = 0)
    {
        $this->input = $input;
        $this->parser = new MimeDir($input, $options);
    }

    /**
     * Every time getNext() is called, a new object will be parsed, until we
     * hit the end of the stream.
     *
     * When the end is reached, null will be returned.
     *
     * @throws VObject\ParseException
     */
    public function getNext(): ?Component
    {
        try {
            $object = $this->parser->parse();

            if (!$object instanceof VObject\Component\VCard) {
                throw new VObject\ParseException('The supplied input contained non-VCARD data.');
            }
        } catch (VObject\EofException $e) {
            return null;
        }

        return $object;
    }
}
