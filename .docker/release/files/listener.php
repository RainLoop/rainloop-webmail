<?php
$stdIn = STDIN;
$stdOut = STDOUT;

fwrite($stdOut, "READY\n");

while(true) {
    if (false == $line = trim(fgets($stdIn))) {
        continue;
    }

    $match = null;
    if (preg_match('/eventname:(.*?) /', $line, $match)) {
        if (in_array($match[1], ['PROCESS_STATE_EXITED', 'PROCESS_STATE_STOPPED', 'PROCESS_STATE_FATAL'])) {
            exec('kill -15 '.file_get_contents('/run/supervisord.pid'));
        }
    }

    fwrite($stdOut, "RESULT 2\nOK");

    sleep(1);
    fwrite($stdOut, "READY\n");
}