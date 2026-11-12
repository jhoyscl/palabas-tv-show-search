/*
"Talk is cheap. Show me the code."
—Linus Torvalds
*/

// Palabas · WS1 TV Show Search code-along (TVmaze API, no key needed)
// Open DevTools (F12): keep the Console AND the Network tab open.
// Sample or live mode: see config.js.

// ---------- Given: page elements ----------
const form = document.getElementById("searchForm");
const input = document.getElementById("query");
const statusText = document.getElementById("status");
const results = document.getElementById("results");
const dialog = document.getElementById("details");
const detailsBody = document.getElementById("detailsBody");
const closeBtn = document.getElementById("closeDetails");
const modeBadge = document.getElementById("modeBadge");
const sortButton = document.getElementById("sortRating");

// ---------- Given: the API's URLs ----------
const API = "https://api.tvmaze.com";

// Turns "Breaking Bad" into "breaking-bad" (used for the sample-data file names)
function slug(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// e.g. https://api.tvmaze.com/search/shows?q=breaking%20bad
function searchURL(query) {
  if (USE_SAMPLE_DATA) return `data/search/${slug(query)}.json`;
  return `${API}/search/shows?q=${encodeURIComponent(query)}`;
}

// e.g. https://api.tvmaze.com/shows/169
function showURL(id) {
  return USE_SAMPLE_DATA ? `data/shows/${id}.json` : `${API}/shows/${id}`;
}

// e.g. https://api.tvmaze.com/shows/169/cast
function castURL(id) {
  return USE_SAMPLE_DATA ? `data/cast/${id}.json` : `${API}/shows/${id}/cast`;
}

// e.g. https://api.tvmaze.com/shows/169/seasons
function seasonsURL(id) {
  return USE_SAMPLE_DATA ? `data/seasons/${id}.json` : `${API}/shows/${id}/seasons`;
}

// ---------- Given: helpers (no need to change) ----------

// Shows a message under the search box. type: "info", "loading" or "error"
function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.className = "status " + type;
}

// Makes an element with an optional class and text: el("span", "year", "2008")
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A poster <img>, or a placeholder when the show has no image (image is null)
function createPoster(show, size = "medium") {
  if (!show.image) {
    return el("span", "poster none", "No poster");
  }
  const img = el("img", "poster");
  img.src = show.image[size] || show.image.medium;
  img.alt = `Poster: ${show.name}`;
  img.loading = "lazy";
  img.addEventListener("error", () => img.replaceWith(el("span", "poster none", "No poster")));
  return img;
}

// "2008–2013", or "2016–" for a show that is still running
function yearRange(show) {
  const start = show.premiered ? show.premiered.slice(0, 4) : "?";
  const end = show.ended ? show.ended.slice(0, 4) : "";
  return `${start}–${end}`;
}

// TVmaze summaries contain HTML like "<p><b>Friends</b> follows…</p>".
// This keeps only the text. (Never put text from an API into innerHTML:
// if it contained a <script> or an onerror, it could run on your page.)
function stripTags(html) {
  if (!html) return "No summary yet.";
  return new DOMParser().parseFromString(html, "text/html").body.textContent;
}

// Close the details pop-up (Step 4) with the × button or by clicking outside it
closeBtn.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

// Show which mode we're in
modeBadge.textContent = USE_SAMPLE_DATA ? "Sample data" : "Live · TVmaze";
modeBadge.classList.toggle("live", !USE_SAMPLE_DATA);

// STEP 1 — Your first API request


async function testRequest() {
  const url = searchURL("friends");
  console.log("Requesting:", url);

  const response = await fetch(url);
  const data = await response.json();

  console.log("Response:", data);
}

testRequest();



// STEP 2 — Search and show the results
// TODO: renderResults(items), searchShows(query), and a submit listener on the form


function renderResults(items) {
  results.replaceChildren();

  for (const result of items) {
    const show = result.show;

    const showCard = el("button", "card");
    showCard.type = "button";
    showCard.dataset.id = show.id;
    showCard.dataset.rating = show.rating?.average ?? "";

    const showTitle = el("span", "title", show.name);
    const showYears = el("span", "year", yearRange(show));

    const genreList = show.genres.length > 0
      ? show.genres.join(", ")
      : "No genres available";

    const showGenres = el("span", "genres", genreList);

    const averageRating = show.rating?.average;
    const ratingText = averageRating != null
      ? `★ ${averageRating}`
      : "Not rated yet";

    const showRating = el("span", "rating", ratingText);

    showCard.append(
      createPoster(show),
      showTitle,
      showYears,
      showGenres,
      showRating
    );

    results.appendChild(showCard);
  }
  sortButton.disabled = items.length === 0;
}

// Sort the current search results from highest rating to lowest rating.

sortButton.addEventListener("click", () => {
  const cards = Array.from(results.querySelectorAll(".card"));

  cards.sort((cardA, cardB) => {
    const ratingA = cardA.dataset.rating === ""
      ? -1
      : Number(cardA.dataset.rating);
    const ratingB = cardB.dataset.rating === ""
      ? -1
      : Number(cardB.dataset.rating);

    return ratingB - ratingA;
  });

  results.replaceChildren(...cards);
  setStatus("Shows sorted from highest to lowest rating.", "info");
});

// This function requests TV show data based on the entered search term.
async function searchShows(query) {
  const requestURL = searchURL(query);
  const response = await fetch(requestURL);
  const showData = await response.json();

  renderResults(showData);

  setStatus(
    showData.length > 0
      ? `${showData.length} shows found.`
      : "No shows found.",
    "info"
  );
}

// This event listener processes the search form when submitted.
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const searchTerm = input.value.trim();

  if (searchTerm === "") {
    return;
  }

  searchShows(searchTerm);
});

