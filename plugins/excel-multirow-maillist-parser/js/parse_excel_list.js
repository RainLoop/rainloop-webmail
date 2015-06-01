
$(function () {

	//selectors
	var inputs = '.popups .inputosaurus-input input[type="text"]:first, \
				.popups .cc-row input[type="text"]:first, \
				.popups .bcc-row input[type="text"]:first';

	//bind function
	$(document).on( 'keyup', inputs, function(){
		var t = $(this);
		var v = t.val();
		if( v != "" && v.match(/@/ig).length >= 2 ){
			t.val( t.val().replace(/\n| /ig,",") )
		}
	});

});