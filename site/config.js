window.LECHEST_CONFIG = {
  siteName: "Lechest Blog",
  owner: "johnnyZeppelin",
  repo: "Lechest-Blog",
  branch: "main",
  postsPath: "site/content/posts.json",
  email: "sflijohn@foxmail.com",
  githubUrl: "https://github.com/johnnyZeppelin",
  pagesUrl: "https://johnnyzeppelin.github.io/Lechest-Blog/",

  // Anonymous public comments need a hosted comment backend.
  // Create a Cusdis site, paste its app id here, then comments will render below each post.
  cusdis: {
    host: "https://cusdis.com",
    appId: ""
  },

  // Optional visitor logging endpoint. It should accept POST visits and return GET JSON:
  // [{ "city": "Paris", "country": "France", "lat": 48.8566, "lon": 2.3522 }]
  visitorEndpoint: ""
};
