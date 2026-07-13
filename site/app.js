(function () {
  "use strict";

  var CONFIG = window.LECHEST_CONFIG || {};
  var OWNER = (CONFIG.owner || "johnnyZeppelin").toLowerCase();
  var REPO = CONFIG.repo || "Lechest-Blog";
  var BRANCH = CONFIG.branch || "main";
  var POSTS_PATH = CONFIG.postsPath || "site/content/posts.json";

  var state = {
    posts: [],
    activeTag: "All",
    activePostId: "",
    token: localStorage.getItem("lechest-owner-token") || sessionStorage.getItem("lechest-owner-token") || "",
    user: null
  };

  var els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    bindNavigation();
    loadPosts();
    initVisitorMap();
    initStudio();
    initGame();
  }

  function cacheElements() {
    els.navLinks = Array.from(document.querySelectorAll("[data-nav]"));
    els.views = Array.from(document.querySelectorAll("[data-view]"));
    els.latestPost = document.getElementById("latestPost");
    els.tagStrip = document.getElementById("tagStrip");
    els.postList = document.getElementById("postList");
    els.articleReader = document.getElementById("articleReader");
    els.mapPins = document.getElementById("visitorPins");
    els.mapCaption = document.getElementById("mapCaption");
    els.ownerLogin = document.getElementById("ownerLogin");
    els.tokenInput = document.getElementById("tokenInput");
    els.rememberToken = document.getElementById("rememberToken");
    els.authStatus = document.getElementById("authStatus");
    els.composer = document.getElementById("composer");
    els.publishStatus = document.getElementById("publishStatus");
    els.previewPost = document.getElementById("previewPost");
  }

  function bindNavigation() {
    window.addEventListener("hashchange", syncRoute);
    syncRoute();
  }

  function syncRoute() {
    var route = (window.location.hash || "#lounge").replace("#", "").split("?")[0];
    var known = ["lounge", "blog", "game", "studio"];
    if (known.indexOf(route) === -1) {
      route = "lounge";
    }

    els.views.forEach(function (view) {
      view.classList.toggle("active", view.dataset.view === route);
    });
    els.navLinks.forEach(function (link) {
      link.classList.toggle("active", link.dataset.nav === route);
    });

    requestAnimationFrame(function () {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    setTimeout(function () {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, 80);
  }

  async function loadPosts() {
    try {
      var response = await fetch("./content/posts.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Could not load posts.");
      }
      state.posts = await response.json();
      state.posts.sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });
    } catch (error) {
      state.posts = [];
      if (els.articleReader) {
        els.articleReader.innerHTML = "<p>Posts could not be loaded in this preview.</p>";
      }
      return;
    }

    if (state.posts.length) {
      state.activePostId = state.posts[0].id;
    }
    renderLatest();
    renderTags();
    renderPostList();
    renderArticle(getActivePost());
  }

  function renderLatest() {
    if (!els.latestPost || !state.posts.length) {
      return;
    }
    var post = state.posts[0];
    els.latestPost.innerHTML =
      '<div class="latest-card">' +
      '<div class="meta-line"><span>' + escapeHtml(post.date) + "</span><span>" + escapeHtml(post.minutes || 3) + " min</span><span>" + escapeHtml(post.mood || "warm") + "</span></div>" +
      "<h3>" + escapeHtml(post.title) + "</h3>" +
      "<p>" + escapeHtml(post.subtitle || firstSentence(post.body)) + "</p>" +
      '<a class="button ghost" href="#blog" data-open-post="' + escapeAttribute(post.id) + '">Open note</a>' +
      "</div>";

    var link = els.latestPost.querySelector("[data-open-post]");
    if (link) {
      link.addEventListener("click", function () {
        selectPost(post.id);
      });
    }
  }

  function renderTags() {
    if (!els.tagStrip) {
      return;
    }
    var tags = ["All"];
    state.posts.forEach(function (post) {
      (post.tags || []).forEach(function (tag) {
        if (tags.indexOf(tag) === -1) {
          tags.push(tag);
        }
      });
    });

    els.tagStrip.innerHTML = tags
      .map(function (tag) {
        return '<button type="button" class="' + (state.activeTag === tag ? "active" : "") + '" data-tag="' + escapeAttribute(tag) + '">' + escapeHtml(tag) + "</button>";
      })
      .join("");

    els.tagStrip.querySelectorAll("[data-tag]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.activeTag = button.dataset.tag || "All";
        renderTags();
        renderPostList();
      });
    });
  }

  function renderPostList() {
    if (!els.postList) {
      return;
    }
    var visible = state.posts.filter(function (post) {
      return state.activeTag === "All" || (post.tags || []).indexOf(state.activeTag) !== -1;
    });

    els.postList.innerHTML = visible
      .map(function (post) {
        return (
          '<button type="button" class="post-card ' +
          (post.id === state.activePostId ? "active" : "") +
          '" data-post-id="' +
          escapeAttribute(post.id) +
          '">' +
          "<strong>" +
          escapeHtml(post.title) +
          "</strong>" +
          "<small>" +
          escapeHtml(post.subtitle || firstSentence(post.body)) +
          "</small>" +
          '<span class="meta-line"><span>' +
          escapeHtml(post.date) +
          "</span><span>" +
          escapeHtml(post.minutes || 3) +
          " min</span></span>" +
          "</button>"
        );
      })
      .join("");

    els.postList.querySelectorAll("[data-post-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        selectPost(button.dataset.postId);
      });
    });
  }

  function selectPost(id) {
    state.activePostId = id;
    renderPostList();
    renderArticle(getActivePost());
  }

  function getActivePost() {
    return (
      state.posts.find(function (post) {
        return post.id === state.activePostId;
      }) || state.posts[0]
    );
  }

  function renderArticle(post) {
    if (!els.articleReader || !post) {
      return;
    }

    els.articleReader.innerHTML =
      "<header>" +
      '<div class="meta-line"><span>' +
      escapeHtml(post.date || "") +
      "</span><span>" +
      escapeHtml(post.minutes || estimateMinutes(post.body || "")) +
      " min</span><span>" +
      escapeHtml(post.mood || "warm") +
      "</span></div>" +
      "<h1>" +
      escapeHtml(post.title || "Untitled") +
      "</h1>" +
      '<p class="subtitle">' +
      escapeHtml(post.subtitle || "") +
      "</p>" +
      '<div class="article-tags">' +
      (post.tags || [])
        .map(function (tag) {
          return "<span>" + escapeHtml(tag) + "</span>";
        })
        .join("") +
      "</div>" +
      "</header>" +
      '<div class="article-body">' +
      markdownToHtml(post.body || "") +
      "</div>" +
      '<section class="comments-box" id="commentsBox"></section>';

    renderComments(post);
  }

  function renderComments(post) {
    var box = document.getElementById("commentsBox");
    if (!box) {
      return;
    }

    var appId = CONFIG.cusdis && CONFIG.cusdis.appId;
    if (appId) {
      var pageUrl = (CONFIG.pagesUrl || window.location.origin + window.location.pathname) + "#blog/" + post.id;
      box.innerHTML =
        "<h3>Comments</h3>" +
        '<div id="cusdis_thread" ' +
        'data-host="' +
        escapeAttribute((CONFIG.cusdis && CONFIG.cusdis.host) || "https://cusdis.com") +
        '" data-app-id="' +
        escapeAttribute(appId) +
        '" data-page-id="' +
        escapeAttribute(post.id) +
        '" data-page-url="' +
        escapeAttribute(pageUrl) +
        '" data-page-title="' +
        escapeAttribute(post.title) +
        '"></div>';
      loadCusdis();
      return;
    }

    var notes = readLocalNotes(post.id);
    box.innerHTML =
      "<h3>Guest notes</h3>" +
      "<p>Anonymous public comments are ready for Cusdis. Until an app id is added in config.js, notes stay on this browser only.</p>" +
      '<form class="local-note-form" id="localNoteForm">' +
      '<input name="name" maxlength="40" placeholder="Name" required>' +
      '<textarea name="message" maxlength="500" placeholder="A small note by the fire" required></textarea>' +
      '<button class="button ghost" type="submit">Leave Local Note</button>' +
      "</form>" +
      '<div class="local-note-list" id="localNoteList">' +
      notes
        .map(function (note) {
          return '<div class="local-note"><strong>' + escapeHtml(note.name) + "</strong><p>" + escapeHtml(note.message) + "</p></div>";
        })
        .join("") +
      "</div>";

    var form = document.getElementById("localNoteForm");
    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var formData = new FormData(form);
        var next = {
          name: String(formData.get("name") || "Guest").slice(0, 40),
          message: String(formData.get("message") || "").slice(0, 500),
          at: new Date().toISOString()
        };
        if (!next.message.trim()) {
          return;
        }
        notes.unshift(next);
        localStorage.setItem("lechest-notes-" + post.id, JSON.stringify(notes.slice(0, 12)));
        renderComments(post);
      });
    }
  }

  function loadCusdis() {
    if (document.querySelector('script[data-cusdis="true"]')) {
      if (window.CUSDIS && typeof window.CUSDIS.renderTo === "function") {
        window.CUSDIS.renderTo("#cusdis_thread");
      }
      return;
    }
    var script = document.createElement("script");
    script.src = "https://cusdis.com/js/cusdis.es.js";
    script.async = true;
    script.defer = true;
    script.dataset.cusdis = "true";
    document.body.appendChild(script);
  }

  function readLocalNotes(postId) {
    try {
      return JSON.parse(localStorage.getItem("lechest-notes-" + postId) || "[]");
    } catch (error) {
      return [];
    }
  }

  async function initVisitorMap() {
    var visits = [
      { city: "Shanghai", country: "China", lat: 31.2304, lon: 121.4737, warm: true },
      { city: "Seattle", country: "United States", lat: 47.6062, lon: -122.3321, warm: true },
      { city: "Paris", country: "France", lat: 48.8566, lon: 2.3522, warm: true },
      { city: "Melbourne", country: "Australia", lat: -37.8136, lon: 144.9631, warm: true }
    ];

    try {
      var currentResponse = await fetch("https://ipwho.is/");
      var current = await currentResponse.json();
      if (current && current.success !== false && current.latitude && current.longitude) {
        var liveVisit = {
          city: current.city || "Nearby",
          country: current.country || "Somewhere",
          lat: Number(current.latitude),
          lon: Number(current.longitude),
          current: true
        };
        visits.unshift(liveVisit);
        await syncVisitorEndpoint(liveVisit, visits);
      } else {
        await syncVisitorEndpoint(null, visits);
      }
    } catch (error) {
      await syncVisitorEndpoint(null, visits);
    }

    drawVisitorPins(visits);
  }

  async function syncVisitorEndpoint(currentVisit, visits) {
    if (!CONFIG.visitorEndpoint) {
      return;
    }
    try {
      if (currentVisit) {
        await fetch(CONFIG.visitorEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentVisit)
        });
      }
      var response = await fetch(CONFIG.visitorEndpoint, { cache: "no-store" });
      if (response.ok) {
        var remoteVisits = await response.json();
        if (Array.isArray(remoteVisits)) {
          visits.splice(0, visits.length);
          remoteVisits.forEach(function (visit) {
            if (typeof visit.lat === "number" && typeof visit.lon === "number") {
              visits.push(visit);
            }
          });
        }
      }
    } catch (error) {
      if (els.mapCaption) {
        els.mapCaption.textContent = "The public visitor log is asleep; showing local lights for now.";
      }
    }
  }

  function drawVisitorPins(visits) {
    if (!els.mapPins) {
      return;
    }
    els.mapPins.innerHTML = "";
    visits.forEach(function (visit, index) {
      var point = project(visit.lat, visit.lon);
      var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("class", "visitor-pin");
      var pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      pulse.setAttribute("cx", point.x);
      pulse.setAttribute("cy", point.y);
      pulse.setAttribute("r", visit.current ? 10 : 7);
      pulse.setAttribute("fill", visit.current ? "rgba(241,179,95,0.22)" : "rgba(217,236,245,0.12)");
      var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", point.x);
      dot.setAttribute("cy", point.y);
      dot.setAttribute("r", visit.current ? 4.5 : 3.5);
      dot.setAttribute("fill", visit.current ? "#f1b35f" : "#d9ecf5");
      var title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = (visit.current ? "You near " : "") + [visit.city, visit.country].filter(Boolean).join(", ");
      group.style.opacity = String(Math.max(0.45, 1 - index * 0.035));
      group.appendChild(title);
      group.appendChild(pulse);
      group.appendChild(dot);
      els.mapPins.appendChild(group);
    });
    if (els.mapCaption) {
      var current = visits.find(function (visit) {
        return visit.current;
      });
      els.mapCaption.textContent = current
        ? "A new light is glowing near " + current.city + "."
        : "Showing warm sample lights until a visitor endpoint is connected.";
    }
  }

  function project(lat, lon) {
    return {
      x: ((Number(lon) + 180) / 360) * 1000,
      y: ((90 - Number(lat)) / 180) * 500
    };
  }

  function initStudio() {
    if (els.tokenInput && state.token) {
      els.tokenInput.value = state.token;
    }

    if (els.ownerLogin) {
      els.ownerLogin.addEventListener("submit", async function (event) {
        event.preventDefault();
        var token = els.tokenInput.value.trim();
        if (!token) {
          setStatus(els.authStatus, "Paste a GitHub token first.", "bad");
          return;
        }
        await connectOwner(token, els.rememberToken.checked);
      });
    }

    if (els.previewPost) {
      els.previewPost.addEventListener("click", function () {
        var post = composePost();
        if (!post) {
          return;
        }
        renderArticle(post);
        window.location.hash = "#blog";
      });
    }

    if (els.composer) {
      els.composer.addEventListener("submit", async function (event) {
        event.preventDefault();
        var post = composePost();
        if (!post) {
          return;
        }
        await publishPost(post);
      });
    }
  }

  async function connectOwner(token, remember) {
    setStatus(els.authStatus, "Checking GitHub identity...", "");
    try {
      var response = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: "Bearer " + token,
          "X-GitHub-Api-Version": "2022-11-28"
        }
      });
      if (!response.ok) {
        throw new Error("GitHub rejected this token.");
      }
      var user = await response.json();
      if (String(user.login || "").toLowerCase() !== OWNER) {
        throw new Error("This studio only accepts " + CONFIG.owner + ".");
      }
      state.token = token;
      state.user = user;
      if (remember) {
        localStorage.setItem("lechest-owner-token", token);
      } else {
        sessionStorage.setItem("lechest-owner-token", token);
        localStorage.removeItem("lechest-owner-token");
      }
      setStatus(els.authStatus, "Connected as " + user.login + ".", "good");
    } catch (error) {
      state.token = "";
      setStatus(els.authStatus, error.message || "Could not connect to GitHub.", "bad");
    }
  }

  function composePost() {
    var title = document.getElementById("postTitle").value.trim();
    var body = document.getElementById("postBody").value.trim();
    if (!title || !body) {
      setStatus(els.publishStatus, "Title and body are both needed.", "bad");
      return null;
    }
    var tags = document
      .getElementById("postTags")
      .value.split(",")
      .map(function (tag) {
        return tag.trim();
      })
      .filter(Boolean);
    return {
      id: makeSlug(title),
      title: title,
      subtitle: document.getElementById("postSubtitle").value.trim(),
      date: new Date().toISOString().slice(0, 10),
      mood: document.getElementById("postMood").value.trim() || "firelight",
      minutes: estimateMinutes(body),
      tags: tags.length ? tags : ["Notes"],
      body: body
    };
  }

  async function publishPost(post) {
    if (!state.token) {
      setStatus(els.publishStatus, "Connect GitHub first.", "bad");
      return;
    }
    setStatus(els.publishStatus, "Preparing GitHub update...", "");

    try {
      var apiUrl = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + encodeURIComponentPath(POSTS_PATH) + "?ref=" + encodeURIComponent(BRANCH);
      var currentResponse = await fetch(apiUrl, {
        headers: githubHeaders()
      });
      if (!currentResponse.ok) {
        throw new Error("Could not read posts.json from GitHub.");
      }
      var currentFile = await currentResponse.json();
      var posts = JSON.parse(base64ToUtf8(currentFile.content || ""));
      var uniquePost = Object.assign({}, post, { id: uniqueSlug(post.id, posts) });
      posts.unshift(uniquePost);

      var updateResponse = await fetch(apiUrl.replace("?ref=" + encodeURIComponent(BRANCH), ""), {
        method: "PUT",
        headers: githubHeaders(),
        body: JSON.stringify({
          message: "Publish blog post: " + uniquePost.title,
          content: utf8ToBase64(JSON.stringify(posts, null, 2) + "\n"),
          sha: currentFile.sha,
          branch: BRANCH
        })
      });
      if (!updateResponse.ok) {
        var problem = await safeJson(updateResponse);
        throw new Error((problem && problem.message) || "GitHub update failed.");
      }

      state.posts = posts;
      state.activePostId = uniquePost.id;
      renderLatest();
      renderTags();
      renderPostList();
      renderArticle(uniquePost);
      setStatus(els.publishStatus, "Published. GitHub Pages will redeploy shortly.", "good");
      window.location.hash = "#blog";
    } catch (error) {
      setStatus(els.publishStatus, error.message || "Publish failed.", "bad");
    }
  }

  function githubHeaders() {
    return {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + state.token,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function setStatus(element, message, tone) {
    if (!element) {
      return;
    }
    element.textContent = message;
    element.classList.remove("good", "bad");
    if (tone) {
      element.classList.add(tone);
    }
  }

  function initGame() {
    var canvas = document.getElementById("gameCanvas");
    if (!canvas) {
      return;
    }
    var ctx = canvas.getContext("2d");
    var message = document.getElementById("gameMessage");
    var inventory = document.getElementById("inventory");
    var restart = document.getElementById("restartGame");
    var tile = 16;
    var width = 24;
    var height = 16;
    var frame = 0;
    var trees = makeSet([
      [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0], [20, 0], [21, 0], [22, 0], [23, 0],
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [0, 11], [0, 12], [0, 13], [0, 14], [0, 15],
      [23, 1], [23, 2], [23, 3], [23, 4], [23, 5], [23, 6], [23, 7], [23, 8], [23, 9], [23, 10], [23, 11], [23, 12], [23, 13], [23, 14], [23, 15],
      [1, 15], [2, 15], [3, 15], [4, 15], [5, 15], [6, 15], [7, 15], [8, 15], [9, 15], [10, 15], [11, 15], [12, 15], [13, 15], [14, 15], [15, 15], [16, 15], [17, 15], [18, 15], [19, 15], [20, 15], [21, 15], [22, 15],
      [3, 2], [4, 2], [6, 2], [7, 3], [8, 3], [11, 2], [12, 2], [14, 3], [15, 3], [16, 2],
      [2, 5], [3, 5], [4, 6], [6, 6], [7, 7], [8, 7], [10, 6], [11, 6], [13, 7], [15, 7], [16, 7], [18, 7], [19, 8],
      [2, 10], [3, 10], [5, 11], [7, 12], [8, 12], [10, 12], [13, 11], [14, 11], [16, 10], [18, 13], [19, 13], [21, 12]
    ]);
    var ice = makeSet([[9, 9], [10, 9], [11, 9], [9, 10], [10, 10], [11, 10]]);
    var cabin = makeSet([[19, 2], [20, 2], [21, 2], [22, 2], [19, 3], [20, 3], [21, 3], [22, 3], [19, 4], [20, 4], [22, 4], [19, 5], [20, 5], [22, 5]]);
    var door = { x: 21, y: 5 };
    var items = [
      { id: "ember", label: "Pocket Ember", x: 5, y: 9, color: "#f1b35f" },
      { id: "ribbon", label: "Cranberry Ribbon", x: 13, y: 4, color: "#d95f75" },
      { id: "rose", label: "Snow Rose", x: 17, y: 12, color: "#ff8aa0" }
    ];
    var game = resetGame();

    document.addEventListener("keydown", function (event) {
      var key = event.key.toLowerCase();
      var moves = {
        arrowup: [0, -1],
        w: [0, -1],
        arrowdown: [0, 1],
        s: [0, 1],
        arrowleft: [-1, 0],
        a: [-1, 0],
        arrowright: [1, 0],
        d: [1, 0]
      };
      if (moves[key] && document.querySelector('[data-view="game"]').classList.contains("active")) {
        event.preventDefault();
        move(moves[key][0], moves[key][1]);
      }
    });

    document.querySelectorAll("[data-move]").forEach(function (button) {
      button.addEventListener("click", function () {
        var map = {
          up: [0, -1],
          down: [0, 1],
          left: [-1, 0],
          right: [1, 0]
        };
        var delta = map[button.dataset.move];
        move(delta[0], delta[1]);
      });
    });

    if (restart) {
      restart.addEventListener("click", function () {
        game = resetGame();
        setGameMessage("The cabin is waiting for three small warm things.");
        drawInventory();
      });
    }

    drawInventory();
    requestAnimationFrame(loop);

    function resetGame() {
      return {
        player: { x: 2, y: 13 },
        found: {},
        finished: false,
        steps: 0
      };
    }

    function loop() {
      frame += 1;
      draw();
      requestAnimationFrame(loop);
    }

    function move(dx, dy) {
      if (game.finished) {
        return;
      }
      var nx = game.player.x + dx;
      var ny = game.player.y + dy;
      if (isBlocked(nx, ny)) {
        return;
      }
      game.player.x = nx;
      game.player.y = ny;
      game.steps += 1;
      collectAt(nx, ny);
      if (nx === door.x && ny === door.y) {
        if (allItemsFound()) {
          game.finished = true;
          setGameMessage("The door opens. The little room saved its warmest light for the end.");
        } else {
          setGameMessage("The cabin glows, but the table is still missing a few warm things.");
        }
      }
    }

    function collectAt(x, y) {
      items.forEach(function (item) {
        if (!game.found[item.id] && item.x === x && item.y === y) {
          game.found[item.id] = true;
          if (item.id === "ember") {
            setGameMessage("The ember hums. The ice path softens under its tiny heat.");
          } else if (item.id === "ribbon") {
            setGameMessage("The ribbon finds its place, bright as a secret on snow.");
          } else {
            setGameMessage("The rose keeps a brave color even in winter.");
          }
          if (allItemsFound()) {
            setGameMessage("Everything is gathered. The cabin door is glowing now. Step inside.");
          }
          drawInventory();
        }
      });
    }

    function allItemsFound() {
      return items.every(function (item) {
        return game.found[item.id];
      });
    }

    function isBlocked(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        return true;
      }
      if (trees.has(key(x, y))) {
        return true;
      }
      if (cabin.has(key(x, y))) {
        return true;
      }
      if (ice.has(key(x, y)) && !game.found.ember) {
        setGameMessage("The ice is too cold until you carry a little ember.");
        return true;
      }
      return false;
    }

    function drawInventory() {
      if (!inventory) {
        return;
      }
      inventory.innerHTML = items
        .map(function (item) {
          return (
            '<div class="inventory-item ' +
            (game.found[item.id] ? "found" : "") +
            '"><span>' +
            escapeHtml(item.label) +
            "</span><strong>" +
            (game.found[item.id] ? "Found" : "...") +
            "</strong></div>"
          );
        })
        .join("");
    }

    function setGameMessage(text) {
      if (message) {
        message.textContent = text;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (game.finished) {
        drawFinale();
        return;
      }
      drawWorld();
      drawCabin();
      drawItems();
      if (allItemsFound()) {
        drawCabinPrompt();
      }
      drawPlayer();
      drawSnow();
    }

    function drawWorld() {
      ctx.fillStyle = "#1e2b36";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (var y = 0; y < height; y += 1) {
        for (var x = 0; x < width; x += 1) {
          var px = x * tile;
          var py = y * tile;
          ctx.fillStyle = (x + y) % 2 === 0 ? "#dbe9ec" : "#cddfe4";
          ctx.fillRect(px, py, tile, tile);
          ctx.fillStyle = "rgba(35,83,65,0.08)";
          if ((x * 13 + y * 7) % 5 === 0) {
            ctx.fillRect(px + 3, py + 4, 2, 2);
          }
          if (ice.has(key(x, y))) {
            ctx.fillStyle = game.found.ember ? "#b9dee5" : "#83b9cc";
            ctx.fillRect(px, py, tile, tile);
            ctx.fillStyle = "rgba(255,255,255,0.48)";
            ctx.fillRect(px + 3, py + 5, 10, 2);
          }
          if (trees.has(key(x, y))) {
            drawTree(px, py);
          }
        }
      }
    }

    function drawTree(px, py) {
      ctx.fillStyle = "#533422";
      ctx.fillRect(px + 7, py + 9, 3, 6);
      ctx.fillStyle = "#153c31";
      ctx.fillRect(px + 5, py + 2, 7, 4);
      ctx.fillRect(px + 3, py + 6, 11, 4);
      ctx.fillStyle = "#dbe9ec";
      ctx.fillRect(px + 4, py + 5, 4, 1);
      ctx.fillRect(px + 8, py + 9, 5, 1);
    }

    function drawCabin() {
      ctx.fillStyle = "#4a2c1d";
      ctx.fillRect(19 * tile, 2 * tile, 4 * tile, 4 * tile);
      ctx.fillStyle = "#2a1710";
      ctx.fillRect(18 * tile + 8, tile + 8, 5 * tile, tile);
      ctx.fillStyle = "#d98f45";
      ctx.fillRect(21 * tile + 5, 5 * tile + 1, 6, 15);
      ctx.fillStyle = "#f1b35f";
      ctx.fillRect(20 * tile + 3, 3 * tile + 4, 7, 6);
      ctx.fillRect(22 * tile - 2, 3 * tile + 4, 7, 6);
    }

    function drawCabinPrompt() {
      var pulse = Math.floor(frame / 12) % 2;
      ctx.fillStyle = pulse ? "#fff6e7" : "#f1b35f";
      ctx.fillRect(289, 68, 54, 16);
      ctx.fillStyle = "#8f2735";
      ctx.font = "10px monospace";
      ctx.fillText("ENTER", 297, 80);
      ctx.fillStyle = pulse ? "#f1b35f" : "#fff6e7";
      ctx.fillRect(337, 88, 18, 5);
      ctx.fillRect(350, 84, 5, 13);
      ctx.fillRect(355, 87, 4, 7);
      ctx.fillStyle = "rgba(241,179,95,0.28)";
      ctx.fillRect(21 * tile + 2, 5 * tile - 1, 12, 18);
    }

    function drawItems() {
      items.forEach(function (item) {
        if (game.found[item.id]) {
          return;
        }
        var cx = item.x * tile;
        var cy = item.y * tile;
        ctx.fillStyle = item.color;
        if (item.id === "ember") {
          ctx.fillRect(cx + 6, cy + 5, 4, 8);
          ctx.fillStyle = "#fff6e7";
          ctx.fillRect(cx + 7, cy + 4, 2, 4);
        } else if (item.id === "ribbon") {
          ctx.fillRect(cx + 3, cy + 6, 10, 4);
          ctx.fillStyle = "#8f2735";
          ctx.fillRect(cx + 6, cy + 4, 4, 8);
        } else {
          ctx.fillRect(cx + 7, cy + 5, 3, 8);
          ctx.fillRect(cx + 5, cy + 4, 7, 5);
          ctx.fillStyle = "#235341";
          ctx.fillRect(cx + 9, cy + 11, 5, 2);
        }
      });
    }

    function drawPlayer() {
      var px = game.player.x * tile;
      var py = game.player.y * tile;
      ctx.fillStyle = "#2d1d18";
      ctx.fillRect(px + 5, py + 4, 7, 9);
      ctx.fillStyle = "#f1b35f";
      ctx.fillRect(px + 6, py + 2, 5, 5);
      ctx.fillStyle = "#8f2735";
      ctx.fillRect(px + 4, py + 8, 9, 4);
      ctx.fillStyle = "#fff6e7";
      ctx.fillRect(px + 7, py + 4, 1, 1);
      ctx.fillRect(px + 10, py + 4, 1, 1);
    }

    function drawSnow() {
      ctx.fillStyle = "rgba(255,255,255,0.76)";
      for (var i = 0; i < 38; i += 1) {
        var x = (i * 41 + frame * (1 + (i % 3))) % canvas.width;
        var y = (i * 29 + frame * (1 + (i % 2))) % canvas.height;
        ctx.fillRect(x, y, 1 + (i % 2), 1 + (i % 2));
      }
    }

    function drawFinale() {
      ctx.fillStyle = "#161116";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#1f2c38";
      ctx.fillRect(0, 0, canvas.width, 96);
      ctx.fillStyle = "#dbe9ec";
      for (var i = 0; i < 58; i += 1) {
        ctx.fillRect((i * 37 + frame) % canvas.width, (i * 19) % 95, 2, 2);
      }
      ctx.fillStyle = "#4a2c1d";
      ctx.fillRect(78, 94, 230, 112);
      ctx.fillStyle = "#2a1710";
      ctx.fillRect(58, 78, 270, 24);
      ctx.fillStyle = "#d98f45";
      ctx.fillRect(114, 132, 56, 48);
      ctx.fillStyle = "#f1b35f";
      ctx.fillRect(126, 142, 32, 26);
      ctx.fillStyle = "#7b4c32";
      ctx.fillRect(176, 178, 96, 10);
      ctx.fillStyle = "#8f2735";
      ctx.fillRect(225, 134, 6, 38);
      ctx.fillStyle = "#ff8aa0";
      ctx.fillRect(216, 126, 24, 18);
      ctx.fillStyle = "#fff6e7";
      ctx.font = "16px monospace";
      ctx.fillText("I LOVE YOU", 116, 220);
      ctx.fillText("LL \u2764\uFE0F\u2764\uFE0F OO", 120, 240);
      drawBritishShorthair(84, 158);
      drawBeagle(184, 152);
      drawPixelDog(258, 154);
    }

    function drawPixelDog(x, y) {
      ctx.fillStyle = "#f0d2a6";
      ctx.fillRect(x, y + 10, 42, 22);
      ctx.fillRect(x + 6, y, 24, 18);
      ctx.fillStyle = "#7b4c32";
      ctx.fillRect(x + 4, y + 2, 8, 12);
      ctx.fillRect(x + 27, y + 2, 8, 12);
      ctx.fillStyle = "#2a1710";
      ctx.fillRect(x + 14, y + 8, 3, 3);
      ctx.fillRect(x + 24, y + 8, 3, 3);
      ctx.fillRect(x + 20, y + 13, 4, 3);
      ctx.fillStyle = "#f0d2a6";
      ctx.fillRect(x + 37, y + 9, 10, 5);
      ctx.fillStyle = "#d98f45";
      ctx.fillRect(x + 12, y + 31, 5, 7);
      ctx.fillRect(x + 30, y + 31, 5, 7);
    }

    function drawBeagle(x, y) {
      ctx.fillStyle = "#f3d9ad";
      ctx.fillRect(x + 6, y + 12, 44, 22);
      ctx.fillRect(x + 10, y + 2, 26, 20);
      ctx.fillStyle = "#7b4c32";
      ctx.fillRect(x + 22, y + 12, 26, 12);
      ctx.fillRect(x + 6, y + 4, 9, 18);
      ctx.fillRect(x + 33, y + 4, 9, 18);
      ctx.fillStyle = "#fff6e7";
      ctx.fillRect(x + 15, y + 7, 15, 14);
      ctx.fillRect(x + 7, y + 23, 18, 11);
      ctx.fillStyle = "#2a1710";
      ctx.fillRect(x + 18, y + 10, 3, 3);
      ctx.fillRect(x + 28, y + 10, 3, 3);
      ctx.fillRect(x + 23, y + 16, 5, 3);
      ctx.fillStyle = "#f3d9ad";
      ctx.fillRect(x + 49, y + 14, 11, 5);
      ctx.fillStyle = "#7b4c32";
      ctx.fillRect(x + 12, y + 34, 5, 8);
      ctx.fillRect(x + 38, y + 34, 5, 8);
    }

    function drawBritishShorthair(x, y) {
      ctx.fillStyle = "#9aa3aa";
      ctx.fillRect(x + 9, y + 16, 34, 22);
      ctx.fillRect(x + 12, y + 4, 25, 21);
      ctx.fillStyle = "#7d8790";
      ctx.fillRect(x + 11, y + 1, 7, 8);
      ctx.fillRect(x + 31, y + 1, 7, 8);
      ctx.fillRect(x + 40, y + 19, 9, 5);
      ctx.fillRect(x + 45, y + 14, 5, 8);
      ctx.fillStyle = "#f1b35f";
      ctx.fillRect(x + 18, y + 12, 3, 3);
      ctx.fillRect(x + 29, y + 12, 3, 3);
      ctx.fillStyle = "#2a1710";
      ctx.fillRect(x + 23, y + 17, 5, 3);
      ctx.fillStyle = "#7d8790";
      ctx.fillRect(x + 15, y + 38, 5, 7);
      ctx.fillRect(x + 32, y + 38, 5, 7);
    }
  }

  function markdownToHtml(markdown) {
    var blocks = String(markdown)
      .replace(/\r\n/g, "\n")
      .split(/\n{2,}/)
      .map(function (block) {
        return block.trim();
      })
      .filter(Boolean);

    return blocks
      .map(function (block) {
        if (/^###\s+/.test(block)) {
          return "<h3>" + inlineMarkdown(block.replace(/^###\s+/, "")) + "</h3>";
        }
        if (/^##\s+/.test(block)) {
          return "<h2>" + inlineMarkdown(block.replace(/^##\s+/, "")) + "</h2>";
        }
        if (/^#\s+/.test(block)) {
          return "<h2>" + inlineMarkdown(block.replace(/^#\s+/, "")) + "</h2>";
        }
        if (/^[-*]\s+/m.test(block)) {
          return (
            "<ul>" +
            block
              .split("\n")
              .filter(Boolean)
              .map(function (line) {
                return "<li>" + inlineMarkdown(line.replace(/^[-*]\s+/, "")) + "</li>";
              })
              .join("") +
            "</ul>"
          );
        }
        return "<p>" + inlineMarkdown(block).replace(/\n/g, "<br>") + "</p>";
      })
      .join("");
  }

  function inlineMarkdown(text) {
    return escapeHtml(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  }

  function firstSentence(text) {
    var clean = String(text || "").replace(/\s+/g, " ").trim();
    var match = clean.match(/^(.{1,150}?)[.!?](\s|$)/);
    return match ? match[1] + "." : clean.slice(0, 150);
  }

  function estimateMinutes(text) {
    var words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 220));
  }

  function makeSlug(title) {
    var slug = String(title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return (slug || "note") + "-" + new Date().toISOString().slice(0, 10);
  }

  function uniqueSlug(slug, posts) {
    var existing = new Set(posts.map(function (post) { return post.id; }));
    var next = slug;
    var index = 2;
    while (existing.has(next)) {
      next = slug + "-" + index;
      index += 1;
    }
    return next;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function encodeURIComponentPath(path) {
    return String(path)
      .split("/")
      .map(function (part) {
        return encodeURIComponent(part);
      })
      .join("/");
  }

  function utf8ToBase64(text) {
    var bytes = new TextEncoder().encode(text);
    var binary = "";
    bytes.forEach(function (byte) {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function base64ToUtf8(base64) {
    var binary = atob(String(base64 || "").replace(/\s/g, ""));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  async function safeJson(response) {
    try {
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  function key(x, y) {
    return x + "," + y;
  }

  function makeSet(points) {
    return new Set(
      points.map(function (point) {
        return key(point[0], point[1]);
      })
    );
  }
})();
