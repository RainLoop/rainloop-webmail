<?php

namespace Sabre\VObject;

use Sabre\Xml\LibXMLException;

/**
 * iCalendar/vCard/jCal/jCard/xCal/xCard reader object.
 *
 * This object provides a few (static) convenience methods to quickly access
 * the parsers.
 *
 * @copyright Copyright (C) fruux GmbH (https://fruux.com/)
 * @author Evert Pot (http://evertpot.com/)
 * @license http://sabre.io/license/ Modified BSD License
 */
class Reader
{
    /**
     * If this option is passed to the reader, it will be less strict about the
     * validity of the lines.
     */
    public const OPTION_FORGIVING = 1;

    /**
     * If this option is turned on, any lines we cannot parse will be ignored
     * by the reader.
     */
    public const OPTION_IGNORE_INVALID_LINES = 2;

    /**
     * Parses a vCard or iCalendar object, and returns the top component.
     *
     * The options argument is a bitfield. Pass any of the OPTIONS constant to
     * alter the parsers' behaviour.
     *
     * You can either supply a string, or a readable stream for input.
     *
     * @param string|resource $data
     *
     * @throws ParseException
     */
    public static function read($data, int $options = 0, string $charset = 'UTF-8'): ?Document
    {
        $parser = new Parser\MimeDir();
        $parser->setCharset($charset);

        return $parser->parse($data, $options);
    }

    /**
     * Parses a jCard or jCal object, and returns the top component.
     *
     * The options argument is a bitfield. Pass any of the OPTIONS constant to
     * alter the parsers' behaviour.
     *
     * You can either a string, a readable stream, or an array for its input.
     * Specifying the array is useful if json_decode was already called on the
     * input.
     *
     * @param string|resource|array $data
     *
     * @throws EofException
     * @throws ParseException|InvalidDataException
     */
    public static function readJson($data, int $options = 0): ?Document
    {
        $parser = new Parser\Json();

        return $parser->parse($data, $options);
    }

    /**
     * Parses a xCard or xCal object, and returns the top component.
     *
     * The options argument is a bitfield. Pass any of the OPTIONS constant to
     * alter the parsers' behaviour.
     *
     * You can either supply a string, or a readable stream for input.
     *
     * @param string|resource $data
     *
     * @throws EofException
     * @throws InvalidDataException
     * @throws ParseException
     * @throws LibXMLException
     */
    public static function readXML($data, int $options = 0): ?Document
    {
        $parser = new Parser\XML();

        return $parser->parse($data, $options);
    }
}
