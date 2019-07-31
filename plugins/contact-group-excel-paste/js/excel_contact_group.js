(function(window, $) {
  $(function() {
    function replaceGroup() {
      $('li[data-inputosaurus][title*=","]').each(function (index, elem) {
        var $elem = $(elem)
        var title = $elem.attr('title')
        var cut = title.indexOf('<')
        title = title.substr(cut + 1, title.length - cut - 2)
        $elem.parents('ul').find('.ui-autocomplete-input').val(title)
        $('.ui-autocomplete-input').trigger('blur')
      })
      setTimeout(function () {
        $('li[data-inputosaurus][title*=","]').find('a').trigger('click')
      })
    }

  	$('body').on('click', '.ui-autocomplete a', function () {
      replaceGroup()
    })

    $(document).on('keydown', function (e) {
      if (e.which === 13) {
        setTimeout(function () {
          replaceGroup()
        })
      }
    })
  })
}(window, $))
