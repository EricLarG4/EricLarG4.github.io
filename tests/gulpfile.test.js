/**
 * @jest-environment node
 */

describe("gulpfile.js", () => {
  let gulp;
  let gulpExports;

  beforeEach(() => {
    jest.resetModules();

    // Mock all gulp plugins
    jest.mock("gulp-autoprefixer", () => jest.fn(() => "autoprefixer-stream"));
    jest.mock("browser-sync", () => ({
      create: jest.fn(() => ({
        init: jest.fn(),
        reload: jest.fn(),
        stream: jest.fn(),
      })),
    }));
    jest.mock("gulp-clean-css", () => jest.fn(() => "cleancss-stream"));
    jest.mock("del", () => jest.fn(() => Promise.resolve()));
    jest.mock("gulp-header", () => jest.fn(() => "header-stream"));
    jest.mock("merge-stream", () => jest.fn((...streams) => streams));
    jest.mock("gulp-plumber", () => jest.fn(() => "plumber-stream"));
    jest.mock("gulp-rename", () => jest.fn(() => "rename-stream"));
    jest.mock("gulp-sass", () => {
      const sassTransform = jest.fn(() => "sass-stream");
      sassTransform.logError = "logError";
      return sassTransform;
    });
    jest.mock("gulp-uglify", () => jest.fn(() => "uglify-stream"));

    // Mock gulp
    const mockPipe = jest.fn(function () { return this; });
    const mockOn = jest.fn(function () { return this; });
    const mockGulpSrc = jest.fn(() => ({
      pipe: mockPipe,
      on: mockOn,
    }));
    const mockGulpDest = jest.fn((path) => `dest:${path}`);
    const mockGulpWatch = jest.fn();
    const mockDone = jest.fn();
    const mockGulpSeries = jest.fn((...fns) => {
      const composed = async () => {
        for (const fn of fns) await fn(mockDone);
      };
      composed._tasks = fns;
      return composed;
    });
    const mockGulpParallel = jest.fn((...fns) => {
      const composed = async () => {
        await Promise.all(fns.map((fn) => fn(mockDone)));
      };
      composed._tasks = fns;
      return composed;
    });

    jest.mock("gulp", () => ({
      src: mockGulpSrc,
      dest: mockGulpDest,
      watch: mockGulpWatch,
      series: mockGulpSeries,
      parallel: mockGulpParallel,
    }));

    gulp = require("gulp");
    gulpExports = require("../gulpfile.js");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("exported tasks", () => {
    it("should export css task", () => {
      expect(gulpExports.css).toBeDefined();
      expect(typeof gulpExports.css).toBe("function");
    });

    it("should export js task", () => {
      expect(gulpExports.js).toBeDefined();
      expect(typeof gulpExports.js).toBe("function");
    });

    it("should export clean task", () => {
      expect(gulpExports.clean).toBeDefined();
      expect(typeof gulpExports.clean).toBe("function");
    });

    it("should export vendor task", () => {
      expect(gulpExports.vendor).toBeDefined();
      expect(typeof gulpExports.vendor).toBe("function");
    });

    it("should export build task", () => {
      expect(gulpExports.build).toBeDefined();
      expect(typeof gulpExports.build).toBe("function");
    });

    it("should export watch task", () => {
      expect(gulpExports.watch).toBeDefined();
      expect(typeof gulpExports.watch).toBe("function");
    });

    it("should export default task (build)", () => {
      expect(gulpExports.default).toBeDefined();
      expect(typeof gulpExports.default).toBe("function");
    });
  });

  describe("css task", () => {
    it("should read from scss directory", () => {
      gulpExports.css();
      expect(gulp.src).toHaveBeenCalledWith("./scss/**/*.scss");
    });
  });

  describe("js task", () => {
    it("should read JS files excluding minified", () => {
      gulpExports.js();
      expect(gulp.src).toHaveBeenCalledWith([
        "./js/*.js",
        "!./js/*.min.js",
      ]);
    });
  });

  describe("clean task", () => {
    it("should delete the vendor directory", () => {
      const del = require("del");
      gulpExports.clean();
      expect(del).toHaveBeenCalledWith(["./vendor/"]);
    });
  });

  describe("vendor task", () => {
    it("should be a composed task (series of clean + modules)", () => {
      expect(gulpExports.vendor._tasks).toBeDefined();
      expect(gulpExports.vendor._tasks.length).toBe(2);
    });
  });

  describe("build task", () => {
    it("should be a composed task (vendor then parallel css+js)", () => {
      expect(gulpExports.build._tasks).toBeDefined();
      expect(gulpExports.build._tasks.length).toBe(2);
    });
  });

  describe("watch task", () => {
    it("should be a composed task", () => {
      expect(gulpExports.watch._tasks).toBeDefined();
      expect(gulpExports.watch._tasks.length).toBe(2);
    });
  });

  describe("banner generation", () => {
    it("should include package title in banner via gulp-header", () => {
      const header = require("gulp-header");
      gulpExports.css();
      // header is called with banner string and pkg object
      expect(header).toHaveBeenCalled();
      const call = header.mock.calls[0];
      expect(call[0]).toContain("Start Bootstrap");
      expect(call[1]).toHaveProperty("pkg");
      expect(call[1].pkg.title).toBe("New Age");
    });
  });

  describe("browserSync function", () => {
    it("should be callable via the watch task composition", () => {
      // The watch task is series(build, parallel(watchFiles, browserSync))
      // Build is series(vendor, parallel(css, js))
      // We verify the watch task structure includes browserSync
      const watchTask = gulpExports.watch;
      expect(watchTask._tasks).toBeDefined();
      expect(watchTask._tasks.length).toBe(2);
    });
  });

  describe("watchFiles function", () => {
    it("should set up file watchers when called directly", () => {
      // watchFiles is inside the watch composed task
      // Access the parallel task which contains watchFiles and browserSync
      const parallelTask = gulpExports.watch._tasks[1];
      expect(parallelTask._tasks).toBeDefined();
      // Call watchFiles directly (first task in the parallel composition)
      const watchFilesFn = parallelTask._tasks[0];
      watchFilesFn();
      // After calling, gulp.watch should have been invoked for scss and js
      expect(gulp.watch).toHaveBeenCalledWith("./scss/**/*", expect.any(Function));
      expect(gulp.watch).toHaveBeenCalledWith(
        ["./js/**/*", "!./js/**/*.min.js"],
        expect.any(Function)
      );
      expect(gulp.watch).toHaveBeenCalledWith("./**/*.html", expect.any(Function));
    });
  });

  describe("browserSync and browserSyncReload functions", () => {
    it("should call done callback when browserSync is initialized", () => {
      const parallelTask = gulpExports.watch._tasks[1];
      const browserSyncFn = parallelTask._tasks[1];
      const doneFn = jest.fn();
      browserSyncFn(doneFn);
      expect(doneFn).toHaveBeenCalled();
    });

    it("should call browsersync.reload and done when browserSyncReload is invoked", () => {
      // browserSyncReload is passed as the callback to gulp.watch for HTML files
      // First, call watchFiles to register the watchers
      const parallelTask = gulpExports.watch._tasks[1];
      const watchFilesFn = parallelTask._tasks[0];
      watchFilesFn();

      // Find the HTML watcher callback
      const htmlWatchCall = gulp.watch.mock.calls.find(
        (call) => call[0] === "./**/*.html"
      );
      expect(htmlWatchCall).toBeDefined();

      // The second argument is browserSyncReload
      const browserSyncReloadFn = htmlWatchCall[1];
      const doneFn = jest.fn();
      browserSyncReloadFn(doneFn);
      expect(doneFn).toHaveBeenCalled();
    });
  });

  describe("modules task (via vendor)", () => {
    it("should copy bootstrap files", () => {
      // The second task in vendor is modules
      const modulesFn = gulpExports.vendor._tasks[1];
      modulesFn();
      expect(gulp.src).toHaveBeenCalledWith(
        "./node_modules/bootstrap/dist/**/*"
      );
    });

    it("should copy font awesome CSS files", () => {
      const modulesFn = gulpExports.vendor._tasks[1];
      modulesFn();
      expect(gulp.src).toHaveBeenCalledWith(
        "./node_modules/@fortawesome/fontawesome-free/css/**/*"
      );
    });

    it("should copy jQuery files excluding core.js", () => {
      const modulesFn = gulpExports.vendor._tasks[1];
      modulesFn();
      expect(gulp.src).toHaveBeenCalledWith([
        "./node_modules/jquery/dist/*",
        "!./node_modules/jquery/dist/core.js",
      ]);
    });

    it("should copy jQuery Easing files", () => {
      const modulesFn = gulpExports.vendor._tasks[1];
      modulesFn();
      expect(gulp.src).toHaveBeenCalledWith(
        "./node_modules/jquery.easing/*.js"
      );
    });

    it("should copy Simple Line Icons fonts", () => {
      const modulesFn = gulpExports.vendor._tasks[1];
      modulesFn();
      expect(gulp.src).toHaveBeenCalledWith(
        "./node_modules/simple-line-icons/fonts/**"
      );
    });

    it("should copy Simple Line Icons CSS", () => {
      const modulesFn = gulpExports.vendor._tasks[1];
      modulesFn();
      expect(gulp.src).toHaveBeenCalledWith(
        "./node_modules/simple-line-icons/css/**"
      );
    });
  });
});
