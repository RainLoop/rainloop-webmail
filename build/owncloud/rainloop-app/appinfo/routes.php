<?php

$this->create('rainloop_index', '/')
    ->actionInclude('rainloop/index.php');

$this->create('rainloop_app', '/app/')
    ->actionInclude('rainloop/app.php');

$this->create('rainloop_ajax_personal', 'ajax/personal.php')
    ->actionInclude('rainloop/ajax/personal.php');

$this->create('rainloop_ajax_admin', 'ajax/admin.php')
    ->actionInclude('rainloop/ajax/admin.php');
