/**
 * @jest-environment jsdom
 */

describe("new-age.js", () => {
  let $;
  let newAge;

  beforeEach(() => {
    // Set up a minimal DOM
    document.body.innerHTML = `
      <nav id="mainNav" class="navbar">
        <div class="navbar-collapse">menu</div>
      </nav>
      <a class="js-scroll-trigger" href="#section1">Link</a>
      <div id="section1"></div>
    `;

    // Create a jQuery mock
    const jQueryElements = {};

    const createMockElement = (selector) => {
      const el = {
        _selector: selector,
        _classes: new Set(),
        _handlers: {},
        length: 1,
        click: jest.fn(function (handler) {
          el._handlers.click = handler;
          return el;
        }),
        scroll: jest.fn(function (handler) {
          el._handlers.scroll = handler;
          return el;
        }),
        on: jest.fn(function (event, handler) {
          el._handlers[event] = handler;
          return el;
        }),
        hover: jest.fn(function (enterFn, leaveFn) {
          el._handlers.mouseenter = enterFn;
          el._handlers.mouseleave = leaveFn;
          return el;
        }),
        off: jest.fn(function () { return el; }),
        offset: jest.fn(() => ({ top: 50 })),
        height: jest.fn(() => 60),
        addClass: jest.fn(function (cls) {
          el._classes.add(cls);
          return el;
        }),
        removeClass: jest.fn(function (cls) {
          el._classes.delete(cls);
          return el;
        }),
        collapse: jest.fn(function () { return el; }),
        scrollspy: jest.fn(function () { return el; }),
        animate: jest.fn(function () { return el; }),
        find: jest.fn(function () { return createMockElement("find-result"); }),
        attr: jest.fn(function () { return el; }),
      };
      return el;
    };

    $ = jest.fn((selector) => {
      if (!jQueryElements[selector]) {
        jQueryElements[selector] = createMockElement(selector);
      }
      return jQueryElements[selector];
    });

    // Store reference for test access
    $._elements = jQueryElements;

    // Set up window and location mocks via jsdom's href setter
    window.location.href = "http://localhost/";

    // Make $ available globally for the module
    global.$ = $;
    global.jQuery = $;

    // Load the module
    jest.resetModules();
    newAge = require("../js/new-age.js");
  });

  afterEach(() => {
    delete global.$;
    delete global.jQuery;
    jest.restoreAllMocks();
  });

  describe("handleSmoothScroll", () => {
    it("should animate scroll to target element when hash matches", () => {
      const targetEl = $._elements["#section1"] || $( "#section1");
      targetEl.length = 1;
      targetEl.offset = jest.fn(() => ({ top: 500 }));

      const element = {
        pathname: "/",
        hostname: "localhost",
        hash: "#section1",
      };

      const result = newAge.handleSmoothScroll(element);
      expect(result).toBe(false);
      expect($).toHaveBeenCalledWith("#section1");
    });

    it("should not scroll when target element does not exist", () => {
      const noEl = $("#nonexistent");
      noEl.length = 0;

      // Also make the quoted name selector return no results
      const namedEl = $('[name="nonexistent"]');
      namedEl.length = 0;

      const element = {
        pathname: "/",
        hostname: "localhost",
        hash: "#nonexistent",
      };

      const result = newAge.handleSmoothScroll(element);
      expect(result).toBeUndefined();
    });

    it("should not scroll when hostname does not match", () => {
      const element = {
        pathname: "/",
        hostname: "different-host.com",
        hash: "#section1",
      };

      const result = newAge.handleSmoothScroll(element);
      expect(result).toBeUndefined();
    });

    it("should not scroll when pathname does not match", () => {
      const element = {
        pathname: "/other-page",
        hostname: "localhost",
        hash: "#section1",
      };

      const result = newAge.handleSmoothScroll(element);
      expect(result).toBeUndefined();
    });

    it("should fallback to name selector when hash selector has no length", () => {
      // Make the hash selector return no element
      const hashEl = $( "#fallback");
      hashEl.length = 0;

      // Make the name selector return an element
      const nameEl = $('[name="fallback"]');
      nameEl.length = 1;
      nameEl.offset = jest.fn(() => ({ top: 300 }));

      const element = {
        pathname: "/",
        hostname: "localhost",
        hash: "#fallback",
      };

      const result = newAge.handleSmoothScroll(element);
      expect(result).toBe(false);
      expect($).toHaveBeenCalledWith('[name="fallback"]');
    });

    it("should not fallback to name selector when name contains invalid characters", () => {
      const hashEl = $("#bad<name");
      hashEl.length = 0;

      const element = {
        pathname: "/",
        hostname: "localhost",
        hash: "#bad<name",
      };

      const result = newAge.handleSmoothScroll(element);
      expect(result).toBeUndefined();
    });
  });

  describe("closeResponsiveMenu", () => {
    it("should call collapse('hide') on .navbar-collapse", () => {
      newAge.closeResponsiveMenu();
      const navCollapse = $._elements[".navbar-collapse"];
      expect(navCollapse.collapse).toHaveBeenCalledWith("hide");
    });
  });

  describe("click handler registration", () => {
    it("should register click handler on scroll trigger links", () => {
      const scrollLinks = $._elements['a.js-scroll-trigger[href*="#"]:not([href="#"])'];
      expect(scrollLinks.click).toHaveBeenCalled();
    });

    it("should register click handler on .js-scroll-trigger", () => {
      const triggers = $._elements[".js-scroll-trigger"];
      expect(triggers.click).toHaveBeenCalled();
    });

    it("scroll trigger click handler should call closeResponsiveMenu", () => {
      const triggers = $._elements[".js-scroll-trigger"];
      // invoke the registered click handler
      const handler = triggers.click.mock.calls[0][0];
      handler();
      const navCollapse = $._elements[".navbar-collapse"];
      expect(navCollapse.collapse).toHaveBeenCalledWith("hide");
    });

    it("smooth scroll click handler should delegate to handleSmoothScroll", () => {
      const scrollLinks = $._elements['a.js-scroll-trigger[href*="#"]:not([href="#"])'];
      const handler = scrollLinks.click.mock.calls[0][0];
      // Call the handler with a mock element as `this`
      const mockElement = {
        pathname: "/",
        hostname: "localhost",
        hash: "#section1",
      };
      const result = handler.call(mockElement);
      // handleSmoothScroll should have been called
      expect($).toHaveBeenCalledWith("#section1");
    });
  });

  describe("initScrollspy", () => {
    it("should initialize scrollspy on body with correct config", () => {
      newAge.initScrollspy();
      const body = $._elements["body"];
      expect(body.scrollspy).toHaveBeenCalledWith({
        target: "#mainNav",
        offset: 54,
      });
    });
  });

  describe("navbarCollapse", () => {
    it("should add navbar-shrink class when scrolled past 100px", () => {
      const mainNav = $._elements["#mainNav"] || $( "#mainNav");
      mainNav.offset = jest.fn(() => ({ top: 150 }));

      newAge.navbarCollapse();
      expect(mainNav.addClass).toHaveBeenCalledWith("navbar-shrink");
    });

    it("should remove navbar-shrink class when at top of page", () => {
      const mainNav = $._elements["#mainNav"] || $( "#mainNav");
      mainNav.offset = jest.fn(() => ({ top: 50 }));

      newAge.navbarCollapse();
      expect(mainNav.removeClass).toHaveBeenCalledWith("navbar-shrink");
    });

    it("should remove navbar-shrink class when exactly at 100px", () => {
      const mainNav = $._elements["#mainNav"] || $( "#mainNav");
      mainNav.offset = jest.fn(() => ({ top: 100 }));

      newAge.navbarCollapse();
      expect(mainNav.removeClass).toHaveBeenCalledWith("navbar-shrink");
    });

    it("should return early when #mainNav element has no length", () => {
      const mainNav = $._elements["#mainNav"] || $("#mainNav");
      mainNav.length = 0;
      mainNav.addClass.mockClear();
      mainNav.removeClass.mockClear();

      newAge.navbarCollapse();
      expect(mainNav.addClass).not.toHaveBeenCalled();
      expect(mainNav.removeClass).not.toHaveBeenCalled();
    });

    it("should return early when offset() returns null", () => {
      const mainNav = $._elements["#mainNav"] || $("#mainNav");
      mainNav.length = 1;
      mainNav.offset = jest.fn(() => null);
      mainNav.addClass.mockClear();
      mainNav.removeClass.mockClear();

      newAge.navbarCollapse();
      expect(mainNav.addClass).not.toHaveBeenCalled();
      expect(mainNav.removeClass).not.toHaveBeenCalled();
    });
  });
});
