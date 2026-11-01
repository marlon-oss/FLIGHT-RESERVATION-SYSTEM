const airports = [
  ["JNB", "Johannesburg"],
  ["CPT", "Cape Town"],
  ["DUR", "Durban"],
  ["PLZ", "Gqeberha"],
  ["GRJ", "George"],
  ["ELS", "East London"],
];
const flights = [
  ["CL 101", "JNB", "CPT", "06:40", "08:55", "2h 15m", 1899],
  ["CL 105", "JNB", "CPT", "10:30", "12:45", "2h 15m", 2199],
  ["CL 109", "JNB", "CPT", "18:10", "20:25", "2h 15m", 1599],
  ["CL 202", "CPT", "JNB", "07:25", "09:35", "2h 10m", 1699],
  ["CL 206", "CPT", "JNB", "15:15", "17:25", "2h 10m", 2049],
  ["CL 301", "JNB", "DUR", "08:15", "09:25", "1h 10m", 1299],
  ["CL 305", "JNB", "DUR", "16:35", "17:45", "1h 10m", 1499],
  ["CL 302", "DUR", "JNB", "10:05", "11:15", "1h 10m", 1249],
  ["CL 306", "DUR", "JNB", "19:20", "20:30", "1h 10m", 1399],
  ["CL 401", "CPT", "DUR", "09:00", "11:00", "2h", 1799],
  ["CL 402", "DUR", "CPT", "12:10", "14:10", "2h", 1749],
  ["CL 501", "JNB", "PLZ", "11:20", "12:55", "1h 35m", 1549],
  ["CL 502", "PLZ", "JNB", "14:00", "15:35", "1h 35m", 1499],
  ["CL 601", "JNB", "GRJ", "13:05", "15:05", "2h", 1849],
  ["CL 602", "GRJ", "JNB", "16:00", "18:00", "2h", 1799],
  ["CL 701", "JNB", "ELS", "07:50", "09:15", "1h 25m", 1449],
  ["CL 702", "ELS", "JNB", "17:30", "18:55", "1h 25m", 1399],
].map(([number, from, to, depart, arrive, duration, fare], i) => ({
  id: i,
  number,
  from,
  to,
  depart,
  arrive,
  duration,
  fare,
}));
const $ = (s) => document.querySelector(s),
  money = (n) =>
    new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      maximumFractionDigits: 0,
    }).format(n),
  date = (d) =>
    d
      ? new Date(d + "T12:00:00").toLocaleDateString("en-ZA", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";
const key = "cloudy-airlines-flight-reservations-v1";
let trip = "return",
  criteria = null,
  leg = "outbound",
  outbound = null,
  inbound = null,
  passengers = 1,
  bag = false;
const storage = (k, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  save = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  };
const opts = airports
  .map(([code, city]) => `<option value="${code}">${city} (${code})</option>`)
  .join("");
$("#origin").innerHTML = opts;
$("#destination").innerHTML = opts;
$("#destination").value = "CPT";
$("#passengers").innerHTML = Array.from(
  { length: 6 },
  (_, i) =>
    `<option value="${i + 1}">${i + 1} traveller${i ? "s" : ""}</option>`,
).join("");
const today = new Date();
const iso = (d) => {
  const x = new Date(today);
  x.setDate(x.getDate() + d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
$("#depart").min = iso(0);
$("#return").min = iso(0);
$("#depart").value = iso(7);
$("#return").value = iso(14);
const theme = storage(
  "cloudy-airlines-theme",
  matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
);
document.documentElement.dataset.theme = theme;
function setTheme() {
  const next =
    document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  save("cloudy-airlines-theme", next);
  $("#theme").innerHTML =
    `${next === "light" ? "☾" : "☀"} <span>${next[0].toUpperCase() + next.slice(1)}</span>`;
}
$("#theme").innerHTML =
  `${theme === "light" ? "☾" : "☀"} <span>${theme[0].toUpperCase() + theme.slice(1)}</span>`;
$("#theme").onclick = setTheme;
document.querySelectorAll("[data-trip]").forEach(
  (b) =>
    (b.onclick = () => {
      trip = b.dataset.trip;
      document
        .querySelectorAll("[data-trip]")
        .forEach((x) => x.classList.toggle("active", x === b));
      $("#return-wrap").hidden = trip === "one-way";
      $("#return").required = trip === "return";
    }),
);
$("#depart").onchange = () => {
  $("#return").min = $("#depart").value;
  if ($("#return").value < $("#depart").value)
    $("#return").value = $("#depart").value;
};
$("#swap").onclick = () => {
  const a = $("#origin").value;
  $("#origin").value = $("#destination").value;
  $("#destination").value = a;
};
$("#search").onsubmit = (e) => {
  e.preventDefault();
  if ($("#origin").value === $("#destination").value)
    return alert("Choose two different cities.");
  if (trip === "return" && $("#return").value < $("#depart").value)
    return alert("Return date must follow departure.");
  criteria = {
    trip,
    from: $("#origin").value,
    to: $("#destination").value,
    depart: $("#depart").value,
    return: $("#return").value,
    passengers: +$("#passengers").value,
  };
  leg = "outbound";
  outbound = inbound = null;
  showFlights();
  $("#results").scrollIntoView({ behavior: "smooth" });
};
function city(code) {
  return airports.find((a) => a[0] === code)?.[1] || code;
}
function showFlights() {
  const from = leg === "outbound" ? criteria.from : criteria.to,
    to = leg === "outbound" ? criteria.to : criteria.from;
  let list = flights
    .filter((f) => f.from === from && f.to === to)
    .sort((a, b) => a.fare - b.fare);
  $("#results").innerHTML =
    `<div class="results"><p class="eyebrow">${leg.toUpperCase()} FLIGHTS · ${date(leg === "outbound" ? criteria.depart : criteria.return)}</p><h3>${city(from)} → ${city(to)}</h3>${leg === "return" && outbound ? `<small>Outbound selected · ${outbound.number}</small>` : ""}${list.length ? list.map((f) => `<article class="flight"><strong>Cloudy Airlines<small>${f.number} · Economy</small></strong><div class="times"><b>${f.depart}<small>${city(f.from)}</small></b><small>${f.duration}<br>Non-stop</small><b>${f.arrive}<small>${city(f.to)}</small></b></div><div class="fare">${money(f.fare)}<small>per traveller</small></div><button data-flight="${f.id}">${leg === "outbound" && trip === "return" ? "Choose outbound" : leg === "return" ? "Choose return" : "Reserve"}</button></article>`).join("") : "<p>No sample flight for this route yet. Try JNB–CPT, JNB–DUR, CPT–DUR, or JNB–PLZ."}<small class="disclaimer">Sample schedule and fare only. Taxes included. No live inventory.</small></div>`;
  document
    .querySelectorAll("[data-flight]")
    .forEach((b) => (b.onclick = () => choose(flights[+b.dataset.flight])));
}
function choose(f) {
  if (leg === "outbound" && trip === "return") {
    outbound = f;
    leg = "return";
    showFlights();
    return;
  }
  if (leg === "outbound") outbound = f;
  else inbound = f;
  passengers = criteria.passengers;
  bag = false;
  showDialog();
}
function legHtml(f, label, d) {
  return `<div><b>${label} · ${date(d)}</b><p>${f.depart} ${city(f.from)} → ${f.arrive} ${city(f.to)}</p><small>${f.number} · ${f.duration} · Non-stop</small></div>`;
}
function total() {
  return (
    (outbound.fare + (inbound?.fare || 0)) * passengers +
    (bag ? 350 * passengers * (inbound ? 2 : 1) : 0)
  );
}
function showDialog() {
  passengers = criteria.passengers;
  bag = false;
  renderDetails();
  $("#booking-dialog").showModal();
}
function renderDetails() {
  const all = inbound ? [outbound, inbound] : [outbound];
  $("#booking-content").innerHTML =
    `<h2>Who’s coming along?</h2><p>Sample itinerary · fares in South African rand.</p><div class="dialog-legs">${all.map((f, i) => legHtml(f, i ? "Return" : "Outbound", i ? criteria.return : criteria.depart)).join("")}</div><form id="details" class="dialog-form">${Array.from({ length: passengers }, (_, i) => `<fieldset><legend>Traveller ${i + 1} · as shown on ID</legend><div class="name-row"><label>First name<input name="first${i}" required></label><label>Last name<input name="last${i}" required></label></div></fieldset>`).join("")}<label>Contact email<input name="email" type="email" required></label><label>Mobile number (optional)<input name="phone" type="tel"></label><label class="bag"><input name="bag" type="checkbox"> Add checked bag · R350 per person, per direction</label><div class="total"> Total <span id="total">${money(total())}</span></div><p id="name-error" class="error" role="alert"></p><button class="button submit">Review reservation →</button><small class="disclaimer">Saved in this browser only. No payment details requested.</small></form>`;
  const form = $("#details");
  form.bag.onchange = () => {
    bag = form.bag.checked;
    $("#total").textContent = money(total());
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    const data = new FormData(form),
      names = Array.from({ length: passengers }, (_, i) => ({
        firstName: String(data.get("first" + i)).trim(),
        lastName: String(data.get("last" + i)).trim(),
      }));
    if (names.some((p) => !p.firstName || !p.lastName))
      return ($("#name-error").textContent =
        "Enter a first and last name for every traveller.");
    review(data, names);
  };
}
function review(data, names) {
  const t = total();
  $("#booking-content").innerHTML =
    `<h2>Review your trip</h2><p>${names.map((p) => `${p.firstName} ${p.lastName}`).join(", ")} · ${data.get("email")}</p><div class="dialog-legs">${legHtml(outbound, "Outbound", criteria.depart)}${inbound ? legHtml(inbound, "Return", criteria.return) : ""}</div><p>${money(outbound.fare + (inbound?.fare || 0))} × ${passengers} travellers${bag ? ` · checked bags ${money(350 * passengers * (inbound ? 2 : 1))}` : ""}</p><div class="total">Total flight fare <span>${money(t)}</span></div><p class="notice"><b>flight only.</b> This saves locally; it does not hold seats, issue tickets, or charge you.</p><div class="review-actions"><button id="back" class="button" type="button">Back</button><button id="confirm" class="button submit" type="button">Confirm flight reservation</button></div>`;
  $("#back").onclick = () => renderDetails();
  $("#confirm").onclick = () => {
    const ref = "CA-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      reservations = storage(key, []),
      reservation = {
        reference: ref,
        createdAt: new Date().toISOString(),
        tripType: trip,
        origin: criteria.from,
        destination: criteria.to,
        departureDate: criteria.depart,
        returnDate: trip === "return" ? criteria.return : "",
        passengers: names,
        contactEmail: String(data.get("email")).trim().toLowerCase(),
        contactPhone: String(data.get("phone") || "").trim(),
        checkedBags: bag,
        outbound,
        inbound,
        total: t,
      };
    save(key, [reservation, ...reservations]);
    $("#booking-content").innerHTML =
      `<p class="eyebrow">YOUR FLIGHT RESERVATION IS SAVED</p><h2>You’re cleared for takeoff.</h2><p>Saved on this device only. No ticket or payment was issued.</p><div class="total">Reference <b>${ref}</b></div><div class="total"> Total <b>${money(t)}</b></div><button id="done" class="button submit">Done</button>`;
    $("#done").onclick = () => $("#booking-dialog").close();
  };
}
$("#close").onclick = () => $("#booking-dialog").close();
$("#booking-dialog").onclick = (e) => {
  if (e.target === $("#booking-dialog")) $("#booking-dialog").close();
};
$("#lookup").onsubmit = (e) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget),
    r = storage(key, []).find(
      (x) =>
        x.reference.toLowerCase() ===
          String(data.get("reference")).trim().toLowerCase() &&
        x.contactEmail === String(data.get("email")).trim().toLowerCase(),
    );
  $("#lookup-message").textContent = r
    ? "Reservation found on this device."
    : "No matching flight reservation saved on this device.";
  $("#lookup-result").innerHTML = r
    ? `<p><b>${r.reference}</b> · ${city(r.origin)} → ${city(r.destination)}</p><p>Outbound ${date(r.departureDate)} · ${r.outbound.depart} ${r.inbound ? `· Return ${date(r.returnDate)} · ${r.inbound.depart}` : ""}</p><p>${r.passengers.length} traveller(s) · Demo total ${money(r.total)}</p><small class="disclaimer">Local flight reservation only — not a ticket.</small>`
    : "";
};