// STEP 3 — getJSON(): one careful helper for every request
// TODO: catch network errors, check 429 and response.ok; rewrite searchShows with try / catch and an empty-array check


async function getJSON(url) {
  let result;

  try {
    result = await fetch(url);
  } catch (error) {
    throw new Error(
      "Can't reach TVmaze. Check your internet, or use sample mode."
    );
  }

  if (result.status === 429) {
    throw new Error(
      "Too many requests (429). Wait 10 seconds and try again."
    );
  }

if (!result.ok) {
    if (USE_SAMPLE_DATA && result.status === 404) {
      throw new Error(
        "That show isn't available in sample mode. Try one of the six sample titles, or type sample."
      );
    }

    throw new Error(`Request failed (HTTP ${result.status}).`);
  }

  const jsonData = await result.json();
  return jsonData;
}

// This function searches for shows and displays the results.
async function searchShows(query) {
  results.replaceChildren();
  sortButton.disabled = true;
  setStatus(`Looking for "${query}"...`, "loading");

  try {
    const shows = await getJSON(searchURL(query));

    if (!shows.length) {
      setStatus(`No shows found for "${query}".`, "error");
      return;
    }

    renderResults(shows);

    const total = shows.length;
    setStatus(
      `${total} ${total === 1 ? "show" : "shows"} found.`,
      "info"
    );

  } catch (problem) {
    setStatus(problem.message, "error");
  }
}

// STEP 4 — Click a show to see its details
// TODO: one click listener on #results, showDetails(id), renderDetails(show)
results.addEventListener("click", (event) => {
  const card = event.target.closest(".card");

  if (card) {
    showDetails(card.dataset.id);
  }
});

// This function loads the selected show's details.
async function showDetails(id) {
  detailsBody.replaceChildren(
    el("p", "status loading", "Loading details…")
  );

  dialog.showModal();

  try {
    const show = await getJSON(showURL(id));
    renderDetails(show);
  } catch (error) {
    detailsBody.replaceChildren(
      el("p", "status error", error.message)
    );
  }
}

// This function displays the selected show's details.
function renderDetails(show) {
  detailsBody.replaceChildren();
  detailsBody.append(createPoster(show, "original"));
  detailsBody.append(el("h2", "", show.name));

  const network = show.network
    ? show.network.name
    : show.webChannel
      ? show.webChannel.name
      : "Not available";

  const genres = show.genres.length > 0
    ? show.genres.join(", ")
    : "No genres available";

  // Get the runtime.
  const runtime = show.runtime || show.averageRuntime || "Not available";
  const info = `${yearRange(show)} · ${network} · ${genres} · ${runtime} minutes`;
  detailsBody.append(el("p", "", info));
  const rating = show.rating?.average != null
    ? show.rating.average
    : "Not rated yet";

  detailsBody.append(el("p", "", `Rating: ${rating}`));
  detailsBody.append(
    el("p", "", stripTags(show.summary || "No summary available."))
  );

  const link = el("a", "", "View on TVmaze");
  link.href = show.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  detailsBody.append(link);
}

// STEP 5 — Promise.all: show + cast + seasons at the same time
// TODO: rewrite showDetails with Promise.all, and renderDetails(show, cast, seasons)

results.addEventListener("click", (event) => {
  const card = event.target.closest(".card");

  if (card) {
    showDetails(card.dataset.id);
  }
});

// This function loads the show's details, cast, and seasons at the same time.
async function showDetails(id) {
  detailsBody.replaceChildren(
    el("p", "status loading", "Loading details…")
  );

  dialog.showModal();

  try {
    const start = performance.now();

    const [show, cast, seasons] = await Promise.all([
      getJSON(showURL(id)),
      getJSON(castURL(id)),
      getJSON(seasonsURL(id)),
    ]);

    console.log(
      `3 requests in ${Math.round(performance.now() - start)} ms`
    );

    renderDetails(show, cast, seasons);

  } catch (error) {
    detailsBody.replaceChildren(
      el("p", "status error", error.message)
    );
  }
}

// This function displays the show's details, seasons, and cast members.
function renderDetails(show, cast, seasons) {
  detailsBody.replaceChildren();


  detailsBody.append(createPoster(show, "original"));
  detailsBody.append(el("h2", "", show.name));

  // Get the network or streaming platform.
  const network = show.network
    ? show.network.name
    : show.webChannel
      ? show.webChannel.name
      : "Not available";

  // Get the genres.
  const genres = show.genres.length > 0
    ? show.genres.join(", ")
    : "No genres available";

  // Get the runtime.
  const runtime = show.runtime || show.averageRuntime || "Not available";
  const info = `${yearRange(show)} · ${network} · ${genres} · ${runtime} minutes`;
  detailsBody.append(el("p", "", info));

  // Display the rating.
  const rating = show.rating?.average != null
    ? show.rating.average
    : "Not rated yet";

  detailsBody.append(el("p", "", `Rating: ${rating}`));

  const seasonCount = seasons.length;
  detailsBody.append(
    el("p", "", `${seasonCount} ${seasonCount === 1 ? "season" : "seasons"}`)
  );
  detailsBody.append(
    el("p", "", stripTags(show.summary || "No summary available."))
  );
  detailsBody.append(el("h3", "", "Cast"));

  const list = el("ul", "", "");

  cast.slice(0, 6).forEach((member) => {
    const li = el("li", "", member.person.name + " ");
    li.append(el("span", "", "as " + member.character.name));
    list.append(li);
  });

  detailsBody.append(list);

  // Display the TVmaze link.
  const link = el("a", "", "View on TVmaze");
  link.href = show.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  detailsBody.append(link);
}


