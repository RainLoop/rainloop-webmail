(function(window, $) {
  $(function() {
  	$(window.document).on('paste', '.RL-PopupsContacts .contactValueInput', function() {
      // trigger the process on click and paste
      var $this = $(this);

      setTimeout(function () {
        $this.trigger('keyup');
      });
    }).on('keyup', '.RL-PopupsContacts .contactValueInput', function() {
      var $this = $(this),
  			value = $this.val(),
        match = value && value.match(/@/ig);

  		if (match && match.length > 1) {
  			$this.val($this.val().replace(/\n| /ig, ','));
  		}
  	});
  });
}(window, $));
