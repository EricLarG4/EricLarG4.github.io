(function($) {
  "use strict"; // Start of use strict

  // Smooth scrolling using jQuery easing
  function handleSmoothScroll(element) {
    if (location.pathname.replace(/^\//, '') == element.pathname.replace(/^\//, '') && location.hostname == element.hostname) {
      var hash = element.hash;
      var target = $(hash);
      if (!target.length) {
        var name = hash.slice(1);
        if (/^[a-zA-Z0-9_-]+$/.test(name)) {
          target = $('[name="' + name + '"]');
        }
      }
      if (target.length) {
        $('html, body').animate({
          scrollTop: (target.offset().top - 48)
        }, 1000, "easeInOutExpo");
        return false;
      }
    }
  }

  $('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function() {
    return handleSmoothScroll(this);
  });

  // Closes responsive menu when a scroll trigger link is clicked
  function closeResponsiveMenu() {
    $('.navbar-collapse').collapse('hide');
  }

  $('.js-scroll-trigger').click(function() {
    closeResponsiveMenu();
  });

  // Activate scrollspy to add active class to navbar items on scroll
  function initScrollspy() {
    $('body').scrollspy({
      target: '#mainNav',
      offset: 54
    });
  }

  initScrollspy();

  // Collapse Navbar
  var navbarCollapse = function() {
    var $nav = $("#mainNav");
    if (!$nav.length) {
      return;
    }
    var offset = $nav.offset();
    if (!offset) {
      return;
    }
    if (offset.top > 100) {
      $nav.addClass("navbar-shrink");
    } else {
      $nav.removeClass("navbar-shrink");
    }
  };
  // Collapse now if page is not at top
  navbarCollapse();
  // Collapse the navbar when page is scrolled
  $(window).scroll(navbarCollapse);

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      handleSmoothScroll: handleSmoothScroll,
      closeResponsiveMenu: closeResponsiveMenu,
      initScrollspy: initScrollspy,
      navbarCollapse: navbarCollapse
    };
  }

})(typeof jQuery !== 'undefined' ? jQuery : (typeof $ !== 'undefined' ? $ : null)); // End of use strict
