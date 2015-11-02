<?php

namespace SabreForRainLoop\VObject;

/**
 * Exception thrown by parser when the end of the stream has been reached,
 * before this was expected.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class EofException extends ParseException { }
