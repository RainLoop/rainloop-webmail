
(function(window, $) {

	$(function() {

		$(window.document).on('keyup', '.b-compose .b-header .inputosaurus-input input[type="text"]:first', function() {

			var
				$this = $(this),
				value = $this.val()
			;

			if (value && value.match(/@/ig).length >= 2)
			{
				$this.val($this.val().replace(/\n| /ig, ','));
			}

		});

	});

}(window, $))