(() => {
  // <stdin>
  var container = document.querySelector(".container");
  var allMenus = document.querySelectorAll(".menu");
  document.body.addEventListener("click", () => {
    allMenus.forEach((menu) => {
      if (menu.classList.contains("open")) {
        menu.classList.remove("open");
      }
    });
  });
  window.addEventListener("resize", () => {
    allMenus.forEach((menu) => {
      menu.classList.remove("open");
    });
  });
  allMenus.forEach((menu) => {
    const trigger = menu.querySelector(".menu-trigger");
    const dropdown = menu.querySelector(".menu-dropdown");
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (menu.classList.contains("open")) {
        menu.classList.remove("open");
      } else {
        allMenus.forEach((m) => m.classList.remove("open"));
        menu.classList.add("open");
      }
      if (dropdown.getBoundingClientRect().right > container.getBoundingClientRect().right) {
        dropdown.style.left = "auto";
        dropdown.style.right = 0;
      }
    });
    dropdown.addEventListener("click", (e) => e.stopPropagation());
  });
})();

;
(() => {
  // <stdin>
  var themeDark = "theme--dark";
  var themeLight = "theme--light";
  var bodyClassList = document.body.classList;
  var isSystemDark = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;
  var themeToggle = document.querySelector(".theme-toggle");
  var preferTheme = "prefer-theme";
  var localTheme = localStorage.getItem(preferTheme);
  if (localTheme === themeDark) {
    bodyClassList.add(themeDark);
  } else if (localTheme === themeLight) {
    bodyClassList.remove(themeDark);
  } else if (isSystemDark) {
    bodyClassList.add(themeDark);
  }
  function setBodyBackground() {
    const tc = document.querySelector(".theme-container");
    const cs = window.getComputedStyle(tc);
    document.body.style.background = cs.background;
  }
  setBodyBackground();
  themeToggle.addEventListener("click", () => {
    if (bodyClassList.contains(themeDark)) {
      bodyClassList.remove(themeDark);
      localStorage.setItem(preferTheme, themeLight);
    } else {
      bodyClassList.add(themeDark);
      localStorage.setItem(preferTheme, themeDark);
    }
    setBodyBackground();
  });
})();

;
(() => {
  // <stdin>
  var hiTextBlock = document.querySelectorAll(".highlight-wrapper");
  hiTextBlock.forEach(function(hiTextBlock2) {
    const hiToolbar = hiTextBlock2.querySelector(".highlight-toolbar");
    if (!hiToolbar) return;
    const hiText = hiTextBlock2.querySelector(".highlight");
    if (!hiText) return;
    const copyButton = hiToolbar.querySelector(".js-btn-copy-code");
    if (!copyButton) return;
    copyButton.classList.remove("hide");
    function copyingDone() {
      copyButton.innerHTML = "Copied!";
      setTimeout(() => {
        copyButton.innerHTML = "Copy";
      }, 2e3);
    }
    copyButton.addEventListener("click", () => {
      const range = document.createRange();
      range.selectNodeContents(hiText);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      try {
        document.execCommand("copy");
        copyingDone();
      } catch (e) {
      }
      selection.removeRange(range);
    });
  });
})();

;
(() => {
})();
