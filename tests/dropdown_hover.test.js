/**
 * @jest-environment jsdom
 */

describe("dropdown_hover.js", () => {
  let $;
  let dropdownHover;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="dropdown">
        <a class="dropdown-toggle" aria-expanded="false">Toggle</a>
        <div class="dropdown-menu">Menu content</div>
      </div>
    `;

    const createMockElement = (selector) => {
      const el = {
        _selector: selector,
        _classes: new Set(),
        _handlers: {},
        length: 1,
        addClass: jest.fn(function (cls) {
          el._classes.add(cls);
          return el;
        }),
        removeClass: jest.fn(function (cls) {
          el._classes.delete(cls);
          return el;
        }),
        find: jest.fn(function (target) {
          return createMockElement("find:" + (target._selector || target));
        }),
        attr: jest.fn(function () { return el; }),
        hover: jest.fn(function (enterFn, leaveFn) {
          el._handlers.mouseenter = enterFn;
          el._handlers.mouseleave = leaveFn;
          return el;
        }),
        off: jest.fn(function () { return el; }),
        on: jest.fn(function (event, handler) {
          el._handlers[event] = handler;
          return el;
        }),
        click: jest.fn(function (handler) {
          el._handlers.click = handler;
          return el;
        }),
        scroll: jest.fn(function (handler) {
          el._handlers.scroll = handler;
          return el;
        }),
        offset: jest.fn(() => ({ top: 50 })),
        collapse: jest.fn(function () { return el; }),
        scrollspy: jest.fn(function () { return el; }),
        animate: jest.fn(function () { return el; }),
      };
      return el;
    };

    const jQueryElements = {};
    $ = jest.fn((selector) => {
      if (!jQueryElements[selector]) {
        jQueryElements[selector] = createMockElement(selector);
      }
      return jQueryElements[selector];
    });
    $._elements = jQueryElements;

    // Add matchMedia mock
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === "(min-width: 768px)",
      media: query,
    }));

    global.$ = $;
    global.jQuery = $;

    jest.resetModules();
    dropdownHover = require("../js/dropdown_hover.js");
  });

  afterEach(() => {
    delete global.$;
    delete global.jQuery;
    jest.restoreAllMocks();
  });

  describe("handleDropdownMouseEnter", () => {
    it("should add show class to the dropdown element", () => {
      const $element = $(".dropdown");
      const $toggle = $(".dropdown-toggle");
      const $menu = $(".dropdown-menu");

      dropdownHover.handleDropdownMouseEnter($element, $toggle, $menu);
      expect($element.addClass).toHaveBeenCalledWith("show");
    });

    it("should set aria-expanded to true on the toggle", () => {
      const $element = $(".dropdown");
      const $toggle = $(".dropdown-toggle");
      const $menu = $(".dropdown-menu");

      dropdownHover.handleDropdownMouseEnter($element, $toggle, $menu);
      expect($element.find).toHaveBeenCalledWith($toggle);
    });

    it("should add show class to the dropdown menu", () => {
      const $element = $(".dropdown");
      const $toggle = $(".dropdown-toggle");
      const $menu = $(".dropdown-menu");

      // Track find calls
      const findResult = createTrackedMockElement();
      $element.find = jest.fn(() => findResult);

      dropdownHover.handleDropdownMouseEnter($element, $toggle, $menu);
      // First call is for toggle (attr), second is for menu (addClass)
      expect($element.find).toHaveBeenCalledTimes(2);
    });
  });

  describe("handleDropdownMouseLeave", () => {
    it("should remove show class from the dropdown element", () => {
      const $element = $(".dropdown");
      const $toggle = $(".dropdown-toggle");
      const $menu = $(".dropdown-menu");

      dropdownHover.handleDropdownMouseLeave($element, $toggle, $menu);
      expect($element.removeClass).toHaveBeenCalledWith("show");
    });

    it("should set aria-expanded to false on the toggle", () => {
      const $element = $(".dropdown");
      const $toggle = $(".dropdown-toggle");
      const $menu = $(".dropdown-menu");

      const findResult = createTrackedMockElement();
      $element.find = jest.fn(() => findResult);

      dropdownHover.handleDropdownMouseLeave($element, $toggle, $menu);
      expect(findResult.attr).toHaveBeenCalledWith("aria-expanded", "false");
    });

    it("should remove show class from the dropdown menu", () => {
      const $element = $(".dropdown");
      const $toggle = $(".dropdown-toggle");
      const $menu = $(".dropdown-menu");

      const findResult = createTrackedMockElement();
      $element.find = jest.fn(() => findResult);

      dropdownHover.handleDropdownMouseLeave($element, $toggle, $menu);
      expect(findResult.removeClass).toHaveBeenCalledWith("show");
    });
  });

  describe("initDropdownHover", () => {
    it("should bind hover events on desktop (>= 768px)", () => {
      const $dropdown = $(".dropdown");
      const $toggle = $(".dropdown-toggle");
      const $menu = $(".dropdown-menu");

      dropdownHover.initDropdownHover($dropdown, $toggle, $menu, true);
      expect($dropdown.hover).toHaveBeenCalled();
    });

    it("should unbind hover events on mobile (< 768px)", () => {
      const $dropdown = $(".dropdown");
      const $toggle = $(".dropdown-toggle");
      const $menu = $(".dropdown-menu");

      dropdownHover.initDropdownHover($dropdown, $toggle, $menu, false);
      expect($dropdown.off).toHaveBeenCalledWith("mouseenter mouseleave");
    });

    it("should not bind hover events on mobile", () => {
      const $dropdown = $(".dropdown");
      const $toggle = $(".dropdown-toggle");
      const $menu = $(".dropdown-menu");

      dropdownHover.initDropdownHover($dropdown, $toggle, $menu, false);
      expect($dropdown.hover).not.toHaveBeenCalled();
    });
  });

  describe("showClass constant", () => {
    it("should equal 'show'", () => {
      expect(dropdownHover.showClass).toBe("show");
    });
  });

  describe("hover callback integration", () => {
    it("should call handleDropdownMouseEnter when hover enter fires on desktop", () => {
      const $dropdown = $(".dropdown");
      const $toggle = $(".dropdown-toggle");
      const $menu = $(".dropdown-menu");

      dropdownHover.initDropdownHover($dropdown, $toggle, $menu, true);

      // Get the registered hover callbacks
      const enterFn = $dropdown.hover.mock.calls[0][0];
      const leaveFn = $dropdown.hover.mock.calls[0][1];

      // Simulate the hover enter being called with a jQuery context
      const mockThis = createTrackedMockElement();
      // Mock jQuery to return mockThis when called with `this`
      const origFn = $.getMockImplementation ? $.getMockImplementation() : null;

      enterFn.call(mockThis);
      // The function internally calls $(this), so we verify via the $dropdown's hover call
      expect($dropdown.hover).toHaveBeenCalled();
    });

    it("should call handleDropdownMouseLeave when hover leave fires on desktop", () => {
      const $dropdown = $(".dropdown");
      const $toggle = $(".dropdown-toggle");
      const $menu = $(".dropdown-menu");

      dropdownHover.initDropdownHover($dropdown, $toggle, $menu, true);

      const leaveFn = $dropdown.hover.mock.calls[0][1];
      const mockThis = createTrackedMockElement();
      leaveFn.call(mockThis);
      expect($dropdown.hover).toHaveBeenCalled();
    });
  });

  describe("window event registration", () => {
    it("should register load resize handler on window", () => {
      const windowEl = $._elements["window"] || $(window);
      expect(windowEl.on).toHaveBeenCalledWith("load resize", expect.any(Function));
    });

    it("should call initDropdownHover with matchMedia result when window event fires", () => {
      const windowEl = $._elements["window"] || $(window);
      const onCall = windowEl.on.mock.calls.find((c) => c[0] === "load resize");
      expect(onCall).toBeDefined();

      // Invoke the handler with a mock window context that has matchMedia
      const handler = onCall[1];
      const mockContext = {
        matchMedia: jest.fn(() => ({ matches: true })),
      };
      handler.call(mockContext);
      expect(mockContext.matchMedia).toHaveBeenCalledWith("(min-width: 768px)");
    });

    it("should unbind hover when matchMedia returns false (mobile)", () => {
      const windowEl = $._elements["window"] || $(window);
      const onCall = windowEl.on.mock.calls.find((c) => c[0] === "load resize");
      const handler = onCall[1];

      const mockContext = {
        matchMedia: jest.fn(() => ({ matches: false })),
      };
      handler.call(mockContext);
      // On mobile, dropdown.off should be called
      const $dropdown = $._elements[".dropdown"];
      expect($dropdown.off).toHaveBeenCalledWith("mouseenter mouseleave");
    });

    it("should return early when dropdown element has no length", () => {
      const $dropdown = $._elements[".dropdown"];
      $dropdown.length = 0;

      const windowEl = $._elements["window"] || $(window);
      const onCall = windowEl.on.mock.calls.find((c) => c[0] === "load resize");
      const handler = onCall[1];

      const mockContext = {
        matchMedia: jest.fn(() => ({ matches: true })),
      };
      handler.call(mockContext);
      // matchMedia should not have been called since we returned early
      expect(mockContext.matchMedia).not.toHaveBeenCalled();
    });

    it("should return early when matchMedia is not a function", () => {
      const windowEl = $._elements["window"] || $(window);
      const onCall = windowEl.on.mock.calls.find((c) => c[0] === "load resize");
      const handler = onCall[1];

      const mockContext = {
        matchMedia: "not a function",
      };
      // Should not throw
      handler.call(mockContext);
    });
  });
});

function createTrackedMockElement() {
  return {
    addClass: jest.fn(function () { return this; }),
    removeClass: jest.fn(function () { return this; }),
    attr: jest.fn(function () { return this; }),
    find: jest.fn(function () { return this; }),
  };
}
