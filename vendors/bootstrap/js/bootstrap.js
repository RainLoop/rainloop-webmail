/* ============================================================
 * bootstrap-dropdown.js v2.3.2
 * bootstrap-modal.js v2.3.2
 * bootstrap-tab.js v2.3.2
 * http://getbootstrap.com/2.3.2/javascript.html
 * ============================================================
 * Copyright 2013 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */

($ => {

  "use strict"; // jshint ;_;

  const doc = document;

 /* DROPDOWN CLASS DEFINITION
  * ========================= */

  var toggle = '[data-toggle=dropdown]';

  class Dropdown {

    constructor (element) {
      var $el = $(element).on('click.dropdown.data-api', this.toggle)
      $('html').on('click.dropdown.data-api', () => $el.parent().removeClass('open'))
    }

    toggle () {
      var $this = $(this)
        , $parent
        , isActive

      if ($this.is('.disabled, :disabled')) return

      $parent = getParent($this)

      isActive = $parent.hasClass('open')

      clearMenus()

      if (!isActive) {
        if ('ontouchstart' in doc.documentElement) {
          // if mobile we we use a backdrop because click events don't delegate
          $('<div class="dropdown-backdrop"/>').insertBefore($(this)).on('click', clearMenus)
        }
        $parent.toggleClass('open')
      }

      $this.focus();

      return false
    }

    keydown (e) {
      var $this
        , $items
        , $parent
        , isActive
        , index

      if (!/(38|40|27)/.test(e.keyCode)) return

      $this = $(this)

      e.preventDefault()
      e.stopPropagation()

      if ($this.is('.disabled, :disabled')) return

      $parent = getParent($this)

      isActive = $parent.hasClass('open')

      if (!isActive || (isActive && e.keyCode == 27)) {
        if (e.which == 27) $parent.find(toggle).focus()
        return $this.click()
      }

      $items = $('[role=menu] li:not(.divider):visible a', $parent)

      if ($items.length) {

        index = $items.index($items.filter(':focus'))

        if (e.keyCode == 38 && index > 0) index--                                        // up
        if (e.keyCode == 40 && index < $items.length - 1) index++                        // down
        if (!~index) index = 0

        $items
          .eq(index)
          .focus()
	  }
    }

  }

  function clearMenus() {
    $('.dropdown-backdrop').remove()
    $(toggle).each(function () {
      getParent($(this)).removeClass('open')
    })
  }

  function getParent($this) {
    var selector = $this.attr('data-target')
      , $parent

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && /#/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
    }

    $parent = selector && 1 < selector.length && $(selector)

    if (!$parent || !$parent.length) $parent = $this.parent()

    return $parent
  }


  /* DROPDOWN PLUGIN DEFINITION
   * ========================== */

  $.fn.dropdown = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('dropdown')
      if (!data) $this.data('dropdown', (data = new Dropdown(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  /* APPLY TO STANDARD DROPDOWN ELEMENTS
   * =================================== */

  $(doc)
    .on('click.dropdown.data-api', clearMenus)
    .on('click.dropdown.data-api', '.dropdown form', e => e.stopPropagation())
    .on('click.dropdown.data-api'  , toggle, Dropdown.prototype.toggle)
    .on('keydown.dropdown.data-api', toggle + ', [role=menu]' , Dropdown.prototype.keydown)


 /* MODAL CLASS DEFINITION
  * ====================== */

  class Modal {

    constructor (element, options) {
      this.options = options
      this.$element = $(element)
        .on('click.dismiss.modal', '[data-dismiss="modal"]', this.hide.bind(this))
      this.options.remote && this.$element.find('.modal-body').on('load', this.options.remote)
    }

    toggle () {
      return this[!this.isShown ? 'show' : 'hide']()
    }

    show () {
      var that = this
        , e = $.Event('show')

      this.$element.trigger(e)

      if (this.isShown || e.isDefaultPrevented()) return

      this.isShown = true

      this.escape()

      this.backdrop(() => {
        var transition = that.$element.hasClass('fade')

        if (!that.$element.parent().length) {
          that.$element.appendTo(doc.body) //don't move modals dom position
        }

        that.$element.show()

        if (transition) {
          that.$element[0].offsetWidth // force reflow
        }

        that.$element
          .addClass('in')
          .attr('aria-hidden', false)

        that.enforceFocus()

        transition ?
          that.$element.one('transitionend', () => that.$element.focus().trigger('shown')) :
          that.$element.focus().trigger('shown')

      })
    }

    hide (e) {
      e && e.preventDefault()

      e = $.Event('hide')

      this.$element.trigger(e)

      if (!this.isShown || e.isDefaultPrevented()) return

      this.isShown = false

      this.escape()

      $(doc).off('focusin.modal')

      this.$element
        .removeClass('in')
        .attr('aria-hidden', true)

      this.$element.hasClass('fade') ?
        this.hideWithTransition() :
        this.hideModal()
    }

    enforceFocus () {
      var that = this
      $(doc).on('focusin.modal', e => {
        if (that.$element[0] !== e.target && !that.$element.has(e.target).length) {
          that.$element.focus()
        }
      })
    }

    escape () {
      var that = this
      if (this.isShown && this.options.keyboard) {
        this.$element.on('keyup.dismiss.modal', e => e.which == 27 && that.hide())
      } else if (!this.isShown) {
        this.$element.off('keyup.dismiss.modal')
      }
    }

    hideWithTransition () {
      var that = this
        , timeout = setTimeout(() => {
            that.$element.off('transitionend')
            that.hideModal()
          }, 500)

      this.$element.one('transitionend', () => {
        clearTimeout(timeout)
        that.hideModal()
      })
    }

    hideModal () {
      var that = this
      this.$element.hide()
      this.backdrop(() => {
        that.removeBackdrop()
        that.$element.trigger('hidden')
      })
    }

    removeBackdrop () {
      this.$backdrop && this.$backdrop.remove()
      this.$backdrop = null
    }

    backdrop (callback) {
      var animate = this.$element.hasClass('fade') ? 'fade' : ''

      if (this.isShown && this.options.backdrop) {

        this.$backdrop = $('<div class="modal-backdrop ' + animate + '" />')
          .appendTo(doc.body)

        this.$backdrop.click(
          this.options.backdrop == 'static' ?
            this.$element[0].focus.bind(this.$element[0])
          : this.hide.bind(this)
        )

        if (animate) this.$backdrop[0].offsetWidth // force reflow

        this.$backdrop.addClass('in')

        if (!callback) return

        animate ?
          this.$backdrop.one('transitionend', callback) :
          callback()

      } else if (!this.isShown && this.$backdrop) {
        this.$backdrop.removeClass('in')

        this.$element.hasClass('fade')?
          this.$backdrop.one('transitionend', callback) :
          callback()

      } else if (callback) {
        callback()
      }
    }
  }


 /* MODAL PLUGIN DEFINITION
  * ======================= */

  $.fn.modal = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('modal')
        , options = $.extend({}, $.fn.modal.defaults, $this.data(), typeof option == 'object' && option)
      if (!data) $this.data('modal', (data = new Modal(this, options)))
      if (typeof option == 'string') data[option]()
      else if (options.show) data.show()
    })
  }

  $.fn.modal.defaults = {
      backdrop: true
    , keyboard: true
    , show: true
  }

 /* MODAL DATA-API
  * ============== */

  $(doc).on('click.modal.data-api', '[data-toggle="modal"]', function (e) {
    var $this = $(this)
      , href = $this.attr('href')
      , $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) //strip for ie7
      , option = $target.data('modal') ? 'toggle' : $.extend({ remote:!/#/.test(href) && href }, $target.data(), $this.data())

    e.preventDefault()

    $target
      .modal(option)
      .one('hide', () => $this.focus())
  })

 /* TAB CLASS DEFINITION
  * ==================== */

  var activate = ( element, container, callback) => {
      var $active = container.find('> .active')
        , transition = callback
            && $active.hasClass('fade')
      , next = () => {
        $active
          .removeClass('active')
          .find('> .dropdown-menu > .active')
          .removeClass('active')

        element.addClass('active')

        if (transition) {
          element[0].offsetWidth // reflow for transition
          element.addClass('in')
        } else {
          element.removeClass('fade')
        }

        if ( element.parent('.dropdown-menu') ) {
          element.closest('li.dropdown').addClass('active')
        }

        callback && callback()
      }

      transition ?
        $active.one('transitionend', next) :
        next()

      $active.removeClass('in')
    }

  class Tab {

    constructor (element) {
      this.element = $(element)
    }

    show () {
      var $this = this.element
        , $ul = $this.closest('ul:not(.dropdown-menu)')
        , selector = $this.attr('data-target')
        , previous
        , $target
        , e

      if (!selector) {
        selector = $this.attr('href')
        selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
      }

      if ( $this.parent('li').hasClass('active') ) return

      previous = $ul.find('.active:last a')[0]

      e = $.Event('show', {
        relatedTarget: previous
      })

      $this.trigger(e)

      if (e.isDefaultPrevented()) return

      $target = $(selector)

      activate($this.parent('li'), $ul)
      activate($target, $target.parent(), () => {
        $this.trigger({
          type: 'shown'
        , relatedTarget: previous
        })
      })
    }
  }


 /* TAB PLUGIN DEFINITION
  * ===================== */

  $.fn.tab = function ( option ) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('tab')
      if (!data) $this.data('tab', (data = new Tab(this)))
      if (typeof option == 'string') data[option]()
    })
  }

 /* TAB DATA-API
  * ============ */

  $(doc).on('click.tab.data-api', '[data-toggle="tab"], [data-toggle="pill"]', function (e) {
    e.preventDefault()
    $(this).tab('show')
  })

})(jQuery);
