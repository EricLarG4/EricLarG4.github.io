(function($) {
  "use strict";

  var showClass = "show";

  function handleDropdownMouseEnter($element, $dropdownToggle, $dropdownMenu) {
    $element.addClass(showClass);
    $element.find($dropdownToggle).attr("aria-expanded", "true");
    $element.find($dropdownMenu).addClass(showClass);
  }

  function handleDropdownMouseLeave($element, $dropdownToggle, $dropdownMenu) {
    $element.removeClass(showClass);
    $element.find($dropdownToggle).attr("aria-expanded", "false");
    $element.find($dropdownMenu).removeClass(showClass);
  }

  function initDropdownHover($dropdown, $dropdownToggle, $dropdownMenu, matchesDesktop) {
    if (matchesDesktop) {
      $dropdown.hover(
        function() {
          handleDropdownMouseEnter($(this), $dropdownToggle, $dropdownMenu);
        },
        function() {
          handleDropdownMouseLeave($(this), $dropdownToggle, $dropdownMenu);
        }
      );
    } else {
      $dropdown.off("mouseenter mouseleave");
    }
  }

  var $dropdown = $(".dropdown");
  var $dropdownToggle = $(".dropdown-toggle");
  var $dropdownMenu = $(".dropdown-menu");

  $(window).on("load resize", function() {
    if (!$dropdown.length) {
      return;
    }
    if (typeof this.matchMedia !== "function") {
      return;
    }
    var matchesDesktop = this.matchMedia("(min-width: 768px)").matches;
    initDropdownHover($dropdown, $dropdownToggle, $dropdownMenu, matchesDesktop);
  });

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      handleDropdownMouseEnter: handleDropdownMouseEnter,
      handleDropdownMouseLeave: handleDropdownMouseLeave,
      initDropdownHover: initDropdownHover,
      showClass: showClass
    };
  }

})(typeof jQuery !== 'undefined' ? jQuery : (typeof $ !== 'undefined' ? $ : null));
